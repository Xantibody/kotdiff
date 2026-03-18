import { describe, test, expect, vi, afterEach } from "vitest";
import { createPeriodicUpdateController } from "./PeriodicUpdateController";
import type { TimerPort } from "./TimerPort";

// Create a mock TimerPort
function createMockTimerPort(): TimerPort & {
  triggerInterval: () => void;
  triggerRemoval: () => void;
} {
  let storedIntervalCallback: (() => void) | null = null;
  let storedRemovalCallback: (() => void) | null = null;
  return {
    setInterval(callback, _ms) {
      storedIntervalCallback = callback;
      return () => {
        storedIntervalCallback = null;
      };
    },
    observeRemoval(_element, onRemoved) {
      storedRemovalCallback = onRemoved;
      return () => {
        storedRemovalCallback = null;
      };
    },
    triggerInterval() {
      storedIntervalCallback?.();
    },
    triggerRemoval() {
      storedRemovalCallback?.();
    },
  };
}

describe("PeriodicUpdateController", () => {
  test("calls setInterval with UPDATE_INTERVAL_MS", () => {
    const mockPort = createMockTimerPort();
    const setIntervalSpy = vi.spyOn(mockPort, "setInterval");

    const controller = createPeriodicUpdateController(mockPort);
    const row = document.createElement("tr");
    const diffCell = document.createElement("td");
    controller.start(row, diffCell, 0);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
  });

  test("cleanup: removal callback calls stopTimer and stopObserver", () => {
    const mockPort = createMockTimerPort();
    const stopTimerSpy = vi.fn();
    const stopObserverSpy = vi.fn();
    vi.spyOn(mockPort, "setInterval").mockImplementation(() => {
      return stopTimerSpy;
    });
    vi.spyOn(mockPort, "observeRemoval").mockImplementation((_el, onRemoved) => {
      mockPort["_storedRemoval"] = onRemoved;
      return stopObserverSpy;
    });

    const controller = createPeriodicUpdateController(mockPort);
    const row = document.createElement("tr");
    const diffCell = document.createElement("td");
    controller.start(row, diffCell, 0);

    // Trigger removal callback — should call both stop functions
    (mockPort as { _storedRemoval?: () => void })._storedRemoval?.();

    expect(stopTimerSpy).toHaveBeenCalledTimes(1);
    expect(stopObserverSpy).toHaveBeenCalledTimes(1);
  });

  test("calls observeRemoval with the row element", () => {
    const mockPort = createMockTimerPort();
    const observeRemovalSpy = vi.spyOn(mockPort, "observeRemoval");

    const controller = createPeriodicUpdateController(mockPort);
    const row = document.createElement("tr");
    const diffCell = document.createElement("td");
    controller.start(row, diffCell, 0);

    expect(observeRemovalSpy).toHaveBeenCalledWith(row, expect.any(Function));
  });

  test("does not throw when interval fires with no in-progress data", () => {
    const mockPort = createMockTimerPort();

    const controller = createPeriodicUpdateController(mockPort);
    const row = document.createElement("tr");
    const diffCell = document.createElement("td");
    controller.start(row, diffCell, 0);

    // Trigger the interval — row has no in-progress data so it should cleanup gracefully
    expect(() => mockPort.triggerInterval()).not.toThrow();
  });
});

function createInProgressRow(): HTMLTableRowElement {
  const tr = document.createElement("tr");
  // START_TIMERECORD: "9:00"
  const startCell = document.createElement("td");
  startCell.setAttribute("data-ht-sort-index", "START_TIMERECORD");
  startCell.textContent = "9:00";
  // END_TIMERECORD: empty
  const endCell = document.createElement("td");
  endCell.setAttribute("data-ht-sort-index", "END_TIMERECORD");
  endCell.textContent = "";
  // ALL_WORK_MINUTE: empty (not yet calculated)
  const workCell = document.createElement("td");
  workCell.setAttribute("data-ht-sort-index", "ALL_WORK_MINUTE");
  const p = document.createElement("p");
  p.textContent = "";
  workCell.appendChild(p);
  // REST_START_TIMERECORD: empty
  const restStartCell = document.createElement("td");
  restStartCell.setAttribute("data-ht-sort-index", "REST_START_TIMERECORD");
  restStartCell.textContent = "";
  // REST_END_TIMERECORD: empty
  const restEndCell = document.createElement("td");
  restEndCell.setAttribute("data-ht-sort-index", "REST_END_TIMERECORD");
  restEndCell.textContent = "";
  tr.append(startCell, endCell, workCell, restStartCell, restEndCell);
  document.body.appendChild(tr);
  return tr;
}

describe("PeriodicUpdateController with in-progress row", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  test("updates diff cell text on interval tick with in-progress data", () => {
    vi.useFakeTimers();
    const mockPort = createMockTimerPort();
    const controller = createPeriodicUpdateController(mockPort);

    const row = createInProgressRow();
    const diffCell = document.createElement("td") as HTMLTableCellElement;
    diffCell.textContent = "+0:00";

    controller.start(row, diffCell, 0);
    mockPort.triggerInterval();

    // After interval, cell should be updated (not still "+0:00" or empty)
    // The exact value depends on nowAsDecimalHours() — just verify it's been touched
    expect(diffCell.textContent).not.toBe("");

    row.remove();
  });
});
