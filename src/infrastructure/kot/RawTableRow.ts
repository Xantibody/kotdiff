// Raw strings extracted directly from DOM cells — no parsing performed
export interface RawTableRow {
  readonly date: string;
  readonly dayType: string;
  readonly isSaturday: boolean;
  readonly isSunday: boolean;
  readonly allWorkMinuteText: string;
  readonly fixedWorkMinuteText: string;
  readonly overtimeWorkMinuteText: string;
  readonly restMinuteText: string;
  readonly startTimeText: string;
  readonly endTimeText: string;
  readonly restStartTimeText: string;
  readonly restEndTimeText: string;
  readonly scheduleText: string;
  readonly hasPublicHoliday: boolean;
}
