import { describe, expect, test } from "vitest";
import { describeArc, extractWeekday, polarToCartesian } from "./chart-calculations";

describe("extractWeekday", () => {
  test("extracts weekday from full-width parentheses", () => {
    expect(extractWeekday("03/18（水）")).toBe("水");
    expect(extractWeekday("01/01（月）")).toBe("月");
    expect(extractWeekday("12/31（金）")).toBe("金");
  });

  test("extracts weekday from half-width parentheses", () => {
    expect(extractWeekday("03/18(火)")).toBe("火");
  });

  test("returns null when no weekday found", () => {
    expect(extractWeekday("2025-03-18")).toBeNull();
    expect(extractWeekday("")).toBeNull();
  });
});

describe("polarToCartesian", () => {
  test("0 degrees (top) maps to (cx, cy - r)", () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });

  test("90 degrees (right) maps to (cx + r, cy)", () => {
    const p = polarToCartesian(100, 100, 50, 90);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(100);
  });

  test("180 degrees (bottom) maps to (cx, cy + r)", () => {
    const p = polarToCartesian(100, 100, 50, 180);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(150);
  });

  test("270 degrees (left) maps to (cx - r, cy)", () => {
    const p = polarToCartesian(100, 100, 50, 270);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(100);
  });
});

describe("describeArc", () => {
  test("returns a string starting with M and containing A", () => {
    const d = describeArc(100, 100, 50, 0, 90);
    expect(d).toMatch(/^M /);
    expect(d).toContain(" A ");
  });

  test("uses largeArc=0 for arc <= 180 degrees", () => {
    const d = describeArc(100, 100, 50, 0, 90);
    // The large-arc-flag should be 0
    expect(d).toContain("0 1");
  });

  test("uses largeArc=1 for arc > 180 degrees", () => {
    const d = describeArc(100, 100, 50, 0, 270);
    // The large-arc-flag should be 1
    expect(d).toContain("1 1");
  });
});
