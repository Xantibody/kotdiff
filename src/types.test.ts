import { describe, it, expect } from "vitest";
import { isDashboardData } from "./types";

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
