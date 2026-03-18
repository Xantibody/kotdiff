import type { LeaveBalance } from "../value-objects/LeaveBalance";
import type { DashboardData } from "../../types";
import type { WorkDay } from "../entities/WorkDay";
import { DEFAULT_EXPECTED_HOURS } from "../constants";

export interface RowInput {
  actual: number | null;
  fixedWork: number | null;
  working: boolean;
  inProgress: { estimatedWorkTime: number; isOnBreak: boolean } | null;
}

export interface AccumulateResult {
  totalWorkDays: number;
  workedDays: number;
  remainingDays: number;
  totalActual: number;
  totalExpected: number;
  cumulativeDiff: number;
  overtimeDiff: number;
  inProgressEstimatedDiff: number | null;
}

export function accumulateRows(rows: RowInput[]): AccumulateResult {
  let totalWorkDays = 0;
  let workedDays = 0;
  let remainingDays = 0;
  let totalActual = 0;
  let totalExpected = 0;
  let cumulativeDiff = 0;
  let overtimeDiff = 0;
  let inProgressEstimatedDiff: number | null = null;

  for (const row of rows) {
    if (!row.working) continue;
    totalWorkDays++;

    if (row.actual !== null) {
      workedDays++;
      totalActual += row.actual;
      totalExpected += DEFAULT_EXPECTED_HOURS;
      cumulativeDiff += row.actual - DEFAULT_EXPECTED_HOURS;
      if (row.fixedWork !== null) {
        overtimeDiff += row.actual - row.fixedWork;
      }
    } else if (row.inProgress) {
      inProgressEstimatedDiff = row.inProgress.estimatedWorkTime - DEFAULT_EXPECTED_HOURS;
      remainingDays++;
    } else {
      remainingDays++;
    }
  }

  return {
    totalWorkDays,
    workedDays,
    remainingDays,
    totalActual,
    totalExpected,
    cumulativeDiff,
    overtimeDiff,
    inProgressEstimatedDiff,
  };
}

export interface DashboardSummary {
  totalWorkDays: number;
  workedDays: number;
  remainingDays: number;
  totalActual: number;
  totalExpected: number;
  cumulativeDiff: number;
  totalOvertime: number;
  totalNightOvertime: number;
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
  nightOvertime: number | null;
}

// WorkMonthSummary is an alias for DashboardSummary - same shape, different provenance
export type WorkMonthSummary = DashboardSummary;

export function buildDashboardSummary(data: DashboardData): DashboardSummary {
  // Use accumulateRows as the single source of truth for all summary totals
  const rowInputs: RowInput[] = data.rows.map((row) => ({
    actual: row.actual,
    fixedWork: row.fixedWork,
    working: row.working,
    inProgress: null,
  }));
  const acc = accumulateRows(rowInputs);

  // Build per-row display data and collect night overtime (dashboard-only)
  let perRowCumulativeDiff = 0;
  let totalNightOvertime = 0;
  const dailyRows: DailyRowSummary[] = [];

  for (const row of data.rows) {
    const expected = row.working ? DEFAULT_EXPECTED_HOURS : 0;

    let diff: number | null = null;
    let cumDiff: number | null = null;

    if (row.actual !== null && row.working) {
      perRowCumulativeDiff += row.actual - expected;
      diff = row.actual - expected;
      cumDiff = perRowCumulativeDiff;
    }

    // 深夜残業は勤務日かどうかに関係なく集計（22:00〜4:59）
    if (row.nightOvertime !== null) {
      totalNightOvertime += row.nightOvertime;
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
      breakStarts: [...row.breakStarts],
      breakEnds: [...row.breakEnds],
      schedule: row.schedule,
      nightOvertime: row.nightOvertime,
    });
  }

  const avgWorkTime = acc.workedDays > 0 ? acc.totalActual / acc.workedDays : 0;
  const projectedTotal = acc.workedDays > 0 ? acc.totalActual + acc.remainingDays * avgWorkTime : 0;
  const progressPercent = acc.totalExpected > 0 ? (acc.totalActual / acc.totalExpected) * 100 : 0;

  return {
    totalWorkDays: acc.totalWorkDays,
    workedDays: acc.workedDays,
    remainingDays: acc.remainingDays,
    totalActual: acc.totalActual,
    totalExpected: acc.totalExpected,
    cumulativeDiff: acc.cumulativeDiff,
    totalOvertime: acc.overtimeDiff,
    totalNightOvertime,
    avgWorkTime,
    projectedTotal,
    progressPercent,
    leaveBalances: [...data.leaveBalances],
    dailyRows,
  };
}

function toTimeStr(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
}

export function buildWorkMonthSummary(
  days: WorkDay[],
  leaveBalances: LeaveBalance[],
): WorkMonthSummary {
  const rowInputs: RowInput[] = days.map((day) => ({
    actual: day.actual,
    fixedWork: day.fixedWork,
    working: day.working,
    inProgress: null,
  }));
  const acc = accumulateRows(rowInputs);

  let perRowCumulativeDiff = 0;
  let totalNightOvertime = 0;
  const dailyRows: DailyRowSummary[] = [];

  for (const day of days) {
    const expected = day.working ? DEFAULT_EXPECTED_HOURS : 0;

    let diff: number | null = null;
    let cumDiff: number | null = null;

    if (day.actual !== null && day.working) {
      perRowCumulativeDiff += day.actual - expected;
      diff = day.actual - expected;
      cumDiff = perRowCumulativeDiff;
    }

    if (day.nightOvertime !== null) {
      totalNightOvertime += day.nightOvertime;
    }

    dailyRows.push({
      date: day.date,
      dayType: day.dayType,
      isWeekend: day.isWeekend,
      actual: day.actual,
      expected,
      diff,
      cumulativeDiff: cumDiff,
      overtime: day.overtime,
      breakTime: day.breakTime,
      startTime: day.startTime !== null ? toTimeStr(day.startTime) : null,
      endTime: day.endTime !== null ? toTimeStr(day.endTime) : null,
      breakStarts: day.breakStarts.map(toTimeStr),
      breakEnds: day.breakEnds.map(toTimeStr),
      schedule: day.schedule,
      nightOvertime: day.nightOvertime,
    });
  }

  const avgWorkTime = acc.workedDays > 0 ? acc.totalActual / acc.workedDays : 0;
  const projectedTotal = acc.workedDays > 0 ? acc.totalActual + acc.remainingDays * avgWorkTime : 0;
  const progressPercent = acc.totalExpected > 0 ? (acc.totalActual / acc.totalExpected) * 100 : 0;

  return {
    totalWorkDays: acc.totalWorkDays,
    workedDays: acc.workedDays,
    remainingDays: acc.remainingDays,
    totalActual: acc.totalActual,
    totalExpected: acc.totalExpected,
    cumulativeDiff: acc.cumulativeDiff,
    totalOvertime: acc.overtimeDiff,
    totalNightOvertime,
    avgWorkTime,
    projectedTotal,
    progressPercent,
    leaveBalances,
    dailyRows,
  };
}
