import { describe, test, expect, vi, afterEach } from "vitest";
import { createDayDetailPanel } from "./DayDetailPanel";
import type { CalendarDay } from "../../dashboard/lib/calendar";
import { buildTimelineSegments } from "../../dashboard/lib/timeline";

function makeDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  const startTime = overrides.startTime ?? "12:39";
  const endTime = overrides.endTime ?? "23:30";
  const breakStarts = overrides.breakStarts ?? ["18:45", "20:03"];
  const breakEnds = overrides.breakEnds ?? ["19:35", "21:34"];
  return {
    date: "02/02（月）",
    day: 2,
    weekday: 1,
    isToday: false,
    state: "over",
    actual: 8.5,
    diff: 0.5,
    breakTime: 2.35,
    startTime,
    endTime,
    segments: buildTimelineSegments(startTime, endTime, breakStarts, breakEnds),
    schedule: "複数回休憩",
    breakStarts,
    breakEnds,
    fixedWork: 7,
    nightOvertime: 1.5,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createDayDetailPanel", () => {
  test("holds the readings taken out of the cell", () => {
    const panel = createDayDetailPanel(makeDay(), []).element;
    const text = panel.textContent ?? "";
    expect(text).toContain("02/02（月）");
    expect(text).toContain("複数回休憩");
    expect(text).toContain("働いた形");
    expect(text).toContain("12:39 – 23:30");
    expect(text).toContain("18:45–19:35 ／ 20:03–21:34");
    expect(text).toContain("深夜 所定");
  });

  test("puts the 8h-based diff next to the shift's own 所定", () => {
    // カレンダーの差分は 8:00 基準、KOT の所定はシフトの値。食い違うので両方出す
    const text = createDayDetailPanel(makeDay(), []).element.textContent ?? "";
    expect(text).toContain("実働 / 所定");
    expect(text).toContain("8:30");
    expect(text).toContain("7:00");
  });

  test("warns when the break falls short of the statutory minimum", () => {
    const short = createDayDetailPanel(
      makeDay({ actual: 8.5, breakTime: 0.5, breakStarts: ["12:00"], breakEnds: ["12:30"] }),
      [],
    ).element;
    expect(short.textContent).toContain("必要 1:00");

    const enough = createDayDetailPanel(makeDay(), []).element;
    expect(enough.textContent).not.toContain("必要");
  });

  test("says so when the day was never clocked", () => {
    const text =
      createDayDetailPanel(
        makeDay({ startTime: null, endTime: null, actual: null, diff: null, segments: [] }),
        [],
      ).element.textContent ?? "";
    expect(text).toContain("打刻なし");
  });

  test("offers the jump to the table row when the table is shown", () => {
    const onSelect = vi.fn();
    const panel = createDayDetailPanel(makeDay(), [], onSelect).element;
    document.body.append(panel);
    [...panel.querySelectorAll("button")].at(-1)?.click();
    expect(onSelect).toHaveBeenCalledWith("02/02（月）");
    document.body.innerHTML = "";
  });

  test("runs a KOT request from the footer", () => {
    document.body.innerHTML = "";
    const button = document.createElement("button");
    button.id = "button_schedule_1";
    const onClick = vi.fn();
    button.addEventListener("click", onClick);
    document.body.append(button);

    const panel = createDayDetailPanel(makeDay(), [
      { label: "スケジュール", targetId: "button_schedule_1" },
    ]).element;
    document.body.append(panel);
    [...panel.querySelectorAll("button")].at(-1)?.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    document.body.innerHTML = "";
  });
});

describe("createDayDetailPanel — 開閉", () => {
  function mount() {
    const trigger = document.createElement("span");
    const handle = createDayDetailPanel(makeDay(), []);
    trigger.append(handle.element);
    handle.attach(trigger);
    document.body.append(trigger);
    return { trigger, panel: handle.element };
  }

  test("opens on a click on the date and closes on the next one", () => {
    const { trigger, panel } = mount();
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.style.display).toBe("block");
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("closes on an outside click and on Escape", () => {
    const outside = mount();
    outside.trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(outside.panel.style.display).toBe("none");
    document.body.innerHTML = "";

    const escape = mount();
    escape.trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(escape.panel.style.display).toBe("none");
    document.body.innerHTML = "";
  });

  test("opens with the keyboard", () => {
    const { trigger, panel } = mount();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(panel.style.display).toBe("block");
    document.body.innerHTML = "";
  });

  function openAt(rect: Partial<DOMRect>, height = 360) {
    const { trigger, panel } = mount();
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
    Object.defineProperty(panel, "offsetHeight", { value: height, configurable: true });
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return panel;
  }

  test("escapes the KOT container that would clip it", () => {
    // .htBlock-box は overflow:hidden なので absolute だと上側が切り取られる
    const panel = openAt({ top: 100, bottom: 212, left: 100, right: 260 });
    expect(panel.style.position).toBe("fixed");
  });

  test("opens above the cell when there is no room below", () => {
    const panel = openAt({ top: 700, bottom: 780, left: 100, right: 260 });
    // 780 + 6 + 360 は画面外なので上に出す
    expect(Number.parseFloat(panel.style.top)).toBe(700 - 6 - 360);
  });

  test("pulls itself back inside when neither side fits", () => {
    const panel = openAt({ top: 40, bottom: 120, left: 100, right: 260 }, 700);
    const top = Number.parseFloat(panel.style.top);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + 700).toBeLessThanOrEqual(window.innerHeight);
  });

  test("opens to the left when the cell is near the right edge", () => {
    const panel = openAt({
      top: 100,
      bottom: 212,
      left: window.innerWidth - 120,
      right: window.innerWidth,
    });
    const left = Number.parseFloat(panel.style.left);
    expect(left + 420).toBeLessThanOrEqual(window.innerWidth);
    expect(left).toBeGreaterThanOrEqual(8);
  });

  test("closes when the page scrolls out from under it", () => {
    const panel = openAt({ top: 100, bottom: 212, left: 100, right: 260 });
    expect(panel.style.display).toBe("block");
    globalThis.dispatchEvent(new Event("scroll"));
    expect(panel.style.display).toBe("none");
    document.body.innerHTML = "";
  });
});
