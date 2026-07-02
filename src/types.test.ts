import { describe, it, expect } from "vitest";
import { isDashboardData, isKotDayType, isKotdiffSettings, isNonWorkingDayType } from "./types";

describe("isKotdiffSettings", () => {
  it("returns true for valid settings", () => {
    expect(isKotdiffSettings({ customLeaveKeywords: [] })).toBe(true);
    expect(isKotdiffSettings({ customLeaveKeywords: ["サバティカル"] })).toBe(true);
  });

  it("returns false for null, non-object, and missing keywords", () => {
    expect(isKotdiffSettings(null)).toBe(false);
    expect(isKotdiffSettings("x")).toBe(false);
    expect(isKotdiffSettings({})).toBe(false);
  });

  it("returns false when keywords contain non-strings", () => {
    expect(isKotdiffSettings({ customLeaveKeywords: [1] })).toBe(false);
  });
});

describe("isKotDayType", () => {
  it("accepts 法定外休日 (rendered by KOT on swapped-leave days)", () => {
    expect(isKotDayType("法定外休日")).toBe(true);
  });
});

describe("isNonWorkingDayType", () => {
  it("returns true for KOT holiday day types", () => {
    expect(isNonWorkingDayType("法定休日")).toBe(true);
    expect(isNonWorkingDayType("法定外休日")).toBe(true);
    expect(isNonWorkingDayType("所定休日")).toBe(true);
  });

  it("returns false for 平日 and empty text", () => {
    expect(isNonWorkingDayType("平日")).toBe(false);
    expect(isNonWorkingDayType("")).toBe(false);
  });
});

describe("isDashboardData", () => {
  it("returns false for null", () => {
    expect(isDashboardData(null)).toBe(false);
  });
  it("returns false for non-object", () => {
    expect(isDashboardData(42)).toBe(false);
    expect(isDashboardData("string")).toBe(false);
  });
  it("returns false for empty object", () => {
    expect(isDashboardData({})).toBe(false);
  });
  it("returns false when rows is not an array", () => {
    expect(isDashboardData({ rows: "not-array", leaveBalances: [], generatedAt: "" })).toBe(false);
  });
  it("returns false when leaveBalances is missing", () => {
    expect(isDashboardData({ rows: [], generatedAt: "" })).toBe(false);
  });
  it("returns false when generatedAt is missing", () => {
    expect(isDashboardData({ rows: [], leaveBalances: [] })).toBe(false);
  });
  it("returns true for valid DashboardData shape", () => {
    expect(isDashboardData({ rows: [], leaveBalances: [], generatedAt: "2024-01" })).toBe(true);
  });
});
