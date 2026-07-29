// preview は sample/ の保存済み KOT ページに content script を差し込んで、
// ブラウザで注入 UI を目視できるようにする開発用コマンド。
//
//	pnpm dev                         # sample/normal を開き、以後は編集を監視する
//	pnpm dev -sample 初旬のみ表示      # 別のサンプル
//	pnpm dev -new-ui=false           # 現行 UI と見比べる
//	pnpm preview                     # 監視せず 1 回だけ開く
//
// ページは dist/content.js を参照するので、監視で焼き直せばリロードだけで反映される。
// sample/ は実勤怠データを含むため .gitignore 済み。手元にサンプルが無ければ何もしない。
package main

import (
	"embed"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

//go:embed shim.js
var assets embed.FS

const (
	contentBundle = "dist/content.js"
	shimName      = "kotdiff-preview-shim.js"
)

func main() {
	sample := flag.String("sample", "normal", "sample/ 配下のディレクトリ名")
	newUI := flag.Bool("new-ui", true, "新 UI (newUi) を有効にするか")
	outDir := flag.String("out", ".preview", "生成先ディレクトリ")
	open := flag.Bool("open", true, "生成後にブラウザで開くか")
	watch := flag.Bool("watch", false, "content script の変更を監視して焼き直す")
	// pnpm は `pnpm dev -- -sample x` の "--" もそのまま渡す。Go の flag は "--" で
	// 解析を止めるため、そのままだと以降のフラグが黙って無視される
	os.Args = append(os.Args[:1], dropSeparators(os.Args[1:])...)
	flag.Parse()

	if err := run(*sample, *newUI, *outDir, *open); err != nil {
		fmt.Fprintln(os.Stderr, "preview:", err)
		os.Exit(1)
	}
	if *watch {
		if err := watchContentScript(); err != nil {
			fmt.Fprintln(os.Stderr, "preview:", err)
			os.Exit(1)
		}
	}
}

// 監視は esbuild に任せる。ページはビルド結果を参照しているので、
// 焼き直したらブラウザをリロードするだけで新しい注入 UI になる
func watchContentScript() error {
	fmt.Println("preview: 監視中。編集したらブラウザをリロードする（Ctrl-C で終了）")
	cmd := exec.Command(
		filepath.Join("node_modules", ".bin", "esbuild"),
		"src/content.ts",
		"--bundle",
		"--outfile="+contentBundle,
		"--format=iife",
		"--watch",
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func dropSeparators(args []string) []string {
	kept := make([]string, 0, len(args))
	for _, arg := range args {
		if arg != "--" {
			kept = append(kept, arg)
		}
	}
	return kept
}

func run(sample string, newUI bool, outDir string, open bool) error {
	srcDir := filepath.Join("sample", sample)
	if _, err := os.Stat(srcDir); err != nil {
		return fmt.Errorf("サンプルが見つかりません: %s (利用可能: %s)", srcDir, availableSamples())
	}
	if _, err := os.Stat(contentBundle); err != nil {
		return fmt.Errorf("%s が無い。先に `pnpm run build:content` を実行する", contentBundle)
	}

	htmlName, err := findHTML(srcDir)
	if err != nil {
		return err
	}

	dstDir := filepath.Join(outDir, sample)
	if err := os.RemoveAll(dstDir); err != nil {
		return err
	}
	// 保存ページは CSS や画像を _files/ から相対参照するので、丸ごと複製して同じ配置にする
	if err := copyTree(srcDir, dstDir); err != nil {
		return err
	}

	shim, err := assets.ReadFile("shim.js")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dstDir, shimName), shim, 0o644); err != nil {
		return err
	}

	// バンドルはコピーせず参照する。esbuild --watch で焼き直した内容が
	// ページのリロードだけで反映される
	bundleRef, err := filepath.Rel(dstDir, contentBundle)
	if err != nil {
		return err
	}

	target := filepath.Join(dstDir, htmlName)
	if err := injectScripts(target, newUI, filepath.ToSlash(bundleRef)); err != nil {
		return err
	}

	abs, err := filepath.Abs(target)
	if err != nil {
		return err
	}
	fmt.Printf("preview: %s (newUi=%v)\n", abs, newUI)
	if open {
		return openInBrowser(abs)
	}
	return nil
}

func availableSamples() string {
	entries, err := os.ReadDir("sample")
	if err != nil {
		return "なし"
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			names = append(names, entry.Name())
		}
	}
	if len(names) == 0 {
		return "なし"
	}
	return strings.Join(names, ", ")
}

func findHTML(dir string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".html") {
			return entry.Name(), nil
		}
	}
	return "", fmt.Errorf("%s に html が無い", dir)
}

// 注入は </body> の直前。content script は document_idle 相当で走れば良いので、
// 表がパースされ終わった位置に置けば十分
func injectScripts(path string, newUI bool, bundleRef string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	html := string(raw)

	scripts := fmt.Sprintf(
		"\n<script>window.__KOTDIFF_NEW_UI__ = %v;</script>\n<script src=%q></script>\n<script src=%q></script>\n",
		newUI, shimName, bundleRef,
	)

	index := strings.LastIndex(html, "</body>")
	if index == -1 {
		html += scripts
	} else {
		html = html[:index] + scripts + html[index:]
	}
	return os.WriteFile(path, []byte(html), 0o644)
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if entry.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func openInBrowser(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Run()
}
