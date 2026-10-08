package main

import "fmt"

// 読む op:// 参照はこの設定ファイルにだけ持つ。拡張からは参照を受け取らないので、
// 拡張が乗っ取られても設定済みの項目以外の秘密は読み出せない
type config struct {
	// ブラウザが起動するホストは PATH が最小限のため、setup 時に解決した op の絶対パスを持つ
	Op       string `json:"op"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func handle(req request, cfg config, read func(ref string) (string, error)) response {
	if req.Type != "get-credentials" {
		return response{Error: fmt.Sprintf("unknown request type: %q", req.Type)}
	}
	username, err := read(cfg.Username)
	if err != nil {
		return response{Error: err.Error()}
	}
	password, err := read(cfg.Password)
	if err != nil {
		return response{Error: err.Error()}
	}
	return response{Username: username, Password: password}
}
