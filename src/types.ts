import type { LeaveBalance } from "./domain/value-objects/LeaveBalance";
export type { LeaveBalance };

// KOT (KingOfTime) day type values extracted from the WORK_DAY_TYPE column
export type KotDayType =
  | "平日"
  | "土"
  | "日"
  | "土曜日"
  | "日曜日"
  | "所定休日"
  | "法定休日"
  | "祝日";

const KOT_DAY_TYPE_VALUES: readonly string[] = [
  "平日",
  "土",
  "日",
  "土曜日",
  "日曜日",
  "所定休日",
  "法定休日",
  "祝日",
];

export function isKotDayType(value: string): value is KotDayType {
  return KOT_DAY_TYPE_VALUES.includes(value);
}

export interface DashboardRow {
  readonly date: string;
  readonly dayType: KotDayType;
  readonly isWeekend: boolean;
  readonly actual: number | null;
  readonly fixedWork: number | null;
  readonly overtime: number | null;
  readonly breakTime: number | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly breakStarts: readonly string[];
  readonly breakEnds: readonly string[];
  readonly schedule: string | null;
  readonly working: boolean;
  readonly nightOvertime: number | null;
}

export interface DashboardData {
  readonly rows: readonly DashboardRow[];
  readonly leaveBalances: readonly LeaveBalance[];
  readonly generatedAt: string;
}

function isDashboardRow(v: unknown): v is DashboardRow {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["date"] === "string" &&
    typeof o["dayType"] === "string" &&
    typeof o["isWeekend"] === "boolean"
  );
}

function isLeaveBalance(v: unknown): v is LeaveBalance {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o["label"] === "string" && typeof o["used"] === "number";
}

export function isDashboardData(v: unknown): v is DashboardData {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj["rows"])) return false;
  if (!Array.isArray(obj["leaveBalances"])) return false;
  if (typeof obj["generatedAt"] !== "string") return false;
  if (!obj["rows"].every(isDashboardRow)) return false;
  if (!obj["leaveBalances"].every(isLeaveBalance)) return false;
  return true;
}
