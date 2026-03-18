import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekdayAvgChart } from "./WeekdayAvgChart";
import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";

function makeRow(overrides: Partial<DailyRowSummary> = {}): DailyRowSummary {
  return {
    date: "03/01（月）",
    dayType: "weekday",
    isWeekend: false,
    actual: 8,
    expected: 8,
    diff: 0,
    cumulativeDiff: 0,
    overtime: 0,
    breakTime: 1,
    startTime: "09:00",
    endTime: "18:00",
    breakStarts: [],
    breakEnds: [],
    schedule: null,
    nightOvertime: null,
    ...overrides,
  };
}

describe("WeekdayAvgChart", () => {
  test("shows no-data message when rows is empty", () => {
    render(<WeekdayAvgChart rows={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when all rows are weekends or have null actual", () => {
    const rows = [makeRow({ actual: null }), makeRow({ isWeekend: true })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when data is present", () => {
    const rows = [makeRow({ date: "03/01（月）", actual: 8, isWeekend: false })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByRole("img", { name: "曜日別平均労働時間チャート" })).toBeInTheDocument();
  });

  test("renders weekday labels for days with data", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 7, isWeekend: false }),
    ];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("月")).toBeInTheDocument();
    expect(screen.getByText("火")).toBeInTheDocument();
  });

  test("displays count label for each weekday", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/10（月）", actual: 9, isWeekend: false }),
    ];
    render(<WeekdayAvgChart rows={rows} />);
    // Two Monday entries => (2日)
    expect(screen.getByText("(2日)")).toBeInTheDocument();
  });

  test("renders chart bars for each represented weekday", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 7, isWeekend: false }),
    ];
    const { container } = render(<WeekdayAvgChart rows={rows} />);
    const bars = container.querySelectorAll("rect.chart-bar");
    expect(bars.length).toBe(2);
  });

  test("shows the 8h reference label", () => {
    const rows = [makeRow({ date: "03/03（月）", actual: 8, isWeekend: false })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("8h")).toBeInTheDocument();
  });
});
