// KOT renders a taken leave in the schedule cell as「スケジュール名(休暇名)」(e.g. 複数回休憩(有休)).
// Leave names are company-defined, so match by keywords covering standard KOT leave categories.
// 公休 is intentionally excluded — it is handled separately as PUBLIC_HOLIDAY_KEYWORD.
const BUILT_IN_LEAVE_KEYWORDS: readonly string[] = [
  "有休",
  "有給",
  "代休",
  "振休",
  "休暇",
  "休業",
  "欠勤",
  "特休",
];

export function isLeaveSchedule(scheduleText: string): boolean {
  if (scheduleText === "") {
    return false;
  }
  return BUILT_IN_LEAVE_KEYWORDS.some((keyword) => scheduleText.includes(keyword));
}
