import { describe, expect, test } from "vitest";
import { createBreakPeriod } from "./BreakPeriod";

describe("createBreakPeriod", () => {
  test("valid pair returns BreakPeriod", () => {
    const bp = createBreakPeriod(12, 13);
    expect(bp.start).toBe(12);
    expect(bp.end).toBe(13);
  });

  test("start === end is valid", () => {
    expect(() => createBreakPeriod(12, 12)).not.toThrow();
  });

  test("start > end throws", () => {
    expect(() => createBreakPeriod(13, 12)).toThrow();
  });
});
