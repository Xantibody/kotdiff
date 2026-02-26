import { describe, expect, test } from "vitest";
import { formatDiff, formatHM, getCellValue, isWorkingDay, parseWorkTime } from "./lib";

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
