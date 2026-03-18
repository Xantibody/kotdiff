import { describe, test, expect } from "vitest";
import { rawRowToWorkDay, workDayToDashboardRow } from "./WorkDayMapper";
import type { RawTableRow } from "./RawTableRow";

function makeRaw(overrides: Partial<RawTableRow> = {}): RawTableRow {
  return {
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
    ...overrides,
  };
}

describe("rawRowToWorkDay", () => {
  test("typical weekday raw row", () => {
    const day = rawRowToWorkDay(makeRaw());
    expect(day.date).toBe("03/04");
    expect(day.dayType).toBe("平日");
    expect(day.isWeekend).toBe(false);
    expect(day.working).toBe(true);
    expect(day.actual).toBe(8);
    expect(day.fixedWork).toBe(8);
    expect(day.breakTime).toBe(1);
    expect(day.startTime).toBe(9);
    expect(day.endTime).toBe(18);
    expect(day.breakStarts).toEqual([12]);
    expect(day.breakEnds).toEqual([13]);
    expect(day.schedule).toBeNull();
    expect(day.nightOvertime).toBeNull();
  });

  test("saturday — isWeekend true, working false", () => {
    const day = rawRowToWorkDay(
      makeRaw({
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
      }),
    );
    expect(day.isWeekend).toBe(true);
    expect(day.working).toBe(false);
  });

  test("public holiday — working false, schedule set", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        date: "03/05",
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
      }),
    );
    expect(day.working).toBe(false);
    expect(day.schedule).toBe("公休");
  });

  test("nightOvertime calculation for work starting at 21:00 ending at 23:00", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        allWorkMinuteText: "2.00",
        fixedWorkMinuteText: "8.00",
        overtimeWorkMinuteText: "0.00",
        restMinuteText: "0.00",
        startTimeText: "21:00",
        endTimeText: "23:00",
        restStartTimeText: "",
        restEndTimeText: "",
      }),
    );
    expect(day.nightOvertime).not.toBeNull();
    expect(day.nightOvertime).toBeCloseTo(1, 5);
  });

  test("no nightOvertime for daytime work (9:00-18:00)", () => {
    const day = rawRowToWorkDay(makeRaw());
    expect(day.nightOvertime).toBeNull();
  });

  test("startTime and endTime are decimal hours", () => {
    const day = rawRowToWorkDay(makeRaw({ startTimeText: "9:30", endTimeText: "18:30" }));
    expect(day.startTime).toBeCloseTo(9.5, 5);
    expect(day.endTime).toBeCloseTo(18.5, 5);
  });

  test("breakStarts and breakEnds are number arrays", () => {
    const day = rawRowToWorkDay(makeRaw());
    expect(Array.isArray(day.breakStarts)).toBe(true);
    expect(typeof day.breakStarts[0]).toBe("number");
    expect(Array.isArray(day.breakEnds)).toBe(true);
    expect(typeof day.breakEnds[0]).toBe("number");
  });
});

describe("workDayToDashboardRow", () => {
  test("converts decimal hours back to time strings", () => {
    const day = rawRowToWorkDay(makeRaw());
    const row = workDayToDashboardRow(day);
    expect(row.startTime).toBe("9:00");
    expect(row.endTime).toBe("18:00");
    expect(row.breakStarts).toEqual(["12:00"]);
    expect(row.breakEnds).toEqual(["13:00"]);
  });

  test("converts 9.5 → '9:30' and 18.5 → '18:30'", () => {
    const day = rawRowToWorkDay(makeRaw({ startTimeText: "9:30", endTimeText: "18:30" }));
    const row = workDayToDashboardRow(day);
    expect(row.startTime).toBe("9:30");
    expect(row.endTime).toBe("18:30");
  });

  test("null startTime and endTime remain null", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        startTimeText: "",
        endTimeText: "",
        restStartTimeText: "",
        restEndTimeText: "",
      }),
    );
    const row = workDayToDashboardRow(day);
    expect(row.startTime).toBeNull();
    expect(row.endTime).toBeNull();
  });

  test("round-trip: rawRowToWorkDay then workDayToDashboardRow preserves string-compatible fields", () => {
    const raw = makeRaw();
    const row = workDayToDashboardRow(rawRowToWorkDay(raw));
    expect(row.date).toBe(raw.date);
    expect(row.dayType).toBe(raw.dayType);
    expect(row.isWeekend).toBe(false);
    expect(row.working).toBe(true);
    expect(row.actual).toBe(8);
    expect(row.fixedWork).toBe(8);
    expect(row.breakTime).toBe(1);
    expect(row.startTime).toBe("9:00");
    expect(row.endTime).toBe("18:00");
    expect(row.breakStarts).toEqual(["12:00"]);
    expect(row.breakEnds).toEqual(["13:00"]);
    expect(row.schedule).toBeNull();
    expect(row.nightOvertime).toBeNull();
  });
});
