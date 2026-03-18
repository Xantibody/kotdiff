import { describe, expect, test } from "vitest";
import { type InProgressRowData, calcEstimatedWorkTime } from "./InProgressWork";
import { asDecimalHours } from "./TimeRecord";

function dh(n: number) {
  return asDecimalHours(n);
}

describe("calcEstimatedWorkTime", () => {
  test("休憩なし業務中（09:00開始, now=17:00 → 8.0h）", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(17));
    expect(result.workTime).toBe(8);
    expect(result.status).toBe("working");
  });

  test("休憩1回後の業務中（09:00開始, 12-13休憩, now=18:00 → 8.0h）", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [dh(12)],
      restEnds: [dh(13)],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(18));
    expect(result.workTime).toBe(8);
    expect(result.status).toBe("working");
  });

  test("休憩中（09:00開始, 12:00から休憩 → 3.0h で凍結）", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [dh(12)],
      restEnds: [],
      isOnBreak: true,
    };
    const result = calcEstimatedWorkTime(data, dh(12.5));
    expect(result.workTime).toBe(3);
    expect(result.status).toBe("onBreak");
  });

  test("休憩中は now が変わっても workTime 不変", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [dh(12)],
      restEnds: [],
      isOnBreak: true,
    };
    const result1 = calcEstimatedWorkTime(data, dh(12.5));
    const result2 = calcEstimatedWorkTime(data, dh(14));
    expect(result1.workTime).toBe(result2.workTime);
  });

  test("2回目の休憩中", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [dh(12), dh(15)],
      restEnds: [dh(13)],
      isOnBreak: true,
    };
    // elapsed = 15 - 9 = 6, completed break = 13 - 12 = 1, work = 6 - 1 = 5
    const result = calcEstimatedWorkTime(data, dh(16));
    expect(result.workTime).toBe(5);
    expect(result.status).toBe("onBreak");
  });

  test("開始直後（≈0h）", () => {
    const data: InProgressRowData = {
      startTime: dh(9),
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(9));
    expect(result.workTime).toBe(0);
  });

  test("日跨ぎ（22:00開始, now=1:00 → 3.0h）", () => {
    const data: InProgressRowData = {
      startTime: dh(22),
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(1));
    expect(result.workTime).toBe(3);
  });

  test("早朝出勤（6:00開始, now=7:00 → 1.0h）", () => {
    const data: InProgressRowData = {
      startTime: dh(6),
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(7));
    expect(result.workTime).toBe(1);
  });

  test("深夜帯の休憩（22:00開始, 0:30-1:00休憩, now=2:00 → 3.5h）", () => {
    const data: InProgressRowData = {
      startTime: dh(22),
      restStarts: [dh(24.5)],
      restEnds: [dh(25)],
      isOnBreak: false,
    };
    // now=2:00 → +24 = 26, elapsed = 26-22 = 4, break = 0.5, work = 3.5
    const result = calcEstimatedWorkTime(data, dh(2));
    expect(result.workTime).toBe(3.5);
  });
});
