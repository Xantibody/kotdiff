package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type setupOptions struct {
	item              string
	chromeExtensionID string
	// Chrome 用マニフェストの置き場。空なら Google Chrome の既定の場所
	chromeDirs []string
}

// 繰り返し指定できる文字列フラグ
type multiFlag []string

func (f *multiFlag) String() string     { return strings.Join(*f, ",") }
func (f *multiFlag) Set(v string) error { *f = append(*f, v); return nil }

type setupEnv struct {
	runOp      func(args ...string) ([]byte, error)
	in         io.Reader
	out        io.Writer
	goos       string
	home       string
	hostPath   string
	opPath     string
	configPath string
}

func (e setupEnv) run(opts setupOptions) error {
	item, err := e.resolveItem(opts.item)
	if err != nil {
		return err
	}
	// 名前ではなく ID で参照する: 項目名の変更や同名項目の追加で取り違えないため
	cfg := config{
		Op:       e.opPath,
		Username: fmt.Sprintf("op://%s/%s/username", item.VaultID, item.ID),
		Password: fmt.Sprintf("op://%s/%s/password", item.VaultID, item.ID),
	}
	if err := writeJSONFile(e.configPath, cfg, 0o700, 0o600); err != nil {
		return err
	}
	fmt.Fprintf(e.out, "設定を書きました: %s\n", e.configPath)

	for _, t := range manifestTargets(e.goos, e.home, e.hostPath, opts.chromeExtensionID, opts.chromeDirs) {
		if err := os.MkdirAll(filepath.Dir(t.Path), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(t.Path, t.Content, 0o644); err != nil {
			return err
		}
		fmt.Fprintf(e.out, "マニフェストを書きました: %s\n", t.Path)
	}
	if opts.chromeExtensionID == "" {
		fmt.Fprintln(e.out, "Chrome で使うときは --chrome-extension-id <拡張 ID> を付けて再実行してください")
	}
	return nil
}

func (e setupEnv) resolveItem(itemID string) (candidate, error) {
	if itemID != "" {
		out, err := e.runOp("item", "get", itemID, "--format", "json")
		if err != nil {
			return candidate{}, err
		}
		var it opItem
		if err := json.Unmarshal(out, &it); err != nil {
			return candidate{}, fmt.Errorf("op item get の出力を読めません: %w", err)
		}
		return it.toCandidate(), nil
	}
	out, err := e.runOp("item", "list", "--categories", "Login", "--format", "json")
	if err != nil {
		return candidate{}, err
	}
	cands, err := findCandidates(out)
	if err != nil {
		return candidate{}, err
	}
	return chooseCandidate(cands, e.in, e.out)
}

func writeJSONFile(path string, v any, dirMode, fileMode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), dirMode); err != nil {
		return err
	}
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), fileMode)
}

// kotdiff-native-host setup [--item <ID>] [--chrome-extension-id <ID>] [--chrome-dir <dir>]... [--op <path>]
func runSetup(args []string) error {
	fs := flag.NewFlagSet("setup", flag.ContinueOnError)
	var opts setupOptions
	fs.StringVar(&opts.item, "item", "", "使う 1Password ログイン項目の ID（省略時は kingoftime.jp の項目を探す）")
	fs.StringVar(&opts.chromeExtensionID, "chrome-extension-id", "", "Chrome で使うときの KotDiff の拡張 ID")
	fs.Var((*multiFlag)(&opts.chromeDirs), "chrome-dir", "Chrome 用マニフェストの置き場（Brave や Edge など Chromium 系で使うとき。繰り返し可）")
	opFlag := fs.String("op", "", "op CLI のパス（省略時は PATH から探す）")
	if err := fs.Parse(args); err != nil {
		return err
	}

	opPath, err := resolveOp(*opFlag)
	if err != nil {
		return err
	}
	hostPath, err := os.Executable()
	if err != nil {
		return err
	}
	if hostPath, err = filepath.EvalSymlinks(hostPath); err != nil {
		return err
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	cfgPath, err := configPath()
	if err != nil {
		return err
	}
	env := setupEnv{
		runOp:      opRunner(opPath),
		in:         os.Stdin,
		out:        os.Stdout,
		goos:       runtime.GOOS,
		home:       home,
		hostPath:   hostPath,
		opPath:     opPath,
		configPath: cfgPath,
	}
	return env.run(opts)
}

func resolveOp(flagValue string) (string, error) {
	path := flagValue
	if path == "" {
		found, err := exec.LookPath("op")
		if err != nil {
			return "", errors.New("op CLI が見つかりません。--op <パス> で指定してください")
		}
		path = found
	}
	return filepath.Abs(path)
}

func opRunner(op string) func(args ...string) ([]byte, error) {
	return func(args ...string) ([]byte, error) {
		var stdout, stderr bytes.Buffer
		cmd := exec.Command(op, args...)
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			if msg := strings.TrimSpace(stderr.String()); msg != "" {
				return nil, fmt.Errorf("op %s: %s", args[0], msg)
			}
			return nil, fmt.Errorf("op %s: %w", args[0], err)
		}
		return stdout.Bytes(), nil
	}
}
