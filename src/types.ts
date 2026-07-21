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
  | "法定外休日"
  | "祝日";

const KOT_DAY_TYPE_VALUES: ReadonlySet<string> = new Set([
  "平日",
  "土",
  "日",
  "土曜日",
  "日曜日",
  "所定休日",
  "法定休日",
  "法定外休日",
  "祝日",
]);

export function isKotDayType(value: string): value is KotDayType {
  return KOT_DAY_TYPE_VALUES.has(value);
}

// KOT flips WORK_DAY_TYPE from 平日 to a holiday type when a day off is designated
// (e.g. 振替休暇 renders as 法定外休日), so these types mark the day as non-working
const NON_WORKING_DAY_TYPES: ReadonlySet<string> = new Set(["所定休日", "法定休日", "法定外休日"]);

export function isNonWorkingDayType(value: string): boolean {
  return NON_WORKING_DAY_TYPES.has(value);
}

// User-configurable extension settings (company-specific values stay out of the codebase)
export interface KotdiffSettings {
  readonly customLeaveKeywords: readonly string[];
}

export const DEFAULT_SETTINGS: KotdiffSettings = { customLeaveKeywords: [] };

export function isKotdiffSettings(v: unknown): v is KotdiffSettings {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  const keywords = o["customLeaveKeywords"];
  return Array.isArray(keywords) && keywords.every((k) => typeof k === "string");
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
  // フレックスタイム集計の基準外労働時間（当月精算する残業）。
  // フレックス以外や旧バージョンの保存データでは undefined/null (issue #44)
  readonly statutoryOvertime?: number | null;
}

function isNumberOrNull(v: unknown): boolean {
  return v === null || typeof v === "number";
}

function isStringOrNull(v: unknown): boolean {
  return v === null || typeof v === "string";
}

function isStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

// 旧バージョンの保存データ (フィールド欠落・型違い) を通すと
// buildDashboardSummary が実行時例外を起こすため、全フィールドを検証する
function isDashboardRow(v: unknown): v is DashboardRow {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o["date"] === "string" &&
    typeof o["dayType"] === "string" &&
    typeof o["isWeekend"] === "boolean" &&
    isNumberOrNull(o["actual"]) &&
    isNumberOrNull(o["fixedWork"]) &&
    isNumberOrNull(o["overtime"]) &&
    isNumberOrNull(o["breakTime"]) &&
    isStringOrNull(o["startTime"]) &&
    isStringOrNull(o["endTime"]) &&
    isStringArray(o["breakStarts"]) &&
    isStringArray(o["breakEnds"]) &&
    isStringOrNull(o["schedule"]) &&
    typeof o["working"] === "boolean" &&
    isNumberOrNull(o["nightOvertime"])
  );
}

function isLeaveBalance(v: unknown): v is LeaveBalance {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o["label"] === "string" &&
    typeof o["used"] === "number" &&
    isNumberOrNull(o["remaining"])
  );
}

export function isDashboardData(v: unknown): v is DashboardData {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj["rows"])) {
    return false;
  }
  if (!Array.isArray(obj["leaveBalances"])) {
    return false;
  }
  if (typeof obj["generatedAt"] !== "string") {
    return false;
  }
  const { statutoryOvertime } = obj;
  if (
    statutoryOvertime !== undefined &&
    statutoryOvertime !== null &&
    typeof statutoryOvertime !== "number"
  ) {
    return false;
  }
  if (!obj["rows"].every(isDashboardRow)) {
    return false;
  }
  if (!obj["leaveBalances"].every(isLeaveBalance)) {
    return false;
  }
  return true;
}
