import type { TimerPort } from "./ports/TimerPort";
import { calcEstimatedWorkTime } from "../../domain/value-objects/InProgressWork";
import { detectInProgressRow, getCell } from "../kot/KotDomHelpers";
import { nowAsDecimalHours } from "../../domain/value-objects/TimeRecord";
import { DEFAULT_EXPECTED_HOURS } from "../../domain/constants";
import { updateDiffCell, updateEstimatedWorkCell } from "./DiffColumnRenderer";

const UPDATE_INTERVAL_MS = 60_000;

export interface PeriodicUpdateController {
  start(row: Element, diffCell: HTMLTableCellElement, cumulativeDiffBase: number): void;
}

export function createPeriodicUpdateController(timer: TimerPort): PeriodicUpdateController {
  return {
    start(row, diffCell, cumulativeDiffBase) {
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

        updateDiffCell(diffCell, newCumulativeDiff);
      }, UPDATE_INTERVAL_MS);

      stopObserver = timer.observeRemoval(row, cleanup);
    },
  };
}
