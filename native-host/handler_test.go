package main

import (
	"errors"
	"testing"
)

var testConfig = config{
	Op:       "/usr/local/bin/op",
	Username: "op://Work/abc123/username",
	Password: "op://Work/abc123/password",
}

func TestHandleReturnsCredentialsReadFromConfiguredRefs(t *testing.T) {
	secrets := map[string]string{
		"op://Work/abc123/username": "user01",
		"op://Work/abc123/password": "secret",
	}
	read := func(ref string) (string, error) { return secrets[ref], nil }

	got := handle(request{Type: "get-credentials"}, testConfig, read)

	if got != (response{Username: "user01", Password: "secret"}) {
		t.Fatalf("got %+v", got)
	}
}

func TestHandleReportsReadFailure(t *testing.T) {
	read := func(string) (string, error) { return "", errors.New("op: not signed in") }

	got := handle(request{Type: "get-credentials"}, testConfig, read)

	if got != (response{Error: "op: not signed in"}) {
		t.Fatalf("got %+v", got)
	}
}

func TestHandleRejectsUnknownRequest(t *testing.T) {
	read := func(string) (string, error) {
		t.Fatal("must not read secrets for an unknown request")
		return "", nil
	}

	got := handle(request{Type: "get-everything"}, testConfig, read)

	if got.Error == "" {
		t.Fatalf("got %+v", got)
	}
}
