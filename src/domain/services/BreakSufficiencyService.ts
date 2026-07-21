// Labor Standards Act requires 45min break for 6-8h work, 60min for 8h+ work
export const WORK_HOURS_6H = 6;
export const WORK_HOURS_8H = 8;
export const MIN_BREAK_6_TO_8H = 0.75; // 45 minutes
export const MIN_BREAK_8H_PLUS = 1; // 60 minutes

// 労働時間に対する法定の必要休憩時間（＝想定休憩時間）
export function requiredBreakFor(workHours: number): number {
  if (workHours >= WORK_HOURS_8H) {
    return MIN_BREAK_8H_PLUS;
  }
  if (workHours >= WORK_HOURS_6H) {
    return MIN_BREAK_6_TO_8H;
  }
  return 0;
}

export function isBreakSufficient(totalWork: number, breakTime: number): boolean {
  return breakTime >= requiredBreakFor(totalWork);
}
