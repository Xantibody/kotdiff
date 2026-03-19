import type { LeaveBalance } from "../../domain/value-objects/LeaveBalance";
import { parseLeaveBalanceText } from "../../domain/value-objects/LeaveBalance";

export function scrapeLeaveBalances(container: Document | Element): LeaveBalance[] {
  const balances: LeaveBalance[] = [];
  const entries = container.querySelectorAll(".specific-daysCount_1 li");
  for (const li of entries) {
    const label = li.querySelector("label")?.textContent?.trim() ?? "";
    const div = li.querySelector("div");
    if (!label || !div) continue;
    const { used, remaining } = parseLeaveBalanceText(div.textContent ?? "");
    balances.push({ label, used, remaining });
  }
  return balances;
}
