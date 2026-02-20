export const DEFAULT_EXPECTED_HOURS = 8;
export const OVERTIME_LIMIT = 45;
export const EXT_COLOR = "#e8eaf6"; // 薄い青紫 — KOT既存UIにない色

export function parseWorkTime(text: string): number | null {
  const match = text.trim().match(/^(\d+)\.(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours + minutes / 60;
}

export function formatHM(hours: number): string {
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatDiff(hours: number): string {
  const sign = hours >= 0 ? "+" : "-";
  return `${sign}${formatHM(hours)}`;
}

export function getCellValue(row: Element, sortIndex: string): number | null {
  const cell = row.querySelector<HTMLTableCellElement>(`td[data-ht-sort-index="${sortIndex}"]`);
  if (!cell) return null;
  const p = cell.querySelector("p");
  return parseWorkTime(p?.textContent ?? "");
}

export function isWorkingDay(row: Element): boolean {
  const schedule = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="SCHEDULE"]');
  if (!schedule) return false;
  const text = schedule.textContent?.trim() ?? "";
  return text !== "" && !text.includes("公休");
}
