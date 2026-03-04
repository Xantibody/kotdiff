import { describe, expect, test } from "vitest";
import {
  type BannerLine,
  type InProgressRowData,
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
  parseTimeRecord,
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

  test("now < start → 0にクランプ", () => {
    const data: InProgressRowData = {
      startTime: 9,
      restStarts: [],
      restEnds: [],
      isOnBreak: false,
    };
    const result = calcEstimatedWorkTime(data, 8);
    expect(result.workTime).toBe(0);
  });
});

describe("nowAsDecimalHours", () => {
  test("UTC 00:00 → JST 9.0", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    expect(nowAsDecimalHours(date)).toBe(9);
  });

  test("UTC 05:30 → JST 14.5", () => {
    const date = new Date("2026-03-05T05:30:00Z");
    expect(nowAsDecimalHours(date)).toBe(14.5);
  });

  test("UTC 15:00 → JST 翌0:00 → 24.0", () => {
    const date = new Date("2026-03-05T15:00:00Z");
    expect(nowAsDecimalHours(date)).toBe(24);
  });

  test("UTC 16:30 → JST 翌1:30 → 25.5", () => {
    const date = new Date("2026-03-05T16:30:00Z");
    expect(nowAsDecimalHours(date)).toBe(25.5);
  });
});
