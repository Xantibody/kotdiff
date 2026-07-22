import { describe, expect, test } from "vitest";
import { isWorkedDay, getWorkDayDiff, hasInsufficientBreak } from "./WorkDay";
import type { WorkDay } from "./WorkDay";

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

  test("8h ちょうど + 0.75h 休憩 → false (法の境界は「超える」なので 45 分で十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 8, breakTime: 0.75 }))).toBe(false);
  });

  test("8h 超 + 0.75h 休憩 → true (不十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 8 + 1 / 60, breakTime: 0.75 }))).toBe(true);
  });

  test("6h 勤務 + 0.75h 休憩 → false (十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 6, breakTime: 0.75 }))).toBe(false);
  });

  test("6h ちょうど + 0.5h 休憩 → false (法の境界は「超える」なので休憩義務なし)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 6, breakTime: 0.5 }))).toBe(false);
  });

  test("6h 超 + 0.5h 休憩 → true (不十分)", () => {
    expect(hasInsufficientBreak(makeWorkDay({ actual: 6 + 1 / 60, breakTime: 0.5 }))).toBe(true);
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
