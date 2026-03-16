import type { DashboardData, LeaveBalance } from "./types";
import { DEFAULT_EXPECTED_HOURS } from "./worktime";

export interface DashboardSummary {
  totalWorkDays: number;
  workedDays: number;
  remainingDays: number;
  totalActual: number;
  totalExpected: number;
  cumulativeDiff: number;
  totalOvertime: number;
  avgWorkTime: number;
  projectedTotal: number;
  progressPercent: number;
  leaveBalances: LeaveBalance[];
  dailyRows: DailyRowSummary[];
}

export interface DailyRowSummary {
  date: string;
  dayType: string;
  isWeekend: boolean;
  actual: number | null;
  expected: number;
  diff: number | null;
  cumulativeDiff: number | null;
  overtime: number | null;
  breakTime: number | null;
  startTime: string | null;
  endTime: string | null;
  breakStarts: string[];
  breakEnds: string[];
  schedule: string | null;
}

export function buildDashboardSummary(data: DashboardData): DashboardSummary {
  let totalWorkDays = 0;
  let workedDays = 0;
  let totalActual = 0;
  let totalExpected = 0;
  let cumulativeDiff = 0;
  let totalOvertime = 0;
  const dailyRows: DailyRowSummary[] = [];

  for (const row of data.rows) {
    const isWorkDay = !row.isWeekend && row.dayType !== "";
    const expected = isWorkDay ? DEFAULT_EXPECTED_HOURS : 0;

    if (isWorkDay) {
      totalWorkDays++;
    }

    let diff: number | null = null;
    let cumDiff: number | null = null;

    if (row.actual !== null && isWorkDay) {
      workedDays++;
      totalActual += row.actual;
      totalExpected += expected;
      cumulativeDiff += row.actual - expected;
      diff = row.actual - expected;
      cumDiff = cumulativeDiff;

      if (row.overtime !== null) {
        totalOvertime += row.overtime;
      }
    } else if (isWorkDay) {
      // Future work day or no data
    }

    dailyRows.push({
      date: row.date,
      dayType: row.dayType,
      isWeekend: row.isWeekend,
      actual: row.actual,
      expected,
      diff,
      cumulativeDiff: cumDiff,
      overtime: row.overtime,
      breakTime: row.breakTime,
      startTime: row.startTime,
      endTime: row.endTime,
      breakStarts: row.breakStarts,
      breakEnds: row.breakEnds,
      schedule: row.schedule,
    });
  }

  const remainingDays = totalWorkDays - workedDays;
  const avgWorkTime = workedDays > 0 ? totalActual / workedDays : 0;
  const projectedTotal = workedDays > 0 ? totalActual + remainingDays * avgWorkTime : 0;
  const progressPercent = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

  return {
    totalWorkDays,
    workedDays,
    remainingDays,
    totalActual,
    totalExpected,
    cumulativeDiff,
    totalOvertime,
    avgWorkTime,
    projectedTotal,
    progressPercent,
    leaveBalances: data.leaveBalances,
    dailyRows,
  };
}
