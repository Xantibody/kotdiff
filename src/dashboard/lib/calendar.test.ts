import { describe, it, expect } from "vitest";
import { buildMiniBars, buildMonthCalendar, weekdayOf } from "./calendar";
import { makeUnworkedRow, makeWorkedRow } from "../test-helpers";

// 2026/03/01 は日曜
const NOW = new Date("2026-03-04T08:00:00.000Z"); // JST 03/04 17:00

describe("weekdayOf", () => {
  it("reads the weekday out of the KOT date label", () => {
    expect(weekdayOf("03/01（日）")).toBe(0);
    expect(weekdayOf("03/07（土）")).toBe(6);
  });

  it("returns -1 when the label has no weekday", () => {
    expect(weekdayOf("03/01")).toBe(-1);
  });
});

describe("buildMonthCalendar", () => {
  it("pads the first week so every column keeps its weekday", () => {
    const weeks = buildMonthCalendar([makeWorkedRow({ date: "03/03（火）" })], NOW);
    const [first] = weeks;
    expect(first?.cells.length).toBe(7);
    expect(first?.cells[0]).toBeNull();
    expect(first?.cells[1]).toBeNull();
    expect(first?.cells[2]?.day).toBe(3);
  });

  it("starts a new week on Sunday", () => {
    const weeks = buildMonthCalendar(
      [
        makeWorkedRow({ date: "03/06（金）" }),
        makeWorkedRow({ date: "03/07（土）" }),
        makeWorkedRow({ date: "03/08（日）" }),
      ],
      NOW,
    );
    expect(weeks.length).toBe(2);
    expect(weeks[1]?.cells[0]?.day).toBe(8);
  });

  it("totals only the worked days of the week", () => {
    const weeks = buildMonthCalendar(
      [
        makeWorkedRow({ date: "03/02（月）", actual: 9, diff: 1 }),
        makeWorkedRow({ date: "03/03（火）", actual: 7, diff: -1 }),
        makeUnworkedRow({ date: "03/04（水）" }),
      ],
      NOW,
    );
    const [week] = weeks;
    expect(week?.workedDays).toBe(2);
    expect(week?.total).toBe(16);
    expect(week?.diff).toBe(0);
  });

  it("classifies each day", () => {
    const weeks = buildMonthCalendar(
      [
        makeWorkedRow({ date: "03/02（月）", diff: 1 }),
        makeWorkedRow({ date: "03/03（火）", diff: -1 }),
        makeUnworkedRow({ date: "03/04（水）", startTime: "09:00" }),
        makeUnworkedRow({ date: "03/05（木）" }),
        makeUnworkedRow({ date: "03/07（土）", expected: 0 }),
      ],
      NOW,
    );
    const cells = weeks[0]?.cells ?? [];
    expect(cells[1]?.state).toBe("over");
    expect(cells[2]?.state).toBe("under");
    // 03/04 は今日で出勤打刻あり → 勤務中扱い
    expect(cells[3]?.state).toBe("attention");
    expect(cells[4]?.state).toBe("future");
    expect(cells[6]?.state).toBe("holiday");
  });

  it("flags a past day with a clock-in but no clock-out", () => {
    const weeks = buildMonthCalendar(
      [makeUnworkedRow({ date: "03/02（月）", startTime: "09:00" })],
      NOW,
    );
    expect(weeks[0]?.cells[1]?.state).toBe("attention");
  });
});

describe("buildMiniBars", () => {
  it("grows upward for surplus and downward for shortfall", () => {
    const weeks = buildMonthCalendar(
      [
        makeWorkedRow({ date: "03/02（月）", diff: 3 }),
        makeWorkedRow({ date: "03/03（火）", diff: -1.5 }),
      ],
      NOW,
    );
    const bars = buildMiniBars(weeks, 12);
    expect(bars[0]?.upPixels).toBe(12);
    expect(bars[0]?.downPixels).toBe(0);
    expect(bars[1]?.upPixels).toBe(0);
    expect(bars[1]?.downPixels).toBe(6);
  });

  it("clamps beyond the ±3:00 scale", () => {
    const weeks = buildMonthCalendar([makeWorkedRow({ date: "03/02（月）", diff: 9 })], NOW);
    expect(buildMiniBars(weeks, 12)[0]?.upPixels).toBe(12);
  });
});
