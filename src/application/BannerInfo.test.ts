import { describe, test, expect } from "vitest";
import { buildBannerLines, type BannerLine } from "./BannerInfo";

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
      projectedOvertime: 20,
    });
    expect(lines).toHaveLength(2);
    expect(lineText(lines[0])).toContain("残り 10日");
    expect(lineText(lines[0])).toContain("80:00");
    expect(lineText(lines[0])).toContain("8:00");
    expect(lineText(lines[1])).toContain("時間貯金");
    expect(lineText(lines[1])).toContain("+0:00");
    expect(lineHasColor(lines[1], "green")).toBe(true);
  });

  test("B: goal cleared case (remainingRequired <= 0)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 0,
      avgPerDay: 0,
      cumulativeDiff: 40,
      projectedOvertime: 30,
    });
    expect(lineText(lines[0])).toContain("+0:00");
    expect(lineText(lines[0])).toContain("クリア済み");
    expect(lineText(lines[0])).not.toContain("1日あたり平均");
  });

  test("I: projectedOvertime = 45 (exactly 45h → overtime warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 45,
    });
    expect(lines).toHaveLength(3);
    expect(lineHasColor(lines[2], "red")).toBe(true);
    expect(lineText(lines[2])).toContain("45時間超過");
    expect(lineText(lines[2])).not.toContain("回避可能");
  });

  test("G: projectedOvertime = 36.01 (80%+ → avoidance suggestion)", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 36.01,
    });
    expect(lines).toHaveLength(3);
    expect(lineHasColor(lines[2], "orange")).toBe(true);
    expect(lineText(lines[2])).toContain("回避可能");
    // maxDaily = 8 + (45 - 36.01) / 10 = 8.899 → 8:54
    expect(lineText(lines[2])).toContain("8:54");
  });

  test("F: projectedOvertime = 36 (exactly 80% → no warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 36,
    });
    expect(lines).toHaveLength(2);
  });

  test("A-negative: negative cumulativeDiff shows red color", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: -3,
      projectedOvertime: 10,
    });
    expect(lineHasColor(lines[1], "red")).toBe(true);
    expect(lineText(lines[1])).toContain("-");
  });

  test("K: remainingDays = 0, projectedOvertime = 40 (end of month, 80%+ but no remaining days → no warning)", () => {
    const lines = buildBannerLines({
      remainingDays: 0,
      remainingRequired: 0,
      avgPerDay: 0,
      cumulativeDiff: 0,
      projectedOvertime: 40,
    });
    expect(lines).toHaveLength(2);
  });
});
