import { describe, expect, test } from "vitest";

import { defined } from "../../test-utils";
import {
  getCell,
  getCellValue,
  isWorkingDay,
  detectInProgressRow,
  addColumnTooltips,
} from "./KotDomHelpers";

function makeCellValueRow(sortIndex: string, text: string): Element {
  const row = document.createElement("tr");
  const td = document.createElement("td");
  td.setAttribute("data-ht-sort-index", sortIndex);
  const p = document.createElement("p");
  p.textContent = text;
  td.appendChild(p);
  row.appendChild(td);
  return row;
}

function makeWorkingDayRow(
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

function appendCell(row: Element, sortIndex: string, text: string): void {
  const td = document.createElement("td");
  td.setAttribute("data-ht-sort-index", sortIndex);
  td.textContent = text;
  row.appendChild(td);
}

function makeInProgressRow(opts: {
  start?: string;
  end?: string;
  allWork?: string;
  restStarts?: string;
  restEnds?: string;
}): Element {
  const row = document.createElement("tr");
  if (opts.start !== undefined) appendCell(row, "START_TIMERECORD", opts.start);
  if (opts.end !== undefined) appendCell(row, "END_TIMERECORD", opts.end);
  if (opts.allWork !== undefined) appendCell(row, "ALL_WORK_MINUTE", opts.allWork);
  if (opts.restStarts !== undefined) appendCell(row, "REST_START_TIMERECORD", opts.restStarts);
  if (opts.restEnds !== undefined) appendCell(row, "REST_END_TIMERECORD", opts.restEnds);
  return row;
}

describe("getCell", () => {
  test("returns cell by sort index", () => {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", "ALL_WORK_MINUTE");
    row.appendChild(td);
    expect(getCell(row, "ALL_WORK_MINUTE")).toBe(td);
  });

  test("returns null when not found", () => {
    const row = document.createElement("tr");
    expect(getCell(row, "ALL_WORK_MINUTE")).toBeNull();
  });
});

describe("getCellValue", () => {
  test("returns numeric value from cell's <p> element", () => {
    const row = makeCellValueRow("ALL_WORK_MINUTE", "8.30");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBe(8.5);
  });

  test("returns null for empty text", () => {
    const row = makeCellValueRow("ALL_WORK_MINUTE", "");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBeNull();
  });

  test("returns null when cell not found", () => {
    const row = document.createElement("tr");
    expect(getCellValue(row, "ALL_WORK_MINUTE")).toBeNull();
  });
});

describe("isWorkingDay", () => {
  test("returns true for weekday with empty schedule", () => {
    expect(isWorkingDay(makeWorkingDayRow(""))).toBe(true);
  });

  test("returns false for saturday with empty schedule", () => {
    expect(isWorkingDay(makeWorkingDayRow("", "saturday"))).toBe(false);
  });

  test("returns false for sunday with empty schedule", () => {
    expect(isWorkingDay(makeWorkingDayRow("", "sunday"))).toBe(false);
  });

  test("returns false for public holiday", () => {
    expect(isWorkingDay(makeWorkingDayRow("複数回休憩(公休)"))).toBe(false);
  });

  test("returns true for non-holiday schedule", () => {
    expect(isWorkingDay(makeWorkingDayRow("複数回休憩"))).toBe(true);
  });

  test("returns false when WORK_DAY cell is missing and schedule is empty", () => {
    expect(isWorkingDay(makeWorkingDayRow("", undefined, false))).toBe(false);
  });

  test("returns false for row with specific-uncomplete class", () => {
    const row = document.createElement("tr");
    const scheduleTd = document.createElement("td");
    scheduleTd.setAttribute("data-ht-sort-index", "SCHEDULE");
    scheduleTd.textContent = "";
    row.appendChild(scheduleTd);
    const errorTd = document.createElement("td");
    errorTd.classList.add("specific-uncomplete");
    row.appendChild(errorTd);
    expect(isWorkingDay(row)).toBe(false);
  });
});

function makeTable(headers: string[], rows: string[][]): HTMLTableElement {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const cells of rows) {
    const tr = document.createElement("tr");
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

describe("addColumnTooltips", () => {
  test("sets data-kotdiff-tooltip on each td matching header name", () => {
    const table = makeTable(["日付", "勤務時間"], [["03/04", "8:00"]]);
    addColumnTooltips(table);
    const tds = table.querySelectorAll("tbody tr td");
    expect(defined(tds[0]).getAttribute("data-kotdiff-tooltip")).toBe("日付");
    expect(defined(tds[1]).getAttribute("data-kotdiff-tooltip")).toBe("勤務時間");
  });

  test("does nothing when thead or tbody is missing", () => {
    const table = document.createElement("table");
    expect(() => addColumnTooltips(table)).not.toThrow();
  });

  test("skips empty header names", () => {
    const table = makeTable(["日付", ""], [["03/04", "8:00"]]);
    addColumnTooltips(table);
    const tds = table.querySelectorAll("tbody tr td");
    expect(defined(tds[0]).getAttribute("data-kotdiff-tooltip")).toBe("日付");
    expect(defined(tds[1]).getAttribute("data-kotdiff-tooltip")).toBeNull();
  });
});

describe("detectInProgressRow", () => {
  test("returns null for completed row (has end time)", () => {
    const row = makeInProgressRow({ start: "09:00", end: "18:00", allWork: "8.00" });
    expect(detectInProgressRow(row)).toBeNull();
  });

  test("returns null for row with no start time", () => {
    const row = makeInProgressRow({ start: "", end: "", allWork: "" });
    expect(detectInProgressRow(row)).toBeNull();
  });

  test("returns InProgressRowData for in-progress row (no breaks)", () => {
    const row = makeInProgressRow({
      start: "09:00",
      end: "",
      allWork: "",
      restStarts: "",
      restEnds: "",
    });
    const result = detectInProgressRow(row);
    expect(result).not.toBeNull();
    expect(result!.startTime).toBe(9);
    expect(result!.restStarts).toEqual([]);
    expect(result!.restEnds).toEqual([]);
    expect(result!.isOnBreak).toBe(false);
  });

  test("returns InProgressRowData for row currently on break", () => {
    const row = makeInProgressRow({
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
});
