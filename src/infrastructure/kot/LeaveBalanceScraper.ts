import type { LeaveBalance } from "../../domain/value-objects/LeaveBalance";
import { parseLeaveBalanceText } from "../../domain/value-objects/LeaveBalance";

export function scrapeLeaveBalances(container: Document | Element): LeaveBalance[] {
  const balances: LeaveBalance[] = [];
  const entries = container.querySelectorAll(".specific-daysCount_1 li");
  for (const li of entries) {
    const label = li.querySelector("label")?.textContent?.trim() ?? "";
    const div = li.querySelector("div");
    if (!label || !div) {
      continue;
    }
    const { used, remaining } = parseLeaveBalanceText(div.textContent ?? "");
    // KOT の日数集計には平日・遅刻・早退など休暇でない集計列も並ぶ。
    // 残数表記「(残 x.x)」を持つ列だけを休暇残数として扱う (issue #48)
    if (remaining === null) {
      continue;
    }
    balances.push({ label, used, remaining });
  }
  return balances;
}
