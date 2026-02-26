import { describe, expect, test } from "vitest";
import {
  type BannerLine,
  buildBannerLines,
  formatDiff,
  formatHM,
  getCellValue,
  isWorkingDay,
  parseWorkTime,
} from "./lib";

function lineText(line: BannerLine): string {
  return line.map((s) => s.text).join("");
}

function lineHasColor(line: BannerLine, color: string): boolean {
  return line.some((s) => s.color === color);
}

describe("parseWorkTime", () => {
  test('""  → null', () => {
    expect(parseWorkTime("")).toBeNull();
  });

  test('"8.00" → 8.0', () => {
    expect(parseWorkTime("8.00")).toBe(8.0);
  });

  test('"8.30" → 8.5', () => {
    expect(parseWorkTime("8.30")).toBe(8.5);
  });

  test('"0.00" → 0', () => {
    expect(parseWorkTime("0.00")).toBe(0);
  });

  test('"12.45" → 12.75', () => {
    expect(parseWorkTime("12.45")).toBe(12.75);
  });

  test('"  8.30  " → 8.5 (trim)', () => {
    expect(parseWorkTime("  8.30  ")).toBe(8.5);
  });

  test('"abc" → null', () => {
    expect(parseWorkTime("abc")).toBeNull();
  });

  test('"8.0" → null (minutes must be 2 digits)', () => {
    expect(parseWorkTime("8.0")).toBeNull();
  });

  test('"8:30" → null (colon not supported)', () => {
    expect(parseWorkTime("8:30")).toBeNull();
  });
});

describe("formatHM", () => {
  test("0 → 0:00", () => {
    expect(formatHM(0)).toBe("0:00");
  });

  test("8 → 8:00", () => {
    expect(formatHM(8)).toBe("8:00");
  });

  test("8.5 → 8:30", () => {
    expect(formatHM(8.5)).toBe("8:30");
  });

  test("-2.25 → 2:15 (absolute value)", () => {
    expect(formatHM(-2.25)).toBe("2:15");
  });

  test("0.9917 → 1:00 (0→1 繰り上がり: m=60 → h=1, m=0)", () => {
    expect(formatHM(0.9917)).toBe("1:00");
  });

  test("2.9917 → 3:00 (N→N+1 繰り上がり)", () => {
    expect(formatHM(2.9917)).toBe("3:00");
  });

  test("2.991 → 2:59 (閾値直下: 繰り上がらない)", () => {
    expect(formatHM(2.991)).toBe("2:59");
  });

  test("-2.9917 → 3:00 (負数での繰り上がり)", () => {
    expect(formatHM(-2.9917)).toBe("3:00");
  });

  test("99.9917 → 100:00 (大きな値での繰り上がり)", () => {
    expect(formatHM(99.9917)).toBe("100:00");
  });
});

describe("formatDiff", () => {
  test("0 → +0:00", () => {
    expect(formatDiff(0)).toBe("+0:00");
  });

  test("1.5 → +1:30", () => {
    expect(formatDiff(1.5)).toBe("+1:30");
  });

  test("-0.5 → -0:30", () => {
    expect(formatDiff(-0.5)).toBe("-0:30");
  });

  test("2.9917 → +3:00 (正の繰り上がり + 符号)", () => {
    expect(formatDiff(2.9917)).toBe("+3:00");
  });

  test("-2.9917 → -3:00 (負の繰り上がり + 符号)", () => {
    expect(formatDiff(-2.9917)).toBe("-3:00");
  });
});

describe("getCellValue", () => {
  function makeRow(sortIndex: string, text: string): Element {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", sortIndex);
    const p = document.createElement("p");
    p.textContent = text;
    td.appendChild(p);
    row.appendChild(td);
    return row;
  }

  test("セルあり → パース値", () => {
    const row = makeRow("ALL_WORK_MINUTE", "8.30");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBe(8.5);
  });

  test("空テキスト → null", () => {
    const row = makeRow("ALL_WORK_MINUTE", "");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBeNull();
  });

  test("セルなし → null", () => {
    const row = document.createElement("tr");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBeNull();
  });
});

describe("isWorkingDay", () => {
  function makeRow(scheduleText: string): Element {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", "SCHEDULE");
    td.textContent = scheduleText;
    row.appendChild(td);
    return row;
  }

  test('"複数回休憩" → true', () => {
    expect(isWorkingDay(makeRow("複数回休憩"))).toBe(true);
  });

  test('"複数回休憩(公休)" → false', () => {
    expect(isWorkingDay(makeRow("複数回休憩(公休)"))).toBe(false);
  });

  test("空文字 → false", () => {
    expect(isWorkingDay(makeRow(""))).toBe(false);
  });
});

describe("buildBannerLines", () => {
  test("A: 通常ケース（残日数あり、残業少）", () => {
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

  test("B: 時間貯金が赤字", () => {
    const lines = buildBannerLines({
      remainingDays: 15,
      remainingRequired: 130,
      avgPerDay: 8.67,
      cumulativeDiff: -10,
      projectedOvertime: 5,
    });
    expect(lineText(lines[1])).toContain("-10:00");
    expect(lineHasColor(lines[1], "red")).toBe(true);
  });

  test("C: remainingRequired = 0（ちょうど達成 → クリア済み）", () => {
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

  test("D: remainingRequired = -0.5（わずかに余剰 → クリア済み）", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: -0.5,
      avgPerDay: -0.1,
      cumulativeDiff: 40.5,
      projectedOvertime: 25,
    });
    expect(lineText(lines[0])).toContain("-0:30");
    expect(lineText(lines[0])).toContain("クリア済み");
    expect(lineText(lines[0])).not.toContain("1日あたり平均");
  });

  test("E: remainingRequired = -100（大幅に余剰）", () => {
    const lines = buildBannerLines({
      remainingDays: 0,
      remainingRequired: -100,
      avgPerDay: 0,
      cumulativeDiff: 100,
      projectedOvertime: 50,
    });
    expect(lineText(lines[0])).toContain("残り 0日");
    expect(lineText(lines[0])).toContain("-100:00");
    expect(lineText(lines[0])).toContain("クリア済み");
    expect(lineText(lines[0])).not.toContain("1日あたり平均");
  });

  test("F: projectedOvertime = 36（80%ちょうど → 警告なし）", () => {
    const lines = buildBannerLines({
      remainingDays: 10,
      remainingRequired: 80,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 36,
    });
    expect(lines).toHaveLength(2);
  });

  test("G: projectedOvertime = 36.01（80%超 → 回避案表示）", () => {
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

  test("H: projectedOvertime = 44.99, remainingDays = 1（45h直前 → 回避案表示）", () => {
    const lines = buildBannerLines({
      remainingDays: 1,
      remainingRequired: 8,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 44.99,
    });
    expect(lines).toHaveLength(3);
    expect(lineText(lines[2])).toContain("回避可能");
    // maxDaily = 8 + (45 - 44.99) / 1 = 8.01 → 8:01
    expect(lineText(lines[2])).toContain("8:01");
  });

  test("I: projectedOvertime = 45（ちょうど45h → 超過警告）", () => {
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

  test("J: projectedOvertime = 60（大幅超過）", () => {
    const lines = buildBannerLines({
      remainingDays: 5,
      remainingRequired: 40,
      avgPerDay: 8,
      cumulativeDiff: 0,
      projectedOvertime: 60,
    });
    expect(lineText(lines[2])).toContain("60:00");
    expect(lineText(lines[2])).toContain("45時間超過");
  });

  test("K: remainingDays = 0, projectedOvertime = 40（月末、80%超だが残日なし → 警告なし）", () => {
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
