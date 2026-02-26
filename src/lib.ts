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
  let h = Math.floor(abs);
  let m = Math.round((abs - h) * 60);
  if (m === 60) {
    h++;
    m = 0;
  }
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

export interface BannerData {
  remainingDays: number;
  remainingRequired: number;
  avgPerDay: number;
  cumulativeDiff: number;
  projectedOvertime: number;
}

export function buildBannerLines(data: BannerData): string[] {
  const lines: string[] = [];

  lines.push(
    `<b>残り ${data.remainingDays}日 ／ 必要時間 ${formatHM(data.remainingRequired)}</b>` +
      `（1日あたり平均 <b>${formatHM(data.avgPerDay)}</b>）`,
  );
  lines.push(
    `現在の時間貯金: <span style="color:${data.cumulativeDiff >= 0 ? "green" : "red"}">${formatDiff(data.cumulativeDiff)}</span>`,
  );

  if (data.projectedOvertime > OVERTIME_LIMIT) {
    lines.push(
      `<span style="color:red;font-weight:bold">⚠ 8h/日ペースで残業 ${formatHM(data.projectedOvertime)} — 45時間超過</span>`,
    );
  } else if (data.projectedOvertime > OVERTIME_LIMIT * 0.8) {
    lines.push(
      `<span style="color:orange;font-weight:bold">⚠ 8h/日ペースで残業 ${formatHM(data.projectedOvertime)} — 45時間に接近中</span>`,
    );
  }

  return lines;
}

export function isWorkingDay(row: Element): boolean {
  const schedule = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="SCHEDULE"]');
  if (!schedule) return false;
  const text = schedule.textContent?.trim() ?? "";
  return text !== "" && !text.includes("公休");
}
