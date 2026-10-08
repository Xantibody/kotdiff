import { describe, test, expect } from "vitest";
import { buildNotificationText } from "./NotificationInfo";
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

function makeData(rows: DashboardRow[]): DashboardData {
  // 2026-07-02 09:05 JST に保存
  return { rows, leaveBalances: [], generatedAt: "2026-07-02T00:05:00.000Z" };
}

// 2026-07-02 15:00 JST
const NOW = new Date("2026-07-02T06:00:00.000Z");

describe("buildNotificationText", () => {
  test("時間貯金を本文にし、いつのデータかを添える", () => {
    const text = buildNotificationText(
      makeData([makeDashboardRow({ actual: 9, startTime: "9:00", endTime: "19:00" })]),
      NOW,
    );

    expect(text.title).toBe("KotDiff");
    expect(text.message).toBe("💰 現在の時間貯金: +1:00\n（7/2 09:05 時点）");
  });

  test("勤務中なら退勤目安の行も入る", () => {
    const text = buildNotificationText(
      makeData([makeDashboardRow({ date: "07/02（木）", startTime: "9:00" })]),
      NOW,
    );

    expect(text.message.split("\n")).toHaveLength(3);
    expect(text.message).toContain("退勤目安");
  });
});
