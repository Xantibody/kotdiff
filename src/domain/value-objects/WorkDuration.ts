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

export function formatDiff(hours: number): string {
  const sign = hours >= 0 ? "+" : "-";
  return `${sign}${formatHM(hours)}`;
}
