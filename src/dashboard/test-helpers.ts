import type {
  WorkedDailyRow,
  UnworkedDailyRow,
  DailyRowSummary,
} from "../domain/aggregates/WorkMonth";

export function makeWorkedRow(overrides: Partial<WorkedDailyRow> = {}): WorkedDailyRow {
  return {
    type: "worked",
    date: "03/01（月）",
    dayType: "平日",
    isWeekend: false,
    actual: 8,
    expected: 8,
    isPublicHoliday: false,
    diff: 0,
    cumulativeDiff: 0,
    overtime: 0,
    breakTime: 1,
    startTime: "09:00",
    endTime: "18:00",
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    nightOvertime: null,
    ...overrides,
  };
}

export function makeUnworkedRow(overrides: Partial<UnworkedDailyRow> = {}): UnworkedDailyRow {
  return {
    type: "unworked",
    date: "03/01（月）",
    dayType: "平日",
    isWeekend: false,
    actual: null,
    expected: 8,
    isPublicHoliday: false,
    diff: null,
    cumulativeDiff: null,
    overtime: null,
    breakTime: null,
    startTime: null,
    endTime: null,
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    nightOvertime: null,
    ...overrides,
  };
}

export function makeRow(overrides: Partial<WorkedDailyRow> = {}): DailyRowSummary {
  return makeWorkedRow(overrides);
}
