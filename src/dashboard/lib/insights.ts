import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { extractWeekday } from "./chart-calculations";
import { isBreakSufficient } from "../../domain/services/BreakSufficiencyService";

export const WEEKDAY_LABELS = ["月", "火", "水", "木", "金"] as const;

export interface WeekdayAverage {
  readonly label: string;
  readonly average: number;
  readonly count: number;
}

export function weekdayAverages(rows: readonly DailyRowSummary[]): readonly WeekdayAverage[] {
  const buckets = new Map<string, number[]>(WEEKDAY_LABELS.map((label) => [label, []]));
  for (const row of rows) {
    if (row.actual === null || row.isWeekend) {
      continue;
    }
    const weekday = extractWeekday(row.date);
    if (weekday === null) {
      continue;
    }
    buckets.get(weekday)?.push(row.actual);
  }
  return WEEKDAY_LABELS.map((label) => {
    const values = buckets.get(label) ?? [];
    const total = values.reduce((a, b) => a + b, 0);
    return {
      label,
      average: values.length > 0 ? total / values.length : 0,
      count: values.length,
    };
  });
}

// 時間貯金の推移。スパークライン用に勤務済み日だけを並べる
export function savingsSeries(rows: readonly DailyRowSummary[]): readonly number[] {
  return rows.filter((row) => row.cumulativeDiff !== null).map((row) => row.cumulativeDiff);
}

export function dailyActuals(rows: readonly DailyRowSummary[]): readonly number[] {
  return rows.filter((row) => row.actual !== null).map((row) => row.actual);
}

// 労働基準法第 34 条を満たしていない日。要対応カードに出す
export function insufficientBreakDays(rows: readonly DailyRowSummary[]): readonly string[] {
  const days: string[] = [];
  for (const row of rows) {
    if (row.actual === null) {
      continue;
    }
    if (!isBreakSufficient(row.actual, row.breakTime ?? 0)) {
      days.push(row.date);
    }
  }
  return days;
}
