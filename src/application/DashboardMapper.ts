import type { WorkDay } from "../domain/entities/WorkDay";
import type { LeaveBalance } from "../domain/value-objects/LeaveBalance";
import type { DashboardData } from "../types";
import { workDayToDashboardRow } from "../infrastructure/kot/WorkDayMapper";

export function toStorageData(
  days: WorkDay[],
  leaveBalances: LeaveBalance[],
  generatedAt: string,
): DashboardData {
  return {
    rows: days.map(workDayToDashboardRow),
    leaveBalances,
    generatedAt,
  };
}
