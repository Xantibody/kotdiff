import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { buildTimelineSegments } from "./timeline";
import type { TimelineSegment } from "./timeline";
import { isSameJstDay, parseMonthDay } from "./summary";

// 月全体を 1 画面で把握させるためのカレンダー用データ。
// 「働いた形」を見せたいので、日ごとの過不足に加えて稼働・休憩の帯も持つ。

export type CalendarDayState = "over" | "under" | "holiday" | "future" | "attention";

export interface CalendarDay {
  readonly date: string;
  readonly day: number;
  readonly weekday: number;
  readonly isToday: boolean;
  readonly state: CalendarDayState;
  readonly actual: number | null;
  readonly diff: number | null;
  readonly breakTime: number | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly segments: readonly TimelineSegment[];
  // ホバーで出す明細。セルから外した情報の置き場
  readonly schedule: string | null;
  readonly breakStarts: readonly string[];
  readonly breakEnds: readonly string[];
  readonly fixedWork: number | null;
  readonly nightOvertime: number | null;
}

export interface CalendarWeek {
  readonly label: string;
  readonly workedDays: number;
  readonly total: number;
  readonly diff: number;
  // 日曜始まりの 7 マス。月初・月末の空きは null
  readonly cells: readonly (CalendarDay | null)[];
}

const WEEKDAY_CHARS = "日月火水木金土";

export function weekdayOf(date: string): number {
  const match = /（(.)）/.exec(date);
  const index = match?.[1] === undefined ? -1 : WEEKDAY_CHARS.indexOf(match[1]);
  return index;
}

function stateOf(row: DailyRowSummary, isToday: boolean, isPast: boolean): CalendarDayState {
  if (row.actual !== null && row.diff !== null) {
    return row.diff < 0 ? "under" : "over";
  }
  const hasStart = row.startTime !== null && row.startTime !== "";
  if (hasStart && !isToday && isPast) {
    // 出勤だけ打って退勤が無い過去日 = 打刻漏れ
    return "attention";
  }
  if (isToday && hasStart) {
    return "attention";
  }
  if (row.expected === 0) {
    return "holiday";
  }
  return "future";
}

export function buildMonthCalendar(
  rows: readonly DailyRowSummary[],
  now: Date,
): readonly CalendarWeek[] {
  const jstToday = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDate();

  const days: CalendarDay[] = [];
  for (const row of rows) {
    const parsed = parseMonthDay(row.date);
    if (!parsed) {
      continue;
    }
    const isToday = isSameJstDay(row.date, now);
    days.push({
      date: row.date,
      day: parsed.day,
      weekday: weekdayOf(row.date),
      isToday,
      state: stateOf(row, isToday, parsed.day < jstToday),
      actual: row.actual,
      diff: row.diff,
      breakTime: row.breakTime,
      startTime: row.startTime,
      endTime: row.endTime,
      segments: buildTimelineSegments(row.startTime, row.endTime, row.breakStarts, row.breakEnds),
      schedule: row.schedule,
      breakStarts: row.breakStarts,
      breakEnds: row.breakEnds,
      fixedWork: row.fixedWork,
      nightOvertime: row.nightOvertime,
    });
  }

  const weeks: CalendarWeek[] = [];
  let cells: (CalendarDay | null)[] = [];

  const flush = (): void => {
    if (cells.length === 0) {
      return;
    }
    while (cells.length < 7) {
      cells.push(null);
    }
    const filled = cells.filter((c): c is CalendarDay => c !== null && c.actual !== null);
    weeks.push({
      label: `第${weeks.length + 1}週`,
      workedDays: filled.length,
      total: filled.reduce((acc, c) => acc + (c.actual ?? 0), 0),
      diff: filled.reduce((acc, c) => acc + (c.diff ?? 0), 0),
      cells,
    });
    cells = [];
  };

  for (const day of days) {
    // 曜日が取れない (表記が想定外) 場合は詰めて並べる
    const weekday = day.weekday === -1 ? cells.length % 7 : day.weekday;
    if (weekday === 0 && cells.length > 0) {
      flush();
    }
    // 月初の欠けだけでなく、欠勤日が抜けた月中の穴も埋めないと曜日がずれる
    while (cells.length < weekday) {
      cells.push(null);
    }
    cells.push(day);
    if (cells.length === 7) {
      flush();
    }
  }
  flush();

  return weeks;
}

// たたんだ状態のミニバー。±3:00 で振り切る
export const MINI_BAR_FULL_SCALE = 3;

export interface MiniBar {
  readonly date: string;
  readonly upPixels: number;
  readonly downPixels: number;
  readonly state: CalendarDayState;
}

export function buildMiniBars(weeks: readonly CalendarWeek[], maxPixels = 12): readonly MiniBar[] {
  const bars: MiniBar[] = [];
  for (const week of weeks) {
    for (const cell of week.cells) {
      if (!cell) {
        continue;
      }
      const diff = cell.diff ?? 0;
      const scaled = Math.min(maxPixels, (Math.abs(diff) / MINI_BAR_FULL_SCALE) * maxPixels);
      bars.push({
        date: cell.date,
        upPixels: diff > 0 ? scaled : 0,
        downPixels: diff < 0 ? scaled : 0,
        state: cell.state,
      });
    }
  }
  return bars;
}
