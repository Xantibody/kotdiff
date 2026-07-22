import { describe, expect, test } from "vitest";
import { calcNightWork } from "./NightWorkCalculator";
import { asDecimalHours } from "../value-objects/TimeRecord";

function dh(n: number) {
  return asDecimalHours(n);
}

describe("calcNightWork", () => {
  test("22:00前に退勤 → 0", () => {
    expect(calcNightWork(dh(9), dh(21), [], [])).toBe(0);
  });

  test("22:00ちょうどに退勤 → 0", () => {
    expect(calcNightWork(dh(9), dh(22), [], [])).toBe(0);
  });

  test("23:00に退勤 → 1h", () => {
    expect(calcNightWork(dh(9), dh(23), [], [])).toBe(1);
  });

  test("翌2:00まで勤務 (26:00) → 4h", () => {
    expect(calcNightWork(dh(18), dh(26), [], [])).toBe(4);
  });

  test("翌5:00まで勤務 (29:00) → 7h (22:00-29:00)", () => {
    expect(calcNightWork(dh(18), dh(29), [], [])).toBe(7);
  });

  test("翌6:00まで勤務 (30:00) → 7h (29:00で打ち切り)", () => {
    expect(calcNightWork(dh(18), dh(30), [], [])).toBe(7);
  });

  test("深夜帯に休憩あり (23:00-23:30) → 深夜から休憩を差し引く", () => {
    // 18:00-25:00勤務, 23:00-23:30休憩
    // 深夜勤務 = (22:00-25:00) - (23:00-23:30) = 3 - 0.5 = 2.5
    expect(calcNightWork(dh(18), dh(25), [dh(23)], [dh(23.5)])).toBe(2.5);
  });

  test("休憩が深夜帯をまたぐ場合は深夜帯部分のみ差し引く", () => {
    // 18:00-25:00勤務, 21:30-22:30休憩
    // 深夜勤務 = (22:00-25:00) - overlap(21:30-22:30, 22:00-29:00) = 3 - 0.5 = 2.5
    expect(calcNightWork(dh(18), dh(25), [dh(21.5)], [dh(22.5)])).toBe(2.5);
  });

  test("休憩が深夜帯外なら影響なし", () => {
    // 18:00-25:00勤務, 19:00-20:00休憩
    // 深夜勤務 = (22:00-25:00) = 3
    expect(calcNightWork(dh(18), dh(25), [dh(19)], [dh(20)])).toBe(3);
  });

  test("複数回の休憩", () => {
    // 18:00-27:00勤務, 22:00-22:30休憩, 25:00-25:30休憩
    // 深夜勤務 = (22:00-27:00) - 0.5 - 0.5 = 5 - 1 = 4
    expect(calcNightWork(dh(18), dh(27), [dh(22), dh(25)], [dh(22.5), dh(25.5)])).toBe(4);
  });

  // issue #31: 当日内で完結する早朝シフトの法定深夜 (0:00-5:00) を計上する
  test("早朝シフト 3:00-8:00 → 深夜 2h (3:00-5:00)", () => {
    expect(calcNightWork(dh(3), dh(8), [], [])).toBe(2);
  });

  test("早朝シフト 0:30-8:00 → 深夜 4.5h (0:30-5:00)", () => {
    expect(calcNightWork(dh(0.5), dh(8), [], [])).toBe(4.5);
  });

  test("早朝シフトの深夜帯内休憩は差し引く (3:00-8:00, 休憩 4:00-4:30)", () => {
    expect(calcNightWork(dh(3), dh(8), [dh(4)], [dh(4.5)])).toBe(1.5);
  });

  test("日跨ぎ勤務 23:00-翌7:00 (23-31) は二重計上しない → 6h", () => {
    // 23:00-24:00 (1h) + 0:00-5:00 (5h) = 6h。[22,29] 窓で 23→29 の 6h として計上
    expect(calcNightWork(dh(23), dh(31), [], [])).toBe(6);
  });

  test("startTime と endTime が null の場合は NaN にならず 0", () => {
    // endTime が startTime 以下の場合
    expect(calcNightWork(dh(0), dh(0), [], [])).toBe(0);
  });
});
