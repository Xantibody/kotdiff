export interface LeaveBalance {
  readonly label: string;
  readonly used: number;
  readonly remaining: number | null;
}

export function createLeaveBalance(
  label: string,
  used: number,
  remaining: number | null,
): LeaveBalance {
  if (used < 0) throw new Error(`LeaveBalance: used (${used}) must be >= 0`);
  if (remaining !== null && remaining < 0)
    throw new Error(`LeaveBalance: remaining (${remaining}) must be >= 0`);
  return { label, used, remaining };
}

export function parseLeaveBalanceText(text: string): { used: number; remaining: number | null } {
  const normalized = text.replace(/\s+/g, " ").trim();

  const remainingMatch = normalized.match(/残\s*([\d.]+)/);
  const remaining = remainingMatch ? parseFloat(remainingMatch[1]) : null;

  const usedMatch = normalized.match(/^([\d.]+)/);
  const used = usedMatch ? parseFloat(usedMatch[1]) : 0;

  return { used, remaining };
}
