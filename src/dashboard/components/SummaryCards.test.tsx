import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCards } from "./SummaryCards";
import type { DashboardSummary } from "../../domain/aggregates/WorkMonth";

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalWorkDays: 20,
    workedDays: 10,
    remainingDays: 10,
    totalActual: 80,
    totalExpected: 80,
    cumulativeDiff: 0,
    totalOvertime: 0,
    totalNightOvertime: 0,
    avgWorkTime: 8,
    projectedTotal: 160,
    progressPercent: 100,
    leaveBalances: [],
    dailyRows: [],
    ...overrides,
  };
}

describe("SummaryCards", () => {
  test("renders all four card titles", () => {
    render(<SummaryCards summary={makeSummary()} />);
    expect(screen.getByText("時間貯金")).toBeInTheDocument();
    expect(screen.getByText("残り日数")).toBeInTheDocument();
    expect(screen.getByText("1日あたり平均")).toBeInTheDocument();
    expect(screen.getByText("残業")).toBeInTheDocument();
  });

  test("displays worked days out of total work days", () => {
    render(<SummaryCards summary={makeSummary({ workedDays: 5, totalWorkDays: 20 })} />);
    expect(screen.getByText("5日勤務済み / 20日")).toBeInTheDocument();
  });

  test("displays remaining days", () => {
    render(<SummaryCards summary={makeSummary({ remainingDays: 7 })} />);
    expect(screen.getByText("7日")).toBeInTheDocument();
  });

  test("displays positive cumulative diff in green", () => {
    render(<SummaryCards summary={makeSummary({ cumulativeDiff: 2 })} />);
    const diffText = screen.getByText("+2:00");
    expect(diffText).toHaveClass("text-green-600");
  });

  test("displays negative cumulative diff in red", () => {
    render(<SummaryCards summary={makeSummary({ cumulativeDiff: -1 })} />);
    const diffText = screen.getByText("-1:00");
    expect(diffText).toHaveClass("text-red-600");
  });

  test("shows overtime value", () => {
    render(<SummaryCards summary={makeSummary({ totalOvertime: 10 })} />);
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  test("shows normal badge when overtime is low", () => {
    render(<SummaryCards summary={makeSummary({ totalOvertime: 5 })} />);
    expect(screen.getByText("正常")).toBeInTheDocument();
  });

  test("shows warning badge when overtime is between 80% and 100% of limit (45h)", () => {
    // 80% of 45 = 36, so 37 should trigger warning
    render(<SummaryCards summary={makeSummary({ totalOvertime: 37 })} />);
    expect(screen.getByText("注意")).toBeInTheDocument();
  });

  test("shows destructive badge when overtime >= 45h", () => {
    render(<SummaryCards summary={makeSummary({ totalOvertime: 45 })} />);
    expect(screen.getByText("45時間超過")).toBeInTheDocument();
  });

  test("shows night overtime when it is > 0", () => {
    render(<SummaryCards summary={makeSummary({ totalOvertime: 5, totalNightOvertime: 2 })} />);
    expect(screen.getByText("うち深夜 2:00")).toBeInTheDocument();
  });

  test("shows dash for avg when no days worked", () => {
    render(<SummaryCards summary={makeSummary({ workedDays: 0, avgWorkTime: 0 })} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  test("shows 目標クリア済み when remaining required hours <= 0", () => {
    // remainingDays=10, cumulativeDiff=100 (way over) => remainingRequired = 10*8 - 100 = -20 <= 0
    render(<SummaryCards summary={makeSummary({ remainingDays: 10, cumulativeDiff: 100 })} />);
    expect(screen.getByText("目標クリア済み")).toBeInTheDocument();
  });
});
