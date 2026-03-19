import { formatHM, formatDiff } from "../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS, OVERTIME_LIMIT } from "../domain/constants";

export interface Segment {
  text: string;
  bold?: boolean;
  color?: string;
}

export type BannerLine = Segment[];

export interface BannerData {
  remainingDays: number;
  remainingRequired: number;
  avgPerDay: number;
  cumulativeDiff: number;
  currentOvertime: number;
}

export function buildBannerLines(data: BannerData): BannerLine[] {
  const lines: BannerLine[] = [];

  // 必要時間の行
  if (data.remainingRequired <= 0) {
    // 余裕あり — 目標クリア済み、1日あたり平均は不要
    lines.push([
      {
        text: `残り ${data.remainingDays}日 ／ 余剰 ${formatHM(data.remainingRequired)}`,
        bold: true,
      },
      { text: " ✓ 今月の目標クリア済み" },
    ]);
  } else {
    lines.push([
      {
        text: `残り ${data.remainingDays}日 ／ 必要時間 ${formatHM(data.remainingRequired)}`,
        bold: true,
      },
      { text: "（1日あたり平均 " },
      { text: formatHM(data.avgPerDay), bold: true },
      { text: "）" },
    ]);
  }

  // 時間貯金
  lines.push([
    { text: "現在の時間貯金: " },
    { text: formatDiff(data.cumulativeDiff), color: data.cumulativeDiff >= 0 ? "green" : "red" },
  ]);

  // 残業警告（ケース2, 3 は同じ位置に条件分岐で表示）
  if (data.currentOvertime >= OVERTIME_LIMIT) {
    lines.push([
      { text: `⚠ 残業 ${formatHM(data.currentOvertime)} — 45時間超過`, color: "red", bold: true },
    ]);
  } else if (data.currentOvertime > OVERTIME_LIMIT * 0.8 && data.remainingDays > 0) {
    const maxDaily =
      DEFAULT_EXPECTED_HOURS + (OVERTIME_LIMIT - data.currentOvertime) / data.remainingDays;
    lines.push([
      {
        text: `⚠ 残業 ${formatHM(data.currentOvertime)} — 1日 ${formatHM(maxDaily)} 以下で45時間超過を回避可能`,
        color: "orange",
        bold: true,
      },
    ]);
  }

  return lines;
}
