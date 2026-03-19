import { describe, expect, test } from "vitest";

import { defined } from "../../test-utils";
import {
  type RowInput,
  accumulateRows,
  buildDashboardSummary,
  buildWorkMonthSummary,
  type DashboardSummary,
} from "./WorkMonth";
import type { DashboardData, DashboardRow } from "../../types";
import type { WorkDay } from "../entities/WorkDay";
import { asDecimalHours } from "../value-objects/TimeRecord";

function dh(n: number) {
  return asDecimalHours(n);
}

function makeDashboardRow(overrides: Partial<DashboardRow> = {}): DashboardRow {
  return {
    date: "01/01（月）",
    dayType: "平日",
    isWeekend: false,
    actual: null,
    fixedWork: null,
    overtime: null,
    breakTime: null,
    startTime: null,
    endTime: null,
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    working: true,
    nightOvertime: null,
    ...overrides,
  };
}

function makeData(
  rows: DashboardRow[],
  leaveBalances: DashboardData["leaveBalances"] = [],
): DashboardData {
  return { rows, leaveBalances, generatedAt: "2026-03-16T00:00:00Z" };
}

describe("accumulateRows", () => {
  test("all-rest days (working: false) are not counted", () => {
    const rows: RowInput[] = [
      { actual: null, fixedWork: null, working: false, inProgress: null },
      { actual: null, fixedWork: null, working: false, inProgress: null },
    ];
    const result = accumulateRows(rows);
    expect(result.totalWorkDays).toBe(0);
    expect(result.workedDays).toBe(0);
    expect(result.remainingDays).toBe(0);
    expect(result.cumulativeDiff).toBe(0);
    expect(result.totalActual).toBe(0);
    expect(result.totalExpected).toBe(0);
  });

  test("mix of worked and unworked days", () => {
    const rows: RowInput[] = [
      { actual: 9, fixedWork: 8, working: true, inProgress: null },
      { actual: 7.5, fixedWork: 8, working: true, inProgress: null },
      { actual: null, fixedWork: null, working: false, inProgress: null },
    ];
    const result = accumulateRows(rows);
    expect(result.totalWorkDays).toBe(2);
    expect(result.workedDays).toBe(2);
    expect(result.remainingDays).toBe(0);
    expect(result.cumulativeDiff).toBeCloseTo(0.5);
    // day1: fixedWork=8, max(0, 9-8) = 1; day2: fixedWork=8, max(0, 7.5-8) = 0, total = 1
    expect(result.overtimeDiff).toBeCloseTo(1);
    expect(result.totalActual).toBeCloseTo(16.5);
    expect(result.totalExpected).toBeCloseTo(16);
  });

  test("flex-time: fixedWork = actual = 9h yields overtimeDiff of 0 (no overtime beyond scheduled)", () => {
    const rows: RowInput[] = [{ actual: 9, fixedWork: 9, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    // actual == fixedWork → no overtime above scheduled hours
    expect(result.overtimeDiff).toBeCloseTo(0);
  });

  test("overtimeDiff uses fixedWork threshold when provided", () => {
    const rows: RowInput[] = [
      { actual: 15, fixedWork: 12, working: true, inProgress: null }, // 3h overtime
      { actual: 11, fixedWork: 11, working: true, inProgress: null }, // 0h overtime
    ];
    const result = accumulateRows(rows);
    expect(result.overtimeDiff).toBeCloseTo(3);
  });

  test("overtimeDiff falls back to DEFAULT_EXPECTED_HOURS when fixedWork is null", () => {
    const rows: RowInput[] = [{ actual: 9, fixedWork: null, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    // fallback: max(0, 9 - 8) = 1
    expect(result.overtimeDiff).toBeCloseTo(1);
  });

  test("in-progress day: estimated diff is returned separately, not in cumulativeDiff", () => {
    const rows: RowInput[] = [
      { actual: 9, fixedWork: 8, working: true, inProgress: null },
      {
        actual: null,
        fixedWork: 8,
        working: true,
        inProgress: { estimatedWorkTime: dh(3), status: "working" },
      },
    ];
    const result = accumulateRows(rows);
    expect(result.cumulativeDiff).toBeCloseTo(1);
    expect(result.remainingDays).toBe(1);
    expect(result.inProgressEstimatedDiff).toBeCloseTo(3 - 8);
    expect(result.totalActual).toBeCloseTo(9);
    expect(result.workedDays).toBe(1);
    expect(result.totalWorkDays).toBe(2);
  });

  test("future working days count as remainingDays", () => {
    const rows: RowInput[] = [
      { actual: null, fixedWork: null, working: true, inProgress: null },
      { actual: null, fixedWork: null, working: true, inProgress: null },
    ];
    const result = accumulateRows(rows);
    expect(result.remainingDays).toBe(2);
    expect(result.totalWorkDays).toBe(2);
    expect(result.workedDays).toBe(0);
  });

  test("inProgressEstimatedDiff is null when no in-progress row", () => {
    const rows: RowInput[] = [{ actual: 8, fixedWork: 8, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    expect(result.inProgressEstimatedDiff).toBeNull();
  });

  test("empty rows", () => {
    const result = accumulateRows([]);
    expect(result.totalWorkDays).toBe(0);
    expect(result.cumulativeDiff).toBe(0);
    expect(result.inProgressEstimatedDiff).toBeNull();
  });

  test("error row (working: false) is excluded from all counts", () => {
    const rows: RowInput[] = [
      { actual: 9, fixedWork: 8, working: true, inProgress: null }, // worked day
      { actual: null, fixedWork: null, working: false, inProgress: null }, // error row
      { actual: null, fixedWork: null, working: true, inProgress: null }, // future day
    ];
    const result = accumulateRows(rows);
    expect(result.totalWorkDays).toBe(2); // worked + future (not error)
    expect(result.workedDays).toBe(1);
    expect(result.remainingDays).toBe(1); // only the future day (not error)
  });

  test("actual equals DEFAULT_EXPECTED_HOURS contributes 0 to overtimeDiff", () => {
    const rows: RowInput[] = [{ actual: 8, fixedWork: 8, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    expect(result.overtimeDiff).toBe(0);
  });

  test("actual below DEFAULT_EXPECTED_HOURS contributes 0 to overtimeDiff", () => {
    const rows: RowInput[] = [{ actual: 7, fixedWork: 8, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    // Math.max(0, 7 - 8) = 0; undertime does not reduce overtimeDiff
    expect(result.overtimeDiff).toBe(0);
  });
});

describe("buildDashboardSummary", () => {
  test("empty data", () => {
    const summary = buildDashboardSummary(makeData([]));
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBe(0);
    expect(summary.cumulativeDiff).toBe(0);
    expect(summary.dailyRows).toEqual([]);
  });

  test("basic summary computation with worked days", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({
          date: "03/01（月）",
          actual: 9,
          fixedWork: 8,
          overtime: 1,
          breakTime: 1,
        }),
        makeDashboardRow({
          date: "03/02（火）",
          actual: 7.5,
          fixedWork: 8,
          overtime: 0,
          breakTime: 1,
        }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(2);
    expect(summary.workedDays).toBe(2);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBeCloseTo(16.5);
    // summary.cumulativeDiff comes from accumulateRows (DEFAULT_EXPECTED_HOURS-based)
    expect(summary.cumulativeDiff).toBeCloseTo(0.5);
    // totalOvertime uses fixedWork as threshold; fixedWork=8 for both days
    // day1: max(0, 9 - 8) = 1, day2: max(0, 7.5 - 8) = 0, total = 1
    expect(summary.totalOvertime).toBeCloseTo(1);
    expect(summary.avgWorkTime).toBeCloseTo(8.25);
    // Per-row diff uses weekday averages: Mon avg=9h, Tue avg=7.5h → diff=0 for both
    expect(defined(summary.dailyRows[0]).diff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[0]).cumulativeDiff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[1]).diff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[1]).cumulativeDiff).toBeCloseTo(0);
  });

  test("working: false rows are excluded from work day counts", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({
          date: "03/01（土）",
          isWeekend: true,
          dayType: "所定休日",
          working: false,
        }),
        makeDashboardRow({
          date: "03/02（日）",
          isWeekend: true,
          dayType: "法定休日",
          working: false,
        }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
  });

  test("future working days counted as remainingDays", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01（月）", actual: 8, fixedWork: 8 }),
        makeDashboardRow({ date: "03/02（火）" }),
        makeDashboardRow({ date: "03/03（水）" }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(3);
    expect(summary.workedDays).toBe(1);
    expect(summary.remainingDays).toBe(2);
  });

  test("projectedTotal extrapolates from average of worked days", () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push(makeDashboardRow({ date: `03/0${i + 1}`, actual: 8.5, fixedWork: 8 }));
    }
    for (let i = 0; i < 10; i++) {
      rows.push(makeDashboardRow({ date: `03/${i + 6}` }));
    }
    const summary = buildDashboardSummary(makeData(rows));
    expect(summary.projectedTotal).toBeCloseTo(127.5);
  });

  test("nightOvertime is aggregated into totalNightOvertime", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 10, fixedWork: 8, nightOvertime: 1.5 }),
        makeDashboardRow({ date: "03/02", actual: 9, fixedWork: 8, nightOvertime: 0.5 }),
      ]),
    );
    expect(summary.totalNightOvertime).toBeCloseTo(2);
  });

  test("projectedTotal = 0 when workedDays = 0", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01（月）" }),
        makeDashboardRow({ date: "03/02（火）" }),
      ]),
    );
    expect(summary.workedDays).toBe(0);
    expect(summary.projectedTotal).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.avgWorkTime).toBe(0);
  });

  test("leaveBalances are passed through", () => {
    const leaves = [
      { label: "有休", used: 2, remaining: 8 },
      { label: "代休", used: 1, remaining: 0 },
    ];
    const summary = buildDashboardSummary(makeData([], leaves));
    expect(summary.leaveBalances).toEqual(leaves);
  });

  test("weekday average uses multiple samples: two Mondays yield per-row diff relative to Monday avg", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/03（月）", actual: 8, fixedWork: 8 }),
        makeDashboardRow({ date: "03/10（月）", actual: 10, fixedWork: 8 }),
      ]),
    );
    // Monday avg = (8 + 10) / 2 = 9
    // row1.diff = 8 - 9 = -1, row2.diff = 10 - 9 = 1
    expect(defined(summary.dailyRows[0]).diff).toBeCloseTo(-1);
    expect(defined(summary.dailyRows[1]).diff).toBeCloseTo(1);
  });

  test("isPublicHoliday is true when schedule contains 公休", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", schedule: "複数回休憩(公休)", working: false }),
        makeDashboardRow({ date: "03/02", actual: 8, fixedWork: 8 }),
      ]),
    );
    expect(defined(summary.dailyRows[0]).isPublicHoliday).toBe(true);
    expect(defined(summary.dailyRows[1]).isPublicHoliday).toBe(false);
  });
});

function makeWorkDay(overrides: Partial<WorkDay> = {}): WorkDay {
  return {
    date: "01/01（月）",
    dayType: "平日",
    isWeekend: false,
    actual: null,
    fixedWork: null,
    overtime: null,
    breakTime: null,
    startTime: null,
    endTime: null,
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    working: true,
    nightOvertime: null,
    ...overrides,
  };
}

describe("buildWorkMonthSummary", () => {
  test("empty days returns zero totals", () => {
    const summary: DashboardSummary = buildWorkMonthSummary([], []);
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBe(0);
    expect(summary.cumulativeDiff).toBe(0);
    expect(summary.dailyRows).toEqual([]);
    expect(summary.leaveBalances).toEqual([]);
  });

  test("basic summary with worked days", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/01（月）", actual: 9, fixedWork: 8, overtime: 1, breakTime: 1 }),
      makeWorkDay({ date: "03/02（火）", actual: 7.5, fixedWork: 8, overtime: 0, breakTime: 1 }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(summary.totalWorkDays).toBe(2);
    expect(summary.workedDays).toBe(2);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBeCloseTo(16.5);
    // summary.cumulativeDiff comes from accumulateRows (DEFAULT_EXPECTED_HOURS-based)
    expect(summary.cumulativeDiff).toBeCloseTo(0.5);
    // fixedWork=8 for both days; max(0, 9-8) = 1, max(0, 7.5-8) = 0, total = 1
    expect(summary.totalOvertime).toBeCloseTo(1);
    expect(summary.avgWorkTime).toBeCloseTo(8.25);
    // Per-row diff uses weekday averages: Mon avg=9h, Tue avg=7.5h → diff=0 for both
    expect(defined(summary.dailyRows[0]).diff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[0]).cumulativeDiff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[1]).diff).toBeCloseTo(0);
    expect(defined(summary.dailyRows[1]).cumulativeDiff).toBeCloseTo(0);
  });

  test("weekend days (working: false) excluded from work day counts", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/01（土）", isWeekend: true, dayType: "所定休日", working: false }),
      makeWorkDay({ date: "03/02（日）", isWeekend: true, dayType: "法定休日", working: false }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
    expect(summary.dailyRows).toHaveLength(2);
    expect(defined(summary.dailyRows[0]).expected).toBe(0);
  });

  test("startTime and endTime are converted from decimal hours to time strings", () => {
    const days: WorkDay[] = [
      makeWorkDay({
        date: "03/01（月）",
        actual: 8,
        fixedWork: 8,
        startTime: dh(9.5), // 9:30
        endTime: dh(18.75), // 18:45
        breakStarts: [dh(12.0)],
        breakEnds: [dh(13.0)],
      }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(defined(summary.dailyRows[0]).startTime).toBe("9:30");
    expect(defined(summary.dailyRows[0]).endTime).toBe("18:45");
    expect(defined(summary.dailyRows[0]).breakStarts).toEqual(["12:00"]);
    expect(defined(summary.dailyRows[0]).breakEnds).toEqual(["13:00"]);
  });

  test("nightOvertime is aggregated into totalNightOvertime", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/01", actual: 10, fixedWork: 8, nightOvertime: 1.5 }),
      makeWorkDay({ date: "03/02", actual: 9, fixedWork: 8, nightOvertime: 0.5 }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(summary.totalNightOvertime).toBeCloseTo(2);
  });

  test("leaveBalances are passed through directly", () => {
    const leaves = [
      { label: "有休", used: 3, remaining: 7 },
      { label: "代休", used: 0, remaining: null },
    ];
    const summary = buildWorkMonthSummary([], leaves);
    expect(summary.leaveBalances).toEqual(leaves);
  });

  test("projectedTotal extrapolates from average of worked days", () => {
    const days: WorkDay[] = [];
    for (let i = 0; i < 5; i++) {
      days.push(makeWorkDay({ date: `03/0${i + 1}`, actual: 8.5, fixedWork: 8 }));
    }
    for (let i = 0; i < 10; i++) {
      days.push(makeWorkDay({ date: `03/${i + 6}` }));
    }
    const summary = buildWorkMonthSummary(days, []);
    expect(summary.projectedTotal).toBeCloseTo(127.5);
  });

  test("projectedTotal = 0 when workedDays = 0", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/01（月）" }),
      makeWorkDay({ date: "03/02（火）" }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(summary.workedDays).toBe(0);
    expect(summary.projectedTotal).toBe(0);
    expect(summary.progressPercent).toBe(0);
    expect(summary.avgWorkTime).toBe(0);
  });

  test("isPublicHoliday is true when schedule contains 公休", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/01", schedule: "複数回休憩(公休)", working: false }),
      makeWorkDay({ date: "03/02", actual: 8, fixedWork: 8 }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    expect(defined(summary.dailyRows[0]).isPublicHoliday).toBe(true);
    expect(defined(summary.dailyRows[1]).isPublicHoliday).toBe(false);
  });

  test("weekday average uses multiple samples: two Mondays yield per-row diff relative to Monday avg", () => {
    const days: WorkDay[] = [
      makeWorkDay({ date: "03/03（月）", actual: 8, fixedWork: 8 }),
      makeWorkDay({ date: "03/10（月）", actual: 10, fixedWork: 8 }),
    ];
    const summary = buildWorkMonthSummary(days, []);
    // Monday avg = (8 + 10) / 2 = 9
    // row1.diff = 8 - 9 = -1, row2.diff = 10 - 9 = 1
    expect(defined(summary.dailyRows[0]).diff).toBeCloseTo(-1);
    expect(defined(summary.dailyRows[1]).diff).toBeCloseTo(1);
  });
});
