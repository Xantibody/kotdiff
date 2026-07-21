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

  // 型ガードが row の中身を検証しないと、旧バージョンの保存データを読んだ
  // ダッシュボードが buildDashboardSummary 内で実行時例外を起こす
  describe("row validation against stale stored data", () => {
    const validRow = {
      date: "03/01（月）",
      dayType: "平日",
      isWeekend: false,
      actual: 8,
      fixedWork: 8,
      overtime: 0,
      breakTime: 1,
      startTime: "09:00",
      endTime: "18:00",
      breakStarts: ["12:00"],
      breakEnds: ["13:00"],
      schedule: null,
      working: true,
      nightOvertime: null,
    };

    function dataWithRow(row: unknown): unknown {
      return { rows: [row], leaveBalances: [], generatedAt: "2024-01" };
    }

    it("accepts a fully valid row", () => {
      expect(isDashboardData(dataWithRow(validRow))).toBe(true);
    });

    it("rejects a row missing breakStarts/breakEnds (旧形式データ)", () => {
      const { breakStarts, breakEnds, ...legacy } = validRow;
      void breakStarts;
      void breakEnds;
      expect(isDashboardData(dataWithRow(legacy))).toBe(false);
    });

    it("rejects a row whose breakStarts contains non-strings", () => {
      expect(isDashboardData(dataWithRow({ ...validRow, breakStarts: [12] }))).toBe(false);
    });

    it("rejects a row whose actual is a string", () => {
      expect(isDashboardData(dataWithRow({ ...validRow, actual: "8.00" }))).toBe(false);
    });

    it("rejects a row missing working (旧形式データ)", () => {
      const { working, ...legacy } = validRow;
      void working;
      expect(isDashboardData(dataWithRow(legacy))).toBe(false);
    });

    it("rejects a row whose schedule is a number", () => {
      expect(isDashboardData(dataWithRow({ ...validRow, schedule: 0 }))).toBe(false);
    });

    it("accepts null in nullable numeric fields", () => {
      expect(
        isDashboardData(
          dataWithRow({
            ...validRow,
            actual: null,
            fixedWork: null,
            overtime: null,
            breakTime: null,
            startTime: null,
            endTime: null,
            nightOvertime: null,
          }),
        ),
      ).toBe(true);
    });
  });

  describe("leaveBalances validation", () => {
    it("rejects a leave balance missing remaining (旧形式データ)", () => {
      expect(
        isDashboardData({
          rows: [],
          leaveBalances: [{ label: "有休", used: 3 }],
          generatedAt: "2024-01",
        }),
      ).toBe(false);
    });

    it("accepts remaining null", () => {
      expect(
        isDashboardData({
          rows: [],
          leaveBalances: [{ label: "有休", used: 3, remaining: null }],
          generatedAt: "2024-01",
        }),
      ).toBe(true);
    });
  });
});
