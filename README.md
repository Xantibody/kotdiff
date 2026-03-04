# KotDiff

KingOfTime の勤怠画面に実績と期待時間の差分列を追加する Chrome / Firefox 拡張。

## インストール

### Chrome

1. [Releases](https://github.com/Xantibody/kotdiff/releases) から最新の `kotdiff-vX.X.X.zip` をダウンロード
2. zip を展開する
3. `chrome://extensions` を開く
4. 右上の「デベロッパー モード」を有効にする
5. 「パッケージ化されていない拡張機能を読み込む」をクリックし、展開したフォルダを選択

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
