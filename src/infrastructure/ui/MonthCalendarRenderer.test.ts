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

function build(open: boolean, onToggle = vi.fn(), actions = new Map()) {
  return createMonthCalendar({
    rows,
    actions,
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

  test("explains the timeline scale once when expanded", () => {
    const calendar = build(true);
    const text = calendar.element.textContent ?? "";
    // 各セルの帯が何時を指すかは凡例が無いと読めない
    expect(text).toContain("帯の時間軸");
    expect(text).toContain("6");
    expect(text).toContain("24");
  });

  test("only invites a click when the table is there to scroll to", () => {
    expect(build(true).element.textContent).not.toContain("セルをクリック");

    const withSelect = createMonthCalendar({
      rows,
      actions: new Map(),
      now: NOW,
      open: true,
      savingsLabel: "+0:00",
      savingsNegative: false,
      paceLabel: null,
      onToggle: vi.fn(),
      onSelectDate: vi.fn(),
    });
    expect(withSelect.element.textContent).toContain("セルをクリック");
  });

  test("reports the clicked day", () => {
    const onSelectDate = vi.fn();
    const calendar = createMonthCalendar({
      rows,
      actions: new Map(),
      now: NOW,
      open: true,
      savingsLabel: "+0:00",
      savingsNegative: false,
      paceLabel: null,
      onToggle: vi.fn(),
      onSelectDate,
    });
    const cell = [...calendar.element.querySelectorAll("div")].find(
      (d) => d.style.minHeight === "84px" && (d.textContent ?? "").startsWith("2"),
    );
    cell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectDate).toHaveBeenCalledWith("03/02（月）");
  });

  test("expanded state shows the weekday header, week totals and legend", () => {
    const calendar = build(true);
    const text = calendar.element.textContent ?? "";
    expect(text).toContain("週合計");
    expect(text).toContain("第1週");
    expect(text).toContain("推奨ペース 8:30");
  });

  function withActions() {
    document.body.innerHTML = "";
    const button = document.createElement("button");
    button.id = "button_schedule_1";
    const onClick = vi.fn();
    button.addEventListener("click", onClick);
    document.body.append(button);

    const calendar = build(
      true,
      vi.fn(),
      new Map([["03/02", [{ label: "スケジュール申請", targetId: "button_schedule_1" }]]]),
    );
    document.body.append(calendar.element);
    const trigger = calendar.element.querySelector<HTMLButtonElement>("button[aria-haspopup]");
    const menu = trigger?.nextElementSibling as HTMLElement | null;
    return { calendar, trigger, menu, onClick };
  }

  test("keeps only a ⋯ trigger in the cell until it is opened", () => {
    const { trigger, menu } = withActions();
    expect(trigger?.textContent).toBe("⋯");
    expect(menu?.style.display).toBe("none");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    document.body.innerHTML = "";
  });

  test("opens the menu and runs the KOT action", () => {
    const { trigger, menu, onClick } = withActions();
    trigger?.click();
    expect(menu?.style.display).toBe("flex");
    expect(menu?.textContent).toBe("スケジュール申請");

    menu?.querySelector("button")?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    // 実行したら閉じる
    expect(menu?.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("closes on an outside click", () => {
    const { trigger, menu } = withActions();
    trigger?.click();
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(menu?.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("closes on Escape", () => {
    const { trigger, menu } = withActions();
    trigger?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(menu?.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("leaves out the menu for days KOT offers no action", () => {
    const calendar = build(true);
    expect(calendar.element.querySelector("button[aria-haspopup]")).toBeNull();
  });

  test("clicking the summary row toggles and reports the new state", () => {
    const onToggle = vi.fn();
    const calendar = build(false, onToggle);
    calendar.element.firstElementChild?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(calendar.element.textContent).toContain("週合計");
  });
});
