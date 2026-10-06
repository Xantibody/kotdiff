import type { DashboardData, DashboardRow } from "../types";
import { accumulateRows } from "../domain/aggregates/WorkMonth";
import type { RowInput } from "../domain/aggregates/WorkMonth";
import { calcEstimatedWorkTime, calcClockOutTarget } from "../domain/value-objects/InProgressWork";
import type { InProgressRowData } from "../domain/value-objects/InProgressWork";
import {
  asDecimalHours,
  nowAsDecimalHours,
  parseTimeRecord,
} from "../domain/value-objects/TimeRecord";
import type { DecimalHours } from "../domain/value-objects/TimeRecord";
import { formatClockOutTime } from "../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS } from "../domain/constants";
import { isDateTextOnJstDay } from "../infrastructure/kot/KotDomHelpers";
import { buildBannerData } from "./BannerInfo";
import type { BannerData } from "./BannerInfo";

function parseTimes(texts: readonly string[]): DecimalHours[] {
  return texts.flatMap((t) => {
    const v = parseTimeRecord(t);
    return v === null ? [] : [asDecimalHours(v)];
  });
}

// 保存データの行から勤務中の打刻を復元する。保存後に退勤していても
// 保存データからは分からないため、保存時点で勤務中だった行を勤務中とみなす。
// 日付の条件は content script (KotDomHelpers) と揃える: 当日の行か、
// 最後に出勤打刻がある前日の行 (日跨ぎ勤務中) のみ (issue #46)
function toInProgressRowData(
  row: DashboardRow,
  isLastClockIn: boolean,
  now: Date,
): InProgressRowData | null {
  if (!row.working || row.actual !== null || row.endTime !== null || row.startTime === null) {
    return null;
  }
  const isToday = isDateTextOnJstDay(row.date, now, 0);
  const isCrossMidnight = isLastClockIn && isDateTextOnJstDay(row.date, now, -1);
  if (!isToday && !isCrossMidnight) {
    return null;
  }
  const startTime = parseTimeRecord(row.startTime);
  if (startTime === null) {
    return null;
  }
  const restStarts = parseTimes(row.breakStarts);
  const restEnds = parseTimes(row.breakEnds);
  return {
    startTime: asDecimalHours(startTime),
    restStarts,
    restEnds,
    isOnBreak: restStarts.length > restEnds.length,
  };
}

// ツールバーのポップアップを開いた時点の値でバナーと同じ情報を組み立てる
export function buildPopupBannerData(data: DashboardData, now: Date): BannerData {
  const nowHours = nowAsDecimalHours(now);
  let clockOutTarget: BannerData["clockOutTarget"] = null;
  let cumulativeDiffBase = 0;

  const lastClockInIndex = data.rows.findLastIndex((row) => row.startTime !== null);

  const rowInputs: RowInput[] = data.rows.map((row, i) => {
    const inProgressData = toInProgressRowData(row, i === lastClockInIndex, now);
    if (inProgressData === null) {
      if (row.actual !== null && row.working) {
        cumulativeDiffBase += row.actual - DEFAULT_EXPECTED_HOURS;
      }
      return {
        actual: row.actual,
        fixedWork: row.fixedWork,
        working: row.working,
        inProgress: null,
      };
    }
    const estimated = calcEstimatedWorkTime(inProgressData, nowHours);
    const target = calcClockOutTarget(
      cumulativeDiffBase,
      estimated.workTime,
      nowHours,
      DEFAULT_EXPECTED_HOURS,
    );
    clockOutTarget = {
      remainingHours: target.remainingHours,
      targetLabel: formatClockOutTime(target.targetTime, now),
    };
    return {
      actual: row.actual,
      fixedWork: row.fixedWork,
      working: row.working,
      inProgress: { estimatedWorkTime: estimated.workTime, status: estimated.status },
    };
  });

  return buildBannerData(accumulateRows(rowInputs), data.statutoryOvertime ?? null, clockOutTarget);
}
