import { formatDiff } from "../../domain/value-objects/WorkDuration";
import { formatHM } from "../../domain/value-objects/WorkDuration";
import { isBreakSufficient } from "../../domain/services/BreakSufficiencyService";
import { KOTDIFF_MARKER_CLASS, WARNING_COLOR } from "./styles";

// Create the diff column header <th>
export function createDiffHeader(): HTMLTableCellElement {
  const th = document.createElement("th");
  th.classList.add(KOTDIFF_MARKER_CLASS);
  const p = document.createElement("p");
  p.textContent = "差分";
  th.appendChild(p);
  return th;
}

// Create a diff cell showing cumulative diff
export function createDiffCell(cumulativeDiff: number): HTMLTableCellElement {
  const td = document.createElement("td");
  td.classList.add(KOTDIFF_MARKER_CLASS);
  td.textContent = formatDiff(cumulativeDiff);
  td.style.color = cumulativeDiff >= 0 ? "green" : "red";
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
  cell.style.color = cumulativeDiff >= 0 ? "green" : "red";
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
    if (breakCell) breakCell.style.backgroundColor = WARNING_COLOR;
  }
}

// Update estimated work cell (for in-progress row)
export function updateEstimatedWorkCell(cell: HTMLTableCellElement, workTime: number): void {
  const p = cell.querySelector("p");
  if (!p) return;
  p.style.fontStyle = "italic";
  p.style.opacity = "0.5";
  p.textContent = formatHM(workTime);
}
