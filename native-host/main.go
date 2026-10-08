// kotdiff-native-host は KotDiff の 1Password 自動ログイン（おまけ機能）用の
// ネイティブメッセージングホスト。設定ファイルに書かれた op:// 参照を op read で読み、
// KOT の ID とパスワードを拡張に返す。
package main

import (
	"fmt"
	"io"
	"os"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "setup" {
		if err := runSetup(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	// それ以外はブラウザからの起動（Chrome は拡張の origin、Firefox はマニフェストのパスが引数に来る）
	if err := serve(os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// 1 回の sendNativeMessage につきホストが 1 回起動され、1 往復で終わる
func serve(r io.Reader, w io.Writer) error {
	var req request
	if err := readMessage(r, &req); err != nil {
		return err
	}
	return writeMessage(w, respond(req))
}

func respond(req request) response {
	path, err := configPath()
	if err != nil {
		return response{Error: err.Error()}
	}
	cfg, err := loadConfig(path)
	if err != nil {
		return response{Error: err.Error()}
	}
	return handle(req, cfg, opReader(cfg.Op))
}

func opReader(op string) func(ref string) (string, error) {
	run := opRunner(op)
	return func(ref string) (string, error) {
		out, err := run("read", "--no-newline", ref)
		return string(out), err
	}
}
