import { parseWorkTime, asDecimalHours } from "../../domain/value-objects/TimeRecord";
import { parseAllTimeRecords } from "../../domain/services/WorkTimeParser";
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

function computeWorking(
  raw: RawTableRow,
  actual: number | null,
  customLeaveKeywords: readonly string[],
): boolean {
  if (raw.hasError) return false;
  if (isNonWorkingDayType(raw.dayType)) return false;
  if (raw.scheduleText === "") return !raw.isSaturday && !raw.isSunday;
  if (raw.hasPublicHoliday) return false;
  // Full-day leave = leave annotation with no recorded work; half-day leave keeps working=true
  return !(actual === null && isLeaveSchedule(raw.scheduleText, customLeaveKeywords));
}

export function rawRowToWorkDay(
  raw: RawTableRow,
  customLeaveKeywords: readonly string[] = [],
): WorkDay {
  const isWeekend = raw.isSaturday || raw.isSunday;
  const actual = parseWorkTime(raw.allWorkMinuteText);
  const working = computeWorking(raw, actual, customLeaveKeywords);

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
    const adjBreakEnds = breakEndNums.map((be) => (be < st ? be + 24 : be));
    nightOvertime = calcNightWork(
      asDecimalHours(st),
      asDecimalHours(adjEnd),
      breakStartNums.map(asDecimalHours),
      adjBreakEnds.map(asDecimalHours),
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
