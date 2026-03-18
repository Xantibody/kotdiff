import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBreakPairs(starts: string[], ends: string[]): string[] {
  const len = Math.max(starts.length, ends.length);
  const pairs: string[] = [];
  for (let i = 0; i < len; i++) {
    pairs.push(`${starts[i] ?? ""} ~ ${ends[i] ?? ""}`);
  }
  return pairs;
}

export function formatAttendance(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (!end) return `${start} ~`;
  if (!start) return `~ ${end}`;
  return `${start} ~ ${end}`;
}
