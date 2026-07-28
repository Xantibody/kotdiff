import type { StoragePort } from "../chrome/ports/StoragePort";
import type { MessagingPort } from "../chrome/ports/MessagingPort";
import { parseKotTable } from "../kot/KotTableParser";
import { rawRowsToWorkDays } from "../kot/WorkDayMapper";
import { toStorageData } from "../../application/DashboardMapper";
import { scrapeLeaveBalances } from "../kot/LeaveBalanceScraper";
import { KOTDIFF_MARKER_CLASS } from "./styles";
import { COLOR, KOT_FONT } from "./theme";

export type DashboardButtonVariant = "legacy" | "v2";

export function createDashboardButton(
  table: HTMLTableElement,
  storage: StoragePort,
  messaging: MessagingPort,
  variant: DashboardButtonVariant = "legacy",
): HTMLButtonElement {
  const btn = document.createElement("button");
  // v2 は絵文字を使わず、ラベルと色だけで階層を作る
  btn.textContent = variant === "v2" ? "ダッシュボードを開く" : "📊 ダッシュボード";
  btn.style.cssText =
    variant === "v2"
      ? `padding: 4px 12px; border: 1px solid ${COLOR.cardBorder}; border-radius: 3px; background: #fff; color: ${COLOR.accent}; cursor: pointer; font-size: 12px; font-family: ${KOT_FONT};`
      : "margin-top: 8px; padding: 4px 12px; border: 1px solid #7986cb; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font-size: 13px;";
  async function handleClick(): Promise<void> {
    try {
      const tbody = table.querySelector("tbody");
      if (!tbody) {
        return;
      }
      const rawRows = parseKotTable(tbody);
      const workDays = rawRowsToWorkDays(rawRows, new Date());
      const leaveBalances = scrapeLeaveBalances(document);
      const dashboardData = toStorageData(workDays, leaveBalances, new Date().toISOString());
      await storage.setDashboardData(dashboardData);
      await messaging.sendMessage({ type: "kotdiff-open-dashboard" });
    } catch (error) {
      console.error(error);
    }
  }
  btn.addEventListener("click", () => {
    void handleClick();
  });
  return btn;
}

export function injectDashboardButton(
  table: HTMLTableElement,
  storage: StoragePort,
  messaging: MessagingPort,
  variant: DashboardButtonVariant = "legacy",
): void {
  const button = createDashboardButton(table, storage, messaging, variant);
  if (variant === "v2") {
    // カードは 30 秒ごとに作り直されるため、ボタンは独立した行として表の直前に置く
    const holder = document.createElement("div");
    holder.classList.add(KOTDIFF_MARKER_CLASS);
    holder.style.cssText = "margin-bottom: 8px; text-align: right;";
    holder.append(button);
    table.parentElement?.insertBefore(holder, table);
    return;
  }
  const banner = document.querySelector<HTMLElement>(`div.${KOTDIFF_MARKER_CLASS}`);
  if (!banner) {
    return;
  }
  banner.append(button);
}
