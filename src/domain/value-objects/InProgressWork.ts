import { asDecimalHours } from "./TimeRecord";
import type { DecimalHours } from "./TimeRecord";

export interface InProgressRowData {
  readonly startTime: DecimalHours;
  readonly restStarts: readonly DecimalHours[];
  readonly restEnds: readonly DecimalHours[];
  readonly isOnBreak: boolean;
}

export type EstimatedWorkTime =
  | { readonly status: "working"; readonly workTime: DecimalHours }
  | { readonly status: "onBreak"; readonly workTime: DecimalHours };

export interface ClockOutTarget {
  // 貯金±0 まであと何時間働く必要があるか（負なら達成済み）
  readonly remainingHours: number;
  // 退勤目安時刻（decimal hours。以後追加の休憩を取らない前提の概算）
  readonly targetTime: number;
}

// 月の時間貯金が ±0 になる退勤目安を求める (issue #53)
export function calcClockOutTarget(
  cumulativeDiffExcludingToday: number,
  estimatedWorkTime: number,
  now: DecimalHours,
  expectedHours: number,
): ClockOutTarget {
  const remainingHours = expectedHours - cumulativeDiffExcludingToday - estimatedWorkTime;
  return { remainingHours, targetTime: now + remainingHours };
}

export function calcEstimatedWorkTime(
  data: InProgressRowData,
  now: DecimalHours,
): EstimatedWorkTime {
  // 日跨ぎ対応: 出勤を起点に打刻を時系列順へ並べ、前の打刻より小さい値は翌日とみなして +24 する。
  // パース層は "05/08 01:40" のような日跨ぎ打刻から日付を落とし時刻だけ渡すため、
  // ここで単調増加するよう正規化しないと休憩終了 < 休憩開始となり計算が壊れる。
  let prev: number = data.startTime;
  const normalize = (t: number): number => {
    let v = t;
    while (v < prev) {
      v += 24;
    }
    prev = v;
    return v;
  };

  const restStarts: number[] = [];
  const restEnds: number[] = [];
  const pairCount = Math.max(data.restStarts.length, data.restEnds.length);
  for (let i = 0; i < pairCount; i++) {
    const start = data.restStarts[i];
    if (start !== undefined) {
      restStarts.push(normalize(start));
    }
    const end = data.restEnds[i];
    if (end !== undefined) {
      restEnds.push(normalize(end));
    }
  }
  const nowHours = normalize(now);

  let elapsed: number;
  if (data.isOnBreak) {
    const lastRestStart = restStarts.at(-1) ?? data.startTime;
    elapsed = lastRestStart - data.startTime;
  } else {
    elapsed = nowHours - data.startTime;
  }

  let completedBreaks = 0;
  const breakPairs = Math.min(restStarts.length, restEnds.length);
  for (let i = 0; i < breakPairs; i++) {
    completedBreaks += (restEnds[i] ?? 0) - (restStarts[i] ?? 0);
  }

  const workTime = asDecimalHours(Math.max(0, elapsed - completedBreaks));
  const status = data.isOnBreak ? "onBreak" : "working";
  return { status, workTime };
}
