import { describe, expect, test } from "vitest";
import { cn, formatBreakPairs, formatAttendance } from "./utils";

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  test("handles undefined and null-like falsy values", () => {
    expect(cn("a", undefined, "b")).toBe("a b");
    expect(cn("a", false, "b")).toBe("a b");
  });

  test("deduplicates conflicting tailwind classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("merges non-conflicting tailwind classes", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  test("handles array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  test("handles conditional object syntax", () => {
    expect(cn({ "font-bold": true, "font-normal": false })).toBe("font-bold");
  });
});

describe("formatBreakPairs", () => {
  test("空配列 → []", () => {
    expect(formatBreakPairs([], [])).toEqual([]);
  });

  test("1ペア", () => {
    expect(formatBreakPairs(["12:00"], ["13:00"])).toEqual(["12:00 ~ 13:00"]);
  });

  test("複数ペア", () => {
    expect(formatBreakPairs(["12:00", "15:00"], ["13:00", "15:15"])).toEqual([
      "12:00 ~ 13:00",
      "15:00 ~ 15:15",
    ]);
  });

  test("休憩中（終了なし）", () => {
    expect(formatBreakPairs(["12:00"], [])).toEqual(["12:00 ~ "]);
  });
});

describe("formatAttendance", () => {
  test('両方あり: ("9:00", "18:00") → "9:00 ~ 18:00"', () => {
    expect(formatAttendance("9:00", "18:00")).toBe("9:00 ~ 18:00");
  });

  test('出勤のみ（勤務中）: ("9:00", null) → "9:00 ~"', () => {
    expect(formatAttendance("9:00", null)).toBe("9:00 ~");
  });

  test('退勤のみ（異常）: (null, "18:00") → "~ 18:00"', () => {
    expect(formatAttendance(null, "18:00")).toBe("~ 18:00");
  });

  test('両方なし（休日等）: (null, null) → ""', () => {
    expect(formatAttendance(null, null)).toBe("");
  });

  test('空文字列も falsy として扱う: ("", "") → ""', () => {
    expect(formatAttendance("", "")).toBe("");
  });
});
