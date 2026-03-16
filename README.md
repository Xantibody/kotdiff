# KotDiff

KingOfTime の勤怠画面に実績と期待時間の差分列を追加する Chrome / Firefox 拡張。

## インストール

### Chrome

[Chrome Web Store](https://chromewebstore.google.com/detail/klgonjimflndppfmdiegiigdpelhcodo) からインストール

### Firefox

[Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/kotdiff/) からインストール

### Nix (home-manager)

`flake.nix` の inputs に追加し、home-manager の Firefox 拡張として設定する。

```nix
# flake.nix
inputs.kotdiff.url = "github:Xantibody/kotdiff";
```

```nix
# home-manager configuration
programs.firefox.profiles.<profile>.extensions.packages = [
  inputs.kotdiff.packages.${system}.default
];
```
