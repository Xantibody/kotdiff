export interface InProgressRowData {
  readonly startTime: number;
  readonly restStarts: readonly number[];
  readonly restEnds: readonly number[];
  readonly isOnBreak: boolean;
}

export interface EstimatedWorkTime {
  readonly workTime: number;
  readonly isOnBreak: boolean;
}

export function calcEstimatedWorkTime(data: InProgressRowData, now: number): EstimatedWorkTime {
  // 日跨ぎ対応: now が startTime より小さい場合は翌日とみなす
  if (now < data.startTime) {
    now += 24;
  }

  let elapsed: number;
  if (data.isOnBreak) {
    const lastRestStart = data.restStarts[data.restStarts.length - 1];
    elapsed = lastRestStart - data.startTime;
  } else {
    elapsed = now - data.startTime;
  }

  let completedBreaks = 0;
  const breakPairs = Math.min(data.restStarts.length, data.restEnds.length);
  for (let i = 0; i < breakPairs; i++) {
    completedBreaks += data.restEnds[i] - data.restStarts[i];
  }

  const workTime = Math.max(0, elapsed - completedBreaks);
  return { workTime, isOnBreak: data.isOnBreak };
}
