import { describe, it, expect } from "vitest";
import {
  buildDashboardSummaryModel,
  buildTodayInput,
  collectAlerts,
  isSameJstDay,
} from "./summary";
import { makeUnworkedRow, makeWorkedRow } from "../test-helpers";
import type { DashboardSummary } from "../../domain/aggregates/WorkMonth";

// JST 03/04（水）17:00
const NOW = new Date("2026-03-04T08:00:00.000Z");

describe("isSameJstDay", () => {
  it("compares the KOT label against the JST calendar day", () => {
    expect(isSameJstDay("03/04（水）", NOW)).toBe(true);
    expect(isSameJstDay("03/03（火）", NOW)).toBe(false);
  });
});

describe("buildTodayInput", () => {
  it("reconstructs the in-progress day from the stored punches", () => {
    const today = buildTodayInput(
      [makeUnworkedRow({ date: "03/04（水）", startTime: "09:00", endTime: null })],
      NOW,
      0,
    );
    expect(today).not.toBeNull();
    expect(today?.status).toBe("working");
    expect(today?.netWorkTime).toBeCloseTo(8, 6);
    // 貯金 ±0 まで残り 0:00（すでに 8 時間働いている）
    expect(today?.remainingHours).toBeCloseTo(0, 6);
  });

  it("subtracts the breaks already taken", () => {
    const today = buildTodayInput(
      [
        makeUnworkedRow({
          date: "03/04（水）",
          startTime: "09:00",
          endTime: null,
          breakStarts: ["12:00"],
          breakEnds: ["13:00"],
        }),
      ],
      NOW,
      0,
    );
    expect(today?.netWorkTime).toBeCloseTo(7, 6);
    expect(today?.breaks).toEqual([{ start: 12, end: 13 }]);
  });

  it("reports a break in progress", () => {
    const today = buildTodayInput(
      [
        makeUnworkedRow({
          date: "03/04（水）",
          startTime: "09:00",
          endTime: null,
          breakStarts: ["16:00"],
          breakEnds: [],
        }),
      ],
      NOW,
      0,
    );
    expect(today?.status).toBe("onBreak");
    // 休憩中は実労働が進まない (09:00–16:00 の 7 時間で止まる)
    expect(today?.netWorkTime).toBeCloseTo(7, 6);
  });

  it("returns null for a finished or absent day", () => {
    expect(buildTodayInput([makeWorkedRow({ date: "03/04（水）" })], NOW, 0)).toBeNull();
    expect(buildTodayInput([makeUnworkedRow({ date: "03/03（火）" })], NOW, 0)).toBeNull();
    expect(
      buildTodayInput([makeUnworkedRow({ date: "03/04（水）", startTime: null })], NOW, 0),
    ).toBeNull();
  });
});

describe("collectAlerts", () => {
  it("reports past days that were never clocked out", () => {
    const alerts = collectAlerts(
      [
        makeUnworkedRow({ date: "03/02（月）", startTime: "09:00", endTime: null }),
        makeUnworkedRow({ date: "03/04（水）", startTime: "09:00", endTime: null }),
        makeWorkedRow({ date: "03/03（火）" }),
      ],
      NOW,
    );
    // 今日の分は「勤務中」であって打刻漏れではない
    expect(alerts).toEqual(["03/02（月） の退勤打刻なし"]);
  });
});

describe("buildDashboardSummaryModel", () => {
  const summary: DashboardSummary = {
    totalWorkDays: 3,
    workedDays: 2,
    remainingDays: 1,
    totalActual: 17,
    totalExpected: 16,
    cumulativeDiff: 1,
    totalOvertime: 1,
    totalNightOvertime: 0,
    avgWorkTime: 8.5,
    projectedTotal: 25.5,
    progressPercent: 70,
    leaveBalances: [],
    dailyRows: [
      makeWorkedRow({ date: "03/02（月）", actual: 9, diff: 1, cumulativeDiff: 1 }),
      makeWorkedRow({ date: "03/03（火）", actual: 8, diff: 0, cumulativeDiff: 1 }),
      makeUnworkedRow({ date: "03/04（水）", startTime: "09:00", endTime: null }),
    ],
  };

  it("feeds the shared summary model with the dashboard's own data", () => {
    const model = buildDashboardSummaryModel(summary, NOW);
    expect(model.month.requiredLabel).toBe("24:00");
    expect(model.month.savingsLabel).toBe("+1:00");
    expect(model.today.state).toBe("working");
    expect(model.today.dateLabel).toBe("03/04（水）");
  });

  it("keeps the outlook in plain words", () => {
    const model = buildDashboardSummaryModel(summary, NOW);
    expect(model.outlook.sentence).toContain("このままだと");
    expect(model.outlook.sentence).not.toContain("標準偏差");
    expect(model.outlook.sentence).not.toContain("予測区間");
  });
});
