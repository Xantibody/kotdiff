import { describe, test, expect } from "vitest";

import { defined } from "../../test-utils";
import { parseRow, rawRowToDashboardRow, parseKotTable } from "./KotTableParser";
import type { RawTableRow } from "./RawTableRow";

function createRow(
  data: Record<string, string>,
  classes: Record<string, string[]> = {},
  pCells: string[] = [],
): Element {
  const doc = document;
  const tr = doc.createElement("tr");
  for (const [sortIndex, text] of Object.entries(data)) {
    const td = doc.createElement("td");
    td.setAttribute("data-ht-sort-index", sortIndex);
    if (classes[sortIndex]) {
      td.classList.add(...classes[sortIndex]);
    }
    if (pCells.includes(sortIndex)) {
      const p = doc.createElement("p");
      p.textContent = text;
      td.appendChild(p);
    } else {
      td.textContent = text;
    }
    tr.appendChild(td);
  }
  return tr;
}

describe("parseRow", () => {
  test("extracts date and dayType", () => {
    const row = createRow({
      WORK_DAY: "03/01",
      WORK_DAY_TYPE: "平日",
      SCHEDULE: "定時",
    });
    const raw = parseRow(row);
    expect(raw.date).toBe("03/01");
    expect(raw.dayType).toBe("平日");
    expect(raw.scheduleText).toBe("定時");
  });

  test("detects saturday class", () => {
    const row = createRow(
      { WORK_DAY: "03/01", WORK_DAY_TYPE: "土", SCHEDULE: "" },
      { WORK_DAY: ["htBlock-scrollTable_saturday"] },
    );
    const raw = parseRow(row);
    expect(raw.isSaturday).toBe(true);
    expect(raw.isSunday).toBe(false);
  });

  test("detects sunday class", () => {
    const row = createRow(
      { WORK_DAY: "03/02", WORK_DAY_TYPE: "日", SCHEDULE: "" },
      { WORK_DAY: ["htBlock-scrollTable_sunday"] },
    );
    const raw = parseRow(row);
    expect(raw.isSaturday).toBe(false);
    expect(raw.isSunday).toBe(true);
  });

  test("detects public holiday in schedule", () => {
    const row = createRow({
      WORK_DAY: "03/03",
      WORK_DAY_TYPE: "平日",
      SCHEDULE: "公休",
    });
    const raw = parseRow(row);
    expect(raw.hasPublicHoliday).toBe(true);
  });

  test("reads work minute text from p element", () => {
    const row = createRow(
      {
        WORK_DAY: "03/04",
        WORK_DAY_TYPE: "平日",
        SCHEDULE: "",
        ALL_WORK_MINUTE: "8.00",
        FIXED_WORK_MINUTE: "8.00",
        OVERTIME_WORK_MINUTE: "0.00",
        REST_MINUTE: "1.00",
      },
      {},
      ["ALL_WORK_MINUTE", "FIXED_WORK_MINUTE", "OVERTIME_WORK_MINUTE", "REST_MINUTE"],
    );
    const raw = parseRow(row);
    expect(raw.allWorkMinuteText).toBe("8.00");
    expect(raw.fixedWorkMinuteText).toBe("8.00");
    expect(raw.restMinuteText).toBe("1.00");
  });
});

describe("rawRowToDashboardRow", () => {
  test("weekday with actual work time", () => {
    const raw = {
      date: "03/04",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "8.00",
      fixedWorkMinuteText: "8.00",
      overtimeWorkMinuteText: "0.00",
      restMinuteText: "1.00",
      startTimeText: "9:00",
      endTimeText: "18:00",
      restStartTimeText: "12:00",
      restEndTimeText: "13:00",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.date).toBe("03/04");
    expect(row.isWeekend).toBe(false);
    expect(row.working).toBe(true);
    expect(row.actual).toBe(8);
    expect(row.fixedWork).toBe(8);
    expect(row.breakTime).toBe(1);
    expect(row.startTime).toBe("9:00");
    expect(row.endTime).toBe("18:00");
    expect(row.breakStarts).toEqual(["12:00"]);
    expect(row.breakEnds).toEqual(["13:00"]);
  });

  test("weekend day with empty schedule is not working", () => {
    const raw = {
      date: "03/01",
      dayType: "土",
      isSaturday: true,
      isSunday: false,
      allWorkMinuteText: "",
      fixedWorkMinuteText: "",
      overtimeWorkMinuteText: "",
      restMinuteText: "",
      startTimeText: "",
      endTimeText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.isWeekend).toBe(true);
    expect(row.working).toBe(false);
  });

  test("sunday with empty schedule is not working", () => {
    const raw = {
      date: "03/02",
      dayType: "日",
      isSaturday: false,
      isSunday: true,
      allWorkMinuteText: "",
      fixedWorkMinuteText: "",
      overtimeWorkMinuteText: "",
      restMinuteText: "",
      startTimeText: "",
      endTimeText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.isWeekend).toBe(true);
    expect(row.working).toBe(false);
  });

  test("public holiday is not working", () => {
    const raw = {
      date: "03/05",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "",
      fixedWorkMinuteText: "",
      overtimeWorkMinuteText: "",
      restMinuteText: "",
      startTimeText: "",
      endTimeText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "公休",
      hasPublicHoliday: true,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.working).toBe(false);
    expect(row.schedule).toBe("公休");
  });

  test("non-public-holiday schedule on weekday is working", () => {
    const raw = {
      date: "03/06",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "8.00",
      fixedWorkMinuteText: "8.00",
      overtimeWorkMinuteText: "0.00",
      restMinuteText: "1.00",
      startTimeText: "9:00",
      endTimeText: "18:00",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "フレックス",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.working).toBe(true);
  });

  test("schedule is null when scheduleText is empty", () => {
    const raw = {
      date: "03/07",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "",
      fixedWorkMinuteText: "",
      overtimeWorkMinuteText: "",
      restMinuteText: "",
      startTimeText: "",
      endTimeText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.schedule).toBeNull();
  });

  test("night overtime calculation for late work", () => {
    // Start 21:00, end 23:00 — 1 hour of night time (22:00-23:00), no breaks
    const raw = {
      date: "03/08",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "2.00",
      fixedWorkMinuteText: "8.00",
      overtimeWorkMinuteText: "0.00",
      restMinuteText: "0.00",
      startTimeText: "21:00",
      endTimeText: "23:00",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.nightOvertime).not.toBeNull();
    expect(row.nightOvertime).toBeCloseTo(1, 5);
  });

  test("no night overtime for daytime work", () => {
    const raw = {
      date: "03/09",
      dayType: "平日",
      isSaturday: false,
      isSunday: false,
      allWorkMinuteText: "8.00",
      fixedWorkMinuteText: "8.00",
      overtimeWorkMinuteText: "0.00",
      restMinuteText: "1.00",
      startTimeText: "9:00",
      endTimeText: "18:00",
      restStartTimeText: "12:00",
      restEndTimeText: "13:00",
      scheduleText: "",
      hasPublicHoliday: false,
    } satisfies RawTableRow;
    const row = rawRowToDashboardRow(raw);
    expect(row.nightOvertime).toBeNull();
  });
});

describe("parseKotTable", () => {
  test("returns array of RawTableRow from tbody", () => {
    const tbody = document.createElement("tbody");
    const tr1 = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.setAttribute("data-ht-sort-index", "WORK_DAY");
    td1.textContent = "03/01";
    tr1.appendChild(td1);
    const tdSchedule1 = document.createElement("td");
    tdSchedule1.setAttribute("data-ht-sort-index", "SCHEDULE");
    tdSchedule1.textContent = "";
    tr1.appendChild(tdSchedule1);
    tbody.appendChild(tr1);

    const tr2 = document.createElement("tr");
    const td2 = document.createElement("td");
    td2.setAttribute("data-ht-sort-index", "WORK_DAY");
    td2.textContent = "03/02";
    tr2.appendChild(td2);
    const tdSchedule2 = document.createElement("td");
    tdSchedule2.setAttribute("data-ht-sort-index", "SCHEDULE");
    tdSchedule2.textContent = "公休";
    tr2.appendChild(tdSchedule2);
    tbody.appendChild(tr2);

    const rows = parseKotTable(tbody);
    expect(rows).toHaveLength(2);
    expect(defined(rows[0]).date).toBe("03/01");
    expect(defined(rows[1]).date).toBe("03/02");
    expect(defined(rows[1]).hasPublicHoliday).toBe(true);
  });
});
