import type { StoragePort } from "../chrome/ports/StoragePort";
import type { MessagingPort } from "../chrome/ports/MessagingPort";
import { parseKotTable } from "../kot/KotTableParser";
import { rawRowToWorkDay } from "../kot/WorkDayMapper";
import { toStorageData } from "../../application/DashboardMapper";
import { scrapeLeaveBalances } from "../kot/LeaveBalanceScraper";
import { KOTDIFF_MARKER_CLASS } from "./styles";

export function createDashboardButton(
  table: HTMLTableElement,
  storage: StoragePort,
  messaging: MessagingPort,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = "📊 ダッシュボード";
  btn.style.cssText =
    "margin-top: 8px; padding: 4px 12px; border: 1px solid #7986cb; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font-size: 13px;";
  btn.addEventListener("click", async () => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const rawRows = parseKotTable(tbody);
    const workDays = rawRows.map(rawRowToWorkDay);
    const leaveBalances = scrapeLeaveBalances(document);
    const dashboardData = toStorageData(workDays, leaveBalances, new Date().toISOString());
    await storage.setDashboardData(dashboardData);
    await messaging.sendMessage({ type: "kotdiff-open-dashboard" });
  });
  return btn;
}

export function injectDashboardButton(
  table: HTMLTableElement,
  storage: StoragePort,
  messaging: MessagingPort,
): void {
  const banner = document.querySelector<HTMLElement>(`div.${KOTDIFF_MARKER_CLASS}`);
  if (!banner) return;
  banner.appendChild(createDashboardButton(table, storage, messaging));
}
