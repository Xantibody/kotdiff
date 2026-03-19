import { asDecimalHours, type DecimalHours } from "./TimeRecord";

export interface InProgressRowData {
  readonly startTime: DecimalHours;
  readonly restStarts: readonly DecimalHours[];
  readonly restEnds: readonly DecimalHours[];
  readonly isOnBreak: boolean;
}

export type EstimatedWorkTime =
  | { readonly status: "working"; readonly workTime: DecimalHours }
  | { readonly status: "onBreak"; readonly workTime: DecimalHours };

export function calcEstimatedWorkTime(
  data: InProgressRowData,
  now: DecimalHours,
): EstimatedWorkTime {
  // 日跨ぎ対応: now が startTime より小さい場合は翌日とみなす
  let nowHours: number = now;
  if (nowHours < data.startTime) {
    nowHours += 24;
  }

  let elapsed: number;
  if (data.isOnBreak) {
    const lastRestStart = data.restStarts[data.restStarts.length - 1] ?? data.startTime;
    elapsed = lastRestStart - data.startTime;
  } else {
    elapsed = nowHours - data.startTime;
  }

  let completedBreaks = 0;
  const breakPairs = Math.min(data.restStarts.length, data.restEnds.length);
  for (let i = 0; i < breakPairs; i++) {
    completedBreaks += (data.restEnds[i] ?? 0) - (data.restStarts[i] ?? 0);
  }

  const workTime = asDecimalHours(Math.max(0, elapsed - completedBreaks));
  const status = data.isOnBreak ? "onBreak" : "working";
  return { status, workTime };
}
