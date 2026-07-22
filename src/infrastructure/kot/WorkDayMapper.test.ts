import { describe, test, expect } from "vitest";
import { rawRowToWorkDay, rawRowsToWorkDays, workDayToDashboardRow } from "./WorkDayMapper";
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
    nightOvertimeWorkMinuteText: "",
    restMinuteText: "1.00",
    startTimeText: "9:00",
    endTimeText: "18:00",
    restStartTimeText: "12:00",
    restEndTimeText: "13:00",
    scheduleText: "",
    hasPublicHoliday: false,
    hasError: false,
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
    expect(day.nightOvertime).toBe(0);
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

  test("full-day leave (有休) — working false", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        allWorkMinuteText: "",
        fixedWorkMinuteText: "",
        overtimeWorkMinuteText: "",
        restMinuteText: "",
        startTimeText: "",
        endTimeText: "",
        restStartTimeText: "",
        restEndTimeText: "",
        scheduleText: "複数回休憩(有休)",
      }),
    );
    expect(day.working).toBe(false);
    expect(day.schedule).toBe("複数回休憩(有休)");
  });

  test("full-day leave with company-defined name (夏季休暇) — working false", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        allWorkMinuteText: "",
        startTimeText: "",
        endTimeText: "",
        restStartTimeText: "",
        restEndTimeText: "",
        scheduleText: "複数回休憩(夏季休暇)",
      }),
    );
    expect(day.working).toBe(false);
  });

  test("half-day leave with recorded work — working stays true", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        allWorkMinuteText: "4.00",
        scheduleText: "複数回休憩(PM有休)",
      }),
    );
    expect(day.working).toBe(true);
    expect(day.actual).toBe(4);
  });

  test("day type 法定外休日 — working false even without leave keyword", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        dayType: "法定外休日",
        allWorkMinuteText: "",
        startTimeText: "",
        endTimeText: "",
        restStartTimeText: "",
        restEndTimeText: "",
        scheduleText: "複数回休憩",
      }),
    );
    expect(day.working).toBe(false);
  });

  test("custom leave keyword — working false only when configured", () => {
    const raw = makeRaw({
      allWorkMinuteText: "",
      startTimeText: "",
      endTimeText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      scheduleText: "複数回休憩(サバティカル)",
    });
    expect(rawRowToWorkDay(raw).working).toBe(true);
    expect(rawRowToWorkDay(raw, ["サバティカル"]).working).toBe(false);
  });

  test("hasError = true — working is false regardless of day type", () => {
    const day = rawRowToWorkDay(makeRaw({ hasError: true }));
    expect(day.working).toBe(false);
  });

  test("hasError = true on Saturday — working is false", () => {
    const day = rawRowToWorkDay(makeRaw({ hasError: true, isSaturday: true }));
    expect(day.working).toBe(false);
  });

  test("hasError = true with hasPublicHoliday = true — working is false", () => {
    const day = rawRowToWorkDay(makeRaw({ hasError: true, hasPublicHoliday: true }));
    expect(day.working).toBe(false);
  });

  test("nightOvertime reads from KOT NIGHT_OVERTIME_WORK_MINUTE column", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        allWorkMinuteText: "2.00",
        fixedWorkMinuteText: "8.00",
        overtimeWorkMinuteText: "0.00",
        nightOvertimeWorkMinuteText: "1.00",
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
    expect(day.nightOvertime).toBe(0);
  });

  test("nightOvertime fallback: day-crossing night shift (22:00-01:00) calculates 3h", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        nightOvertimeWorkMinuteText: "",
        startTimeText: "22:00",
        endTimeText: "1:00",
        restStartTimeText: "",
        restEndTimeText: "",
      }),
    );
    // 22:00-25:00 overlaps night window [22, 29] for 3h
    expect(day.nightOvertime).toBeCloseTo(3, 5);
  });

  test("nightOvertime fallback: day-crossing break (00:30-01:00) is adjusted past midnight", () => {
    const day = rawRowToWorkDay(
      makeRaw({
        nightOvertimeWorkMinuteText: "",
        startTimeText: "22:00",
        endTimeText: "2:00",
        restStartTimeText: "0:30",
        restEndTimeText: "1:00",
      }),
    );
    // 22:00-26:00 overlaps night window [22, 29] for 4h, minus 0.5h break (24:30-25:00)
    expect(day.nightOvertime).toBeCloseTo(3.5, 5);
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
    expect(row.nightOvertime).toBe(0);
  });
});

// 日跨ぎ勤務中 (退勤前に日付が変わり前日行がエラー勤務になる) の保存経路の扱い。
// 画面側 (ContentScriptService) と同じく勤務日として保存しないと、
// ダッシュボードの残り日数・進捗の分母が勤務中の夜間だけ 1 日ずれる
describe("rawRowsToWorkDays (cross-midnight in-progress)", () => {
  const jst0703_0008 = new Date("2026-07-03T00:08:00+09:00");

  function makeCrossMidnightRaw(overrides: Partial<RawTableRow> = {}): RawTableRow {
    return makeRaw({
      date: "07/02（木）",
      allWorkMinuteText: "",
      endTimeText: "",
      restMinuteText: "",
      restStartTimeText: "",
      restEndTimeText: "",
      hasError: true,
      scheduleText: "複数回休憩",
      ...overrides,
    });
  }

  test("最後の出勤打刻行が前日日付・退勤なしなら working true", () => {
    const days = rawRowsToWorkDays([makeCrossMidnightRaw()], [], jst0703_0008);
    expect(days[0]?.working).toBe(true);
  });

  test("後続行に出勤打刻があれば前日行は退勤忘れエラーであり working false", () => {
    const days = rawRowsToWorkDays(
      [
        makeCrossMidnightRaw(),
        makeRaw({ date: "07/03（金）", endTimeText: "", allWorkMinuteText: "" }),
      ],
      [],
      jst0703_0008,
    );
    expect(days[0]?.working).toBe(false);
  });

  test("前日日付でない (2 日以上前の) エラー行は working false", () => {
    const days = rawRowsToWorkDays(
      [makeCrossMidnightRaw({ date: "07/01（水）" })],
      [],
      jst0703_0008,
    );
    expect(days[0]?.working).toBe(false);
  });

  test("退勤打刻があるエラー行は勤務中ではなく working false", () => {
    const days = rawRowsToWorkDays(
      [makeCrossMidnightRaw({ endTimeText: "A\n23:50\n" })],
      [],
      jst0703_0008,
    );
    expect(days[0]?.working).toBe(false);
  });

  test("エラーのない通常行の working は従来どおり", () => {
    const days = rawRowsToWorkDays([makeRaw()], [], jst0703_0008);
    expect(days[0]?.working).toBe(true);
  });
});
