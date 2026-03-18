export interface BreakPeriod {
  readonly start: number; // decimal hours
  readonly end: number; // decimal hours
}

export function createBreakPeriod(start: number, end: number): BreakPeriod {
  if (start > end) throw new Error(`BreakPeriod: start (${start}) must be <= end (${end})`);
  return { start, end };
}
