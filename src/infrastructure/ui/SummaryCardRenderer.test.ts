import { describe, test, expect, vi } from "vitest";
import { createSummaryCard } from "./SummaryCardRenderer";
import { KOTDIFF_CARD_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";
import { buildSummaryModel } from "../../application/SummaryModel";
import type { SummaryInput } from "../../application/SummaryModel";

const workingToday: NonNullable<SummaryInput["today"]> = {
  status: "working",
  startTime: 11 + 7 / 60,
  now: 17 + 42 / 60,
  netWorkTime: 5 + 29 / 60,
  breaks: [{ start: 11 + 58 / 60, end: 13 + 4 / 60 }],
  remainingHours: 2 + 32 / 60,
  targetLabel: "20:14",
  targetTime: 20 + 14 / 60,
};

const input: SummaryInput = {
  totalWorkDays: 18,
  workedDays: 13,
  remainingDays: 5,
  totalActual: 103.983,
  cumulativeDiff: -0.017,
  overtime: 13.233,
  actuals: [8.5, 6.3, 9.7, 7.2, 8.9, 6.9, 8.1, 9.3, 7.4, 8, 6.8, 9.5, 7.4],
  today: workingToday,
  dateLabel: "02/20（金）",
  nowLabel: "17:42",
  alerts: [],
};

const model = buildSummaryModel(input);

describe("createSummaryCard — たたんだ状態", () => {
  test("carries the injection marker so the re-inject guard still works", () => {
    const card = createSummaryCard(model, false, vi.fn());
    expect(card.element.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
    expect(card.element.classList.contains(KOTDIFF_CARD_CLASS)).toBe(true);
  });

  test("fits in one 30px row and leads with the remaining time", () => {
    const card = createSummaryCard(model, false, vi.fn());
    expect(card.element.style.height).toBe("30px");
    expect(card.element.textContent).toContain("あと");
    expect(card.element.textContent).toContain("2:32");
    expect(card.element.textContent).toContain("退勤目安");
    expect(card.element.textContent).toContain("20:14");
  });

  test("keeps a missing-punch alert visible even when collapsed", () => {
    const withAlert = buildSummaryModel({ ...input, alerts: ["02/19 の打刻が未入力"] });
    const card = createSummaryCard(withAlert, false, vi.fn());
    expect(card.element.textContent).toContain("02/19 の打刻が未入力");
  });

  test("summarises multiple alerts as a count", () => {
    const withAlerts = buildSummaryModel({
      ...input,
      alerts: ["02/19 の打刻が未入力", "02/18 の打刻が未入力"],
    });
    const card = createSummaryCard(withAlerts, false, vi.fn());
    expect(card.element.textContent).toContain("他 1件");
  });

  test("drops every emoji from the summary", () => {
    const card = createSummaryCard(model, false, vi.fn());
    expect(card.element.textContent ?? "").not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe("createSummaryCard — 開いた状態", () => {
  test("shows the three zones and the outlook sentence", () => {
    const card = createSummaryCard(model, true, vi.fn());
    const text = card.element.textContent ?? "";
    expect(text).toContain("あと これだけ");
    expect(text).toContain("今日の進行");
    expect(text).toContain("今月");
    expect(text).toContain("このままだと");
    expect(text).toContain("着地の振れ幅");
  });

  test("reports the alerts in the status row", () => {
    const withAlert = buildSummaryModel({ ...input, alerts: ["02/20 の退勤打刻が未入力"] });
    const card = createSummaryCard(withAlert, true, vi.fn());
    expect(card.element.textContent).toContain("02/20 の退勤打刻が未入力");
  });

  test("collapses the progress zone outside working hours", () => {
    const offDuty = buildSummaryModel({ ...input, today: null });
    const card = createSummaryCard(offDuty, true, vi.fn());
    const text = card.element.textContent ?? "";
    expect(text).not.toContain("今日の進行");
    expect(text).toContain("今月あと");
  });
});

describe("createSummaryCard — 開閉", () => {
  test("toggles open on click and reports the new state", () => {
    const onToggle = vi.fn();
    const card = createSummaryCard(model, false, onToggle);
    card.element.click();
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(card.element.textContent).toContain("あと これだけ");
  });

  test("only the header row collapses the open card", () => {
    const onToggle = vi.fn();
    const card = createSummaryCard(model, true, onToggle);
    // 本文クリックは無視する (テキスト選択で閉じてしまうのを避ける)
    const [, body] = card.element.children;
    body?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).not.toHaveBeenCalled();

    card.element.firstElementChild?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  test("update re-renders in place without losing the open state", () => {
    const card = createSummaryCard(model, true, vi.fn());
    const next = buildSummaryModel({
      ...input,
      today: { ...workingToday, remainingHours: 1, targetLabel: "18:42" },
    });
    card.update(next);
    expect(card.element.textContent).toContain("18:42");
    expect(card.element.textContent).toContain("あと これだけ");
  });
});
