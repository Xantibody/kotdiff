package main

import (
	"encoding/json"
	"testing"
)

func TestManifestTargetsOnMacWithChromeExtension(t *testing.T) {
	got := manifestTargets("darwin", "/Users/me", "/opt/kotdiff-native-host", "abcdefghijklmnop", nil)

	if len(got) != 2 {
		t.Fatalf("got %d targets", len(got))
	}
	firefox, chrome := got[0], got[1]
	if firefox.Path != "/Users/me/Library/Application Support/Mozilla/NativeMessagingHosts/io.github.xantibody.kotdiff.json" {
		t.Fatalf("firefox path = %q", firefox.Path)
	}
	if chrome.Path != "/Users/me/Library/Application Support/Google/Chrome/NativeMessagingHosts/io.github.xantibody.kotdiff.json" {
		t.Fatalf("chrome path = %q", chrome.Path)
	}

	var ff, cr map[string]any
	_ = json.Unmarshal(firefox.Content, &ff)
	_ = json.Unmarshal(chrome.Content, &cr)
	if ff["path"] != "/opt/kotdiff-native-host" || ff["type"] != "stdio" {
		t.Fatalf("firefox manifest = %v", ff)
	}
	if exts, _ := ff["allowed_extensions"].([]any); len(exts) != 1 || exts[0] != "kotdiff@example.com" {
		t.Fatalf("firefox allowed_extensions = %v", ff["allowed_extensions"])
	}
	if origins, _ := cr["allowed_origins"].([]any); len(origins) != 1 || origins[0] != "chrome-extension://abcdefghijklmnop/" {
		t.Fatalf("chrome allowed_origins = %v", cr["allowed_origins"])
	}
}

func TestManifestTargetsOnLinuxWithoutChromeExtensionSkipsChrome(t *testing.T) {
	got := manifestTargets("linux", "/home/me", "/opt/kotdiff-native-host", "", nil)

	if len(got) != 1 || got[0].Path != "/home/me/.mozilla/native-messaging-hosts/io.github.xantibody.kotdiff.json" {
		t.Fatalf("got %+v", got)
	}
}

func TestManifestTargetsWritesChromeManifestToEveryGivenDir(t *testing.T) {
	brave := "/Users/me/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
	chromium := "/Users/me/Library/Application Support/Chromium/NativeMessagingHosts"
	got := manifestTargets("darwin", "/Users/me", "/opt/kotdiff-native-host", "abcdefghijklmnop", []string{brave, chromium})

	if len(got) != 3 {
		t.Fatalf("got %d targets", len(got))
	}
	if got[1].Path != brave+"/io.github.xantibody.kotdiff.json" || got[2].Path != chromium+"/io.github.xantibody.kotdiff.json" {
		t.Fatalf("paths = %q, %q", got[1].Path, got[2].Path)
	}
	for _, target := range got[1:] {
		var m map[string]any
		_ = json.Unmarshal(target.Content, &m)
		if origins, _ := m["allowed_origins"].([]any); len(origins) != 1 || origins[0] != "chrome-extension://abcdefghijklmnop/" {
			t.Fatalf("%s allowed_origins = %v", target.Path, m["allowed_origins"])
		}
	}
}

func TestManifestTargetsIgnoresChromeDirsWithoutExtensionID(t *testing.T) {
	got := manifestTargets("linux", "/home/me", "/opt/kotdiff-native-host", "", []string{"/home/me/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"})

	if len(got) != 1 {
		t.Fatalf("got %+v", got)
	}
}
