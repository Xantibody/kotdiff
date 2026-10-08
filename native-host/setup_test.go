package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func fakeOp(t *testing.T, outputs map[string]string) func(args ...string) ([]byte, error) {
	return func(args ...string) ([]byte, error) {
		key := strings.Join(args, " ")
		out, ok := outputs[key]
		if !ok {
			t.Fatalf("unexpected op %s", key)
		}
		return []byte(out), nil
	}
}

func newSetup(t *testing.T, runOp func(args ...string) ([]byte, error), input string) (setupEnv, string) {
	home := t.TempDir()
	return setupEnv{
		runOp:      runOp,
		in:         strings.NewReader(input),
		out:        &strings.Builder{},
		goos:       "darwin",
		home:       home,
		hostPath:   "/opt/kotdiff-native-host",
		opPath:     "/opt/homebrew/bin/op",
		configPath: filepath.Join(home, ".config", "kotdiff", "op.json"),
	}, home
}

func readConfig(t *testing.T, path string) config {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var cfg config
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}
	return cfg
}

func TestSetupWritesConfigForTheChosenItemAndFirefoxManifest(t *testing.T) {
	env, home := newSetup(t, fakeOp(t, map[string]string{
		"item list --categories Login --format json": itemListJSON,
	}), "")

	if err := env.run(setupOptions{}); err != nil {
		t.Fatal(err)
	}

	want := config{
		Op:       "/opt/homebrew/bin/op",
		Username: "op://v1/abc123/username",
		Password: "op://v1/abc123/password",
	}
	if got := readConfig(t, env.configPath); got != want {
		t.Fatalf("config = %+v", got)
	}
	if info, _ := os.Stat(env.configPath); info.Mode().Perm() != 0o600 {
		t.Fatalf("config mode = %v", info.Mode().Perm())
	}
	manifest := filepath.Join(home, "Library/Application Support/Mozilla/NativeMessagingHosts/io.github.xantibody.kotdiff.json")
	if _, err := os.Stat(manifest); err != nil {
		t.Fatal(err)
	}
}

func TestSetupWithItemFlagSkipsTheSearch(t *testing.T) {
	env, _ := newSetup(t, fakeOp(t, map[string]string{
		"item get def456 --format json": `{"id": "def456", "title": "KOT", "vault": {"id": "v2", "name": "Private"}}`,
	}), "")

	if err := env.run(setupOptions{item: "def456"}); err != nil {
		t.Fatal(err)
	}

	if got := readConfig(t, env.configPath); got.Username != "op://v2/def456/username" {
		t.Fatalf("config = %+v", got)
	}
}

func TestSetupWritesChromeManifestToTheGivenDirs(t *testing.T) {
	env, home := newSetup(t, fakeOp(t, map[string]string{
		"item get def456 --format json": `{"id": "def456", "title": "KOT", "vault": {"id": "v2", "name": "Private"}}`,
	}), "")
	brave := filepath.Join(home, "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts")

	if err := env.run(setupOptions{item: "def456", chromeExtensionID: "abcdefghijklmnop", chromeDirs: []string{brave}}); err != nil {
		t.Fatal(err)
	}

	if _, err := os.Stat(filepath.Join(brave, "io.github.xantibody.kotdiff.json")); err != nil {
		t.Fatal(err)
	}
}
