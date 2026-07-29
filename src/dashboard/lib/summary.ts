import type { DashboardSummary, DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { buildSummaryModel } from "../../application/SummaryModel";
import type { SummaryModel, TodayInput } from "../../application/SummaryModel";
import {
  calcClockOutTarget,
  calcEstimatedWorkTime,
} from "../../domain/value-objects/InProgressWork";
import { asDecimalHours, parseTimeRecord } from "../../domain/value-objects/TimeRecord";
import { formatClockOutTime } from "../../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS } from "../../domain/constants";

// KOT の日付表記 "02/20（金）" から月日を取り出す
export function parseMonthDay(date: string): { month: number; day: number } | null {
  const match = /(\d{1,2})\/(\d{1,2})/.exec(date);
  if (!match) {
    return null;
  }
  return { month: Number(match[1]), day: Number(match[2]) };
}

export function isSameJstDay(date: string, now: Date): boolean {
  const parsed = parseMonthDay(date);
  if (!parsed) {
    return false;
  }
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return parsed.month === jst.getUTCMonth() + 1 && parsed.day === jst.getUTCDate();
}

function nowAsJstDecimalHours(now: Date): number {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCHours() + jst.getUTCMinutes() / 60 + jst.getUTCSeconds() / 3600;
}

// ダッシュボードは保存済みデータしか持たないため、勤務中の状態は
// 「出勤打刻はあるが退勤打刻がない今日の行」から組み立て直す
export function buildTodayInput(
  rows: readonly DailyRowSummary[],
  now: Date,
  cumulativeDiffBeforeToday: number,
): TodayInput | null {
  const row = rows.find((r) => isSameJstDay(r.date, now));
  if (!row || row.actual !== null) {
    return null;
  }
  const start = parseTimeRecord(row.startTime ?? "");
  if (start === null) {
    return null;
  }
  if (row.endTime !== null && row.endTime !== "") {
    return null;
  }

  const restStarts = row.breakStarts
    .map((t) => parseTimeRecord(t))
    .filter((t): t is number => t !== null)
    .map((t) => asDecimalHours(t));
  const restEnds = row.breakEnds
    .map((t) => parseTimeRecord(t))
    .filter((t): t is number => t !== null)
    .map((t) => asDecimalHours(t));

  const nowHours = asDecimalHours(nowAsJstDecimalHours(now));
  const estimated = calcEstimatedWorkTime(
    {
      startTime: asDecimalHours(start),
      restStarts,
      restEnds,
      isOnBreak: restStarts.length > restEnds.length,
    },
    nowHours,
  );
  const target = calcClockOutTarget(
    cumulativeDiffBeforeToday,
    estimated.workTime,
    nowHours,
    DEFAULT_EXPECTED_HOURS,
  );

  return {
    status: estimated.status,
    startTime: estimated.startTime,
    now: estimated.nowNormalized,
    netWorkTime: estimated.workTime,
    breaks: estimated.breaks,
    remainingHours: target.remainingHours,
    targetLabel: formatClockOutTime(target.targetTime, now),
    targetTime: estimated.nowNormalized + target.remainingHours,
  };
}

// 打刻漏れ: 出勤だけ打って退勤が無いまま日付が過ぎた行
export function collectAlerts(rows: readonly DailyRowSummary[], now: Date): string[] {
  const alerts: string[] = [];
  for (const row of rows) {
    const hasStart = row.startTime !== null && row.startTime !== "";
    const hasEnd = row.endTime !== null && row.endTime !== "";
    if (row.actual === null && hasStart && !hasEnd && !isSameJstDay(row.date, now)) {
      alerts.push(`${row.date} の退勤打刻なし`);
    }
  }
  return alerts;
}

export function buildDashboardSummaryModel(summary: DashboardSummary, now: Date): SummaryModel {
  const actuals = summary.dailyRows.filter((row) => row.actual !== null).map((row) => row.actual);

  const todayInput = buildTodayInput(summary.dailyRows, now, summary.cumulativeDiff);
  const todayRow = summary.dailyRows.find((row) => isSameJstDay(row.date, now));

  return buildSummaryModel({
    totalWorkDays: summary.totalWorkDays,
    workedDays: summary.workedDays,
    remainingDays: summary.remainingDays,
    totalActual: summary.totalActual,
    cumulativeDiff: summary.cumulativeDiff,
    overtime: summary.totalOvertime,
    actuals,
    today: todayInput,
    dateLabel: todayRow?.date ?? "",
    nowLabel: formatTimeLabel(nowAsJstDecimalHours(now)),
    alerts: collectAlerts(summary.dailyRows, now),
  });
}

function formatTimeLabel(hours: number): string {
  const total = Math.floor(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
