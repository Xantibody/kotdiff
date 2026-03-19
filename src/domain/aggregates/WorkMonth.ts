import type { LeaveBalance } from "../value-objects/LeaveBalance";
import type { DecimalHours } from "../value-objects/TimeRecord";
import type { DashboardData } from "../../types";
import type { WorkDay } from "../entities/WorkDay";
import type { KotDayType } from "../../types";
import { DEFAULT_EXPECTED_HOURS, PUBLIC_HOLIDAY_KEYWORD } from "../constants";

export interface RowInput {
  readonly actual: number | null;
  readonly fixedWork: number | null;
  readonly working: boolean;
  readonly inProgress: {
    readonly estimatedWorkTime: DecimalHours;
    readonly status: "working" | "onBreak";
  } | null;
}

export interface AccumulateResult {
  readonly totalWorkDays: number;
  readonly workedDays: number;
  readonly remainingDays: number;
  readonly totalActual: number;
  readonly totalExpected: number;
  readonly cumulativeDiff: number;
  readonly overtimeDiff: number;
  readonly inProgressEstimatedDiff: number | null;
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
      // overtimeDiff = excess above the scheduled shift (fixedWork); falls back to 8h standard
      const overtimeThreshold = row.fixedWork ?? DEFAULT_EXPECTED_HOURS;
      overtimeDiff += Math.max(0, row.actual - overtimeThreshold);
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
  readonly totalWorkDays: number;
  readonly workedDays: number;
  readonly remainingDays: number;
  readonly totalActual: number;
  readonly totalExpected: number;
  readonly cumulativeDiff: number;
  readonly totalOvertime: number;
  readonly totalNightOvertime: number;
  readonly avgWorkTime: number;
  readonly projectedTotal: number;
  readonly progressPercent: number;
  readonly leaveBalances: readonly LeaveBalance[];
  readonly dailyRows: readonly DailyRowSummary[];
}

export interface DailyRowBase {
  readonly date: string;
  readonly dayType: KotDayType;
  readonly isWeekend: boolean;
  readonly expected: number;
  readonly isPublicHoliday: boolean;
  readonly breakStarts: readonly string[];
  readonly breakEnds: readonly string[];
  readonly schedule: string | null;
}

export interface WorkedDailyRow extends DailyRowBase {
  readonly type: "worked";
  readonly actual: number;
  readonly diff: number;
  readonly cumulativeDiff: number;
  readonly overtime: number | null;
  readonly breakTime: number | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly nightOvertime: number | null;
}

export interface UnworkedDailyRow extends DailyRowBase {
  readonly type: "unworked";
  readonly actual: null;
  readonly diff: null;
  readonly cumulativeDiff: null;
  readonly overtime: null;
  readonly breakTime: null;
  readonly startTime: null;
  readonly endTime: null;
  readonly nightOvertime: null;
}

export type DailyRowSummary = WorkedDailyRow | UnworkedDailyRow;

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

    const isPublicHoliday = row.schedule?.includes(PUBLIC_HOLIDAY_KEYWORD) ?? false;
    if (row.actual !== null && diff !== null && cumDiff !== null) {
      dailyRows.push({
        type: "worked",
        date: row.date,
        dayType: row.dayType,
        isWeekend: row.isWeekend,
        actual: row.actual,
        expected,
        isPublicHoliday,
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
    } else {
      dailyRows.push({
        type: "unworked",
        date: row.date,
        dayType: row.dayType,
        isWeekend: row.isWeekend,
        actual: null,
        expected,
        isPublicHoliday,
        diff: null,
        cumulativeDiff: null,
        overtime: null,
        breakTime: null,
        startTime: null,
        endTime: null,
        breakStarts: [...row.breakStarts],
        breakEnds: [...row.breakEnds],
        schedule: row.schedule,
        nightOvertime: null,
      });
    }
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
  if (mins === 60) {
    return `${hrs + 1}:00`;
  }
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
}

export function buildWorkMonthSummary(
  days: WorkDay[],
  leaveBalances: LeaveBalance[],
): DashboardSummary {
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

    const isPublicHoliday = day.schedule?.includes("公休") ?? false;
    if (day.actual !== null && diff !== null && cumDiff !== null) {
      dailyRows.push({
        type: "worked",
        date: day.date,
        dayType: day.dayType,
        isWeekend: day.isWeekend,
        actual: day.actual,
        expected,
        isPublicHoliday,
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
    } else {
      dailyRows.push({
        type: "unworked",
        date: day.date,
        dayType: day.dayType,
        isWeekend: day.isWeekend,
        actual: null,
        expected,
        isPublicHoliday,
        diff: null,
        cumulativeDiff: null,
        overtime: null,
        breakTime: null,
        startTime: null,
        endTime: null,
        breakStarts: day.breakStarts.map(toTimeStr),
        breakEnds: day.breakEnds.map(toTimeStr),
        schedule: day.schedule,
        nightOvertime: null,
      });
    }
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
