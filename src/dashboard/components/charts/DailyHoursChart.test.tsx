import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyHoursChart } from "./DailyHoursChart";
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

describe("DailyHoursChart", () => {
  test("shows no-data message when rows is empty", () => {
    render(<DailyHoursChart rows={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when all rows are weekend or have null actual", () => {
    const rows = [makeRow({ actual: null }), makeRow({ isWeekend: true })];
    render(<DailyHoursChart rows={rows} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when data is present", () => {
    const rows = [makeRow({ actual: 8, isWeekend: false })];
    render(<DailyHoursChart rows={rows} />);
    expect(screen.getByRole("img", { name: "日別労働時間チャート" })).toBeInTheDocument();
  });

  test("renders a rect for each working day", () => {
    const rows = [
      makeRow({ date: "03/01（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/02（火）", actual: 9, isWeekend: false }),
      makeRow({ date: "03/03（土）", actual: 4, isWeekend: true }), // weekend excluded
    ];
    const { container } = render(<DailyHoursChart rows={rows} />);
    // Each bar is a rect; there should be at least 2 chart bars (one per weekday)
    const rects = container.querySelectorAll("rect.chart-bar");
    expect(rects.length).toBe(2);
  });

  test("renders the 8h reference label", () => {
    const rows = [makeRow({ actual: 8, isWeekend: false })];
    render(<DailyHoursChart rows={rows} />);
    expect(screen.getByText("8h")).toBeInTheDocument();
  });
});
