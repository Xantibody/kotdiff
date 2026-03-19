import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkRangeChart } from "./WorkRangeChart";
import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";
import { makeWorkedRow, makeUnworkedRow, makeRow } from "../../test-helpers";

describe("WorkRangeChart", () => {
  test("shows no-data message when rows is empty", () => {
    render(<WorkRangeChart rows={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when all rows have null start/end times", () => {
    const rows: DailyRowSummary[] = [
      makeUnworkedRow(),
      makeWorkedRow({ startTime: null, endTime: null }),
    ];
    render(<WorkRangeChart rows={rows} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when data is present", () => {
    render(<WorkRangeChart rows={[makeRow()]} />);
    expect(screen.getByRole("img", { name: "出退勤レンジチャート" })).toBeInTheDocument();
  });

  test("renders Y-axis time labels", () => {
    render(<WorkRangeChart rows={[makeRow()]} />);
    expect(screen.getByText("9:00")).toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
  });

  test("renders rect elements for work range bars", () => {
    const { container } = render(<WorkRangeChart rows={[makeRow()]} />);
    // Each row gets a background rect + segment rects
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  test("renders work and break segments separately", () => {
    const { container } = render(
      <WorkRangeChart
        rows={[
          makeRow({
            startTime: "09:00",
            endTime: "18:00",
            breakStarts: ["12:00"],
            breakEnds: ["13:00"],
          }),
        ]}
      />,
    );
    // Should have at least a background rect, work segments and a break segment
    const blueFillRects = container.querySelectorAll("rect[fill='#3b82f6']");
    const yellowFillRects = container.querySelectorAll("rect[fill='#fbbf24']");
    expect(blueFillRects.length).toBeGreaterThan(0);
    expect(yellowFillRects.length).toBeGreaterThan(0);
  });
});
