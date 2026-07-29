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
    const trigger = document.createElement("div");
    const handle = createDayDetailPanel(makeDay(), []);
    trigger.append(handle.element);
    handle.attach(trigger);
    document.body.append(trigger);
    return { trigger, panel: handle.element };
  }

  test("waits before opening so a passing pointer does not flash it", () => {
    vi.useFakeTimers();
    const { trigger, panel } = mount();

    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    expect(panel.style.display).toBe("none");
    vi.advanceTimersByTime(300);
    expect(panel.style.display).toBe("block");

    document.body.innerHTML = "";
  });

  test("keeps it open while the pointer moves into the panel", () => {
    vi.useFakeTimers();
    const { trigger, panel } = mount();
    trigger.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(300);

    trigger.dispatchEvent(new MouseEvent("mouseleave"));
    panel.dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(150);
    expect(panel.style.display).toBe("block");

    panel.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(150);
    expect(panel.style.display).toBe("none");

    document.body.innerHTML = "";
  });

  test("opens upward when the cell is near the bottom of the screen", () => {
    const { trigger, panel } = mount();
    // 画面下端に近いセル。下に出すと切れてしまう
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: 700,
      bottom: 780,
      left: 100,
      right: 260,
    } as DOMRect);
    Object.defineProperty(panel, "offsetHeight", { value: 360, configurable: true });

    trigger.dispatchEvent(new FocusEvent("focusin"));
    expect(panel.style.bottom).toBe("calc(100% + 6px)");
    expect(panel.style.top).toBe("auto");
    document.body.innerHTML = "";
  });

  test("opens to the left when the cell is near the right edge", () => {
    const { trigger, panel } = mount();
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 212,
      left: window.innerWidth - 120,
      right: window.innerWidth,
    } as DOMRect);

    trigger.dispatchEvent(new FocusEvent("focusin"));
    expect(panel.style.right).toBe("0px");
    expect(panel.style.left).toBe("auto");
    document.body.innerHTML = "";
  });

  test("opens on focus for keyboard and touch", () => {
    const { trigger, panel } = mount();
    trigger.dispatchEvent(new FocusEvent("focusin"));
    expect(panel.style.display).toBe("block");
    document.body.innerHTML = "";
  });
});
