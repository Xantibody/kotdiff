import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyTable } from "./DailyTable";
import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";

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
    breakStarts: ["12:00"],
    breakEnds: ["13:00"],
    schedule: null,
    nightOvertime: null,
    ...overrides,
  };
}

describe("DailyTable", () => {
  test("renders table header columns", () => {
    render(<DailyTable rows={[]} />);
    expect(screen.getByText("日付")).toBeInTheDocument();
    expect(screen.getByText("実績")).toBeInTheDocument();
    expect(screen.getByText("差分")).toBeInTheDocument();
    expect(screen.getByText("累積差分")).toBeInTheDocument();
    expect(screen.getByText("休憩")).toBeInTheDocument();
    expect(screen.getByText("一日の流れ")).toBeInTheDocument();
  });

  test("renders the section heading", () => {
    render(<DailyTable rows={[]} />);
    expect(screen.getByText("日別勤怠")).toBeInTheDocument();
  });

  test("renders a row for each entry", () => {
    const rows = [
      makeRow({ date: "03/01（月）" }),
      makeRow({ date: "03/02（火）" }),
      makeRow({ date: "03/03（水）" }),
    ];
    render(<DailyTable rows={rows} />);
    expect(screen.getByText("03/01（月）")).toBeInTheDocument();
    expect(screen.getByText("03/02（火）")).toBeInTheDocument();
    expect(screen.getByText("03/03（水）")).toBeInTheDocument();
  });

  test("displays formatted actual hours", () => {
    render(<DailyTable rows={[makeRow({ actual: 8 })]} />);
    expect(screen.getByText("8:00")).toBeInTheDocument();
  });

  test("displays OFF for weekend rows with null actual", () => {
    render(<DailyTable rows={[makeRow({ actual: null, isWeekend: true, expected: 0 })]} />);
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  test("displays dash for weekday rows with null actual and non-zero expected", () => {
    render(<DailyTable rows={[makeRow({ actual: null, isWeekend: false, expected: 8 })]} />);
    // The "-" could appear in multiple cells (diff, cumDiff, etc.) so use getAllByText
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  test("displays positive diff badge", () => {
    render(<DailyTable rows={[makeRow({ diff: 1, cumulativeDiff: 1 })]} />);
    // The diff value appears in both the badge and the cumulative diff cell
    const matches = screen.getAllByText("+1:00");
    expect(matches.length).toBeGreaterThan(0);
  });

  test("displays negative diff badge", () => {
    render(<DailyTable rows={[makeRow({ diff: -0.5, cumulativeDiff: -0.5 })]} />);
    // The diff value appears in both the badge and the cumulative diff cell
    const matches = screen.getAllByText("-0:30");
    expect(matches.length).toBeGreaterThan(0);
  });

  test("displays attendance time range", () => {
    render(<DailyTable rows={[makeRow({ startTime: "09:00", endTime: "18:00" })]} />);
    expect(screen.getByText("09:00 ~ 18:00")).toBeInTheDocument();
  });

  test("displays schedule badge when schedule is set", () => {
    render(<DailyTable rows={[makeRow({ schedule: "フレックス" })]} />);
    expect(screen.getByText("フレックス")).toBeInTheDocument();
  });

  test("renders empty table body with no rows", () => {
    const { container } = render(<DailyTable rows={[]} />);
    const tbody = container.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });
});
