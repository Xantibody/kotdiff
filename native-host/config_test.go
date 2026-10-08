package main

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestConfigPathPrefersXDGConfigHome(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "/tmp/xdg")

	got, err := configPath()
	if err != nil {
		t.Fatal(err)
	}
	if got != "/tmp/xdg/kotdiff/op.json" {
		t.Fatalf("got %q", got)
	}
}

func TestConfigPathFallsBackToDotConfig(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "")
	t.Setenv("HOME", "/home/me")

	got, err := configPath()
	if err != nil {
		t.Fatal(err)
	}
	if got != "/home/me/.config/kotdiff/op.json" {
		t.Fatalf("got %q", got)
	}
}

func TestLoadConfigReportsMissingSetup(t *testing.T) {
	_, err := loadConfig(filepath.Join(t.TempDir(), "op.json"))

	// 拡張の画面に出るので、次に何をすればよいかを伝える
	if err == nil || !strings.Contains(err.Error(), "setup") {
		t.Fatalf("err = %v", err)
	}
}
