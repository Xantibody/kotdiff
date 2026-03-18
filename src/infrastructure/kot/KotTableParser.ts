import { rawRowToWorkDay, workDayToDashboardRow } from "./WorkDayMapper";
import type { DashboardRow } from "../../types";
import type { RawTableRow } from "./RawTableRow";

const SATURDAY_CLASS = "htBlock-scrollTable_saturday";
const SUNDAY_CLASS = "htBlock-scrollTable_sunday";
const PUBLIC_HOLIDAY_KEYWORD = "公休";

function getCellText(row: Element, sortIndex: string): string {
  const cell = row.querySelector<HTMLTableCellElement>(`td[data-ht-sort-index="${sortIndex}"]`);
  return cell?.textContent?.trim() ?? "";
}

export function parseRow(row: Element): RawTableRow {
  const dayCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
  const scheduleText = getCellText(row, "SCHEDULE");
  return {
    date: dayCell?.textContent?.trim() ?? "",
    dayType: getCellText(row, "WORK_DAY_TYPE"),
    isSaturday: dayCell?.classList.contains(SATURDAY_CLASS) ?? false,
    isSunday: dayCell?.classList.contains(SUNDAY_CLASS) ?? false,
    allWorkMinuteText: (() => {
      const cell = row.querySelector<HTMLTableCellElement>(
        'td[data-ht-sort-index="ALL_WORK_MINUTE"]',
      );
      return cell?.querySelector("p")?.textContent ?? "";
    })(),
    fixedWorkMinuteText: (() => {
      const cell = row.querySelector<HTMLTableCellElement>(
        'td[data-ht-sort-index="FIXED_WORK_MINUTE"]',
      );
      return cell?.querySelector("p")?.textContent ?? "";
    })(),
    overtimeWorkMinuteText: (() => {
      const cell = row.querySelector<HTMLTableCellElement>(
        'td[data-ht-sort-index="OVERTIME_WORK_MINUTE"]',
      );
      return cell?.querySelector("p")?.textContent ?? "";
    })(),
    restMinuteText: (() => {
      const cell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="REST_MINUTE"]');
      return cell?.querySelector("p")?.textContent ?? "";
    })(),
    startTimeText: getCellText(row, "START_TIMERECORD"),
    endTimeText: getCellText(row, "END_TIMERECORD"),
    restStartTimeText: getCellText(row, "REST_START_TIMERECORD"),
    restEndTimeText: getCellText(row, "REST_END_TIMERECORD"),
    scheduleText,
    hasPublicHoliday: scheduleText.includes(PUBLIC_HOLIDAY_KEYWORD),
  };
}

export function parseKotTable(tbody: HTMLTableSectionElement): RawTableRow[] {
  return Array.from(tbody.querySelectorAll("tr")).map(parseRow);
}

export function rawRowToDashboardRow(raw: RawTableRow): DashboardRow {
  return workDayToDashboardRow(rawRowToWorkDay(raw));
}

export function parseKotTableToDashboardRows(tbody: HTMLTableSectionElement): DashboardRow[] {
  return parseKotTable(tbody).map(rawRowToDashboardRow);
}
