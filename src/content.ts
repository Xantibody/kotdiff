import {
  type BannerLine,
  type RowInput,
  DEFAULT_EXPECTED_HOURS,
  DIFF_COLUMN_WIDTH,
  EXT_COLOR,
  KOTDIFF_MARKER_CLASS,
  WARNING_COLOR,
  accumulateRows,
  buildBannerLines,
  calcEstimatedWorkTime,
  detectInProgressRow,
  extractTimeStrings,
  formatDiff,
  formatHM,
  getCell,
  getCellValue,
  isBreakSufficient,
  isWorkingDay,
  nowAsDecimalHours,
  calcNightWork,
  parseAllTimeRecords,
} from "./worktime";
import { DASHBOARD_KEY, DEFAULT_DASHBOARD, DEFAULT_ENABLED, STORAGE_KEY } from "./storage";
import type { DashboardData, DashboardRow, LeaveBalance } from "./types";
import { parseLeaveBalanceText } from "./worktime";

function injectStyles(): void {
  const style = document.createElement("style");
  style.classList.add(KOTDIFF_MARKER_CLASS);
  style.textContent = `
    th.${KOTDIFF_MARKER_CLASS},
    td.${KOTDIFF_MARKER_CLASS} {
      background: ${EXT_COLOR};
      text-align: right;
      white-space: nowrap;
      min-width: ${DIFF_COLUMN_WIDTH}px;
      width: ${DIFF_COLUMN_WIDTH}px;
    }
    th.kotdiff-center,
    td.kotdiff-center {
      text-align: center;
    }
    div.${KOTDIFF_MARKER_CLASS} {
      padding: 10px 14px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.8;
      background: ${EXT_COLOR};
      color: #333;
      border-left: 4px solid #7986cb;
    }
    .htBlock-adjastableTableF_fixedHeader {
      display: none !important;
    }
    .htBlock-adjastableTableF_inner > table > thead > tr > th {
      position: sticky;
      top: 84px;
      z-index: 10;
      background-color: #fff;
    }
    td[data-kotdiff-tooltip] {
      position: relative;
    }
    td[data-kotdiff-tooltip]:hover::after {
      content: attr(data-kotdiff-tooltip);
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 100;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function addColumnTooltips(table: HTMLTableElement): void {
  const headerRow = table.querySelector("thead > tr");
  const tbody = table.querySelector("tbody");
  if (!headerRow || !tbody) return;

  const ths = headerRow.querySelectorAll("th");
  const names: string[] = [];
  for (const th of ths) {
    names.push(th.textContent?.trim() ?? "");
  }

  for (const row of tbody.querySelectorAll("tr")) {
    const tds = row.querySelectorAll("td");
    for (let i = 0; i < tds.length && i < names.length; i++) {
      if (names[i]) tds[i].setAttribute("data-kotdiff-tooltip", names[i]);
    }
  }
}

function addDiffHeader(table: HTMLTableElement): void {
  const headerRow = table.querySelector("thead > tr");
  if (!headerRow) return;
  const th = document.createElement("th");
  th.classList.add(KOTDIFF_MARKER_CLASS);
  const p = document.createElement("p");
  p.textContent = "差分";
  th.appendChild(p);
  headerRow.appendChild(th);
}

function main(): void {
  const table = document.querySelector<HTMLTableElement>(".htBlock-adjastableTableF_inner > table");
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

  // Inject CSS styles for all kotdiff elements
  injectStyles();

  // Add diff header
  addDiffHeader(table);

  // Process body rows: collect data for accumulation and render diff cells
  const rowInputs: RowInput[] = [];
  let displayCumulativeDiff = 0;
  // Track in-progress row for periodic updates
  let ipRow: Element | null = null;
  let ipDiffCell: HTMLTableCellElement | null = null;
  let ipCumulativeDiffBase = 0;
  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
    const actual = getCellValue(row, "ALL_WORK_MINUTE");
    const working = isWorkingDay(row);

    const td = document.createElement("td");
    td.classList.add(KOTDIFF_MARKER_CLASS);

    let inProgress: RowInput["inProgress"] = null;

    if (actual !== null && working) {
      displayCumulativeDiff += actual - DEFAULT_EXPECTED_HOURS;
      td.textContent = formatDiff(displayCumulativeDiff);
      td.style.color = displayCumulativeDiff >= 0 ? "green" : "red";

      // Highlight break cell if insufficient per labor law
      const breakTime = getCellValue(row, "REST_MINUTE");
      if (breakTime !== null && !isBreakSufficient(actual, breakTime)) {
        const breakCell = getCell(row, "REST_MINUTE");
        if (breakCell) breakCell.style.backgroundColor = WARNING_COLOR;
      }
    } else if (working) {
      const inProgressData = detectInProgressRow(row);
      if (inProgressData) {
        ipRow = row;
        ipDiffCell = td;
        ipCumulativeDiffBase = displayCumulativeDiff;
        const now = nowAsDecimalHours();
        const estimated = calcEstimatedWorkTime(inProgressData, now);

        inProgress = { estimatedWorkTime: estimated.workTime, isOnBreak: estimated.isOnBreak };

        // Show estimated time in ALL_WORK_MINUTE cell
        const workCell = getCell(row, "ALL_WORK_MINUTE");
        if (workCell) {
          renderEstimatedWorkCell(workCell, estimated.workTime);
        }

        // Show estimated cumulative diff (italic) in diff cell only
        const estimatedCumulativeDiff =
          displayCumulativeDiff + estimated.workTime - DEFAULT_EXPECTED_HOURS;
        td.textContent = formatDiff(estimatedCumulativeDiff);
        td.style.color = estimatedCumulativeDiff >= 0 ? "green" : "red";
        td.style.fontStyle = "italic";
        td.style.opacity = "0.5";
      }
    }

    rowInputs.push({ actual, fixedWork, working, inProgress });
    row.appendChild(td);
  }

  // Accumulate confirmed totals for banner (excludes in-progress estimates)
  const acc = accumulateRows(rowInputs);
  const remainingRequired = acc.remainingDays * DEFAULT_EXPECTED_HOURS - acc.cumulativeDiff;
  const avgPerDay = acc.remainingDays > 0 ? remainingRequired / acc.remainingDays : 0;
  const projectedOvertime = acc.overtimeDiff;

  // Build summary banner
  const banner = document.createElement("div");
  banner.classList.add(KOTDIFF_MARKER_CLASS);

  const lines = buildBannerLines({
    remainingDays: acc.remainingDays,
    remainingRequired,
    avgPerDay,
    cumulativeDiff: acc.cumulativeDiff,
    projectedOvertime,
  });

  for (const line of lines) {
    renderBannerLine(line, banner);
  }
  table.parentElement?.insertBefore(banner, table);

  // Add tooltips to all cells (supplements sticky header)
  addColumnTooltips(table);

  // Set up periodic update for in-progress row
  if (ipRow && ipDiffCell) {
    startPeriodicUpdate(ipRow, ipDiffCell, ipCumulativeDiffBase);
  }
}

const UPDATE_INTERVAL_MS = 60_000;

function startPeriodicUpdate(
  row: Element,
  diffCell: HTMLTableCellElement,
  cumulativeDiffBase: number,
): void {
  const intervalId = setInterval(() => {
    // Re-detect in case the row is no longer in progress (e.g., user clocked out)
    const data = detectInProgressRow(row);
    if (!data || !document.contains(row)) {
      clearInterval(intervalId);
      return;
    }

    const now = nowAsDecimalHours();
    const estimated = calcEstimatedWorkTime(data, now);
    const newCumulativeDiff = cumulativeDiffBase + estimated.workTime - DEFAULT_EXPECTED_HOURS;

    // Update ALL_WORK_MINUTE cell
    const workCell = getCell(row, "ALL_WORK_MINUTE");
    if (workCell) {
      renderEstimatedWorkCell(workCell, estimated.workTime);
    }

    // Update diff cell
    diffCell.textContent = formatDiff(newCumulativeDiff);
    diffCell.style.color = newCumulativeDiff >= 0 ? "green" : "red";
  }, UPDATE_INTERVAL_MS);

  // Clean up if table is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(row)) {
      clearInterval(intervalId);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function renderEstimatedWorkCell(cell: HTMLTableCellElement, workTime: number): void {
  const p = cell.querySelector("p");
  if (!p) return;
  p.style.fontStyle = "italic";
  p.style.opacity = "0.5";
  p.textContent = formatHM(workTime);
}

function renderBannerLine(line: BannerLine, container: HTMLElement): void {
  const div = document.createElement("div");
  for (const seg of line) {
    if (seg.bold || seg.color) {
      const span = document.createElement("span");
      span.textContent = seg.text;
      if (seg.bold) span.style.fontWeight = "bold";
      if (seg.color) span.style.color = seg.color;
      div.appendChild(span);
    } else {
      div.appendChild(document.createTextNode(seg.text));
    }
  }
  container.appendChild(div);
}

function isAlreadyInjected(): boolean {
  return document.querySelector(`.${KOTDIFF_MARKER_CLASS}`) !== null;
}

async function waitForTable(): Promise<void> {
  const result = await chrome.storage.local.get({
    [STORAGE_KEY]: DEFAULT_ENABLED,
    [DASHBOARD_KEY]: DEFAULT_DASHBOARD,
  });
  if (!result[STORAGE_KEY]) {
    console.log("[kotdiff] disabled");
    return;
  }

  if (isAlreadyInjected()) {
    console.log("[kotdiff] already injected");
    return;
  }

  const dashboardEnabled: boolean = result[DASHBOARD_KEY];

  const selector = ".htBlock-adjastableTableF_inner > table";
  if (document.querySelector(selector)) {
    main();
    if (dashboardEnabled) injectDashboardButton();
    return;
  }
  console.log("[kotdiff] waiting for table");
  const observer = new MutationObserver((_mutations, obs) => {
    if (document.querySelector(selector)) {
      obs.disconnect();
      main();
      if (dashboardEnabled) injectDashboardButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function injectDashboardButton(): void {
  const banner = document.querySelector<HTMLElement>(`div.${KOTDIFF_MARKER_CLASS}`);
  if (!banner) return;

  const btn = document.createElement("button");
  btn.textContent = "📊 ダッシュボード";
  btn.style.cssText =
    "margin-top: 8px; padding: 4px 12px; border: 1px solid #7986cb; border-radius: 4px; background: #fff; color: #333; cursor: pointer; font-size: 13px;";

  btn.addEventListener("click", async () => {
    const table = document.querySelector<HTMLTableElement>(
      ".htBlock-adjastableTableF_inner > table",
    );
    if (!table) return;

    const dashboardData = buildDashboardDataFromTable(table);
    await chrome.storage.local.set({ kotdiff_dashboard_data: dashboardData });
    chrome.runtime.sendMessage({ type: "kotdiff-open-dashboard" });
  });

  banner.appendChild(btn);
}

function scrapeLeaveBalances(): LeaveBalance[] {
  const balances: LeaveBalance[] = [];
  const entries = document.querySelectorAll(".specific-daysCount_1 li");
  for (const li of entries) {
    const label = li.querySelector("label")?.textContent?.trim() ?? "";
    const div = li.querySelector("div");
    if (!label || !div) continue;
    const { used, remaining } = parseLeaveBalanceText(div.textContent ?? "");
    balances.push({ label, used, remaining });
  }
  return balances;
}

function buildDashboardDataFromTable(table: HTMLTableElement): DashboardData {
  const tbody = table.querySelector("tbody");
  if (!tbody) return { rows: [], leaveBalances: [], generatedAt: new Date().toISOString() };

  const rows: DashboardRow[] = [];
  for (const row of tbody.querySelectorAll("tr")) {
    const dayCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
    const date = dayCell?.textContent?.trim() ?? "";
    const dayType =
      row
        .querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY_TYPE"]')
        ?.textContent?.trim() ?? "";

    const isWeekend =
      dayCell?.classList.contains("htBlock-scrollTable_saturday") ||
      dayCell?.classList.contains("htBlock-scrollTable_sunday") ||
      false;

    const actual = getCellValue(row, "ALL_WORK_MINUTE");
    const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
    const overtime = getCellValue(row, "OVERTIME_WORK_MINUTE");
    const breakTime = getCellValue(row, "REST_MINUTE");

    const startCell = getCell(row, "START_TIMERECORD");
    const startTimes = extractTimeStrings(startCell?.textContent ?? "");
    const startTime = startTimes[0] ?? null;

    const endCell = getCell(row, "END_TIMERECORD");
    const endTimes = extractTimeStrings(endCell?.textContent ?? "");
    const endTime = endTimes[0] ?? null;

    const restStartCell = getCell(row, "REST_START_TIMERECORD");
    const breakStarts = extractTimeStrings(restStartCell?.textContent ?? "");

    const restEndCell = getCell(row, "REST_END_TIMERECORD");
    const breakEnds = extractTimeStrings(restEndCell?.textContent ?? "");

    const scheduleCell = getCell(row, "SCHEDULE");
    const schedule = scheduleCell?.textContent?.trim() || null;

    const working = isWorkingDay(row);

    // KOT の深夜残業列は空のため、出退勤・休憩時刻から計算する
    let nightOvertime: number | null = null;
    if (startTime && endTime) {
      const startNums = parseAllTimeRecords(startCell?.textContent ?? "");
      const endNums = parseAllTimeRecords(endCell?.textContent ?? "");
      const breakStartNums = parseAllTimeRecords(restStartCell?.textContent ?? "");
      const breakEndNums = parseAllTimeRecords(restEndCell?.textContent ?? "");
      if (startNums.length > 0 && endNums.length > 0) {
        const nw = calcNightWork(startNums[0], endNums[0], breakStartNums, breakEndNums);
        nightOvertime = nw > 0 ? nw : null;
      }
    }

    rows.push({
      date,
      dayType,
      isWeekend,
      actual,
      fixedWork,
      overtime,
      breakTime,
      startTime,
      endTime,
      breakStarts,
      breakEnds,
      schedule,
      working,
      nightOvertime,
    });
  }

  const leaveBalances = scrapeLeaveBalances();
  return { rows, leaveBalances, generatedAt: new Date().toISOString() };
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "kotdiff-toggle") {
    if (!message.enabled) {
      location.reload();
    } else {
      waitForTable();
    }
  }
  if (message.type === "kotdiff-dashboard-changed") {
    location.reload();
  }
});

waitForTable();
