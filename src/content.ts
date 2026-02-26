import {
  DEFAULT_EXPECTED_HOURS,
  EXT_COLOR,
  buildBannerLines,
  formatDiff,
  formatHM,
  getCellValue,
  isWorkingDay,
} from "./lib";

function addDiffHeader(container: string): void {
  const table = document.querySelector<HTMLTableElement>(`${container} > table`);
  if (!table) return;
  const headerRow = table.querySelector("thead > tr");
  if (!headerRow) return;
  const th = document.createElement("th");
  th.style.background = EXT_COLOR;
  th.innerHTML = "<p>差分</p>";
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

  // Add header (main table + fixed scroll header)
  addDiffHeader(".htBlock-adjastableTableF_inner");
  addDiffHeader(".htBlock-adjastableTableF_fixedHeader");

  // Process body rows
  let cumulativeDiff = 0; // vs 8h/day target
  let overtimeDiff = 0; // vs FIXED_WORK (所定) for overtime tracking
  let remainingDays = 0;
  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
    const actual = getCellValue(row, "ALL_WORK_MINUTE");
    const working = isWorkingDay(row);

    const td = document.createElement("td");
    td.style.textAlign = "right";
    td.style.whiteSpace = "nowrap";
    td.style.background = EXT_COLOR;

    if (actual !== null && working) {
      // Worked day: diff against 8h target
      cumulativeDiff += actual - DEFAULT_EXPECTED_HOURS;
      // Overtime: diff against 所定
      if (fixedWork !== null) {
        overtimeDiff += actual - fixedWork;
      }
      td.textContent = formatDiff(cumulativeDiff);
      td.style.color = cumulativeDiff >= 0 ? "green" : "red";
    } else if (actual === null && working) {
      // Future working day
      remainingDays++;
    }

    row.appendChild(td);
  }

  // Remaining required hours (against 8h/day)
  const remainingRequired = remainingDays * DEFAULT_EXPECTED_HOURS - cumulativeDiff;

  // Average hours per remaining day
  const avgPerDay = remainingDays > 0 ? remainingRequired / remainingDays : 0;

  // Overtime warning: if continuing at 8h/day pace
  // projected = current overtime + remaining_days * (8 - 8) = current overtime
  // But need to account for 所定 on future days too — use overtimeDiff as-is
  const projectedOvertime = overtimeDiff;

  // Build summary banner
  const banner = document.createElement("div");
  banner.style.cssText =
    "padding:10px 14px;margin-bottom:8px;border-radius:4px;" +
    `font-size:14px;line-height:1.8;background:${EXT_COLOR};color:#333;` +
    "border-left:4px solid #7986cb;";

  const lines = buildBannerLines({
    remainingDays,
    remainingRequired,
    avgPerDay,
    cumulativeDiff,
    projectedOvertime,
  });

  banner.innerHTML = lines.join("<br>");
  table.parentElement?.insertBefore(banner, table);

  console.log(
    `[kotdiff] diff: ${formatDiff(cumulativeDiff)}, ` +
      `remaining: ${remainingDays}d / ${formatHM(remainingRequired)}, ` +
      `avg/day: ${formatHM(avgPerDay)}, ` +
      `projected overtime: ${formatHM(projectedOvertime)}`,
  );
}

function waitForTable(): void {
  const selector = ".htBlock-adjastableTableF_inner > table";
  if (document.querySelector(selector)) {
    main();
    return;
  }
  console.log("[kotdiff] waiting for table...");
  const observer = new MutationObserver((_mutations, obs) => {
    if (document.querySelector(selector)) {
      obs.disconnect();
      main();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

waitForTable();
