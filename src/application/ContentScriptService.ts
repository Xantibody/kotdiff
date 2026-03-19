import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import { isKotdiffMessage } from "./types";
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

  function inject(dashboardEnabled: boolean): void {
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
      projectedOvertime: acc.overtimeDiff,
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

    // Dashboard button
    if (dashboardEnabled) {
      injectDashboardButton(table, storage, messaging);
    }
  }

  async function run(): Promise<void> {
    if (injecting || isAlreadyInjected()) {
      console.log("[kotdiff] already injecting or injected");
      return;
    }
    injecting = true;

    const enabled = await storage.getEnabled();
    if (!enabled) {
      injecting = false;
      console.log("[kotdiff] disabled");
      return;
    }

    const dashboardEnabled = await storage.getDashboardEnabled();

    const selector = ".htBlock-adjastableTableF_inner > table";
    if (dom.querySelector(selector)) {
      inject(dashboardEnabled);
      injecting = false;
      return;
    }

    console.log("[kotdiff] waiting for table");
    dom.waitForElement(selector, () => {
      inject(dashboardEnabled);
      injecting = false;
    });
  }

  function listenForMessages(): void {
    messaging.onMessage((msg) => {
      if (!isKotdiffMessage(msg)) return;
      if (msg.type === "kotdiff-toggle") {
        if (!msg.enabled) {
          dom.reload();
        } else {
          void run();
        }
      }
      if (msg.type === "kotdiff-dashboard-changed") {
        dom.reload();
      }
    });
  }

  return { run, listenForMessages };
}
