import { parseWorkTime } from "../../domain/value-objects/TimeRecord";
import { parseAllTimeRecords, extractTimeStrings } from "../../domain/services/WorkTimeParser";
import { calcNightWork } from "../../domain/services/NightWorkCalculator";
import type { WorkDay } from "../../domain/entities/WorkDay";
import type { RawTableRow } from "./RawTableRow";
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

export function rawRowToWorkDay(raw: RawTableRow): WorkDay {
  const isWeekend = raw.isSaturday || raw.isSunday;
  const working =
    raw.scheduleText === "" ? !raw.isSaturday && !raw.isSunday : !raw.hasPublicHoliday;

  const actual = parseWorkTime(raw.allWorkMinuteText);
  const fixedWork = parseWorkTime(raw.fixedWorkMinuteText);
  const overtime = parseWorkTime(raw.overtimeWorkMinuteText);
  const breakTime = parseWorkTime(raw.restMinuteText);

  const startNums = parseAllTimeRecords(raw.startTimeText);
  const endNums = parseAllTimeRecords(raw.endTimeText);
  const breakStartNums = parseAllTimeRecords(raw.restStartTimeText);
  const breakEndNums = parseAllTimeRecords(raw.restEndTimeText);

  const startTime = startNums[0] ?? null;
  const endTime = endNums[0] ?? null;

  // Also verify string presence (consistent with original logic that checked extractTimeStrings)
  const startTimeStrings = extractTimeStrings(raw.startTimeText);
  const endTimeStrings = extractTimeStrings(raw.endTimeText);

  let nightOvertime: number | null = null;
  if (startTimeStrings[0] && endTimeStrings[0]) {
    if (startNums.length > 0 && endNums.length > 0) {
      const s = startNums[0];
      const e = endNums[0];
      if (s !== undefined && e !== undefined) {
        const nw = calcNightWork(s, e, breakStartNums, breakEndNums);
        nightOvertime = nw > 0 ? nw : null;
      }
    }
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
