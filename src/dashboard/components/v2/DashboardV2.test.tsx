import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardV2 } from "./DashboardV2";
import type { DashboardSummary } from "../../../domain/aggregates/WorkMonth";
import { makeUnworkedRow, makeWorkedRow } from "../../test-helpers";

// JST 03/04（水）17:00
const NOW = new Date("2026-03-04T08:00:00.000Z");

const summary: DashboardSummary = {
  totalWorkDays: 4,
  workedDays: 2,
  remainingDays: 2,
  totalActual: 17,
  totalExpected: 16,
  cumulativeDiff: 1,
  totalOvertime: 1,
  totalNightOvertime: 0,
  avgWorkTime: 8.5,
  projectedTotal: 34,
  progressPercent: 53,
  leaveBalances: [],
  dailyRows: [
    makeWorkedRow({ date: "03/02（月）", actual: 9, diff: 1, cumulativeDiff: 1 }),
    makeWorkedRow({ date: "03/03（火）", actual: 8, diff: 0, cumulativeDiff: 1 }),
    makeUnworkedRow({ date: "03/04（水）", startTime: "09:00", endTime: null }),
    makeUnworkedRow({ date: "03/05（木）" }),
  ],
};

function renderDashboard(overrides: Partial<Parameters<typeof DashboardV2>[0]> = {}) {
  return render(
    <DashboardV2
      summary={summary}
      generatedAt="2026-03-04T08:00:00.000Z"
      calendarOpen={false}
      onCalendarToggle={vi.fn()}
      now={NOW}
      {...overrides}
    />,
  );
}

describe("DashboardV2", () => {
  test("leads with today, the savings balance and the month's requirement", () => {
    renderDashboard();
    expect(screen.getByText(/今日 03\/04（水）/)).toBeInTheDocument();
    // カードのラベルと日別テーブルの列見出しの 2 か所に出る
    expect(screen.getAllByText("時間貯金")).toHaveLength(2);
    expect(screen.getByText(/今月の必須/)).toBeInTheDocument();
  });

  test("states the outlook without statistical wording", () => {
    renderDashboard();
    const sentence = screen.getByText(/このままだと/);
    expect(sentence.textContent).not.toContain("標準偏差");
    expect(sentence.textContent).not.toContain("予測区間");
  });

  test("keeps the calendar collapsed by default and reports the toggle", async () => {
    const onCalendarToggle = vi.fn();
    renderDashboard({ onCalendarToggle });

    expect(screen.queryByText("週合計")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("▸ 今月のカレンダー"));
    expect(onCalendarToggle).toHaveBeenCalledWith(true);
  });

  test("shows week totals once the calendar is open", () => {
    renderDashboard({ calendarOpen: true });
    expect(screen.getByText("週合計")).toBeInTheDocument();
    expect(screen.getByText(/第1週/)).toBeInTheDocument();
  });

  test("keeps the existing chart tabs below the table", () => {
    renderDashboard();
    expect(screen.getByText("日別勤怠")).toBeInTheDocument();
    expect(screen.getByText("累積差分")).toBeInTheDocument();
  });

  test("explains the timeline scale once when the calendar is open", () => {
    renderDashboard({ calendarOpen: true });
    expect(screen.getByText("帯の時間軸")).toBeInTheDocument();
  });

  test("lists days that fall short of the statutory break", () => {
    render(
      <DashboardV2
        summary={{
          ...summary,
          // 8 時間以上働いて休憩 30 分は労基法 34 条を満たさない
          dailyRows: [
            makeWorkedRow({ date: "03/02（月）", actual: 8.5, breakTime: 0.5, diff: 0.5 }),
            ...summary.dailyRows.slice(1),
          ],
        }}
        generatedAt=""
        calendarOpen={false}
        onCalendarToggle={vi.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText(/休憩不足の日：03\/02（月）/)).toBeInTheDocument();
  });

  test("says so when no day is short of a break", () => {
    renderDashboard();
    expect(screen.getByText(/休憩不足の日：なし/)).toBeInTheDocument();
  });

  test("counts a past day with no clock-out as an action item", () => {
    render(
      <DashboardV2
        summary={{
          ...summary,
          dailyRows: [
            makeUnworkedRow({ date: "03/02（月）", startTime: "09:00", endTime: null }),
            ...summary.dailyRows.slice(1),
          ],
        }}
        generatedAt=""
        calendarOpen={false}
        onCalendarToggle={vi.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText(/03\/02（月） の退勤打刻なし/)).toBeInTheDocument();
  });
});
