import { describe, it, expect } from "vitest";
import { buildSummaryModel } from "./SummaryModel";
import type { SummaryInput, TodayInput } from "./SummaryModel";

const baseInput: SummaryInput = {
  totalWorkDays: 18,
  workedDays: 13,
  remainingDays: 5,
  totalActual: 103.983,
  cumulativeDiff: -0.017,
  overtime: 13.233,
  actuals: [8.5, 6.3, 9.7, 7.2, 8.9, 6.9, 8.1, 9.3, 7.4, 8, 6.8, 9.5, 7.4],
  today: null,
  dateLabel: "02/20（金）",
  nowLabel: "17:42",
  alerts: [],
};

// 出勤 11:07・休憩 11:58–13:04・現在 17:42 で実労働 5:29、貯金±0 まであと 2:32
const workingToday: TodayInput = {
  status: "working",
  startTime: 11 + 7 / 60,
  now: 17 + 42 / 60,
  netWorkTime: 5 + 29 / 60,
  breaks: [{ start: 11 + 58 / 60, end: 13 + 4 / 60 }],
  remainingHours: 2 + 32 / 60,
  targetLabel: "20:14",
  targetTime: 20 + 14 / 60,
};

describe("buildSummaryModel — 今月", () => {
  it("derives the monthly required total from the working days", () => {
    const m = buildSummaryModel(baseInput).month;
    expect(m.requiredLabel).toBe("144:00");
    expect(m.actualLabel).toBe("103:59");
  });

  it("labels a negative savings balance as negative", () => {
    const m = buildSummaryModel(baseInput).month;
    expect(m.savingsLabel).toBe("-0:01");
    expect(m.savingsNegative).toBe(true);
  });

  it("keeps -0:00 rounding artefacts on the positive side", () => {
    const m = buildSummaryModel({ ...baseInput, cumulativeDiff: -1e-15 }).month;
    expect(m.savingsNegative).toBe(false);
  });
});

describe("buildSummaryModel — 今日", () => {
  it("puts the remaining hours and the clock-out estimate front and centre", () => {
    const t = buildSummaryModel({ ...baseInput, today: workingToday }).today;
    expect(t.state).toBe("working");
    expect(t.remainingLabel).toBe("2:32");
    expect(t.leaveAtLabel).toBe("20:14");
    expect(t.netLabel).toBe("5:29");
    expect(t.needLabel).toBe("8:01");
    expect(t.startLabel).toBe("11:07");
  });

  it("scales the progress bar over 出勤→退勤目安", () => {
    const t = buildSummaryModel({ ...baseInput, today: workingToday }).today;
    // (17:42 − 11:07) / (20:14 − 11:07) = 6:35 / 9:07 = 72.2%
    expect(t.progressPercent).toBeCloseTo(72.2, 1);
    const [firstBreak] = t.breakSegments;
    expect(firstBreak?.leftPercent).toBeCloseTo(9.3, 1);
    expect(firstBreak?.widthPercent).toBeCloseTo(12.1, 1);
    expect(t.breakRangeLabel).toBe("11:58–13:04");
    expect(t.breakTotalLabel).toBe("1:06");
  });

  it("freezes the progress bar at the break start while on break", () => {
    const t = buildSummaryModel({
      ...baseInput,
      today: { ...workingToday, status: "onBreak" },
    }).today;
    expect(t.state).toBe("onBreak");
    // 休憩中は実労働が進まないので現在位置も休憩開始で止める
    expect(t.progressPercent).toBeCloseTo(9.3, 1);
    expect(t.breakNoteLabel).toBe("休憩中 11:58 から 5:44");
  });

  it("falls back to a month-oriented view outside working hours", () => {
    const t = buildSummaryModel(baseInput).today;
    expect(t.state).toBe("afterWork");
    expect(t.remaining).toBeNull();
    expect(t.leaveAtLabel).toBeNull();
    expect(t.stateLabel).toBe("退勤後");
  });

  it("reports 非勤務日 when nothing is left to work", () => {
    const t = buildSummaryModel({ ...baseInput, remainingDays: 0 }).today;
    expect(t.state).toBe("offDay");
  });

  it("never reports a negative remaining time once the day is already covered", () => {
    const t = buildSummaryModel({
      ...baseInput,
      today: { ...workingToday, remainingHours: -0.5 },
    }).today;
    expect(t.remainingLabel).toBe("0:00");
  });
});

describe("buildSummaryModel — 見通し", () => {
  it("states the outlook in plain words with a required pace", () => {
    const o = buildSummaryModel({ ...baseInput, today: workingToday }).outlook;
    expect(o.sentence).toContain("このままだと");
    expect(o.sentence).toContain(o.emphasis);
    expect(o.paceLabel).not.toBeNull();
    expect(o.reachPhrase).toMatch(/^10回のうち\d+回$/);
  });

  it("drops the pace sentence when there is no day left to adjust", () => {
    const o = buildSummaryModel({ ...baseInput, remainingDays: 0 }).outlook;
    expect(o.paceLabel).toBeNull();
    expect(o.sentence).not.toContain("1日");
  });

  it("counts today separately from the remaining days", () => {
    const withToday = buildSummaryModel({ ...baseInput, today: workingToday }).outlook;
    const withoutToday = buildSummaryModel(baseInput).outlook;
    // 本日の見込みは todayPlanned として別枠に入るので、残り日数の二重計上を避ける
    expect(withToday.forecast.point).toBeCloseTo(withoutToday.forecast.point, 0);
  });
});
