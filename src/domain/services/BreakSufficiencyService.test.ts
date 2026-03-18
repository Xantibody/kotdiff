import { describe, expect, test } from "vitest";
import { isBreakSufficient } from "./BreakSufficiencyService";

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
