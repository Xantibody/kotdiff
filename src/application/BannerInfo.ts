import { formatHM, formatDiff, isDiffNegative } from "../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS, OVERTIME_LIMIT } from "../domain/constants";
import type { AccumulateResult } from "../domain/aggregates/WorkMonth";

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
  // 勤務中のときの貯金±0 退勤目安 (issue #53)。targetLabel は表示用（例 "19:24"、日跨ぎは "7/3 4:40"）
  clockOutTarget?: { readonly remainingHours: number; readonly targetLabel: string } | null;
}

// 月次集計からバナー表示用の値を組み立てる
export function buildBannerData(
  acc: AccumulateResult,
  statutoryOvertime: number | null,
  clockOutTarget: Exclude<BannerData["clockOutTarget"], undefined>,
): BannerData {
  const remainingRequired = acc.remainingDays * DEFAULT_EXPECTED_HOURS - acc.cumulativeDiff;
  const avgPerDay = acc.remainingDays > 0 ? remainingRequired / acc.remainingDays : 0;
  return {
    remainingDays: acc.remainingDays,
    remainingRequired,
    avgPerDay,
    cumulativeDiff: acc.cumulativeDiff,
    // フレックスでは日次の 実績−所定 は残業ではないため、月次集計の
    // 基準外労働時間があれば残業警告もそちらを使う (issue #44)
    currentOvertime: statutoryOvertime ?? acc.overtimeDiff,
    clockOutTarget,
  };
}

export function buildBannerLines(data: BannerData): BannerLine[] {
  return [buildRequiredTimeLine(data), ...buildStatusLines(data)];
}

// 月末までの残り日数と必要時間の行
function buildRequiredTimeLine(data: BannerData): BannerLine {
  if (data.remainingRequired <= 0) {
    // 余裕あり — 目標クリア済み、1日あたり平均は不要
    return [
      {
        text: `📅 残り ${data.remainingDays}日 ／ 余剰 ${formatHM(data.remainingRequired)}`,
        bold: true,
      },
      { text: " 🎉 今月の目標クリア済み" },
    ];
  }
  if (data.remainingDays === 0) {
    // 月末に未達 — 割る日数がないため「平均 0:00」ではなく不足として表示 (issue #26)
    return [
      {
        text: `📅 残り 0日 ／ 不足 ${formatHM(data.remainingRequired)}`,
        bold: true,
        color: "red",
      },
    ];
  }
  return [
    {
      text: `📅 残り ${data.remainingDays}日 ／ 必要時間 ${formatHM(data.remainingRequired)}`,
      bold: true,
    },
    { text: "（1日あたり平均 " },
    { text: formatHM(data.avgPerDay), bold: true },
    { text: "）" },
  ];
}

// 時間貯金・退勤目安・残業警告の行
export function buildStatusLines(data: BannerData): BannerLine[] {
  const lines: BannerLine[] = [
    // 時間貯金
    [
      { text: "💰 現在の時間貯金: " },
      {
        text: formatDiff(data.cumulativeDiff),
        color: isDiffNegative(data.cumulativeDiff) ? "red" : "green",
      },
    ],
  ];

  // 勤務中は貯金±0 で帰れる目安を出す。以後休憩を取らない前提の概算 (issue #53)
  if (data.clockOutTarget) {
    const { remainingHours, targetLabel } = data.clockOutTarget;
    if (remainingHours > 0) {
      lines.push([
        { text: `🏠 あと ${formatHM(remainingHours)} で貯金±0（` },
        { text: `退勤目安 ${targetLabel}`, bold: true },
        { text: "）" },
      ]);
    } else {
      lines.push([
        { text: "🏠 本日分の目標達成済み（今退勤すると貯金 " },
        { text: formatDiff(-remainingHours), color: "green", bold: true },
        { text: "）" },
      ]);
    }
  }

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
