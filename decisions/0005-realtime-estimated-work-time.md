# 0005: 退勤前の推定労働時間をリアルタイム表示する

## なぜやるか

現在の kotdiff は退勤済み（`ALL_WORK_MINUTE` に値あり）の行のみ差分を計算しており、出勤済み・退勤前の行は「未来の勤務日」として扱われ差分列が空のままだった。ユーザーは業務中に「今退勤したら何時間になるか」「累積差分はどうなるか」をリアルタイムで確認したいというニーズがあった。

## やったこと

### lib 層（純粋関数の追加）

- `parseTimeRecord`: KOT 打刻セルの HH:MM 形式をパース（深夜勤務の 24 時超も許容）
- `parseAllTimeRecords`: REST_START/REST_END セルの複数打刻を一括抽出
- `detectInProgressRow`: 出勤済み・退勤前の行を検出し、打刻データと休憩中フラグを返す
- `calcEstimatedWorkTime`: 推定労働時間を計算（業務中: リアルタイム、休憩中: 凍結）
- `nowAsDecimalHours`: JST での現在時刻を10進数時間で取得

### content.ts（統合・表示）

- main() ループに第3分岐を追加（進行中の日の処理）
- ALL_WORK_MINUTE セルに推定時間 + 状態ラベル（業務中/休憩中）を表示
- 差分列に推定時間を含む累積差分を表示（イタリック）
- バナーに推定時間を反映（初回スナップショットのみ）
- 60秒間隔の自動更新（setInterval）+ DOM除去時のクリーンアップ

### テスト

29 テストケースを追加（合計 81 テスト全パス）

### コミット

- `e84bcec` feat(lib): add time record parsing and estimated work time functions
- `72a94bf` feat(content): integrate estimated work time display with periodic updates

## やらなかったこと / 次にやること

- バナーの定期更新: 現在はページ読み込み時のスナップショットのみ。必要に応じて検討
- 退勤予測時刻の表示: 「あと何分で目標の8時間に達するか」の表示
- 深夜勤務（日付またぎ）の実地テスト: ロジック上は対応しているが手動確認未実施
- ブラウザでの手動確認: KOT 勤怠画面での実際の動作確認は別途必要

## レビュワーへの依頼

- 推定時間の表示スタイル（紫イタリック + 緑/オレンジラベル）が既存UIと調和しているか確認
- 60秒の更新間隔が適切か（短すぎ/長すぎ）の判断

## 資料

- Plan: `plans/realtime-estimated-work-time.md`
