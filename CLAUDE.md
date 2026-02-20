# kotdiff

KingOfTime の勤怠画面に差分列を追加する Chrome/Firefox 拡張。

## Versioning

[Semantic Versioning 2.0.0](https://semver.org/) に準拠する。

ブラウザ拡張にはライブラリのような公開 API がないため、以下の基準で判断する:

| 種別 | 条件 | 例 |
|------|------|----|
| **MAJOR** | ユーザーに影響する破壊的変更 | 対応サイト URL の変更、manifest_version の変更、最低ブラウザバージョンの引き上げ |
| **MINOR** | 後方互換な新機能の追加 | 新しい表示列の追加、設定画面の追加、新ブラウザ対応 |
| **PATCH** | 後方互換なバグ修正 | 計算ロジックの修正、表示崩れの修正、パフォーマンス改善 |

### リリース手順

1. `package.json` と `manifest.json` の `version` を更新する
2. コミット: `release: v{version}`
3. タグ: `git tag v{version}`
4. `git push && git push --tags`
5. GitHub Actions がビルド + リリースを自動作成

### 制約

- `package.json` と `manifest.json` のバージョンは常に一致させる
- Chrome manifest v3 はハイフン付きプレリリース（`1.0.0-beta.1`）を許容しないため、プレリリースは使用しない
