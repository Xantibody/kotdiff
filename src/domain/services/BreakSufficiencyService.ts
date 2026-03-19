// Labor Standards Act requires 45min break for 6-8h work, 60min for 8h+ work
export const WORK_HOURS_6H = 6;
export const WORK_HOURS_8H = 8;
export const MIN_BREAK_6_TO_8H = 0.75; // 45 minutes
export const MIN_BREAK_8H_PLUS = 1.0; // 60 minutes

export function isBreakSufficient(totalWork: number, breakTime: number): boolean {
  if (totalWork >= WORK_HOURS_8H) return breakTime >= MIN_BREAK_8H_PLUS;
  if (totalWork >= WORK_HOURS_6H) return breakTime >= MIN_BREAK_6_TO_8H;
  return true;
}
