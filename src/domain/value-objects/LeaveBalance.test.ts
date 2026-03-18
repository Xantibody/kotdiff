import { describe, expect, test } from "vitest";
import { createLeaveBalance, parseLeaveBalanceText } from "./LeaveBalance";

describe("createLeaveBalance", () => {
  test("valid values return LeaveBalance", () => {
    const lb = createLeaveBalance("有休", 2, 8);
    expect(lb.label).toBe("有休");
    expect(lb.used).toBe(2);
    expect(lb.remaining).toBe(8);
  });

  test("remaining = null is valid", () => {
    const lb = createLeaveBalance("特休", 1, null);
    expect(lb.remaining).toBeNull();
  });

  test("negative used throws", () => {
    expect(() => createLeaveBalance("有休", -1, 5)).toThrow();
  });

  test("negative remaining throws", () => {
    expect(() => createLeaveBalance("有休", 2, -1)).toThrow();
  });
});

describe("parseLeaveBalanceText", () => {
  test('残あり: "0.0 (残 5.0 )" → used=0, remaining=5', () => {
    const result = parseLeaveBalanceText("0.0\n(残\u00a05.0 )");
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(5);
  });

  test('残なし: "3.0" → used=3, remaining=null', () => {
    const result = parseLeaveBalanceText("3.0");
    expect(result.used).toBe(3);
    expect(result.remaining).toBeNull();
  });

  test('時間付き: "1.0 / 0H (残 4.0 )" → used=1, remaining=4', () => {
    const result = parseLeaveBalanceText("1.0 / 0H (残 4.0 )");
    expect(result.used).toBe(1);
    expect(result.remaining).toBe(4);
  });

  test("空文字 → used=0, remaining=null", () => {
    const result = parseLeaveBalanceText("");
    expect(result.used).toBe(0);
    expect(result.remaining).toBeNull();
  });

  test('半端な数値: "2.5 (残 10.5 )" → used=2.5, remaining=10.5', () => {
    const result = parseLeaveBalanceText("2.5 (残 10.5 )");
    expect(result.used).toBe(2.5);
    expect(result.remaining).toBe(10.5);
  });
});
