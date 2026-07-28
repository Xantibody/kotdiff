import { describe, test, expect, vi } from "vitest";
import { createMonthCalendar } from "./MonthCalendarRenderer";
import { KOTDIFF_CALENDAR_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";
import { makeUnworkedRow, makeWorkedRow } from "../../dashboard/test-helpers";

// JST 03/04（水）17:00
const NOW = new Date("2026-03-04T08:00:00.000Z");

const rows = [
  makeWorkedRow({ date: "03/02（月）", actual: 9, diff: 1, cumulativeDiff: 1 }),
  makeWorkedRow({ date: "03/03（火）", actual: 7, diff: -1, cumulativeDiff: 0 }),
  makeUnworkedRow({ date: "03/05（木）" }),
];

function build(open: boolean, onToggle = vi.fn()) {
  return createMonthCalendar({
    rows,
    now: NOW,
    open,
    savingsLabel: "+0:00",
    savingsNegative: false,
    paceLabel: "8:30",
    onToggle,
  });
}

describe("createMonthCalendar", () => {
  test("carries the injection marker so stale nodes are cleaned up on re-inject", () => {
    const calendar = build(false);
    expect(calendar.element.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
    expect(calendar.element.classList.contains(KOTDIFF_CALENDAR_CLASS)).toBe(true);
  });

  test("collapsed state shows only the ± strip and the running total", () => {
    const calendar = build(false);
    const text = calendar.element.textContent ?? "";
    expect(text).toContain("▸ 今月のカレンダー");
    expect(text).toContain("累計");
    expect(text).not.toContain("週合計");
  });

  test("expanded state shows the weekday header, week totals and legend", () => {
    const calendar = build(true);
    const text = calendar.element.textContent ?? "";
    expect(text).toContain("週合計");
    expect(text).toContain("第1週");
    expect(text).toContain("推奨ペース 8:30");
  });

  test("clicking the summary row toggles and reports the new state", () => {
    const onToggle = vi.fn();
    const calendar = build(false, onToggle);
    calendar.element.firstElementChild?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(calendar.element.textContent).toContain("週合計");
  });
});
