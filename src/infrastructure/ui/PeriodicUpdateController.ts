import type { TimerPort } from "./ports/TimerPort";
import { calcEstimatedWorkTime } from "../../domain/value-objects/InProgressWork";
import type { EstimatedWorkTime } from "../../domain/value-objects/InProgressWork";
import { detectInProgressRow, getCell } from "../kot/KotDomHelpers";
import { nowAsDecimalHours } from "../../domain/value-objects/TimeRecord";
import { DEFAULT_EXPECTED_HOURS } from "../../domain/constants";
import { updateDiffCell, updateEstimatedWorkCell } from "./DiffColumnRenderer";

const UPDATE_INTERVAL_MS = 60_000;
// v2 UI は「あと何時間」を主役にするので、分単位の表示が遅れないよう更新を早める
export const V2_UPDATE_INTERVAL_MS = 30_000;

export interface PeriodicUpdateOptions {
  readonly intervalMs?: number;
  // 差分セルの書き換え方。v2 の 2 段組セルは書式が違うので差し替えられるようにする
  readonly updateDiff?: (cell: HTMLTableCellElement, cumulativeDiff: number) => void;
  // セル以外（注入カードなど）を更新するためのフック
  readonly onTick?: (estimated: EstimatedWorkTime, cumulativeDiff: number) => void;
}

export interface PeriodicUpdateController {
  start(
    row: Element,
    diffCell: HTMLTableCellElement,
    cumulativeDiffBase: number,
    options?: PeriodicUpdateOptions,
  ): void;
}

export function createPeriodicUpdateController(timer: TimerPort): PeriodicUpdateController {
  return {
    start(row, diffCell, cumulativeDiffBase, options = {}) {
      let stopTimer: (() => void) | null = null;
      let stopObserver: (() => void) | null = null;

      const cleanup = () => {
        stopTimer?.();
        stopObserver?.();
      };

      stopTimer = timer.setInterval(() => {
        const data = detectInProgressRow(row);
        if (!data || !document.contains(row)) {
          cleanup();
          return;
        }

        const now = nowAsDecimalHours();
        const estimated = calcEstimatedWorkTime(data, now);
        const newCumulativeDiff = cumulativeDiffBase + estimated.workTime - DEFAULT_EXPECTED_HOURS;

        const workCell = getCell(row, "ALL_WORK_MINUTE");
        if (workCell) {
          updateEstimatedWorkCell(workCell, estimated.workTime);
        }

        (options.updateDiff ?? updateDiffCell)(diffCell, newCumulativeDiff);
        options.onTick?.(estimated, newCumulativeDiff);
      }, options.intervalMs ?? UPDATE_INTERVAL_MS);

      stopObserver = timer.observeRemoval(row, cleanup);
    },
  };
}
