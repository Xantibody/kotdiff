import { describe, expect, test } from "vitest";
import {
  MIN_BREAK_6_TO_8H,
  MIN_BREAK_8H_PLUS,
  isBreakSufficient,
  requiredBreakFor,
} from "./BreakSufficiencyService";

describe("requiredBreakFor", () => {
  test("5h work → no break required", () => {
    expect(requiredBreakFor(5)).toBe(0);
  });

  test("just under 6h → no break required", () => {
    expect(requiredBreakFor(6 - 1 / 60)).toBe(0);
  });

  test("exactly 6h → 45min break required", () => {
    expect(requiredBreakFor(6)).toBe(MIN_BREAK_6_TO_8H);
  });

  test("7h work → 45min break required", () => {
    expect(requiredBreakFor(7)).toBe(MIN_BREAK_6_TO_8H);
  });

  test("exactly 8h → 60min break required", () => {
    expect(requiredBreakFor(8)).toBe(MIN_BREAK_8H_PLUS);
  });

  test("10h work → 60min break required", () => {
    expect(requiredBreakFor(10)).toBe(MIN_BREAK_8H_PLUS);
  });
});

describe("isBreakSufficient", () => {
  test("6h work with 0:00 break → insufficient", () => {
    expect(isBreakSufficient(6, 0)).toBe(false);
  });

  test("6h work with 0:44 break → insufficient", () => {
    expect(isBreakSufficient(6, 44 / 60)).toBe(false);
  });

  test("6h work with 0:45 break → sufficient", () => {
    expect(isBreakSufficient(6, 0.75)).toBe(true);
  });

  test("7h work with 0:30 break → insufficient", () => {
    expect(isBreakSufficient(7, 0.5)).toBe(false);
  });

  test("7h work with 1:00 break → sufficient", () => {
    expect(isBreakSufficient(7, 1)).toBe(true);
  });

  test("8h work with 0:45 break → insufficient", () => {
    expect(isBreakSufficient(8, 0.75)).toBe(false);
  });

  test("8h work with 1:00 break → sufficient", () => {
    expect(isBreakSufficient(8, 1)).toBe(true);
  });

  test("10h work with 0:59 break → insufficient", () => {
    expect(isBreakSufficient(10, 59 / 60)).toBe(false);
  });

  test("5h work with 0:00 break → sufficient (under 6h threshold)", () => {
    expect(isBreakSufficient(5, 0)).toBe(true);
  });
});
