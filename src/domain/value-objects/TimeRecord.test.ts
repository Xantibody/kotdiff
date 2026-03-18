import { describe, expect, test } from "vitest";
import { parseWorkTime, parseTimeRecord, nowAsDecimalHours, asDecimalHours } from "./TimeRecord";

describe("parseWorkTime", () => {
  test('"" → null', () => {
    expect(parseWorkTime("")).toBeNull();
  });

  test('"8.00" → 8.0', () => {
    expect(parseWorkTime("8.00")).toBe(8.0);
  });

  test('"8.30" → 8.5', () => {
    expect(parseWorkTime("8.30")).toBe(8.5);
  });

  test('"0.00" → 0', () => {
    expect(parseWorkTime("0.00")).toBe(0);
  });

  test('"12.45" → 12.75', () => {
    expect(parseWorkTime("12.45")).toBe(12.75);
  });

  test('"  8.30  " → 8.5 (trim)', () => {
    expect(parseWorkTime("  8.30  ")).toBe(8.5);
  });

  test('"abc" → null', () => {
    expect(parseWorkTime("abc")).toBeNull();
  });

  test('"8.0" → null (minutes must be 2 digits)', () => {
    expect(parseWorkTime("8.0")).toBeNull();
  });

  test('"8:30" → null (colon not supported)', () => {
    expect(parseWorkTime("8:30")).toBeNull();
  });
});

describe("parseTimeRecord", () => {
  test('"" → null', () => {
    expect(parseTimeRecord("")).toBeNull();
  });

  test('"09:36" → 9.6', () => {
    expect(parseTimeRecord("09:36")).toBe(9.6);
  });

  test('"0:00" → 0', () => {
    expect(parseTimeRecord("0:00")).toBe(0);
  });

  test('"23:59" → 23 + 59/60', () => {
    expect(parseTimeRecord("23:59")).toBeCloseTo(23 + 59 / 60);
  });

  test('"  09:36  " → 9.6 (trim)', () => {
    expect(parseTimeRecord("  09:36  ")).toBe(9.6);
  });

  test('"abc" → null', () => {
    expect(parseTimeRecord("abc")).toBeNull();
  });

  test('"9.36" → null (dot not supported)', () => {
    expect(parseTimeRecord("9.36")).toBeNull();
  });

  test('"25:00" → 25 (deep night shift allowed)', () => {
    expect(parseTimeRecord("25:00")).toBe(25);
  });

  test('"9:60" → null (minutes >= 60 invalid)', () => {
    expect(parseTimeRecord("9:60")).toBeNull();
  });

  test('"9:99" → null (minutes > 60 invalid)', () => {
    expect(parseTimeRecord("9:99")).toBeNull();
  });
});

describe("asDecimalHours", () => {
  test("wraps a number as DecimalHours", () => {
    expect(asDecimalHours(8.5)).toBe(8.5);
  });

  test("zero is valid", () => {
    expect(asDecimalHours(0)).toBe(0);
  });

  test("preserves the numeric value", () => {
    const v = asDecimalHours(23 + 59 / 60);
    expect(v).toBeCloseTo(23 + 59 / 60);
  });
});

describe("nowAsDecimalHours", () => {
  test("converts date to JST decimal hours", () => {
    // 9:30 JST = 0:30 UTC, so UTC time + 9h = 9.5 hours
    const utc0h30 = new Date("2024-01-01T00:30:00Z");
    expect(nowAsDecimalHours(utc0h30)).toBeCloseTo(9.5, 5);
  });
});
