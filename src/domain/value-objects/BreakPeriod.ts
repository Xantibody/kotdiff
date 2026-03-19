import { asDecimalHours, type DecimalHours } from "./TimeRecord";

export interface BreakPeriod {
  readonly start: DecimalHours; // decimal hours
  readonly end: DecimalHours; // decimal hours
}

export function createBreakPeriod(start: number, end: number): BreakPeriod {
  if (start > end) throw new Error(`BreakPeriod: start (${start}) must be <= end (${end})`);
  return { start: asDecimalHours(start), end: asDecimalHours(end) };
}
