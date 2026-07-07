import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import { type RowInput, accumulateRows } from "../domain/aggregates/WorkMonth";
import { buildBannerLines, type BannerData } from "./BannerInfo";
import {
  getCellValue,
  isWorkingDay,
  isErrorWorkRow,
  detectSameDayInProgressRow,
  detectCrossMidnightInProgressRow,
  findLastClockInRow,
  getCell,
  addColumnTooltips,
} from "../infrastructure/kot/KotDomHelpers";
import { calcEstimatedWorkTime } from "../domain/value-objects/InProgressWork";
import { nowAsDecimalHours } from "../domain/value-objects/TimeRecord";
import { DEFAULT_EXPECTED_HOURS } from "../domain/constants";
import { DEFAULT_SETTINGS } from "../types";
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

const TABLE_SELECTOR = ".htBlock-adjastableTableF_inner > table";

export function createContentScriptService(
  storage: StoragePort,
  messaging: MessagingPort,
  timer: TimerPort = browserTimerAdapter,
  dom: DomReadyPort = browserDomAdapter,
): ContentScriptServiceInstance {
  // Guards against concurrent calls to run() before the DOM marker is written
  let injecting = false;

  function isAlreadyInjected(): boolean {
    // テーブル外の残骸(バナー等)で誤判定しないよう、対象テーブル内の
    // 差分ヘッダの有無だけを見る (issue #20)
    return dom.querySelector(`${TABLE_SELECTOR} th.${KOTDIFF_MARKER_CLASS}`) !== null;
  }

  function inject(customLeaveKeywords: readonly string[]): void {
    const table = dom.querySelector<HTMLTableElement>(TABLE_SELECTOR);
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

    // 再注入時に KOT 再描画で取り残されたバナーが残っていれば除去する (冪等性)
    for (const stale of dom.querySelectorAll(`div.${KOTDIFF_MARKER_CLASS}`)) {
      stale.remove();
    }

    injectStyles();

    // Add diff header
    const headerRow = thead.querySelector("tr");
    const diffHeader = createDiffHeader();
    if (headerRow) headerRow.appendChild(diffHeader);

    // Process body rows
    const rowInputs: RowInput[] = [];
    let displayCumulativeDiff = 0;
    let errorWorkDays = 0;
    let ipRow: Element | null = null;
    let ipDiffCell: HTMLTableCellElement | null = null;
    let ipCumulativeDiffBase = 0;

    const rows = tbody.querySelectorAll("tr");
    // 日跨ぎ勤務中とみなすのは最後に出勤打刻がある行のみ。後続の行（当日行）に
    // 出勤打刻があれば前日行は退勤打刻忘れエラーであり、勤務継続中ではない。
    const lastClockInRow = findLastClockInRow(rows);

    for (const row of rows) {
      const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
      const actual = getCellValue(row, "ALL_WORK_MINUTE");
      // 日跨ぎ勤務中の行はエラー勤務扱いで isWorkingDay が false になるため別途検出する
      const crossMidnight =
        row === lastClockInRow ? detectCrossMidnightInProgressRow(row, new Date()) : null;
      const working = isWorkingDay(row, customLeaveKeywords) || crossMidnight !== null;

      // 日跨ぎ勤務中を除くエラー勤務は時間貯金に反映されないため件数を警告に使う (issue #45)
      if (crossMidnight === null && isErrorWorkRow(row)) errorWorkDays++;

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
        const inProgressData = crossMidnight ?? detectSameDayInProgressRow(row, new Date());

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
      errorWorkDays,
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
    const workDays = rawRows.map((raw) => rawRowToWorkDay(raw, customLeaveKeywords));
    const leaveBalances = scrapeLeaveBalances(document);
    const dashboardData = toStorageData(workDays, leaveBalances, new Date().toISOString());
    storage.setDashboardData(dashboardData).catch(console.error);

    // Dashboard button
    injectDashboardButton(table, storage, messaging, customLeaveKeywords);

    // KOT がテーブルを再描画すると差分列ごと消えるため、注入したヘッダの
    // 切断を監視して再注入する (issue #20)。observer は一度発火したら
    // 停止するので、run() 側のガードと合わせて無限ループにはならない
    if (diffHeader.isConnected) {
      timer.observeRemoval(diffHeader, () => {
        if (isAlreadyInjected()) return;
        void run();
      });
    }
  }

  async function run(): Promise<void> {
    if (injecting || isAlreadyInjected()) {
      console.log("[kotdiff] already injecting or injected");
      return;
    }
    injecting = true;

    // Settings must not block injection — fall back to defaults on storage failure
    const settings = await storage.getSettings().catch(() => DEFAULT_SETTINGS);
    const customLeaveKeywords = settings.customLeaveKeywords;

    if (dom.querySelector(TABLE_SELECTOR)) {
      inject(customLeaveKeywords);
      injecting = false;
      return;
    }

    console.log("[kotdiff] waiting for table");
    dom.waitForElement(
      TABLE_SELECTOR,
      () => {
        inject(customLeaveKeywords);
        injecting = false;
      },
      {
        onTimeout: () => {
          console.log("[kotdiff] table did not appear, giving up");
          injecting = false;
        },
      },
    );
  }

  return { run, listenForMessages: () => {} };
}
