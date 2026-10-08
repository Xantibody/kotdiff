package main

import (
	"encoding/json"
	"path/filepath"
)

const (
	// 拡張側の NATIVE_HOST_NAME (src/infrastructure/chrome/constants.ts) と一致させる
	hostName = "io.github.xantibody.kotdiff"
	// manifest.firefox.json の browser_specific_settings.gecko.id
	firefoxExtensionID = "kotdiff@example.com"
	hostDescription    = "KotDiff 1Password auto login"
)

type manifestTarget struct {
	Path    string
	Content []byte
}

type hostManifest struct {
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Path              string   `json:"path"`
	Type              string   `json:"type"`
	AllowedExtensions []string `json:"allowed_extensions,omitempty"`
	AllowedOrigins    []string `json:"allowed_origins,omitempty"`
}

// Chrome の拡張 ID はストア版と unpacked で異なり、こちらでは決められないため、
// 指定されたときだけ Chrome 用を書く。chromeDirs が空なら Google Chrome の置き場に書き、
// Brave や Edge など Chromium 系で使うときは置き場を指定してもらう
func manifestTargets(goos, home, hostPath, chromeExtensionID string, chromeDirs []string) []manifestTarget {
	firefoxDir := filepath.Join(home, ".mozilla", "native-messaging-hosts")
	if goos == "darwin" {
		firefoxDir = filepath.Join(home, "Library", "Application Support", "Mozilla", "NativeMessagingHosts")
	}

	base := hostManifest{Name: hostName, Description: hostDescription, Path: hostPath, Type: "stdio"}
	firefox := base
	firefox.AllowedExtensions = []string{firefoxExtensionID}
	targets := []manifestTarget{newTarget(firefoxDir, firefox)}

	if chromeExtensionID == "" {
		return targets
	}
	if len(chromeDirs) == 0 {
		chromeDirs = []string{defaultChromeDir(goos, home)}
	}
	chrome := base
	chrome.AllowedOrigins = []string{"chrome-extension://" + chromeExtensionID + "/"}
	for _, dir := range chromeDirs {
		targets = append(targets, newTarget(dir, chrome))
	}
	return targets
}

func defaultChromeDir(goos, home string) string {
	if goos == "darwin" {
		return filepath.Join(home, "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts")
	}
	return filepath.Join(home, ".config", "google-chrome", "NativeMessagingHosts")
}

func newTarget(dir string, m hostManifest) manifestTarget {
	content, _ := json.MarshalIndent(m, "", "  ")
	return manifestTarget{Path: filepath.Join(dir, hostName+".json"), Content: append(content, '\n')}
}
