# Handoff: kotdiff v2 UI 見やすさブラッシュアップ

## Overview

KingOfTime の勤怠画面に注入する kotdiff の **新 UI（v2, opt-in）** の「細部の見づらさ」を解消するための改修。
情報の抽象度・画面構成（カード → カレンダー → 操作行 → 表）は**変えない**。変えるのは細部だけ:

- 最小フォントの底上げ（10/11px を廃止）とコントラストの確保
- セルの塗りをやめ、状態は**左 3px のライン**、過不足は**中央基準の差分バー**で見せる
- 週合計列を既定で隠す／申請メニューを日付の ▾ に移す
- 「月末の着地」を 0 起点の 1 本バー＋目盛り＋前提の一文にする（抽象的な帯をやめる）
- 重複していた進捗表現を 1 本に統合し、旧バナーを廃止する

## About the Design Files

このバンドルの `*.dc.html` は **HTML で作った design reference**（意図した見た目と挙動を示すプロトタイプ）であり、そのままプロダクションに貼るコードではない。
実装は **既存の kotdiff コードベースの環境で作り直す**こと:

- KOT ページ注入側 = **素の TypeScript + DOM API**（`document.createElement` / `el()` ヘルパ / インラインスタイル）。React は使っていない。
- ダッシュボード側 = **React + Tailwind**（`src/dashboard/**`）。
- スタイルの単一の出どころは `src/infrastructure/ui/theme.ts`（注入側）と `src/dashboard/lib/tokens.ts`（ダッシュボード側）。**生の色コードを他の場所に書かない**という既存の制約を守る。

## Fidelity

**High-fidelity (hifi)。** 色・サイズ・余白・文言は確定値。実データ（2026/02, `sample/normal`）で描いてある。
ピクセルどおりに再現してよいが、値は必ず `theme.ts` / `tokens.ts` 経由で参照すること。

## Screens / Views

モックは `KOT見やすさ確定案.dc.html`（確定案）と `KOT見やすさ3案.dc.html`（比較検討の履歴）。確定案には 6 面ある。

### ① 基本形 — 退勤後 / 1440px

**Purpose**: 表を隠した既定状態。「今月あと何時間か」と「今月の着地」を読む。

**Layout**: ページ幅 1440px、白背景、`padding:24px`。上から
日付見出し行 → たたんだカード → 開いたカード → カレンダー → 操作行。要素間 `gap:18px`。

**日付見出し行**（KOT 既存＋追加）
- `2026/02/01(日) 〜 2026/02/28(土)` — 26px / 700 / `#333`（曜日カッコ内のみ 15px）
- `‹ 今月 ›` — 枠 `1px solid #ccc` / radius 3 / 13px / `#333` / `padding:5px 11px`
- **追加**: 右端に `KOT の表・月別データは非表示中`（12px / `#5b6f75`）＋ `表示 ▾` ボタン（13px / `#00695c` / 枠 `#cfd8d9` / radius 3 / `padding:7px 16px`）

**たたんだカード（sticky, 40px）**
- 枠 `1px solid #cfd8d9`、左に `3px solid #00695c`、radius 3、背景 `#fff`
- キャレット `▸` 11px `#00695c` を 30px 幅のセルに中央寄せ
- セグメントは 3 つだけ（区切りは `1px solid #eef2f2`、左右 `padding:18px`、`gap:9px`）
  1. `今月あと` 13px `#5b6f75` ＋ `40:01` 17px/800 `#00695c`
  2. `時間貯金` ＋ `-0:01` 15px/800 `#c62828`
  3. `月末` ＋ `所定に届くか半々` 14px/700 `#1b2a2e`
- 右端に進捗ゲージ: track 132×6px radius 3 `#e2eae9` / fill `#00695c` 72% ＋ `72%` 13px `#5b6f75`
- 勤務中は 1〜3 が `あと 3:22 で貯金 ±0` / `退勤目安 19:02` / `実労働 4:38 / 8:00` に変わり、ゲージは本日の達成率（58%）

**開いたカード**
- ヘッダー 44px、背景 `#f7faf9`、下線 `#eef2f2`: `▾` / `本日 07/29（水）` 15px/700 / 状態バッジ（`padding:3px 11px` radius 11 背景 `#e0f0ee` 文字 `#00695c` 12px/700）/ 右に `12:18 時点 ・ 30 秒ごとに更新` 12px `#7a8f95` / `たたむ` 13px `#5b6f75`
- 本体は 2 ゾーン（退勤後）:
  - 左 420px、背景 `#f7faf9`、`padding:32px`: アイブロウ `今月 あと これだけ` 12px/800 `letter-spacing:.1em` `#00695c` → 主役数字 **60px / 900 / `#00695c` / `letter-spacing:-.03em` / tabular-nums** → 補足 15px `#40565c`（2 行目 13px `#5b6f75`）
  - 右 flex:1、`padding:26px 32px`: 4 行の一覧。各行 `padding:11px 0` + 下線 `#eef2f2`、ラベル 14px `#40565c` / 値 17px/800 tabular-nums。従属値は 13px/400 `#7a8f95`（例 `103:59 / 144:00`）。**行全体に `white-space:nowrap`**
- 勤務中は中央に「今日の進行」ゾーンが入り 3 ゾーンになる（下記 ②）
- 最下段 = 見通し行（背景 `#f7faf9`、上線 `#eef2f2`、`padding:20px 32px`、`gap:32px`）:
  - 左 430px: 文 15px `#1b2a2e` line-height 1.7、強調部のみ `#00695c`/700 ＋ 前提 12px `#5b6f75`
  - 右 flex:1: **着地バー**（下記「着地バー」）

**着地バー（この改修の核）**
- キャプション `月に積み上がる勤務時間の合計` 12px `#7a8f95`
- 高さ 58px の相対座標。横軸は **0:00 → 160:00**（`0` 起点。従来の「区間だけ浮いた帯」は廃止）
  - rail: `top:18px` 全幅 16px radius 3 `#f2f5f5`
  - 実績: 0 → 65%（103:59）`#37474f`、radius 3 0 0 3
  - これから増える分: 65% → 86.7% `#a8d5cf`
  - 着地の振れ幅: 86.7% → 93.3%（138:39〜149:18）`repeating-linear-gradient(115deg,#a8d5cf 0 4px,#e2efed 4px 8px)`、radius 0 3 3 0
  - 所定線: `left:90%` 幅 2px `top:12px` 高さ 28px `#c62828`
  - 実績端のラベル `実働済み 103:59` 12px/700 `#37474f` を `top:0` に `translateX(-50%)`
  - 目盛り: 22.5 / 45 / 67.5% に 1×5px `#cfd8d9`、ラベルは `top:41px` に `25% ・ 36:00` / `50% ・ 72:00` / `75% ・ 108:00`（12px `#7a8f95`）、90% に `所定 100% ・ 144:00`（12px/700 `#c62828`）
- 下に結論の一文 12px `#5b6f75`: `斜線＝月末の着地の振れ幅 138:39 〜 149:18（10回のうち8回）。所定ラインがその真ん中にあるので「届くかは半々」。`

**カレンダー**
- 外枠 `1px solid #e6ecec` radius 6 背景 `#fff` `padding:22px 24px 24px`、`gap:18px`
- 見出し行（下線 `#eef2f2`、`padding-bottom:16px`）: `▾ 今月のカレンダー` 14px/700 `#00695c` / `02/01 – 02/28` 13px `#7a8f95` / 右に `バーは 8:00 を中心に ±3:00 で振り切り` 13px `#7a8f95`・`▸ 週合計` チップ（枠 `#dde5e6` radius 14 12px `#5b6f75`）・`累計 -0:01`（13px `#5b6f75` ＋ 値 15px `#c62828`）
- グリッド `repeat(7, 1fr)` / `gap:14px`（**週合計列は既定で無い**）
- 曜日ヘッダー 13px/700、日 `#e05c55` / 土 `#4b74c4` / 他 `#40565c`
- **稼働日セル**: `min-height:112px` `padding:13px 14px 12px` 枠 `1px solid #e6ecec` ＋ 左 `3px solid` 状態色（超過 `#2e7d32` / 不足 `#c62828` / 打刻漏れ `#e65100`）radius 8 背景 `#fff` `gap:11px`
  1. 1 行目: 日付ハンドル（`inline-flex` `gap:5px` `margin:-4px -7px` `padding:4px 7px` radius 5、ホバー時 背景 `#eef3f3`、数字 14px/700 `#1b2a2e`、`▾` 11px `#00695c`）／ 右に差分 **20px / 800 / tabular-nums / `letter-spacing:-.02em`**（超過 `#2e7d32` / 不足 `#c62828`）
  2. 2 行目: 差分バー — 高さ 12px 背景 `#f5f8f8` radius 2、中央 1px `#cfd8d9`、正は `left:50%` から右へ `#66bb6a`、負は中央から左へ `#e57373`（`top/bottom:2px`）。スケールは ±3:00 = 片側 50%
  3. 3 行目: 出退勤 12px `#7a8f95` tabular-nums ／ 実働 13px/700 `#1b2a2e`
- **休日/週末セル**: `padding:13px 14px` radius 8 背景 `#fafbfb`、日付のみ
- **これからの稼働日**: 枠 `1px dashed #dde5e6` 背景 `#fff`、右下に推奨ペース `9:04` 13px `#93a5aa`（唯一意図的に薄い値）
- **打刻漏れ**: 枠 `1px solid #ffb74d` 左 `3px solid #e65100` 背景 `#fff8f1`、差分の位置に `打刻漏れ` 13px/800 `#c25e00`、3 行目 `11:07– 退勤なし` 12px `#c25e00`
- **今日**（勤務中）: 枠 `2px solid #00695c`、日付の右に `今日` バッジ（11px/700 背景 `#00695c` 文字 `#fff` radius 9 `padding:2px 7px`）、差分の位置に `勤務中` 14px/800 `#00695c`、バーは斜線（進行中＝未確定）
- 凡例（上線 `#eef2f2` `padding-top:16px`、12px `#5b6f75`、`gap:26px`）は 3 項目のみ ＋ 右端に `日付の ▾ から申請メニュー ／ ホバーで稼働・休憩の帯`（`#7a8f95`）

**操作行**: 右寄せ `gap:10px`、`表示` / `ダッシュボードを開く`（13px `#00695c` 枠 `#cfd8d9` radius 3 `padding:7px 16px`）

### ② 勤務中 — 「今日の進行」ゾーン

**Purpose**: 出勤後、退勤するまでの状態。「あと何時間で貯金 ±0 か」「退勤目安」が主役。

- 開いたカードが 3 ゾーンになる（左 300px / 中央 flex:1 / 右 330px、区切り 1px `#eef2f2`）
- 中央「今日の進行」（`padding:28px 32px` `gap:14px`）
  - 見出し行: アイブロウ `今日の進行` 12px/800 `#7a8f95` ／ 右に `実労働 4:38 ／ 経過 5:28`（14px `#40565c`、実労働のみ 17px/800 `#1b2a2e`）
  - track: 高さ 24px radius 4 背景 `#eef2f2`。経過 fill `#a8d5cf` 61.9%、休憩区間 `#ffd9a8`（left 26% / width 9.4%）、現在位置 2px `#00695c`
  - 目盛り行 12px `#5b6f75`: 左 `出勤 10:12` / 中央（現在位置）`現在 15:40` 700 `#00695c` / 右 `目安 19:02`
  - 注記 12px `#5b6f75`: `オレンジ＝休憩 12:30–13:20（0:50）／ 休憩中は実労働が進みません`
- 例の値: 出勤 10:12 / 現在 15:40 / 休憩 12:30–13:20 / 実労働 4:38 / 経過 5:28 / あと 3:22 / 退勤目安 19:02 / 達成率 58%

### ③ セルのホバー — 削った情報の置き場

**Purpose**: セルから外した「稼働・休憩の帯」「休憩の内訳」「所定との差」を見る。

- パネル幅 420px、枠 `1px solid #cfd8d9` radius 8 影 `0 8px 24px rgba(27,42,46,.16)`
- ヘッダー（`padding:14px 18px` 背景 `#f7faf9` 下線 `#eef2f2`）: `02/02（月）` 15px/700 ／ スケジュール名 12px `#5b6f75` ／ 右に差分 15px/800
- 「働いた形」: 高さ 18px の帯（5:00〜翌5:00 固定軸）。青 `#60a5fa`＝稼働 / 黄 `#fde68a`＝休憩。下に `5:00 / 12:00 / 18:00 / 翌5:00` 12px `#7a8f95`
- 明細 5 行（各 `padding:9px 0` 上線 `#eef2f2` 13px）: 出勤–退勤 / 休憩（回数＋各区間）/ 休憩合計 / 実働 / 所定 / 深夜 所定
- フッター（背景 `#f7faf9`）: `申請` ＋ `打刻編集` `スケジュール` `時間外勤務` の 3 ボタン（12px `#00695c` 枠 `#cfd8d9`）
- 挙動: 300ms 遅延で開く。キーボードフォーカスでも開く。日付の `▾` を押した場合は**申請メニューだけ**を出す（ドロップダウン、幅 198px、項目 13px `padding:7px 13px`、ホバー `#f4f8f8`）

### ④ KOT の表を出した状態 — 時間貯金列

**Purpose**: `表示 ▾` で KOT の表を戻したとき。

- 列順は実ページのまま。**時間貯金列を日付の直後に挿入**する（`編集申請 / 日付 / 時間貯金 / 締 / 認 / スケジュール / 勤務日種別 / 出勤 / 退勤 / 休憩開始 / 休憩終了 / 所定 / 所定外 / 残業 / 深夜所定 / 深夜所定外 / 深夜残業 / 遅刻 / 早退 / 休憩 / 労働合計 / 備考`＋休日系 6 列）
- `th.時間貯金`: 背景 `#e0f0ee` 文字 `#00443b` 700 `padding:7px 9px` 下線 `2px solid #00695c` 右寄せ `min-width:104px`
- `td.時間貯金`: 背景 `#f5faf9` 右寄せ 2 段組
  - 累積（主）15px/700 line-height 1.15 tabular-nums、超過 `#1d9e48`（KOT 純正の緑）/ 不足 `#c62828`
  - 当日（従）**12px** `#5b6f75` line-height 1.3（旧 10px `#93a5aa` から変更）
- 行の状態は**日付セルの左 3px**のみ（KOT のセル背景・文字色には触れない）
- 打刻漏れの行: 累積は確定しないので `未` 15px/700 `#c25e00` ＋ 2 段目 `打刻漏れ` 12px `#c25e00`、行背景 `#fff8f1`
- 日付列・時間貯金列は横スクロールしても `position:sticky` で残る（`left:0` / `left:var(--kotdiff-date-width)`）

### ⑤ 1280px（ノートPC）

- **文字サイズとセルの高さ（112px）は変えない**。詰めるのは `gap`（14 → 10px）と `padding`（32 → 24px、カード外周 24 → 20px）だけ
- たたんだカードのセグメント `padding` 18 → 14px、ゲージ 132 → 96px
- 1120px を下回ったら着地バーは文章の下に回り込む（見通し行を `flex-direction:column`）
- 1280px でもセル幅は 160px 前後あり `12:39–23:30` と `8:30` は 1 行に収まる。それ以下なら出退勤を `12:39–` だけにしてホバーへ送る

### ⑥ ダッシュボード側（7b）

- 同じ着地バー（0 起点・目盛りつき）を `MonthRequiredCard` に入れる
- `text-[10px]` / `text-[11px]` の本文を 12px に、`textMuted #93a5aa` の本文を `#5b6f75` に
- 「要対応」カードは件数だけでなく日付を書く（`02/20 の退勤打刻がありません`）
- カードは既存のまま radius 10 / 枠 `#e6ecec` / 影なし、フォント `Noto Sans JP`、背景 `#f4f7f7`、最大幅 1180px

## Interactions & Behavior

- **カードの開閉**: たたんだ状態は 30px → **40px**、`position:sticky; top:54px`。開いた状態は `position:static`。トグルは開いた状態ではヘッダー行のみ（本文のテキスト選択で閉じない既存挙動を維持）。`transition:height 120ms ease-out`、`prefers-reduced-motion` で無効
- **カレンダーの開閉**: 見出し行クリック。表を隠している間は常に開く（既存 `applyKotVisibility` の挙動）
- **週合計列**: 既定で閉じる。ヘッダーの `▸ 週合計` で開閉し、状態は `chrome.storage.local` に保存
- **申請メニュー**: 日付ハンドル（`▾`）のクリックで開く。項目を選ぶと KOT 側の対応ボタンを `click()` する（既存 `triggerRowAction`）。当たり判定は 24×24px 以上
- **セルのホバー**: 300ms 遅延で開き、離脱で 150ms 後に閉じる。パネル内にポインタが入っている間は閉じない。フォーカスでも開く
- **表示メニュー**: `表示 ▾` は日付見出しの行と操作行の 2 か所。項目ごとのチェックボックスで、ラベルのクリックでメニューを閉じない（既存挙動）
- **更新**: 30 秒ごとに再計算 → カードを作り直す（既存 `PeriodicUpdateController`）

## State Management

`UiPreferences`（`chrome.storage.local`）に既存 + 1 つ追加:

| キー | 既定 | 用途 |
|---|---|---|
| `bannerOpen` | false | カードの開閉 |
| `calendarOpen` | false | カレンダーの開閉 |
| `showTable` | false | KOT の表 |
| `showMonthlySummary` | false | 月別データ（時間集計） |
| `showToolbar` | false | ツールバー（申請・出力） |
| **`weekTotalOpen`（追加）** | **false** | 週合計列 |

表示モデルは既存のまま: `buildSummaryModel()`（`SummaryModel` / `TodayModel` / `MonthModel` / `OutlookModel`）、`buildMonthCalendar()`、`forecastMonth()`。**計算ロジックの変更は無い**（着地バーの `toPercent` のスケールを 0 起点に変えるだけ）。

## Design Tokens

`src/infrastructure/ui/theme.ts` の `COLOR` を基準にする。この改修で**用途が変わる**もの:

| トークン | 値 | 変更後の用途 |
|---|---|---|
| `accent` | `#00695c` | 主役の数字・アクセント |
| `accentSoft` | `#a8d5cf` | 「これから増える分」 |
| `accentPale` | `#e0f0ee` | 状態バッジ・時間貯金 th |
| `accentDark` | `#00443b` | 時間貯金 th の文字 |
| `accentTrack` | `#e2eae9` | ゲージの track |
| `neutralStrong` | `#37474f` | 実績（実働済み） |
| `danger` | `#c62828` | 不足・所定ライン |
| `attention` / `attentionStrong` | `#e65100` / `#c25e00` | 打刻漏れのみ |
| `attentionSurface` / `attentionBorder` | `#fff8f1` / `#ffb74d` | 打刻漏れの面 |
| `kotGreen` | `#1d9e48` | 表の中の超過（KOT 純正） |
| `textPrimary` | `#1b2a2e` | 値・見出し |
| `textSecondary` | `#40565c` | ラベル |
| `textTertiary` | `#5b6f75` | **本文の最薄（説明文はここまで）** |
| `textQuaternary` | `#7a8f95` | 補助（キャプション・目盛り） |
| `textMuted` | `#93a5aa` | **アイブロウ見出しと「意図的に薄い値」専用。説明文に使わない** |
| `textFaint` | `#b0bfc3` | **廃止**（本文に使わない） |
| `divider` / `border` / `borderStrong` / `cardBorder` | `#eef2f2` / `#e6ecec` / `#d8e2e3` / `#cfd8d9` | 線 |
| `surfaceSoft` / `surfaceFaint` / `savingsCell` | `#f7faf9` / `#fbfcfc` / `#f5faf9` | 面 |
| `work` / `rest` / `restBar` | `#60a5fa` / `#fde68a` / `#ffd9a8` | 稼働・休憩の帯 |

追加で使う色（`theme.ts` に足す）: 差分バーの `#66bb6a`（超過）/ `#e57373`（不足）、バーの下地 `#f5f8f8` / `#f2f5f5`、日付ハンドルのホバー `#eef3f3`、破線枠 `#dde5e6`、超過の文字 `#2e7d32`、曜日色 `#e05c55`（日）/ `#4b74c4`（土）。

**タイポ**: `"Meiryo UI", "メイリオ", Meiryo, sans-serif`（注入側）／ `"Noto Sans JP"`（ダッシュボード）。数値はすべて `font-variant-numeric: tabular-nums`。
**最小 12px**。10px / 11px は使わない。
**フォントサイズ階層**: 主役 60px/900 → 大 20px/800 → 値 17px/800 → 本文 15px → 標準 14px → 副 13px → 最小 12px。

**スペーシング**: 4 / 5 / 7 / 9 / 11 / 12 / 14 / 16 / 18 / 22 / 24 / 26 / 32px。
**radius**: 2（バー）/ 3（ボタン・カード枠）/ 5（ハンドル）/ 6（カレンダー枠）/ 8（セル）/ 10（ダッシュボードのカード）/ 11〜14（バッジ・チップ）。
**影**: 原則なし。例外はホバーパネル `0 8px 24px rgba(27,42,46,.16)` とドロップダウン `0 6px 18px rgba(27,42,46,.16)`。

## Assets

画像・アイコンは**なし**。`▸ ▾ ⋯ ‹ ›` はテキストのまま（既存実装と同じ）。絵文字は使わない（v2 の方針）。
`icons/icon16|48|128.png` は拡張のアイコンで、この改修では触らない。

## Files

### このバンドルに入っている design reference
- `KOT見やすさ確定案.dc.html` — 確定案。① 基本形 ② 勤務中 ③ セルのホバー ④ 表を出した状態 ⑤ 1280px ⑥ ダッシュボード
- `KOT見やすさ3案.dc.html` — 検討の履歴（1a 線と余白 / 1b 面で読む / 1c 長さで読む）。確定案は 1a×1c の混成
- `実装メモ_見やすさブラッシュアップ.md` — 変更点の一覧（C1〜C23）と 14 ステップの実装手順、値の対応表

### 実装で触るファイル（kotdiff リポジトリ）

| ファイル | 変更 |
|---|---|
| `src/infrastructure/ui/theme.ts` | トークンの用途整理・色の追加（手順 1） |
| `src/application/ContentScriptService.ts` | v2 で旧バナーを描かない（手順 2） |
| `src/infrastructure/ui/SummaryCardRenderer.ts` | たたんだ状態 40px / 3 項目、ヘッダー 44px、`renderStatusRow` 削除、開いた状態の 2〜3 ゾーン、着地バーの置き換え（手順 3–5） |
| `src/infrastructure/ui/MonthCalendarRenderer.ts` | セル 112px・塗り撤去・差分バー・日付ハンドル・週合計の開閉・見出し行・凡例 3 項目・ホバーパネル（手順 6–10） |
| `src/infrastructure/ui/DiffColumnRenderer.ts` | 当日行を 12px / `#5b6f75`（手順 11） |
| `src/infrastructure/ui/ActionsRowRenderer.ts` / `DisplayMenuRenderer.ts` | ボタン 13px、非表示項目の要約（手順 12） |
| `src/application/V2PageInjector.ts` | `表示` を日付見出しの行にも追加（手順 12） |
| `src/preferences.ts` | `weekTotalOpen` を追加（手順 8） |
| `src/infrastructure/ui/styles.ts` | `COLLAPSED_CARD_TOP` / sticky / 1280px の詰め（手順 14） |
| `src/dashboard/components/v2/Cards.tsx`, `src/dashboard/lib/tokens.ts` | 同じ規則を通す（手順 13） |

### 確認方法

```sh
pnpm build
pnpm preview                  # sample/normal を新 UI で開く（注入 UI の目視確認）
pnpm preview -- -new-ui=false # 現行 UI と見比べる
pnpm verify                   # fmt:check + lint + test:run
```

ダッシュボードは拡張として読み込む必要があるので `pnpm package:local`。

## 未決（実装前に決めたいこと）

1. **所定ラインが固定 8h**（`DEFAULT_EXPECTED_HOURS`）で、シフトの `FIXED_WORK_MINUTE` ではない。シフト勤務の人には「届く/届かない」の基準がずれる。ホバーパネルでは実働/所定を並べて出しているが、カード側の扱いは未決。
2. **ホバーパネルはタッチ環境で開けない。** 日付の `▾` を押したときに「申請 + 詳細」を両方出すかどうか。
