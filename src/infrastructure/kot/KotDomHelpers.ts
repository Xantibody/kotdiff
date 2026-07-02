import { parseWorkTime, asDecimalHours } from "../../domain/value-objects/TimeRecord";
import { parseAllTimeRecords } from "../../domain/services/WorkTimeParser";
import type { InProgressRowData } from "../../domain/value-objects/InProgressWork";
import { SATURDAY_CLASS, SUNDAY_CLASS, UNCOMPLETE_CLASS } from "./constants";
import { PUBLIC_HOLIDAY_KEYWORD } from "../../domain/constants";
import { isLeaveSchedule } from "../../domain/services/LeaveScheduleDetector";
import { isNonWorkingDayType } from "../../types";
import type { KotSortIndex } from "./types";

export function getCell(row: Element, sortIndex: KotSortIndex): HTMLTableCellElement | null {
  return row.querySelector<HTMLTableCellElement>(`td[data-ht-sort-index="${sortIndex}"]`);
}

export function getCellValue(row: Element, sortIndex: KotSortIndex): number | null {
  const cell = getCell(row, sortIndex);
  if (!cell) return null;
  const p = cell.querySelector("p");
  return parseWorkTime(p?.textContent ?? "");
}

function isWeekday(row: Element): boolean {
  const dayCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
  if (!dayCell) return false;
  return !dayCell.classList.contains(SATURDAY_CLASS) && !dayCell.classList.contains(SUNDAY_CLASS);
}

// Returns raw trimmed text content of a cell; use getCellValue for numeric work-time parsing
export function getCellText(row: Element, sortIndex: KotSortIndex): string {
  const cell = getCell(row, sortIndex);
  if (!cell) return "";
  return cell.textContent?.trim() ?? "";
}

export function isWorkingDay(row: Element, customLeaveKeywords: readonly string[] = []): boolean {
  if (row.querySelector(`.${UNCOMPLETE_CLASS}`) !== null) return false;
  if (isNonWorkingDayType(getCellText(row, "WORK_DAY_TYPE"))) return false;
  const schedule = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="SCHEDULE"]');
  if (!schedule) return false;
  const text = schedule.textContent?.trim() ?? "";
  if (text === "") return isWeekday(row);
  if (text.includes(PUBLIC_HOLIDAY_KEYWORD)) return false;
  // Full-day leave (有休 etc.) with no recorded work is not a working day
  if (isLeaveSchedule(text, customLeaveKeywords) && getCellValue(row, "ALL_WORK_MINUTE") === null) {
    return false;
  }
  return true;
}

export function addColumnTooltips(table: HTMLTableElement): void {
  const headerRow = table.querySelector("thead > tr");
  const tbody = table.querySelector("tbody");
  if (!headerRow || !tbody) return;
  const ths = headerRow.querySelectorAll("th");
  const names: string[] = [];
  for (const th of ths) names.push(th.textContent?.trim() ?? "");
  for (const row of tbody.querySelectorAll("tr")) {
    const tds = row.querySelectorAll("td");
    for (let i = 0; i < tds.length && i < names.length; i++) {
      const name = names[i];
      const td = tds[i];
      if (name && td) td.setAttribute("data-kotdiff-tooltip", name);
    }
  }
}

// 日跨ぎ勤務中の行を検出する。退勤前に日付が変わると KOT は前日行を
// エラー勤務（specific-uncomplete）にするため isWorkingDay では拾えない。
// 「昨日の日付 + エラー勤務 + 出勤打刻あり退勤打刻なし」を勤務継続中とみなす。
export function detectCrossMidnightInProgressRow(
  row: Element,
  now: Date,
): InProgressRowData | null {
  if (row.querySelector(`.${UNCOMPLETE_CLASS}`) === null) return null;
  if (!isDatedYesterday(row, now)) return null;
  return detectInProgressRow(row);
}

function isDatedYesterday(row: Element, now: Date): boolean {
  const match = getCellText(row, "WORK_DAY").match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return false;
  // KOT の表示日付は JST 基準のため、実行環境のタイムゾーンによらず JST で昨日を求める
  // （nowAsDecimalHours と同じ +9h 手法）
  const jstYesterday = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jstYesterday.setUTCDate(jstYesterday.getUTCDate() - 1);
  return (
    Number(match[1]) === jstYesterday.getUTCMonth() + 1 &&
    Number(match[2]) === jstYesterday.getUTCDate()
  );
}

export function detectInProgressRow(row: Element): InProgressRowData | null {
  const startText = getCellText(row, "START_TIMERECORD");
  const startTimes = parseAllTimeRecords(startText);
  if (startTimes.length === 0) return null;
  const startTimeRaw = startTimes[0];
  if (startTimeRaw === undefined) return null;
  const startTime = asDecimalHours(startTimeRaw);

  const endText = getCellText(row, "END_TIMERECORD");
  if (parseAllTimeRecords(endText).length > 0) return null;
  const allWork = getCellText(row, "ALL_WORK_MINUTE");
  if (parseWorkTime(allWork) !== null) return null;

  const restStarts = parseAllTimeRecords(getCellText(row, "REST_START_TIMERECORD"));
  const restEnds = parseAllTimeRecords(getCellText(row, "REST_END_TIMERECORD"));
  const isOnBreak = restStarts.length > restEnds.length;

  return { startTime, restStarts, restEnds, isOnBreak };
}
