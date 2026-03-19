import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import { type RowInput, accumulateRows } from "../domain/aggregates/WorkMonth";
import { buildBannerLines, type BannerData } from "./BannerInfo";
import {
  getCellValue,
  isWorkingDay,
  detectInProgressRow,
  getCell,
  addColumnTooltips,
} from "../infrastructure/kot/KotDomHelpers";
import { calcEstimatedWorkTime } from "../domain/value-objects/InProgressWork";
import { nowAsDecimalHours } from "../domain/value-objects/TimeRecord";
import { DEFAULT_EXPECTED_HOURS } from "../domain/constants";
import { KOTDIFF_MARKER_CLASS } from "../infrastructure/ui/styles";
import {
  createDiffHeader,
  createDiffCell,
  createInProgressDiffCell,
  createEmptyDiffCell,
  highlightBreakCellIfInsufficient,
  updateEstimatedWorkCell,
} from "../infrastructure/ui/DiffColumnRenderer";
import {
  createBannerElement,
  renderBannerLine,
  injectStyles,
} from "../infrastructure/ui/BannerRenderer";
import { createPeriodicUpdateController } from "../infrastructure/ui/PeriodicUpdateController";
import type { TimerPort } from "../infrastructure/ui/ports/TimerPort";
import { browserTimerAdapter } from "../infrastructure/ui/BrowserTimerAdapter";
import type { DomReadyPort } from "../infrastructure/ui/ports/DomReadyPort";
import { browserDomAdapter } from "../infrastructure/ui/BrowserDomAdapter";
import { injectDashboardButton } from "../infrastructure/ui/DashboardButtonRenderer";
import { parseKotTable } from "../infrastructure/kot/KotTableParser";
import { rawRowToWorkDay } from "../infrastructure/kot/WorkDayMapper";
import { scrapeLeaveBalances } from "../infrastructure/kot/LeaveBalanceScraper";
import { toStorageData } from "./DashboardMapper";

export interface ContentScriptServiceInstance {
  run(): Promise<void>;
  listenForMessages(): void;
}

export function createContentScriptService(
  storage: StoragePort,
  messaging: MessagingPort,
  timer: TimerPort = browserTimerAdapter,
  dom: DomReadyPort = browserDomAdapter,
): ContentScriptServiceInstance {
  // Guards against concurrent calls to run() before the DOM marker is written
  let injecting = false;

  function isAlreadyInjected(): boolean {
    return dom.isAlreadyInjected(KOTDIFF_MARKER_CLASS);
  }

  function inject(): void {
    const table = dom.querySelector<HTMLTableElement>(".htBlock-adjastableTableF_inner > table");
    if (!table) {
      console.log("[kotdiff] table not found");
      return;
    }

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) {
      console.log("[kotdiff] thead/tbody not found");
      return;
    }

    injectStyles();

    // Add diff header
    const headerRow = thead.querySelector("tr");
    if (headerRow) headerRow.appendChild(createDiffHeader());

    // Process body rows
    const rowInputs: RowInput[] = [];
    let displayCumulativeDiff = 0;
    let ipRow: Element | null = null;
    let ipDiffCell: HTMLTableCellElement | null = null;
    let ipCumulativeDiffBase = 0;

    for (const row of tbody.querySelectorAll("tr")) {
      const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
      const actual = getCellValue(row, "ALL_WORK_MINUTE");
      const working = isWorkingDay(row);

      let inProgress: RowInput["inProgress"] = null;

      if (actual !== null && working) {
        displayCumulativeDiff += actual - DEFAULT_EXPECTED_HOURS;
        const td = createDiffCell(displayCumulativeDiff);
        const breakTime = getCellValue(row, "REST_MINUTE");
        if (breakTime !== null) {
          highlightBreakCellIfInsufficient(row, actual, breakTime);
        }
        rowInputs.push({ actual, fixedWork, working, inProgress });
        row.appendChild(td);
      } else if (working) {
        const inProgressData = detectInProgressRow(row);

        if (inProgressData) {
          ipRow = row;
          ipCumulativeDiffBase = displayCumulativeDiff;
          const now = nowAsDecimalHours();
          const estimated = calcEstimatedWorkTime(inProgressData, now);
          inProgress = { estimatedWorkTime: estimated.workTime, status: estimated.status };

          const workCell = getCell(row, "ALL_WORK_MINUTE");
          if (workCell) updateEstimatedWorkCell(workCell, estimated.workTime);

          const estimatedCumulativeDiff =
            displayCumulativeDiff + estimated.workTime - DEFAULT_EXPECTED_HOURS;
          const td = createInProgressDiffCell(estimatedCumulativeDiff);
          ipDiffCell = td;
          rowInputs.push({ actual, fixedWork, working, inProgress });
          row.appendChild(td);
        } else {
          const td = createEmptyDiffCell();
          rowInputs.push({ actual, fixedWork, working, inProgress });
          row.appendChild(td);
        }
      } else {
        const td = createEmptyDiffCell();
        rowInputs.push({ actual, fixedWork, working, inProgress });
        row.appendChild(td);
      }
    }

    // Build banner
    const acc = accumulateRows(rowInputs);
    const remainingRequired = acc.remainingDays * DEFAULT_EXPECTED_HOURS - acc.cumulativeDiff;
    const avgPerDay = acc.remainingDays > 0 ? remainingRequired / acc.remainingDays : 0;
    const bannerData: BannerData = {
      remainingDays: acc.remainingDays,
      remainingRequired,
      avgPerDay,
      cumulativeDiff: acc.cumulativeDiff,
      currentOvertime: acc.overtimeDiff,
    };
    const banner = createBannerElement();
    for (const line of buildBannerLines(bannerData)) {
      renderBannerLine(line, banner);
    }
    table.parentElement?.insertBefore(banner, table);

    // Tooltips
    addColumnTooltips(table);

    // Periodic update for in-progress row
    if (ipRow && ipDiffCell) {
      const controller = createPeriodicUpdateController(timer);
      controller.start(ipRow, ipDiffCell, ipCumulativeDiffBase);
    }

    // Auto-save dashboard data on every successful injection
    const rawRows = parseKotTable(tbody);
    const workDays = rawRows.map(rawRowToWorkDay);
    const leaveBalances = scrapeLeaveBalances(document);
    const dashboardData = toStorageData(workDays, leaveBalances, new Date().toISOString());
    storage.setDashboardData(dashboardData).catch(console.error);

    // Dashboard button
    injectDashboardButton(table, storage, messaging);
  }

  async function run(): Promise<void> {
    if (injecting || isAlreadyInjected()) {
      console.log("[kotdiff] already injecting or injected");
      return;
    }
    injecting = true;

    const selector = ".htBlock-adjastableTableF_inner > table";
    if (dom.querySelector(selector)) {
      inject();
      injecting = false;
      return;
    }

    console.log("[kotdiff] waiting for table");
    dom.waitForElement(selector, () => {
      inject();
      injecting = false;
    });
  }

  return { run, listenForMessages: () => {} };
}
