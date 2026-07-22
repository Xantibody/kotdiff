import type { DecimalHours } from "../value-objects/TimeRecord";

const NIGHT_START = 22;
const NIGHT_END = 29; // 翌5:00 in 24h+ notation
// 当日内で完結する早朝シフト (例 3:00-8:00) は +24 正規化されないため、
// 当日の 0:00-5:00 を別窓として計上する (issue #31)。日跨ぎ勤務は
// 開始が 22 時以降で当日 0-5 時と重ならないため二重計上にはならない
const EARLY_NIGHT_START = 0;
const EARLY_NIGHT_END = 5;

function overlapHours(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function nightHours(start: number, end: number): number {
  return (
    overlapHours(start, end, NIGHT_START, NIGHT_END) +
    overlapHours(start, end, EARLY_NIGHT_START, EARLY_NIGHT_END)
  );
}

export function calcNightWork(
  startTime: DecimalHours,
  endTime: DecimalHours,
  breakStarts: readonly DecimalHours[],
  breakEnds: readonly DecimalHours[],
): number {
  let night = nightHours(startTime, endTime);
  const pairs = Math.min(breakStarts.length, breakEnds.length);
  for (let i = 0; i < pairs; i++) {
    night -= nightHours(breakStarts[i] ?? 0, breakEnds[i] ?? 0);
  }
  return Math.max(0, night);
}
