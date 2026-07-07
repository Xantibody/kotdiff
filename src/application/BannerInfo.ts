import {
  formatHM,
  formatDiff,
  formatTimeOfDay,
  isDiffNegative,
} from "../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS, OVERTIME_LIMIT } from "../domain/constants";
import type { ClockOutTarget } from "../domain/value-objects/InProgressWork";
import type { ErrorWorkCause } from "../infrastructure/kot/KotDomHelpers";

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
  // エラー勤務（打刻忘れ等）で差分計算から除外された日と推測原因 (issue #45, #52)
  errorWork?: readonly ErrorWorkItem[];
  // 勤務中のときの貯金±0 退勤目安 (issue #53)
  clockOutTarget?: ClockOutTarget | null;
}

export interface ErrorWorkItem {
  readonly date: string;
  readonly cause: ErrorWorkCause;
}

const ERROR_CAUSE_LABELS: Record<ErrorWorkCause, string | null> = {
  "missing-clock-out": "退勤打刻の漏れ?",
  "missing-clock-in": "出勤打刻の漏れ?",
  "missing-break-end": "休憩終了打刻の漏れ?",
  unknown: null,
};

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
  } else if (data.remainingDays === 0) {
    // 月末に未達 — 割る日数がないため「平均 0:00」ではなく不足として表示 (issue #26)
    lines.push([
      {
        text: `残り 0日 ／ 不足 ${formatHM(data.remainingRequired)}`,
        bold: true,
        color: "red",
      },
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
    {
      text: formatDiff(data.cumulativeDiff),
      color: isDiffNegative(data.cumulativeDiff) ? "red" : "green",
    },
  ]);

  // 勤務中は貯金±0 で帰れる目安を出す。以後休憩を取らない前提の概算 (issue #53)
  if (data.clockOutTarget) {
    const { remainingHours, targetTime } = data.clockOutTarget;
    if (remainingHours > 0) {
      lines.push([
        { text: `🏠 あと ${formatHM(remainingHours)} で貯金±0（` },
        { text: `退勤目安 ${formatTimeOfDay(targetTime)}`, bold: true },
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

  // エラー勤務は KOT が労働時間を計上しないため時間貯金に含まれない。
  // 修正されるまで差分がずれることを、推測できた原因と合わせて知らせる (issue #45, #52)
  const errorWork = data.errorWork ?? [];
  if (errorWork.length > 0) {
    const causeNotes = errorWork
      .map((e) => {
        const label = ERROR_CAUSE_LABELS[e.cause];
        return label === null ? null : `${e.date}: ${label}`;
      })
      .filter((note): note is string => note !== null);
    const suffix = causeNotes.length > 0 ? `（${causeNotes.join("、")}）` : "";
    lines.push([
      {
        text: `⚠ エラー勤務 ${errorWork.length}日は修正されるまで時間貯金に反映されません${suffix}`,
        color: "orange",
        bold: true,
      },
    ]);
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
