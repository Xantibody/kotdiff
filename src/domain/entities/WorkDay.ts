import { isBreakSufficient } from "../services/BreakSufficiencyService";
import { calcNightWork } from "../services/NightWorkCalculator";
import type { DecimalHours } from "../value-objects/TimeRecord";
import type { KotDayType } from "../../types";

// WorkDay entity — identified by date string from the KOT system
export interface WorkDay {
  readonly date: string;
  readonly dayType: KotDayType;
  readonly isWeekend: boolean;
  readonly actual: number | null;
  readonly fixedWork: number | null;
  readonly overtime: number | null;
  readonly breakTime: number | null;
  readonly startTime: DecimalHours | null; // decimal hours (parsed, unlike DashboardRow which has string)
  readonly endTime: DecimalHours | null; // decimal hours (parsed)
  readonly breakStarts: readonly DecimalHours[]; // decimal hours (parsed)
  readonly breakEnds: readonly DecimalHours[]; // decimal hours (parsed)
  readonly schedule: string | null;
  readonly working: boolean;
  readonly nightOvertime: number | null;
}

export function isWorkedDay(day: WorkDay): boolean {
  return day.actual !== null && day.working;
}

export function getWorkDayDiff(day: WorkDay, expectedHours: number): number | null {
  if (day.actual === null || !day.working) return null;
  return day.actual - expectedHours;
}

export function hasInsufficientBreak(day: WorkDay): boolean {
  if (day.actual === null || day.breakTime === null) return false;
  return !isBreakSufficient(day.actual, day.breakTime);
}

export function getWorkDayNightOvertime(day: WorkDay): number {
  if (day.startTime === null || day.endTime === null) return 0;
  return calcNightWork(day.startTime, day.endTime, [...day.breakStarts], [...day.breakEnds]);
}
