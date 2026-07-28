import { formatDiff, formatHM, isDiffNegative } from "../../domain/value-objects/WorkDuration";
import { isBreakSufficient } from "../../domain/services/BreakSufficiencyService";
import { KOTDIFF_MARKER_CLASS, KOTDIFF_SAVINGS_CLASS, WARNING_COLOR } from "./styles";
import { COLOR, TABULAR } from "./theme";
import { el } from "./dom";

// Create the diff column header <th>
export function createDiffHeader(): HTMLTableCellElement {
  const th = document.createElement("th");
  th.classList.add(KOTDIFF_MARKER_CLASS);
  const p = document.createElement("p");
  p.textContent = "差分";
  th.append(p);
  return th;
}

// Create a diff cell showing cumulative diff
export function createDiffCell(cumulativeDiff: number): HTMLTableCellElement {
  const td = document.createElement("td");
  td.classList.add(KOTDIFF_MARKER_CLASS);
  td.textContent = formatDiff(cumulativeDiff);
  td.style.color = isDiffNegative(cumulativeDiff) ? "red" : "green";
  return td;
}

// Create an in-progress diff cell (italic, semi-transparent)
export function createInProgressDiffCell(estimatedCumulativeDiff: number): HTMLTableCellElement {
  const td = createDiffCell(estimatedCumulativeDiff);
  td.style.fontStyle = "italic";
  td.style.opacity = "0.5";
  return td;
}

// Create an empty placeholder diff cell (non-working days, weekends)
export function createEmptyDiffCell(): HTMLTableCellElement {
  const td = document.createElement("td");
  td.classList.add(KOTDIFF_MARKER_CLASS);
  return td;
}

// Update an existing diff cell value
export function updateDiffCell(cell: HTMLTableCellElement, cumulativeDiff: number): void {
  cell.textContent = formatDiff(cumulativeDiff);
  cell.style.color = isDiffNegative(cumulativeDiff) ? "red" : "green";
}

// Highlight break cell if insufficient (labor law)
export function highlightBreakCellIfInsufficient(
  row: Element,
  actual: number,
  breakTime: number,
): void {
  if (!isBreakSufficient(actual, breakTime)) {
    const breakCell = row.querySelector<HTMLTableCellElement>(
      'td[data-ht-sort-index="REST_MINUTE"]',
    );
    if (breakCell) {
      breakCell.style.backgroundColor = WARNING_COLOR;
    }
  }
}

// Update estimated work cell (for in-progress row)
export function updateEstimatedWorkCell(cell: HTMLTableCellElement, workTime: number): void {
  const p = cell.querySelector("p");
  if (!p) {
    return;
  }
  p.style.fontStyle = "italic";
  p.style.opacity = "0.5";
  p.textContent = formatHM(workTime);
}

// --- v2 UI (時間貯金列) ---------------------------------------------------
// 差分列を「時間貯金」に改称し、テーブル右端 (28 列目) から日付セルの直後へ移す。
// 横スクロールしないと見えない位置にある限り、主役の指標にはならないため。

export type RowState = "over" | "under" | "missing" | "none";

export function createSavingsHeader(): HTMLTableCellElement {
  const th = document.createElement("th");
  th.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_SAVINGS_CLASS);
  const p = document.createElement("p");
  p.textContent = "時間貯金";
  th.append(p);
  return th;
}

function savingsCellShell(): HTMLTableCellElement {
  const td = document.createElement("td");
  td.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_SAVINGS_CLASS);
  return td;
}

function savingsColor(cumulativeDiff: number): string {
  return isDiffNegative(cumulativeDiff) ? COLOR.danger : COLOR.kotGreen;
}

function renderSavingsContent(
  td: HTMLTableCellElement,
  cumulativeDiff: number,
  dayDiff: number | null,
  inProgress: boolean,
): void {
  td.textContent = "";
  const primary = el(
    "div",
    `font-size:15px; font-weight:700; line-height:1.15; ${TABULAR}; color:${savingsColor(cumulativeDiff)}`,
    formatDiff(cumulativeDiff),
  );
  if (inProgress) {
    primary.style.fontStyle = "italic";
    primary.style.opacity = "0.6";
  }
  td.append(primary);
  if (dayDiff !== null) {
    td.append(
      el(
        "div",
        `font-size:10px; color:${COLOR.textMuted}; line-height:1.2; ${TABULAR}`,
        `当日 ${formatDiff(dayDiff)}`,
      ),
    );
  }
}

export function createSavingsCell(
  cumulativeDiff: number,
  dayDiff: number | null,
  inProgress = false,
): HTMLTableCellElement {
  const td = savingsCellShell();
  renderSavingsContent(td, cumulativeDiff, dayDiff, inProgress);
  return td;
}

// 打刻漏れの日は累積が確定しないので値を出さず「未」とだけ示す
export function createMissingSavingsCell(): HTMLTableCellElement {
  const td = savingsCellShell();
  td.append(
    el("div", `font-size:15px; font-weight:700; line-height:1.15; color:${COLOR.attention}`, "未"),
  );
  return td;
}

export function createEmptySavingsCell(): HTMLTableCellElement {
  return savingsCellShell();
}

export function updateSavingsCell(
  cell: HTMLTableCellElement,
  cumulativeDiff: number,
  dayDiff: number | null,
): void {
  renderSavingsContent(cell, cumulativeDiff, dayDiff, true);
}

const STRIPE_COLORS: Record<RowState, string> = {
  over: COLOR.kotGreen,
  under: COLOR.danger,
  missing: COLOR.attention,
  none: "transparent",
};

// 行の状態は日付セルの左端 3px で示す。KOT 既存セルの背景・文字色には触れない
export function applyRowStripe(row: Element, state: RowState): void {
  const dateCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
  if (!dateCell) {
    return;
  }
  dateCell.style.borderLeft = `3px solid ${STRIPE_COLORS[state]}`;
}

// 差分セルを日付セルの直後に差し込む。日付セルが無い行は列がずれるため末尾に足す
export function insertSavingsCell(row: Element, cell: HTMLTableCellElement): void {
  const dateCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
  if (dateCell) {
    dateCell.after(cell);
    return;
  }
  row.append(cell);
}

// ヘッダーも同じ位置 (1 列目の直後) に入れないと本文と列がずれる
export function insertSavingsHeader(headerRow: Element, th: HTMLTableCellElement): void {
  const first = headerRow.querySelector("th");
  if (first) {
    first.after(th);
    return;
  }
  headerRow.append(th);
}
