import { describe, test, expect } from "vitest";
import { buildBannerLines, type BannerLine } from "./BannerInfo";

import { defined } from "../test-utils";

function lineText(line: BannerLine): string {
  return line.map((s) => s.text).join("");
}

function lineHasColor(line: BannerLine, color: string): boolean {
  return line.some((s) => s.color === color);
}

describe("buildBannerLines", () => {
  test("A: normal case (remaining days, low overtime)", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 20,
    });
    expect(lines).toHaveLength(2);
    expect(lineText(defined(lines[0]))).toContain("残り 10日");
    expect(lineText(defined(lines[0]))).toContain("80:00");
    expect(lineText(defined(lines[0]))).toContain("8:00");
    expect(lineText(defined(lines[1]))).toContain("時間貯金");
    expect(lineText(defined(lines[1]))).toContain("+0:00");
    expect(lineHasColor(defined(lines[1]), "green")).toBe(true);
  });

  test("B: goal cleared case (remainingRequired <= 0)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 0,
      avgPerDay: 0,
      cumulativeDiff: 40,
      currentOvertime: 30,
    });
    expect(lines).toHaveLength(2);
    expect(lineText(defined(lines[0]))).toContain("残り 5日");
    expect(lineText(defined(lines[0]))).toContain("余剰");
    expect(lineText(defined(lines[0]))).toContain("0:00");
    expect(lineText(defined(lines[0]))).toContain("クリア済み");
    expect(lineText(defined(lines[0]))).not.toContain("1日あたり平均");
    expect(lineText(defined(lines[0]))).not.toContain("必要時間");
    expect(lineText(defined(lines[1]))).toContain("時間貯金");
  });

  test("B2: goal cleared with surplus (remainingRequired < 0)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: -5,
      avgPerDay: 0,
      cumulativeDiff: 45,
      currentOvertime: 30,
    });
    expect(lines).toHaveLength(2);
    expect(lineText(defined(lines[0]))).toContain("残り 5日");
    expect(lineText(defined(lines[0]))).toContain("余剰");
    expect(lineText(defined(lines[0]))).toContain("5:00");
    expect(lineText(defined(lines[0]))).not.toContain("-5");
    expect(lineText(defined(lines[0]))).not.toContain("必要時間");
    expect(lineText(defined(lines[0]))).not.toContain("1日あたり平均");
    expect(lineText(defined(lines[0]))).toContain("クリア済み");
    expect(lineText(defined(lines[1]))).toContain("時間貯金");
  });

  test("I: projectedOvertime = 45 (exactly 45h → overtime warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 45,
    });
    expect(lines).toHaveLength(3);
    expect(lineHasColor(defined(lines[2]), "red")).toBe(true);
    expect(lineText(defined(lines[2]))).toContain("45時間超過");
    expect(lineText(defined(lines[2]))).not.toContain("回避可能");
  });

  test("G: projectedOvertime = 36.01 (80%+ → avoidance suggestion)", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 36.01,
    });
    expect(lines).toHaveLength(3);
    expect(lineHasColor(defined(lines[2]), "orange")).toBe(true);
    expect(lineText(defined(lines[2]))).toContain("回避可能");
    // maxDaily = 8 + (45 - 36.01) / 10 = 8.899 → 8:54
    expect(lineText(defined(lines[2]))).toContain("8:54");
  });

  test("F: projectedOvertime = 36 (exactly 80% → no warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 36,
    });
    expect(lines).toHaveLength(2);
  });

  test("A-negative: negative cumulativeDiff shows red color", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: -3,
      currentOvertime: 10,
    });
    expect(lineHasColor(defined(lines[1]), "red")).toBe(true);
    expect(lineText(defined(lines[1]))).toContain("-");
  });

  test("K: remainingDays = 0, projectedOvertime = 40 (end of month, 80%+ but no remaining days → no warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 0,
      remainingRequired: 0,
      avgPerDay: 0,
      cumulativeDiff: 0,
      currentOvertime: 40,
    });
    expect(lines).toHaveLength(2);
  });

  test("remainingDays=0 with unmet required time omits the meaningless avg (issue #26)", () => {
    const lines = buildBannerLines({
      remainingDays: 0,
      remainingRequired: 5,
      avgPerDay: 0,
      cumulativeDiff: -5,
      currentOvertime: 0,
    });
    const first = lineText(defined(lines[0]));
    expect(first).toContain("残り 0日");
    expect(first).toContain("不足 5:00");
    expect(first).not.toContain("1日あたり平均");
  });

  test("shows error work warning with dates and causes in the banner", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 0,
      errorWork: [
        { date: "07/02", cause: "missing-clock-out" },
        { date: "07/05", cause: "unknown" },
      ],
    });
    const warn = lines.find((l) => lineText(l).includes("エラー勤務"));
    expect(warn).toBeDefined();
    const text = lineText(defined(warn));
    expect(text).toContain("2日");
    expect(text).toContain("07/02 退勤打刻の漏れ?");
    // 原因不明の日は日付のみ
    expect(text).toContain("07/05");
    expect(text).not.toContain("07/05 ");
    expect(lineHasColor(defined(warn), "orange")).toBe(true);
  });

  test("no error work warning when errorWork is omitted or empty", () => {
    const base = {
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 0,
    };
    expect(buildBannerLines(base).some((l) => lineText(l).includes("エラー勤務"))).toBe(false);
    expect(
      buildBannerLines({ ...base, errorWork: [] }).some((l) => lineText(l).includes("エラー勤務")),
    ).toBe(false);
  });

  test("shows clock-out target while working (issue #53)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 2,
      currentOvertime: 0,
      clockOutTarget: { remainingHours: 5, targetLabel: "15:00" },
    });
    const line = lines.find((l) => lineText(l).includes("退勤目安"));
    expect(line).toBeDefined();
    const text = lineText(defined(line));
    expect(text).toContain("あと 5:00 で貯金±0");
    expect(text).toContain("退勤目安 15:00");
  });

  test("shows achieved note when clock-out target is already met", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 5,
      currentOvertime: 0,
      clockOutTarget: { remainingHours: -1, targetLabel: "13:00" },
    });
    const line = lines.find((l) => lineText(l).includes("本日分の目標達成済み"));
    expect(line).toBeDefined();
    expect(lineText(defined(line))).toContain("今退勤すると貯金 +1:00");
  });

  test("no clock-out line when not in progress", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 0,
      currentOvertime: 0,
    });
    expect(lines.some((l) => lineText(l).includes("退勤目安"))).toBe(false);
  });
});
