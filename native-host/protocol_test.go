package main

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func frame(payload string) []byte {
	var buf bytes.Buffer
	_ = binary.Write(&buf, binary.LittleEndian, uint32(len(payload)))
	buf.WriteString(payload)
	return buf.Bytes()
}

func TestReadMessageDecodesLengthPrefixedJSON(t *testing.T) {
	var req request
	if err := readMessage(bytes.NewReader(frame(`{"type":"get-credentials"}`)), &req); err != nil {
		t.Fatal(err)
	}
	if req.Type != "get-credentials" {
		t.Fatalf("type = %q", req.Type)
	}
}

func TestWriteMessageEncodesLengthPrefixedJSON(t *testing.T) {
	var buf bytes.Buffer
	if err := writeMessage(&buf, response{Error: "x"}); err != nil {
		t.Fatal(err)
	}
	if got, want := buf.Bytes(), frame(`{"error":"x"}`); !bytes.Equal(got, want) {
		t.Fatalf("got %q, want %q", got, want)
	}
}
