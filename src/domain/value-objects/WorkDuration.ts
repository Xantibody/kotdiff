import { asDecimalHours, type DecimalHours } from "./TimeRecord";

export interface WorkDuration {
  readonly hours: DecimalHours;
}

export function createWorkDuration(hours: number): WorkDuration {
  if (hours < 0) throw new Error(`WorkDuration: hours (${hours}) must be >= 0`);
  return { hours: asDecimalHours(hours) };
}

export function formatHM(hours: number): string {
  const abs = Math.abs(hours);
  let h = Math.floor(abs);
  let m = Math.round((abs - h) * 60);
  if (m === 60) {
    h++;
    m = 0;
  }
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 差分合算の浮動小数点残差（例 -4e-16）が "-0:00" にならないよう、
// 符号は表示単位（分）に丸めてから判定する (issue #25)
export function isDiffNegative(hours: number): boolean {
  return Math.round(hours * 60) < 0;
}

export function formatDiff(hours: number): string {
  const sign = isDiffNegative(hours) ? "-" : "+";
  return `${sign}${formatHM(hours)}`;
}

// 時刻表示（24時を超える値は翌日の時刻に折り返す）
export function formatTimeOfDay(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}
