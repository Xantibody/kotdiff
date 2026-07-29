import { describe, expect, test } from "vitest";
import { calcEstimatedWorkTime, calcClockOutTarget } from "./InProgressWork";
import type { InProgressRowData } from "./InProgressWork";
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

  test("日跨ぎ休憩終了（22:00開始, 23:00休憩開始, 翌1:00休憩終了, now=翌2:00 → 2.0h）", () => {
    // パース層は日付を落とすため休憩終了は raw 1:00 として渡る
    const data: InProgressRowData = {
      startTime: dh(22),
      restStarts: [dh(23)],
      restEnds: [dh(1)],
      isOnBreak: false,
    };
    // 正規化後: 休憩終了 25, now 26, elapsed = 26-22 = 4, break = 25-23 = 2, work = 2.0
    const result = calcEstimatedWorkTime(data, dh(2));
    expect(result.workTime).toBe(2);
    expect(result.status).toBe("working");
  });

  test("日跨ぎ休憩中（22:00開始, 翌0:30休憩開始, now=翌1:00 → 2.5h で凍結）", () => {
    // パース層は日付を落とすため休憩開始は raw 0:30 として渡る
    const data: InProgressRowData = {
      startTime: dh(22),
      restStarts: [dh(0.5)],
      restEnds: [],
      isOnBreak: true,
    };
    // 正規化後: 休憩開始 24.5, elapsed = 24.5-22 = 2.5
    const result = calcEstimatedWorkTime(data, dh(1));
    expect(result.workTime).toBe(2.5);
    expect(result.status).toBe("onBreak");
  });
});

describe("calcClockOutTarget", () => {
  test("残り必要時間と退勤目安時刻を返す", () => {
    // 貯金 +2h・本日 1h 勤務済み・期待 8h → 残り 5h、目安 = 10:00 + 5h = 15:00
    const result = calcClockOutTarget(2, 1, asDecimalHours(10), 8);
    expect(result.remainingHours).toBeCloseTo(5);
    expect(result.targetTime).toBeCloseTo(15);
  });

  test("既に達成済みなら remainingHours が負になる", () => {
    // 貯金 +5h・本日 4h 勤務済み → 残り -1h
    const result = calcClockOutTarget(5, 4, asDecimalHours(14), 8);
    expect(result.remainingHours).toBeCloseTo(-1);
  });
});

describe("calcEstimatedWorkTime — 正規化した打刻", () => {
  test("exposes the breaks normalised against the clock-in time", () => {
    const data = {
      startTime: dh(9),
      restStarts: [dh(12)],
      restEnds: [dh(13)],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(17));
    expect(result.startTime).toBe(9);
    expect(result.nowNormalized).toBe(17);
    expect(result.breaks).toEqual([{ start: 12, end: 13 }]);
  });

  test("treats an open break as lasting until now", () => {
    const data = {
      startTime: dh(9),
      restStarts: [dh(12)],
      restEnds: [],
      isOnBreak: true,
    };
    const result = calcEstimatedWorkTime(data, dh(12.5));
    expect(result.breaks).toEqual([{ start: 12, end: 12.5 }]);
  });

  test("shifts cross-midnight breaks past the clock-in time", () => {
    const data = {
      startTime: dh(22),
      restStarts: [dh(1)],
      restEnds: [dh(2)],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, dh(3));
    expect(result.breaks).toEqual([{ start: 25, end: 26 }]);
    expect(result.nowNormalized).toBe(27);
  });
});
