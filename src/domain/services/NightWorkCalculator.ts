const NIGHT_START = 22;
const NIGHT_END = 29; // 翌5:00 in 24h+ notation

function overlapHours(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

export function calcNightWork(
  startTime: number,
  endTime: number,
  breakStarts: number[],
  breakEnds: number[],
): number {
  let night = overlapHours(startTime, endTime, NIGHT_START, NIGHT_END);
  const pairs = Math.min(breakStarts.length, breakEnds.length);
  for (let i = 0; i < pairs; i++) {
    night -= overlapHours(breakStarts[i], breakEnds[i], NIGHT_START, NIGHT_END);
  }
  return Math.max(0, night);
}
