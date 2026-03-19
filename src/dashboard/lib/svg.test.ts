import { describe, expect, test } from "vitest";

import { defined } from "../../test-utils";
import { generateTicks, linearScale, niceRange } from "./svg";

describe("linearScale", () => {
  test("maps domain to range linearly", () => {
    const scale = linearScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  test("handles negative domain", () => {
    const scale = linearScale([-5, 5], [0, 200]);
    expect(scale(-5)).toBe(0);
    expect(scale(0)).toBe(100);
    expect(scale(5)).toBe(200);
  });

  test("domain with same min/max returns range midpoint", () => {
    const scale = linearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(50);
  });
});

describe("niceRange", () => {
  test("positive range", () => {
    const [min, max] = niceRange(0.5, 8.3);
    expect(min).toBe(0);
    expect(max).toBeGreaterThanOrEqual(8.3);
  });

  test("negative range", () => {
    const [min, max] = niceRange(-3.2, -0.1);
    expect(min).toBeLessThanOrEqual(-3.2);
    expect(max).toBeGreaterThanOrEqual(0);
  });

  test("zero-crossing range", () => {
    const [min, max] = niceRange(-2, 3);
    expect(min).toBeLessThanOrEqual(-2);
    expect(max).toBeGreaterThanOrEqual(3);
  });

  test("same values", () => {
    const [min, max] = niceRange(5, 5);
    expect(min).toBeLessThan(5);
    expect(max).toBeGreaterThan(5);
  });
});

describe("generateTicks", () => {
  test("generates requested number of ticks", () => {
    const ticks = generateTicks(0, 10, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(8);
  });

  test("first tick <= min, last tick >= max", () => {
    const ticks = generateTicks(0.5, 8.3, 5);
    expect(ticks[0]).toBeLessThanOrEqual(0.5);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(8.3);
  });

  test("ticks are evenly spaced", () => {
    const ticks = generateTicks(0, 10, 5);
    if (ticks.length >= 3) {
      const step = defined(ticks[1]) - defined(ticks[0]);
      for (let i = 2; i < ticks.length; i++) {
        expect(defined(ticks[i]) - defined(ticks[i - 1])).toBeCloseTo(step);
      }
    }
  });

  test("same min/max returns at least 2 ticks", () => {
    const ticks = generateTicks(5, 5, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });
});
