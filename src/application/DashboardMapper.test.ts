import { describe, test, expect } from "vitest";
import { toStorageData } from "./DashboardMapper";

import { defined } from "../test-utils";
import type { WorkDay } from "../domain/entities/WorkDay";
import type { LeaveBalance } from "../domain/value-objects/LeaveBalance";
import { asDecimalHours } from "../domain/value-objects/TimeRecord";

function dh(n: number) {
  return asDecimalHours(n);
}

function makeWorkDay(overrides: Partial<WorkDay> = {}): WorkDay {
  return {
    date: "03/01",
    dayType: "平日",
    isWeekend: false,
    actual: 8,
    fixedWork: 8,
    overtime: 0,
    breakTime: 1,
    startTime: dh(9),
    endTime: dh(18),
    breakStarts: [dh(12)],
    breakEnds: [dh(13)],
    schedule: null,
    working: true,
    nightOvertime: null,
    ...overrides,
  };
}

describe("toStorageData", () => {
  test("converts empty days array to DashboardData", () => {
    const result = toStorageData([], [], "2026-03-01T00:00:00Z");
    expect(result.rows).toHaveLength(0);
    expect(result.leaveBalances).toHaveLength(0);
    expect(result.generatedAt).toBe("2026-03-01T00:00:00Z");
  });

  test("converts WorkDay to DashboardRow (decimal hours become time strings)", () => {
    const day = makeWorkDay({
      startTime: dh(9),
      endTime: dh(18),
      breakStarts: [dh(12)],
      breakEnds: [dh(13)],
    });
    const result = toStorageData([day], [], "2026-03-01T00:00:00Z");
    expect(result.rows).toHaveLength(1);
    const row = defined(result.rows[0]);
    expect(row.startTime).toBe("9:00");
    expect(row.endTime).toBe("18:00");
    expect(row.breakStarts).toEqual(["12:00"]);
    expect(row.breakEnds).toEqual(["13:00"]);
  });

  test("preserves date, dayType, isWeekend fields", () => {
    const day = makeWorkDay({ date: "03/15", dayType: "土曜日", isWeekend: true });
    const result = toStorageData([day], [], "2026-03-01T00:00:00Z");
    const row = defined(result.rows[0]);
    expect(row.date).toBe("03/15");
    expect(row.dayType).toBe("土曜日");
    expect(row.isWeekend).toBe(true);
  });

  test("passes leaveBalances through unchanged", () => {
    const leaves: LeaveBalance[] = [
      { label: "有休", used: 3, remaining: 7 },
      { label: "代休", used: 1, remaining: null },
    ];
    const result = toStorageData([], leaves, "2026-03-01T00:00:00Z");
    expect(result.leaveBalances).toEqual(leaves);
  });

  test("handles multiple days in order", () => {
    const days = [
      makeWorkDay({ date: "03/01" }),
      makeWorkDay({ date: "03/02" }),
      makeWorkDay({ date: "03/03" }),
    ];
    const result = toStorageData(days, [], "2026-03-01T00:00:00Z");
    expect(result.rows).toHaveLength(3);
    expect(defined(result.rows[0]).date).toBe("03/01");
    expect(defined(result.rows[1]).date).toBe("03/02");
    expect(defined(result.rows[2]).date).toBe("03/03");
  });

  test("handles day with null actual (future/unworked day)", () => {
    const day = makeWorkDay({ actual: null, startTime: null, endTime: null });
    const result = toStorageData([day], [], "2026-03-01T00:00:00Z");
    const row = defined(result.rows[0]);
    expect(row.actual).toBeNull();
    expect(row.startTime).toBeNull();
    expect(row.endTime).toBeNull();
  });

  test("handles fractional hours (e.g. 9.5 → 9:30)", () => {
    const day = makeWorkDay({ startTime: dh(9.5), endTime: dh(18.5) });
    const result = toStorageData([day], [], "2026-03-01T00:00:00Z");
    const row = defined(result.rows[0]);
    expect(row.startTime).toBe("9:30");
    expect(row.endTime).toBe("18:30");
  });
});
