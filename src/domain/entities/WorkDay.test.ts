import { describe, expect, test } from "vitest";
import {
  type WorkDay,
  isWorkedDay,
  getWorkDayDiff,
  hasInsufficientBreak,
  getWorkDayNightOvertime,
} from "./WorkDay";

function makeWorkDay(overrides: Partial<WorkDay> = {}): WorkDay {
  return {
    date: "03/01（月）",
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

describe("isWorkedDay", () => {
  test("actual あり + working true → true", () => {
    expect(isWorkedDay(makeWorkDay({ actual: 8, working: true }))).toBe(true);
  });

  test("actual null → false", () => {
    expect(isWorkedDay(makeWorkDay({ actual: null, working: true }))).toBe(false);
  });

  test("working false → false", () => {
    expect(isWorkedDay(makeWorkDay({ actual: 8, working: false }))).toBe(false);
  });

  test("actual null + working false → false", () => {
    expect(isWorkedDay(makeWorkDay({ actual: null, working: false }))).toBe(false);
  });
});

describe("getWorkDayDiff", () => {
  test("actual 9h, expected 8h → +1", () => {
    expect(getWorkDayDiff(makeWorkDay({ actual: 9, working: true }), 8)).toBeCloseTo(1);
  });

  test("actual 7.5h, expected 8h → -0.5", () => {
    expect(getWorkDayDiff(makeWorkDay({ actual: 7.5, working: true }), 8)).toBeCloseTo(-0.5);
  });

  test("actual 8h, expected 8h → 0", () => {
    expect(getWorkDayDiff(makeWorkDay({ actual: 8, working: true }), 8)).toBeCloseTo(0);
  });

  test("actual null → null", () => {
    expect(getWorkDayDiff(makeWorkDay({ actual: null, working: true }), 8)).toBeNull();
  });

  test("working false → null", () => {
    expect(getWorkDayDiff(makeWorkDay({ actual: 8, working: false }), 8)).toBeNull();
  });
});

describe("hasInsufficientBreak", () => {
  test("8h 勤務 + 1h 休憩 → false (十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 8, breakTime: 1 }))).toBe(false);
  });

  test("8h 勤務 + 0.75h 休憩 → true (不十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 8, breakTime: 0.75 }))).toBe(true);
  });

  test("6h 勤務 + 0.75h 休憩 → false (十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 6, breakTime: 0.75 }))).toBe(false);
  });

  test("6h 勤務 + 0.5h 休憩 → true (不十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 6, breakTime: 0.5 }))).toBe(true);
  });

  test("5h 勤務 + 0h 休憩 → false (6h 未満は不要)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 5, breakTime: 0 }))).toBe(false);
  });

  test("actual null → false", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: null, breakTime: 1 }))).toBe(false);
  });

  test("breakTime null → false", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 8, breakTime: null }))).toBe(false);
  });
});

describe("getWorkDayNightOvertime", () => {
  test("22:00 前に退勤 → 0", () => {
    expect(getWorkDayNightOvertime(makeWorkDay({ startTime: 9, endTime: 21 }))).toBe(0);
  });

  test("23:00 退勤 → 1h", () => {
    expect(getWorkDayNightOvertime(makeWorkDay({ startTime: 9, endTime: 23 }))).toBe(1);
  });

  test("翌 2:00 (26:00) まで勤務 → 4h", () => {
    expect(getWorkDayNightOvertime(makeWorkDay({ startTime: 18, endTime: 26 }))).toBe(4);
  });

  test("深夜帯に休憩あり → 休憩分を差し引く", () => {
    expect(
      getWorkDayNightOvertime(
        makeWorkDay({ startTime: 18, endTime: 25, breakStarts: [23], breakEnds: [23.5] }),
      ),
    ).toBe(2.5);
  });

  test("startTime null → 0", () => {
    expect(getWorkDayNightOvertime(makeWorkDay({ startTime: null, endTime: 25 }))).toBe(0);
  });

  test("endTime null → 0", () => {
    expect(getWorkDayNightOvertime(makeWorkDay({ startTime: 9, endTime: null }))).toBe(0);
  });
});
