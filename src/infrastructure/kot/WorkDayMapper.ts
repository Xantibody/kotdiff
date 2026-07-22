import { parseWorkTime, asDecimalHours } from "../../domain/value-objects/TimeRecord";
import { parseAllTimeRecords } from "../../domain/services/WorkTimeParser";
import { isDateTextOnJstDay } from "./KotDomHelpers";
import { calcNightWork } from "../../domain/services/NightWorkCalculator";
import { isLeaveSchedule } from "../../domain/services/LeaveScheduleDetector";
import type { WorkDay } from "../../domain/entities/WorkDay";
import type { RawTableRow } from "./RawTableRow";
import { isNonWorkingDayType } from "../../types";
import type { DashboardRow } from "../../types";

// Convert decimal hours (e.g. 9.5) to time string (e.g. "9:30")
function decimalHoursToTimeString(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) {
    return `${h + 1}:00`;
  }
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 退勤前に日付が変わった勤務中の行。KOT 上はエラー勤務 (hasError) になるが、
// 画面側 (ContentScriptService の detectCrossMidnightInProgressRow) と同じ条件で
// 勤務日として扱わないと、ダッシュボードの残り日数・進捗の分母が
// 勤務中の夜間だけ 1 日ずれる
function isCrossMidnightInProgress(raw: RawTableRow, now: Date): boolean {
  if (!raw.hasError) {
    return false;
  }
  if (!isDateTextOnJstDay(raw.date, now, -1)) {
    return false;
  }
  if (parseAllTimeRecords(raw.startTimeText).length === 0) {
    return false;
  }
  if (parseAllTimeRecords(raw.endTimeText).length > 0) {
    return false;
  }
  return parseWorkTime(raw.allWorkMinuteText) === null;
}

function computeWorking(
  raw: RawTableRow,
  actual: number | null,
  customLeaveKeywords: readonly string[],
  crossMidnightNow: Date | null,
): boolean {
  if (raw.hasError) {
    return crossMidnightNow !== null && isCrossMidnightInProgress(raw, crossMidnightNow);
  }
  if (isNonWorkingDayType(raw.dayType)) {
    return false;
  }
  if (raw.scheduleText === "") {
    return !raw.isSaturday && !raw.isSunday;
  }
  if (raw.hasPublicHoliday) {
    return false;
  }
  // Full-day leave = leave annotation with no recorded work; half-day leave keeps working=true
  return !(actual === null && isLeaveSchedule(raw.scheduleText, customLeaveKeywords));
}

export function rawRowToWorkDay(
  raw: RawTableRow,
  customLeaveKeywords: readonly string[] = [],
  // 非 null のとき、この行を日跨ぎ勤務中の候補 (最後に出勤打刻がある行) として判定する
  crossMidnightNow: Date | null = null,
): WorkDay {
  const isWeekend = raw.isSaturday || raw.isSunday;
  const actual = parseWorkTime(raw.allWorkMinuteText);
  const working = computeWorking(raw, actual, customLeaveKeywords, crossMidnightNow);

  const fixedWork = parseWorkTime(raw.fixedWorkMinuteText);
  const overtime = parseWorkTime(raw.overtimeWorkMinuteText);
  const nightOvertimeFromKot = parseWorkTime(raw.nightOvertimeWorkMinuteText);
  const breakTime = parseWorkTime(raw.restMinuteText);

  const startNums = parseAllTimeRecords(raw.startTimeText);
  const endNums = parseAllTimeRecords(raw.endTimeText);
  const breakStartNums = parseAllTimeRecords(raw.restStartTimeText);
  const breakEndNums = parseAllTimeRecords(raw.restEndTimeText);

  const startTime = startNums[0] ?? null;
  const endTime = endNums[0] ?? null;

  let nightOvertime: number | null = nightOvertimeFromKot;
  if (nightOvertimeFromKot === null && startTime !== null && endTime !== null) {
    const st = startTime;
    const adjEnd = endTime < st ? endTime + 24 : endTime;
    const adjBreakStarts = breakStartNums.map((bs) => (bs < st ? bs + 24 : bs));
    const adjBreakEnds = breakEndNums.map((be) => (be < st ? be + 24 : be));
    nightOvertime = calcNightWork(
      asDecimalHours(st),
      asDecimalHours(adjEnd),
      adjBreakStarts.map((bs) => asDecimalHours(bs)),
      adjBreakEnds.map((be) => asDecimalHours(be)),
    );
  }

  return {
    date: raw.date,
    dayType: raw.dayType,
    isWeekend,
    actual,
    fixedWork,
    overtime,
    breakTime,
    startTime,
    endTime,
    breakStarts: breakStartNums,
    breakEnds: breakEndNums,
    schedule: raw.scheduleText || null,
    working,
    nightOvertime,
  };
}

// 行配列をまとめて変換する。日跨ぎ勤務中とみなすのは最後に出勤打刻がある行のみ
// (後続行に出勤打刻があれば前日行は退勤打刻忘れエラーであり、勤務継続中ではない)
export function rawRowsToWorkDays(
  raws: readonly RawTableRow[],
  customLeaveKeywords: readonly string[] = [],
  now: Date = new Date(),
): WorkDay[] {
  let lastClockInIndex = -1;
  for (const [i, raw] of raws.entries()) {
    if (parseAllTimeRecords(raw.startTimeText).length > 0) {
      lastClockInIndex = i;
    }
  }
  return raws.map((raw, i) =>
    rawRowToWorkDay(raw, customLeaveKeywords, i === lastClockInIndex ? now : null),
  );
}

export function workDayToDashboardRow(day: WorkDay): DashboardRow {
  return {
    date: day.date,
    dayType: day.dayType,
    isWeekend: day.isWeekend,
    actual: day.actual,
    fixedWork: day.fixedWork,
    overtime: day.overtime,
    breakTime: day.breakTime,
    startTime: day.startTime !== null ? decimalHoursToTimeString(day.startTime) : null,
    endTime: day.endTime !== null ? decimalHoursToTimeString(day.endTime) : null,
    breakStarts: day.breakStarts.map(decimalHoursToTimeString),
    breakEnds: day.breakEnds.map(decimalHoursToTimeString),
    schedule: day.schedule,
    working: day.working,
    nightOvertime: day.nightOvertime,
  };
}
