export const DEFAULT_EXPECTED_HOURS = 8;
export const OVERTIME_LIMIT = 45;
export const EXT_COLOR = "#e8eaf6"; // 薄い青紫 — KOT既存UIにない色
export const WARNING_COLOR = "#ffcccc"; // 薄い赤 — 休憩不足などの警告用
export const KOTDIFF_MARKER_CLASS = "kotdiff-injected";
export const DIFF_COLUMN_WIDTH = 70;

export function parseWorkTime(text: string): number | null {
  const match = text.trim().match(/^(\d+)\.(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours + minutes / 60;
}

export function parseTimeRecord(text: string): number | null {
  const match = text.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes >= 60) return null;
  return hours + minutes / 60;
}

export function parseAllTimeRecords(text: string): number[] {
  const matches = text.match(/\d+:\d{2}/g);
  if (!matches) return [];
  const results: number[] = [];
  for (const m of matches) {
    const parsed = parseTimeRecord(m);
    if (parsed !== null) results.push(parsed);
  }
  return results;
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

export function getCell(row: Element, sortIndex: string): HTMLTableCellElement | null {
  return row.querySelector<HTMLTableCellElement>(`td[data-ht-sort-index="${sortIndex}"]`);
}

export function getCellValue(row: Element, sortIndex: string): number | null {
  const cell = getCell(row, sortIndex);
  if (!cell) return null;
  const p = cell.querySelector("p");
  return parseWorkTime(p?.textContent ?? "");
}

export function nowAsDecimalHours(date: Date = new Date()): number {
  const utcH = date.getUTCHours();
  const utcM = date.getUTCMinutes();
  const utcS = date.getUTCSeconds();
  const jstTotalSeconds = (utcH + 9) * 3600 + utcM * 60 + utcS;
  return jstTotalSeconds / 3600;
}

export interface Segment {
  text: string;
  bold?: boolean;
  color?: string;
}

export type BannerLine = Segment[];

export interface BannerData {
  remainingDays: number;
  remainingRequired: number;
  avgPerDay: number;
  cumulativeDiff: number;
  projectedOvertime: number;
}

export interface EstimatedWorkTime {
  workTime: number;
  isOnBreak: boolean;
}

export function calcEstimatedWorkTime(data: InProgressRowData, now: number): EstimatedWorkTime {
  let elapsed: number;
  if (data.isOnBreak) {
    // Frozen at the last rest start
    const lastRestStart = data.restStarts[data.restStarts.length - 1];
    elapsed = lastRestStart - data.startTime;
  } else {
    elapsed = now - data.startTime;
  }

  // Subtract completed breaks
  let completedBreaks = 0;
  for (let i = 0; i < data.restEnds.length; i++) {
    completedBreaks += data.restEnds[i] - data.restStarts[i];
  }

  const workTime = Math.max(0, elapsed - completedBreaks);
  return { workTime, isOnBreak: data.isOnBreak };
}

// Labor Standards Act requires 45min break for 6-8h work, 60min for 8h+ work
export function isBreakSufficient(totalWork: number, breakTime: number): boolean {
  if (totalWork >= 8) return breakTime >= 1;
  if (totalWork >= 6) return breakTime >= 0.75;
  return true;
}

export function buildBannerLines(data: BannerData): BannerLine[] {
  const lines: BannerLine[] = [];

  // 必要時間の行
  if (data.remainingRequired <= 0) {
    // 余裕あり — 目標クリア済み、1日あたり平均は不要
    lines.push([
      {
        text: `残り ${data.remainingDays}日 ／ 必要時間 ${formatDiff(data.remainingRequired)}`,
        bold: true,
      },
      { text: " ✓ 今月の目標クリア済み" },
    ]);
  } else {
    lines.push([
      {
        text: `残り ${data.remainingDays}日 ／ 必要時間 ${formatHM(data.remainingRequired)}`,
        bold: true,
      },
      { text: "（1日あたり平均 " },
      { text: formatHM(data.avgPerDay), bold: true },
      { text: "）" },
    ]);
  }

  // 時間貯金
  lines.push([
    { text: "現在の時間貯金: " },
    { text: formatDiff(data.cumulativeDiff), color: data.cumulativeDiff >= 0 ? "green" : "red" },
  ]);

  // 残業警告（ケース2, 3 は同じ位置に条件分岐で表示）
  if (data.projectedOvertime >= OVERTIME_LIMIT) {
    lines.push([
      { text: `⚠ 残業 ${formatHM(data.projectedOvertime)} — 45時間超過`, color: "red", bold: true },
    ]);
  } else if (data.projectedOvertime > OVERTIME_LIMIT * 0.8 && data.remainingDays > 0) {
    const maxDaily =
      DEFAULT_EXPECTED_HOURS + (OVERTIME_LIMIT - data.projectedOvertime) / data.remainingDays;
    lines.push([
      {
        text: `⚠ 残業 ${formatHM(data.projectedOvertime)} — 1日 ${formatHM(maxDaily)} 以下で45時間超過を回避可能`,
        color: "orange",
        bold: true,
      },
    ]);
  }

  return lines;
}

const PUBLIC_HOLIDAY_KEYWORD = "公休";
const SATURDAY_CLASS = "htBlock-scrollTable_saturday";
const SUNDAY_CLASS = "htBlock-scrollTable_sunday";

function isWeekday(row: Element): boolean {
  const dayCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
  if (!dayCell) return false;
  return !dayCell.classList.contains(SATURDAY_CLASS) && !dayCell.classList.contains(SUNDAY_CLASS);
}

function getCellText(row: Element, sortIndex: string): string {
  const cell = getCell(row, sortIndex);
  if (!cell) return "";
  return cell.textContent?.trim() ?? "";
}

export interface InProgressRowData {
  startTime: number;
  restStarts: number[];
  restEnds: number[];
  isOnBreak: boolean;
}

export function detectInProgressRow(row: Element): InProgressRowData | null {
  const startText = getCellText(row, "START_TIMERECORD");
  const startTime = parseTimeRecord(startText);
  if (startTime === null) return null;

  // Already clocked out or work time already calculated
  const endText = getCellText(row, "END_TIMERECORD");
  if (parseTimeRecord(endText) !== null) return null;
  const allWork = getCellText(row, "ALL_WORK_MINUTE");
  if (parseWorkTime(allWork) !== null) return null;

  const restStarts = parseAllTimeRecords(getCellText(row, "REST_START_TIMERECORD"));
  const restEnds = parseAllTimeRecords(getCellText(row, "REST_END_TIMERECORD"));
  const isOnBreak = restStarts.length > restEnds.length;

  return { startTime, restStarts, restEnds, isOnBreak };
}

export function isWorkingDay(row: Element): boolean {
  const schedule = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="SCHEDULE"]');
  if (!schedule) return false;
  const text = schedule.textContent?.trim() ?? "";
  if (text === "") {
    return isWeekday(row);
  }
  return !text.includes(PUBLIC_HOLIDAY_KEYWORD);
}
