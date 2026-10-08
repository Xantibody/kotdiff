import { describe, test, expect } from "vitest";
import { buildPopupBannerData } from "./PopupInfo";
import type { DashboardData, DashboardRow } from "../types";

function makeDashboardRow(overrides: Partial<DashboardRow> = {}): DashboardRow {
  return {
    date: "07/01（水）",
    dayType: "平日",
    isWeekend: false,
    actual: null,
    fixedWork: null,
    overtime: null,
    breakTime: null,
    startTime: null,
    endTime: null,
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    working: true,
    nightOvertime: null,
    ...overrides,
  };
}

function makeData(rows: DashboardRow[], overrides: Partial<DashboardData> = {}): DashboardData {
  return { rows, leaveBalances: [], generatedAt: "2026-07-02T00:00:00.000Z", ...overrides };
}

// 2026-07-02 15:00 JST
const NOW = new Date("2026-07-02T06:00:00.000Z");

describe("buildPopupBannerData", () => {
  test("rows がなければ残り0日・貯金0・退勤目安なし", () => {
    const result = buildPopupBannerData(makeData([]), NOW);

    expect(result.remainingDays).toBe(0);
    expect(result.cumulativeDiff).toBe(0);
    expect(result.clockOutTarget).toBeNull();
  });

  test("勤務済みの日の 実績−8h を貯金に積む", () => {
    const result = buildPopupBannerData(
      makeData([makeDashboardRow({ actual: 9, startTime: "9:00", endTime: "19:00" })]),
      NOW,
    );

    expect(result.cumulativeDiff).toBe(1);
  });

  test("当日の勤務中の行は開いた時刻までの経過で退勤目安を出す", () => {
    const result = buildPopupBannerData(
      makeData([
        makeDashboardRow({ date: "07/01（水）", actual: 9, startTime: "9:00", endTime: "19:00" }),
        makeDashboardRow({
          date: "07/02（木）",
          startTime: "9:00",
          breakStarts: ["12:00"],
          breakEnds: ["13:00"],
        }),
      ]),
      NOW,
    );

    // 9:00〜15:00 から休憩 1h を引いて 5h 経過。貯金 +1h なので残り 8−1−5 = 2h
    expect(result.clockOutTarget).toEqual({ remainingHours: 2, targetLabel: "17:00" });
  });

  test("過去日の退勤打刻忘れの行は勤務中とみなさない (issue #46)", () => {
    const result = buildPopupBannerData(
      makeData([makeDashboardRow({ date: "06/30（火）", startTime: "9:00" })]),
      NOW,
    );

    expect(result.clockOutTarget).toBeNull();
  });

  test("前日付の行が最後の出勤打刻なら日跨ぎ勤務中とみなす", () => {
    // 2026-07-03 01:00 JST
    const afterMidnight = new Date("2026-07-02T16:00:00.000Z");
    const result = buildPopupBannerData(
      makeData([makeDashboardRow({ date: "07/02（木）", startTime: "20:00" })]),
      afterMidnight,
    );

    // 20:00〜翌1:00 の 5h 勤務。残り 3h で 4:00
    expect(result.clockOutTarget).toEqual({ remainingHours: 3, targetLabel: "4:00" });
  });

  test("前日付の行でも後続の行に出勤打刻があれば勤務中とみなさない", () => {
    const result = buildPopupBannerData(
      makeData([
        makeDashboardRow({ date: "07/01（水）", startTime: "9:00" }),
        makeDashboardRow({ date: "07/02（木）", actual: 9, startTime: "9:00", endTime: "19:00" }),
      ]),
      NOW,
    );

    expect(result.clockOutTarget).toBeNull();
  });

  test("休憩中は休憩開始までの勤務時間で退勤目安を出す", () => {
    const result = buildPopupBannerData(
      makeData([
        makeDashboardRow({ date: "07/02（木）", startTime: "9:00", breakStarts: ["14:00"] }),
      ]),
      NOW,
    );

    // 9:00〜14:00 の 5h 勤務。残り 3h を 15:00 から足して 18:00
    expect(result.clockOutTarget).toEqual({ remainingHours: 3, targetLabel: "18:00" });
  });

  test("基準外労働時間が保存されていれば残業はそれを使う (issue #44)", () => {
    const result = buildPopupBannerData(
      makeData([makeDashboardRow({ actual: 10, fixedWork: 8 })], { statutoryOvertime: 5 }),
      NOW,
    );

    expect(result.currentOvertime).toBe(5);
  });
});
