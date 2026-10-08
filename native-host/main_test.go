package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// 本物の op の代わりに、参照に応じて値を返すスクリプトを置く
func writeFakeOp(t *testing.T, dir string) string {
	t.Helper()
	path := filepath.Join(dir, "op")
	script := `#!/bin/sh
case "$3" in
  op://Work/abc123/username) printf user01 ;;
  op://Work/abc123/password) printf secret ;;
  *) echo "[ERROR] item not found" >&2; exit 1 ;;
esac
`
	if err := os.WriteFile(path, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func writeConfig(t *testing.T, cfg config) {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	data, _ := json.Marshal(cfg)
	if err := os.MkdirAll(filepath.Join(dir, "kotdiff"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "kotdiff", "op.json"), data, 0o600); err != nil {
		t.Fatal(err)
	}
}

func roundTrip(t *testing.T) response {
	t.Helper()
	var out bytes.Buffer
	if err := serve(bytes.NewReader(frame(`{"type":"get-credentials"}`)), &out); err != nil {
		t.Fatal(err)
	}
	var res response
	if err := readMessage(&out, &res); err != nil {
		t.Fatal(err)
	}
	return res
}

func TestServeReadsCredentialsWithOp(t *testing.T) {
	op := writeFakeOp(t, t.TempDir())
	writeConfig(t, config{Op: op, Username: "op://Work/abc123/username", Password: "op://Work/abc123/password"})

	if got := roundTrip(t); got != (response{Username: "user01", Password: "secret"}) {
		t.Fatalf("got %+v", got)
	}
}

func TestServePassesOpErrorToExtension(t *testing.T) {
	op := writeFakeOp(t, t.TempDir())
	writeConfig(t, config{Op: op, Username: "op://Work/missing/username", Password: "op://Work/missing/password"})

	if got := roundTrip(t); got.Error != "op read: [ERROR] item not found" {
		t.Fatalf("got %+v", got)
	}
}
