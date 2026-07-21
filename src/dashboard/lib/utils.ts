import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBreakPairs(starts: readonly string[], ends: readonly string[]): string[] {
  const len = Math.max(starts.length, ends.length);
  const pairs: string[] = [];
  for (let i = 0; i < len; i++) {
    pairs.push(`${starts[i] ?? ""} ~ ${ends[i] ?? ""}`);
  }
  return pairs;
}

export function formatAttendance(start: string | null, end: string | null): string {
  // 空文字列も未打刻として扱う
  const startLabel = start === null || start === "" ? null : start;
  const endLabel = end === null || end === "" ? null : end;
  if (startLabel === null && endLabel === null) {
    return "";
  }
  if (endLabel === null) {
    return `${startLabel} ~`;
  }
  if (startLabel === null) {
    return `~ ${endLabel}`;
  }
  return `${startLabel} ~ ${endLabel}`;
}
