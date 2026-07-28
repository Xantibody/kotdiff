// 見やすさ改修 (v2) のデザイントークン。
// 赤は「不足」と「所定ライン」だけ、オレンジは「打刻漏れ・要対応」だけに使う。
// KOT 自身の土日色・スケジュール色と衝突させないための制約なので、
// ここ以外で生の色コードを書かない。
export const COLOR = {
  accent: "#00695c",
  accentSoft: "#a8d5cf",
  accentPale: "#e0f0ee",
  accentDark: "#00443b",
  accentTrack: "#e2eae9",

  neutralStrong: "#37474f",
  neutralSoft: "#b8c7ca",

  danger: "#c62828",
  attention: "#e65100",
  attentionStrong: "#c25e00",
  attentionSurface: "#fff8f1",
  attentionBorder: "#ffb74d",

  // KOT 純正の緑（既存要素の色を継承する箇所のみ）
  kotGreen: "#1d9e48",

  // 稼働／休憩の帯（既存 TimelineBar と同色）
  work: "#60a5fa",
  rest: "#fde68a",
  restBar: "#ffd9a8",

  textPrimary: "#1b2a2e",
  textSecondary: "#40565c",
  textTertiary: "#5b6f75",
  textQuaternary: "#7a8f95",
  textMuted: "#93a5aa",
  textFaint: "#b0bfc3",

  divider: "#eef2f2",
  border: "#e6ecec",
  borderStrong: "#d8e2e3",
  cardBorder: "#cfd8d9",

  surface: "#f4f7f7",
  surfaceSoft: "#f7faf9",
  surfaceFaint: "#fbfcfc",
  savingsCell: "#f5faf9",
} as const;

export const KOT_FONT = '"Meiryo UI", "メイリオ", Meiryo, sans-serif';

// 数値はすべて等幅数字で揃える
export const TABULAR = "font-variant-numeric: tabular-nums";
