import { describe, it, expect } from "vitest";
import { insufficientBreakDays, savingsSeries, weekdayAverages } from "./insights";
import { makeUnworkedRow, makeWorkedRow } from "../test-helpers";

describe("insufficientBreakDays", () => {
  it("lists days that fall short of the statutory break", () => {
    const days = insufficientBreakDays([
      // 8 時間以上は 60 分必要
      makeWorkedRow({ date: "03/02（月）", actual: 8.5, breakTime: 0.5 }),
      makeWorkedRow({ date: "03/03（火）", actual: 8.5, breakTime: 1 }),
      // 6 時間未満は規定なし
      makeWorkedRow({ date: "03/04（水）", actual: 5, breakTime: 0 }),
      makeUnworkedRow({ date: "03/05（木）" }),
    ]);
    expect(days).toEqual(["03/02（月）"]);
  });

  it("treats a missing break as zero", () => {
    expect(insufficientBreakDays([makeWorkedRow({ actual: 9, breakTime: null })]).length).toBe(1);
  });
});

describe("weekdayAverages", () => {
  it("averages worked weekdays only", () => {
    const averages = weekdayAverages([
      makeWorkedRow({ date: "03/02（月）", actual: 9 }),
      makeWorkedRow({ date: "03/09（月）", actual: 7 }),
      makeUnworkedRow({ date: "03/03（火）" }),
    ]);
    expect(averages[0]).toEqual({ label: "月", average: 8, count: 2 });
    expect(averages[1]).toEqual({ label: "火", average: 0, count: 0 });
  });
});

describe("savingsSeries", () => {
  it("keeps only the days that moved the balance", () => {
    expect(
      savingsSeries([
        makeWorkedRow({ cumulativeDiff: 1 }),
        makeUnworkedRow({}),
        makeWorkedRow({ cumulativeDiff: 2 }),
      ]),
    ).toEqual([1, 2]);
  });
});
