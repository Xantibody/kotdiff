import { describe, test, expect, vi } from "vitest";
import { createMonthCalendar } from "./MonthCalendarRenderer";
import type { MonthCalendarOptions } from "./MonthCalendarRenderer";
import { KOTDIFF_CALENDAR_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";
import { makeUnworkedRow, makeWorkedRow } from "../../dashboard/test-helpers";

// JST 03/04（水）17:00
const NOW = new Date("2026-03-04T08:00:00.000Z");

const rows = [
  makeWorkedRow({ date: "03/02（月）", actual: 9, diff: 1, cumulativeDiff: 1 }),
  makeWorkedRow({ date: "03/03（火）", actual: 7, diff: -1, cumulativeDiff: 0 }),
  makeUnworkedRow({ date: "03/05（木）" }),
  makeUnworkedRow({ date: "03/07（土）", expected: 0 }),
];

function build(open: boolean, extra: Partial<MonthCalendarOptions> = {}) {
  return createMonthCalendar({
    rows,
    actions: new Map(),
    now: NOW,
    open,
    weekTotalOpen: false,
    savingsLabel: "+0:00",
    savingsNegative: false,
    paceLabel: "8:30",
    onToggle: vi.fn(),
    onToggleWeekTotal: vi.fn(),
    ...extra,
  });
}

describe("createMonthCalendar — たたんだ状態", () => {
  test("carries the injection marker so stale nodes are cleaned up on re-inject", () => {
    const calendar = build(false);
    expect(calendar.element.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
    expect(calendar.element.classList.contains(KOTDIFF_CALENDAR_CLASS)).toBe(true);
  });

  test("shows the heading, the range and the running total only", () => {
    const text = build(false).element.textContent ?? "";
    expect(text).toContain("▸ 今月のカレンダー");
    expect(text).toContain("03/02 – 03/07");
    expect(text).toContain("累計");
    expect(text).not.toContain("週合計");
  });
});

describe("createMonthCalendar — 開いた状態", () => {
  test("explains the diff bar in the heading instead of a separate legend", () => {
    const text = build(true).element.textContent ?? "";
    expect(text).toContain("バーは 8:00 を中心に ±3:00 で振り切り");
  });

  test("keeps the legend to three readings plus where the rest went", () => {
    const text = build(true).element.textContent ?? "";
    expect(text).toContain("8:00 より多い");
    expect(text).toContain("足りない");
    expect(text).toContain("これからの稼働日（薄い数字＝推奨ペース 8:30）");
    expect(text).toContain("日付の ▾ から申請メニュー");
  });

  test("says what happened instead of a dash on a missing punch", () => {
    const calendar = createMonthCalendar({
      rows: [makeUnworkedRow({ date: "03/02（月）", startTime: "11:07", endTime: null })],
      actions: new Map(),
      now: NOW,
      open: true,
      weekTotalOpen: false,
      savingsLabel: "+0:00",
      savingsNegative: false,
      paceLabel: null,
      onToggle: vi.fn(),
      onToggleWeekTotal: vi.fn(),
    });
    const text = calendar.element.textContent ?? "";
    expect(text).toContain("打刻漏れ");
    expect(text).toContain("11:07– 退勤なし");
    expect(text).not.toContain("—");
  });

  test("uses no text smaller than 12px", () => {
    const calendar = build(true);
    const tooSmall = [...calendar.element.querySelectorAll<HTMLElement>("*")].filter((node) => {
      const size = Number.parseFloat(node.style.fontSize);
      return Number.isFinite(size) && size > 0 && size < 12 && node.textContent !== "▾";
    });
    expect(tooSmall.map((n) => `${n.style.fontSize}:${n.textContent?.slice(0, 10)}`)).toEqual([]);
  });
});

function grid(calendar: { element: HTMLElement }): HTMLElement | null {
  return calendar.element.querySelector<HTMLElement>("div[style*='grid-template-columns']");
}

describe("createMonthCalendar — 週合計", () => {
  test("keeps the week total column out of the way by default", () => {
    const calendar = build(true);
    expect(grid(calendar)?.style.gridTemplateColumns).toBe("repeat(7, 1fr)");
    expect(calendar.element.textContent).toContain("▸ 週合計");
  });

  test("opens the column from the chip and reports it", () => {
    const onToggleWeekTotal = vi.fn();
    const calendar = build(true, { onToggleWeekTotal });
    const chip = [...calendar.element.querySelectorAll("span")].find(
      (s) => s.textContent === "▸ 週合計",
    );
    chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onToggleWeekTotal).toHaveBeenCalledWith(true);
    expect(grid(calendar)?.style.gridTemplateColumns).toBe("repeat(7, 1fr) 132px");
    expect(calendar.element.textContent).toContain("第1週");
  });

  test("does not put 0:00 / +0:00 on a week with no work", () => {
    const calendar = createMonthCalendar({
      rows: [makeUnworkedRow({ date: "03/02（月）" })],
      actions: new Map(),
      now: NOW,
      open: true,
      weekTotalOpen: true,
      savingsLabel: "-1:00",
      savingsNegative: true,
      paceLabel: null,
      onToggle: vi.fn(),
      onToggleWeekTotal: vi.fn(),
    });
    const text = calendar.element.textContent ?? "";
    expect(text).toContain("未稼働");
    expect(text).not.toContain("+0:00");
  });
});

describe("createMonthCalendar — 申請と行送り", () => {
  function withActions(extra: Partial<MonthCalendarOptions> = {}) {
    document.body.innerHTML = "";
    const button = document.createElement("button");
    button.id = "button_schedule_1";
    const onClick = vi.fn();
    button.addEventListener("click", onClick);
    document.body.append(button);

    const calendar = build(true, {
      actions: new Map([["03/02", [{ label: "スケジュール申請", targetId: "button_schedule_1" }]]]),
      ...extra,
    });
    document.body.append(calendar.element);
    const trigger = calendar.element.querySelector<HTMLElement>("[aria-haspopup]");
    return { calendar, trigger, panel: trigger?.nextElementSibling as HTMLElement | null, onClick };
  }

  test("hangs the request menu off the date itself", () => {
    const { trigger, panel } = withActions();
    // セル内に浮いた ⋯ は置かない
    expect(trigger?.textContent).toBe("2▾");
    expect(panel?.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("runs the KOT action from the menu", () => {
    const { trigger, panel, onClick } = withActions();
    trigger?.click();
    expect(panel?.style.display).toBe("flex");
    panel?.querySelector("button")?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    document.body.innerHTML = "";
  });

  test("offers the jump to the table row only when the table is there", () => {
    const withoutTable = withActions();
    withoutTable.trigger?.click();
    expect(withoutTable.panel?.textContent).not.toContain("表の該当行へ");
    document.body.innerHTML = "";

    const withTable = withActions({ onSelectDate: vi.fn() });
    withTable.trigger?.click();
    expect(withTable.panel?.textContent).toContain("表の該当行へ");
    document.body.innerHTML = "";
  });

  test("reports the clicked cell", () => {
    const onSelectDate = vi.fn();
    const calendar = build(true, { onSelectDate });
    const cell = [...calendar.element.querySelectorAll<HTMLElement>("div")].find(
      (d) => d.style.minHeight === "112px" && d.style.cursor === "pointer",
    );
    cell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectDate).toHaveBeenCalledWith("03/02（月）");
  });
});
