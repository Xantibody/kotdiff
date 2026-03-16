import { describe, expect, test } from "vitest";
import {
  type BannerLine,
  type InProgressRowData,
  type RowInput,
  accumulateRows,
  buildBannerLines,
  calcEstimatedWorkTime,
  detectInProgressRow,
  extractTimeStrings,
  formatAttendance,
  formatBreakPairs,
  formatDiff,
  formatHM,
  getCellValue,
  isBreakSufficient,
  isWorkingDay,
  nowAsDecimalHours,
  parseAllTimeRecords,
  parseLeaveBalanceText,
  parseTimeRecord,
  parseWorkTime,
  buildDashboardSummary,
} from "./worktime";
import type { DashboardData, DashboardRow } from "./types";

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
  function makeRow(
    scheduleText: string,
    dayClass?: "saturday" | "sunday",
    hasDayCell = true,
  ): Element {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", "SCHEDULE");
    td.textContent = scheduleText;
    row.appendChild(td);
    if (hasDayCell) {
      const dayTd = document.createElement("td");
      dayTd.setAttribute("data-ht-sort-index", "WORK_DAY");
      if (dayClass === "saturday") {
        dayTd.classList.add("htBlock-scrollTable_saturday");
      } else if (dayClass === "sunday") {
        dayTd.classList.add("htBlock-scrollTable_sunday");
      }
      row.appendChild(dayTd);
    }
    return row;
  }

  test('"複数回休憩" → true', () => {
    expect(isWorkingDay(makeRow("複数回休憩"))).toBe(true);
  });

  test('"複数回休憩(公休)" → false', () => {
    expect(isWorkingDay(makeRow("複数回休憩(公休)"))).toBe(false);
  });

  test("空文字 + 平日 → true", () => {
    expect(isWorkingDay(makeRow(""))).toBe(true);
  });

  test("空文字 + 土曜 → false", () => {
    expect(isWorkingDay(makeRow("", "saturday"))).toBe(false);
  });

  test("空文字 + 日曜 → false", () => {
    expect(isWorkingDay(makeRow("", "sunday"))).toBe(false);
  });

  test("空文字 + WORK_DAYセルなし → false", () => {
    expect(isWorkingDay(makeRow("", undefined, false))).toBe(false);
  });
});

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

describe("extractTimeStrings", () => {
  test("空文字 → []", () => {
    expect(extractTimeStrings("")).toEqual([]);
  });

  test("単一時刻", () => {
    expect(extractTimeStrings("12:00")).toEqual(["12:00"]);
  });

  test("複数時刻（テキスト混在）", () => {
    expect(extractTimeStrings("A 18:45\nA 20:03")).toEqual(["18:45", "20:03"]);
  });
});

describe("formatBreakPairs", () => {
  test("空配列 → []", () => {
    expect(formatBreakPairs([], [])).toEqual([]);
  });

  test("1ペア", () => {
    expect(formatBreakPairs(["12:00"], ["13:00"])).toEqual(["12:00 ~ 13:00"]);
  });

  test("複数ペア", () => {
    expect(formatBreakPairs(["12:00", "15:00"], ["13:00", "15:15"])).toEqual([
      "12:00 ~ 13:00",
      "15:00 ~ 15:15",
    ]);
  });

  test("休憩中（終了なし）", () => {
    expect(formatBreakPairs(["12:00"], [])).toEqual(["12:00 ~ "]);
  });
});

describe("formatAttendance", () => {
  test('両方あり: ("9:00", "18:00") → "9:00 ~ 18:00"', () => {
    expect(formatAttendance("9:00", "18:00")).toBe("9:00 ~ 18:00");
  });

  test('出勤のみ（勤務中）: ("9:00", "") → "9:00 ~"', () => {
    expect(formatAttendance("9:00", "")).toBe("9:00 ~");
  });

  test('退勤のみ（異常）: ("", "18:00") → "~ 18:00"', () => {
    expect(formatAttendance("", "18:00")).toBe("~ 18:00");
  });

  test('両方なし（休日等）: ("", "") → ""', () => {
    expect(formatAttendance("", "")).toBe("");
  });
});

describe("parseTimeRecord", () => {
  test('"" → null', () => {
    expect(parseTimeRecord("")).toBeNull();
  });

  test('"09:36" → 9.6', () => {
    expect(parseTimeRecord("09:36")).toBe(9.6);
  });

  test('"0:00" → 0', () => {
    expect(parseTimeRecord("0:00")).toBe(0);
  });

  test('"23:59" → 23 + 59/60', () => {
    expect(parseTimeRecord("23:59")).toBeCloseTo(23 + 59 / 60);
  });

  test('"  09:36  " → 9.6 (trim)', () => {
    expect(parseTimeRecord("  09:36  ")).toBe(9.6);
  });

  test('"abc" → null', () => {
    expect(parseTimeRecord("abc")).toBeNull();
  });

  test('"9.36" → null (dot not supported)', () => {
    expect(parseTimeRecord("9.36")).toBeNull();
  });

  test('"25:00" → 25 (deep night shift allowed)', () => {
    expect(parseTimeRecord("25:00")).toBe(25);
  });
});

describe("parseAllTimeRecords", () => {
  test("空文字 → []", () => {
    expect(parseAllTimeRecords("")).toEqual([]);
  });

  test("単一時刻", () => {
    expect(parseAllTimeRecords("11:30")).toEqual([11.5]);
  });

  test("複数時刻（改行・テキスト混在）", () => {
    const text = "A\n11:25\nA\n19:24\n";
    const result = parseAllTimeRecords(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(11 + 25 / 60);
    expect(result[1]).toBeCloseTo(19 + 24 / 60);
  });

  test("時刻なしテキスト → []", () => {
    expect(parseAllTimeRecords("hello world")).toEqual([]);
  });
});

describe("detectInProgressRow", () => {
  function makeCell(row: Element, sortIndex: string, text: string): void {
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", sortIndex);
    const p = document.createElement("p");
    p.textContent = text;
    td.appendChild(p);
    row.appendChild(td);
  }

  function makeRow(opts: {
    start?: string;
    end?: string;
    allWork?: string;
    restStarts?: string;
    restEnds?: string;
  }): Element {
    const row = document.createElement("tr");
    if (opts.start !== undefined) makeCell(row, "START_TIMERECORD", opts.start);
    if (opts.end !== undefined) makeCell(row, "END_TIMERECORD", opts.end);
    if (opts.allWork !== undefined) makeCell(row, "ALL_WORK_MINUTE", opts.allWork);
    if (opts.restStarts !== undefined) makeCell(row, "REST_START_TIMERECORD", opts.restStarts);
    if (opts.restEnds !== undefined) makeCell(row, "REST_END_TIMERECORD", opts.restEnds);
    return row;
  }

  test("退勤済み → null", () => {
    const row = makeRow({ start: "09:00", end: "18:00", allWork: "8.00" });
    expect(detectInProgressRow(row)).toBeNull();
  });

  test("未出勤 → null", () => {
    const row = makeRow({ start: "", end: "", allWork: "" });
    expect(detectInProgressRow(row)).toBeNull();
  });

  test("業務中（休憩なし）", () => {
    const row = makeRow({ start: "09:00", end: "", allWork: "", restStarts: "", restEnds: "" });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.startTime).toBe(9);
    expect(result!.restStarts).toEqual([]);
    expect(result!.restEnds).toEqual([]);
    expect(result!.isOnBreak).toBe(false);
  });

  test("業務中（休憩1回完了後）", () => {
    const row = makeRow({
      start: "09:00",
      end: "",
      allWork: "",
      restStarts: "A\n12:00\n",
      restEnds: "A\n13:00\n",
    });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.startTime).toBe(9);
    expect(result!.restStarts).toEqual([12]);
    expect(result!.restEnds).toEqual([13]);
    expect(result!.isOnBreak).toBe(false);
  });

  test("休憩中", () => {
    const row = makeRow({
      start: "09:00",
      end: "",
      allWork: "",
      restStarts: "A\n12:00\n",
      restEnds: "",
    });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.isOnBreak).toBe(true);
  });

  test("2回目の休憩中", () => {
    const row = makeRow({
      start: "09:00",
      end: "",
      allWork: "",
      restStarts: "A\n12:00\nA\n15:00\n",
      restEnds: "A\n13:00\n",
    });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.restStarts).toHaveLength(2);
    expect(result!.restEnds).toHaveLength(1);
    expect(result!.isOnBreak).toBe(true);
  });

  test("レコードサイン付き出勤（A 11:51）", () => {
    const row = makeRow({
      start: "A\n11:51\n",
      end: "",
      allWork: "",
      restStarts: "",
      restEnds: "",
    });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.startTime).toBeCloseTo(11 + 51 / 60);
    expect(result!.isOnBreak).toBe(false);
  });

  test("レコードサイン付き退勤済み → null", () => {
    const row = makeRow({
      start: "A\n09:00\n",
      end: "A\n18:00\n",
      allWork: "8.00",
    });
    expect(detectInProgressRow(row)).toBeNull();
  });
});

describe("calcEstimatedWorkTime", () => {
  test("休憩なし業務中（09:00開始, now=17:00 → 8.0h）", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 17);
    expect(result.workTime).toBe(8);
    expect(result.isOnBreak).toBe(false);
  });

  test("休憩1回後の業務中（09:00開始, 12-13休憩, now=18:00 → 8.0h）", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [12],
      restEnds: [13],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 18);
    expect(result.workTime).toBe(8);
    expect(result.isOnBreak).toBe(false);
  });

  test("休憩中（09:00開始, 12:00から休憩 → 3.0h で凍結）", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [12],
      restEnds: [],
      isOnBreak: true,
    };
    const result = calcEstimatedWorkTime(data, 12.5);
    expect(result.workTime).toBe(3);
    expect(result.isOnBreak).toBe(true);
  });

  test("休憩中は now が変わっても workTime 不変", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [12],
      restEnds: [],
      isOnBreak: true,
    };
    const result1 = calcEstimatedWorkTime(data, 12.5);
    const result2 = calcEstimatedWorkTime(data, 14);
    expect(result1.workTime).toBe(result2.workTime);
  });

  test("2回目の休憩中", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [12, 15],
      restEnds: [13],
      isOnBreak: true,
    };
    // elapsed = 15 - 9 = 6, completed break = 13 - 12 = 1, work = 6 - 1 = 5
    const result = calcEstimatedWorkTime(data, 16);
    expect(result.workTime).toBe(5);
    expect(result.isOnBreak).toBe(true);
  });

  test("開始直後（≈0h）", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 9);
    expect(result.workTime).toBe(0);
  });

  test("日跨ぎ（22:00開始, now=1:00 → 3.0h）", () => {
    const data: InProgressRowData = {
      startTime: 22,
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 1);
    expect(result.workTime).toBe(3);
  });

  test("早朝出勤（6:00開始, now=7:00 → 1.0h）", () => {
    const data: InProgressRowData = {
      startTime: 6,
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 7);
    expect(result.workTime).toBe(1);
  });

  test("深夜帯の休憩（22:00開始, 0:30-1:00休憩, now=2:00 → 3.5h）", () => {
    const data: InProgressRowData = {
      startTime: 22,
      restStarts: [24.5],
      restEnds: [25],
      isOnBreak: false,
    };
    // now=2:00 → +24 = 26, elapsed = 26-22 = 4, break = 0.5, work = 3.5
    const result = calcEstimatedWorkTime(data, 2);
    expect(result.workTime).toBe(3.5);
  });
});

describe("nowAsDecimalHours", () => {
  test("UTC 00:00 → JST 9:00", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    expect(nowAsDecimalHours(date)).toBe(9);
  });

  test("UTC 05:30 → JST 14:30", () => {
    const date = new Date("2026-03-05T05:30:00Z");
    expect(nowAsDecimalHours(date)).toBe(14.5);
  });

  test("UTC 15:00 → JST 0:00", () => {
    const date = new Date("2026-03-05T15:00:00Z");
    expect(nowAsDecimalHours(date)).toBe(0);
  });

  test("UTC 16:30 → JST 1:30", () => {
    const date = new Date("2026-03-05T16:30:00Z");
    expect(nowAsDecimalHours(date)).toBe(1.5);
  });

  test("UTC 22:00 → JST 7:00", () => {
    const date = new Date("2026-03-05T22:00:00Z");
    expect(nowAsDecimalHours(date)).toBe(7);
  });
});

describe("parseLeaveBalanceText", () => {
  test('残あり: "0.0 (残 5.0 )" → used=0, remaining=5', () => {
    const result = parseLeaveBalanceText("0.0\n(残\u00a05.0 )");
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(5);
  });

  test('残なし: "3.0" → used=3, remaining=null', () => {
    const result = parseLeaveBalanceText("3.0");
    expect(result.used).toBe(3);
    expect(result.remaining).toBeNull();
  });

  test('時間付き: "1.0 / 0H (残 4.0 )" → used=1, remaining=4', () => {
    const result = parseLeaveBalanceText("1.0 / 0H (残 4.0 )");
    expect(result.used).toBe(1);
    expect(result.remaining).toBe(4);
  });

  test("空文字 → used=0, remaining=null", () => {
    const result = parseLeaveBalanceText("");
    expect(result.used).toBe(0);
    expect(result.remaining).toBeNull();
  });

  test('半端な数値: "2.5 (残 10.5 )" → used=2.5, remaining=10.5', () => {
    const result = parseLeaveBalanceText("2.5 (残 10.5 )");
    expect(result.used).toBe(2.5);
    expect(result.remaining).toBe(10.5);
  });
});

describe("accumulateRows", () => {
  test("確定済みの勤務日のみ", () => {
    const rows: RowInput[] = [
      { actual: 9, fixedWork: 8, working: true, inProgress: null },
      { actual: 7.5, fixedWork: 8, working: true, inProgress: null },
    ];
    const result = accumulateRows(rows);
    // 9-8 + 7.5-8 = +0.5
    expect(result.cumulativeDiff).toBeCloseTo(0.5);
    expect(result.overtimeDiff).toBeCloseTo(0.5);
    expect(result.remainingDays).toBe(0);
  });

  test("業務中の行は cumulativeDiff に含めない", () => {
    const rows: RowInput[] = [
      { actual: 9, fixedWork: 8, working: true, inProgress: null },
      {
        actual: null,
        fixedWork: 8,
        working: true,
        inProgress: { estimatedWorkTime: 3, isOnBreak: false },
      },
    ];
    const result = accumulateRows(rows);
    // cumulativeDiff はバナー用: 確定分のみ = 9-8 = +1
    expect(result.cumulativeDiff).toBeCloseTo(1);
    expect(result.remainingDays).toBe(1);
    // 業務中の見込み差分は別途返す
    expect(result.inProgressEstimatedDiff).toBeCloseTo(3 - 8);
  });

  test("休日は集計しない", () => {
    const rows: RowInput[] = [{ actual: null, fixedWork: null, working: false, inProgress: null }];
    const result = accumulateRows(rows);
    expect(result.cumulativeDiff).toBe(0);
    expect(result.remainingDays).toBe(0);
  });

  test("未来の勤務日は remainingDays にカウント", () => {
    const rows: RowInput[] = [
      { actual: null, fixedWork: null, working: true, inProgress: null },
      { actual: null, fixedWork: null, working: true, inProgress: null },
    ];
    const result = accumulateRows(rows);
    expect(result.remainingDays).toBe(2);
  });

  test("業務中の行がない場合 inProgressEstimatedDiff は null", () => {
    const rows: RowInput[] = [{ actual: 8, fixedWork: 8, working: true, inProgress: null }];
    const result = accumulateRows(rows);
    expect(result.inProgressEstimatedDiff).toBeNull();
  });
});

// --- Dashboard summary tests (consolidated from dashboard-data.test.ts) ---

function makeDashboardRow(overrides: Partial<DashboardRow> = {}): DashboardRow {
  return {
    date: "01/01（月）",
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

function makeData(
  rows: DashboardRow[],
  leaveBalances: DashboardData["leaveBalances"] = [],
): DashboardData {
  return { rows, leaveBalances, generatedAt: "2026-03-16T00:00:00Z" };
}

describe("buildDashboardSummary", () => {
  test("空データ", () => {
    const summary = buildDashboardSummary(makeData([]));
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBe(0);
    expect(summary.cumulativeDiff).toBe(0);
    expect(summary.dailyRows).toEqual([]);
  });

  test("確定済みの勤務日", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({
          date: "03/01（月）",
          actual: 9,
          fixedWork: 8,
          overtime: 1,
          breakTime: 1,
        }),
        makeDashboardRow({
          date: "03/02（火）",
          actual: 7.5,
          fixedWork: 8,
          overtime: 0,
          breakTime: 1,
        }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(2);
    expect(summary.workedDays).toBe(2);
    expect(summary.remainingDays).toBe(0);
    expect(summary.totalActual).toBeCloseTo(16.5);
    expect(summary.cumulativeDiff).toBeCloseTo(0.5);
    // totalOvertime is actual - fixedWork: (9-8) + (7.5-8) = 0.5
    expect(summary.totalOvertime).toBeCloseTo(0.5);
    expect(summary.avgWorkTime).toBeCloseTo(8.25);

    expect(summary.dailyRows[0].diff).toBeCloseTo(1);
    expect(summary.dailyRows[0].cumulativeDiff).toBeCloseTo(1);
    expect(summary.dailyRows[1].diff).toBeCloseTo(-0.5);
    expect(summary.dailyRows[1].cumulativeDiff).toBeCloseTo(0.5);
  });

  test("working: false の行は勤務日に含めない", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({
          date: "03/01（土）",
          isWeekend: true,
          dayType: "所定休日",
          working: false,
        }),
        makeDashboardRow({
          date: "03/02（日）",
          isWeekend: true,
          dayType: "法定休日",
          working: false,
        }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(0);
    expect(summary.workedDays).toBe(0);
  });

  test("未来の勤務日は remainingDays にカウント", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01（月）", actual: 8, fixedWork: 8 }),
        makeDashboardRow({ date: "03/02（火）" }),
        makeDashboardRow({ date: "03/03（水）" }),
      ]),
    );
    expect(summary.totalWorkDays).toBe(3);
    expect(summary.workedDays).toBe(1);
    expect(summary.remainingDays).toBe(2);
  });

  test("projectedTotal: 勤務済みの平均から着地を予測", () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push(makeDashboardRow({ date: `03/0${i + 1}`, actual: 8.5, fixedWork: 8 }));
    }
    for (let i = 0; i < 10; i++) {
      rows.push(makeDashboardRow({ date: `03/${i + 6}` }));
    }
    const summary = buildDashboardSummary(makeData(rows));
    expect(summary.projectedTotal).toBeCloseTo(127.5);
  });

  test("projectedTotal: 0日勤務は0", () => {
    const summary = buildDashboardSummary(
      makeData([makeDashboardRow({ date: "03/01" }), makeDashboardRow({ date: "03/02" })]),
    );
    expect(summary.projectedTotal).toBe(0);
  });

  test("progressPercent: 実績/期待値の比率", () => {
    const rows = [];
    for (let i = 0; i < 5; i++) {
      rows.push(makeDashboardRow({ date: `03/0${i + 1}`, actual: 8.4, fixedWork: 8 }));
    }
    const summary = buildDashboardSummary(makeData(rows));
    expect(summary.progressPercent).toBeCloseTo(105);
  });

  test("progressPercent: 0日は0%", () => {
    const summary = buildDashboardSummary(makeData([]));
    expect(summary.progressPercent).toBe(0);
  });

  test("dailyRows に時刻フィールドがパススルーされる", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({
          date: "03/01",
          actual: 8,
          fixedWork: 8,
          startTime: "9:00",
          endTime: "18:00",
          breakStarts: ["12:00"],
          breakEnds: ["13:00"],
        }),
      ]),
    );
    expect(summary.dailyRows[0].startTime).toBe("9:00");
    expect(summary.dailyRows[0].endTime).toBe("18:00");
    expect(summary.dailyRows[0].breakStarts).toEqual(["12:00"]);
    expect(summary.dailyRows[0].breakEnds).toEqual(["13:00"]);
  });

  test("累積差分が正しく計算される", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 9, fixedWork: 8 }),
        makeDashboardRow({ date: "03/02", actual: 7, fixedWork: 8 }),
        makeDashboardRow({ date: "03/03", actual: 8.5, fixedWork: 8 }),
      ]),
    );
    expect(summary.dailyRows[0].cumulativeDiff).toBeCloseTo(1);
    expect(summary.dailyRows[1].cumulativeDiff).toBeCloseTo(0);
    expect(summary.dailyRows[2].cumulativeDiff).toBeCloseTo(0.5);
  });

  test("leaveBalances がパススルーされる", () => {
    const leaves = [
      { label: "有休", used: 2, remaining: 8 },
      { label: "代休", used: 1, remaining: 0 },
    ];
    const summary = buildDashboardSummary(makeData([], leaves));
    expect(summary.leaveBalances).toEqual(leaves);
  });

  test("schedule がパススルーされる", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 8, fixedWork: 8, schedule: "複数回休憩" }),
        makeDashboardRow({ date: "03/02", schedule: null }),
      ]),
    );
    expect(summary.dailyRows[0].schedule).toBe("複数回休憩");
    expect(summary.dailyRows[1].schedule).toBeNull();
  });

  test("totalOvertime は actual - fixedWork で計算される", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 10, fixedWork: 8 }),
        makeDashboardRow({ date: "03/02", actual: 7, fixedWork: 8 }),
      ]),
    );
    // (10-8) + (7-8) = 1
    expect(summary.totalOvertime).toBeCloseTo(1);
  });

  test("深夜残業が合計される (totalNightOvertime)", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 10, fixedWork: 8, nightOvertime: 1.5 }),
        makeDashboardRow({ date: "03/02", actual: 9, fixedWork: 8, nightOvertime: 0.5 }),
      ]),
    );
    expect(summary.totalNightOvertime).toBeCloseTo(2);
  });

  test("nightOvertime が null の場合はスキップ", () => {
    const summary = buildDashboardSummary(
      makeData([
        makeDashboardRow({ date: "03/01", actual: 10, fixedWork: 8, nightOvertime: null }),
        makeDashboardRow({ date: "03/02", actual: 9, fixedWork: 8, nightOvertime: 1 }),
      ]),
    );
    expect(summary.totalNightOvertime).toBeCloseTo(1);
  });

  test("nightOvertime が dailyRows にパススルーされる", () => {
    const summary = buildDashboardSummary(
      makeData([makeDashboardRow({ date: "03/01", actual: 9, fixedWork: 8, nightOvertime: 1.5 })]),
    );
    expect(summary.dailyRows[0].nightOvertime).toBeCloseTo(1.5);
  });

  test("working: false の行は残業にもカウントしない", () => {
    const summary = buildDashboardSummary(
      makeData([makeDashboardRow({ date: "03/01", actual: 10, fixedWork: 8, working: false })]),
    );
    expect(summary.totalOvertime).toBe(0);
    expect(summary.totalWorkDays).toBe(0);
  });
});
