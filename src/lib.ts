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

  // 必要時間の行
  if (data.remainingRequired <= 0) {
    // 余裕あり — 目標クリア済み、1日あたり平均は不要
    lines.push(
      `<b>残り ${data.remainingDays}日 ／ 必要時間 ${formatDiff(data.remainingRequired)}</b>` +
        ` ✓ 今月の目標クリア済み`,
    );
  } else {
    lines.push(
      `<b>残り ${data.remainingDays}日 ／ 必要時間 ${formatHM(data.remainingRequired)}</b>` +
        `（1日あたり平均 <b>${formatHM(data.avgPerDay)}</b>）`,
    );
  }

  // 時間貯金
  lines.push(
    `現在の時間貯金: <span style="color:${data.cumulativeDiff >= 0 ? "green" : "red"}">${formatDiff(data.cumulativeDiff)}</span>`,
  );

  // 残業警告（ケース2, 3 は同じ位置に条件分岐で表示）
  if (data.projectedOvertime >= OVERTIME_LIMIT) {
    lines.push(
      `<span style="color:red;font-weight:bold">⚠ 残業 ${formatHM(data.projectedOvertime)} — 45時間超過</span>`,
    );
  } else if (data.projectedOvertime > OVERTIME_LIMIT * 0.8 && data.remainingDays > 0) {
    const maxDaily =
      DEFAULT_EXPECTED_HOURS + (OVERTIME_LIMIT - data.projectedOvertime) / data.remainingDays;
    lines.push(
      `<span style="color:orange;font-weight:bold">⚠ 残業 ${formatHM(data.projectedOvertime)} — ` +
        `1日 ${formatHM(maxDaily)} 以下で45時間超過を回避可能</span>`,
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
