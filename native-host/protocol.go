package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
)

// Native messaging のメッセージは「4 バイトのネイティブエンディアン長 + UTF-8 JSON」。
// 対応する macOS / Linux はいずれもリトルエンディアン
type request struct {
	Type string `json:"type"`
}

type response struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Error    string `json:"error,omitempty"`
}

// プロトコル上の上限は 4 GB だが、要求は小さな JSON だけなので、
// 壊れた長さで巨大な確保をしないよう 1 MB で打ち切る
const maxRequestSize = 1 << 20

func readMessage(r io.Reader, v any) error {
	var size uint32
	if err := binary.Read(r, binary.LittleEndian, &size); err != nil {
		return err
	}
	if size > maxRequestSize {
		return fmt.Errorf("message too large: %d bytes", size)
	}
	buf := make([]byte, size)
	if _, err := io.ReadFull(r, buf); err != nil {
		return err
	}
	return json.Unmarshal(buf, v)
}

func writeMessage(w io.Writer, v any) error {
	payload, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if err := binary.Write(w, binary.LittleEndian, uint32(len(payload))); err != nil {
		return err
	}
	_, err = w.Write(payload)
	return err
}
