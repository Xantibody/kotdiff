import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CumulativeDiffChart } from "./CumulativeDiffChart";
import { makeUnworkedRow, makeRow } from "../../test-helpers";

describe("CumulativeDiffChart", () => {
  test("shows no-data message when all rows have null cumulativeDiff", () => {
    const rows = [makeUnworkedRow(), makeUnworkedRow()];
    render(<CumulativeDiffChart rows={rows} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when rows is empty", () => {
    render(<CumulativeDiffChart rows={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when data is present", () => {
    const rows = [
      makeRow({ date: "03/01（月）", cumulativeDiff: 1 }),
      makeRow({ date: "03/02（火）", cumulativeDiff: 2 }),
    ];
    render(<CumulativeDiffChart rows={rows} />);
    expect(screen.getByRole("img", { name: "累積差分チャート" })).toBeInTheDocument();
  });

  test("renders polyline for the line chart", () => {
    const rows = [
      makeRow({ date: "03/01（月）", cumulativeDiff: 1 }),
      makeRow({ date: "03/02（火）", cumulativeDiff: 2 }),
    ];
    const { container } = render(<CumulativeDiffChart rows={rows} />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  test("uses green line color when last value is positive", () => {
    const rows = [
      makeRow({ date: "03/01（月）", cumulativeDiff: 1 }),
      makeRow({ date: "03/02（火）", cumulativeDiff: 2 }),
    ];
    const { container } = render(<CumulativeDiffChart rows={rows} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "#16a34a");
  });

  test("uses red line color when last value is negative", () => {
    const rows = [
      makeRow({ date: "03/01（月）", cumulativeDiff: -1 }),
      makeRow({ date: "03/02（火）", cumulativeDiff: -2 }),
    ];
    const { container } = render(<CumulativeDiffChart rows={rows} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toHaveAttribute("stroke", "#dc2626");
  });

  test("renders data points as circles", () => {
    const rows = [
      makeRow({ date: "03/01（月）", cumulativeDiff: 1 }),
      makeRow({ date: "03/02（火）", cumulativeDiff: 2 }),
      makeRow({ date: "03/03（水）", cumulativeDiff: 3 }),
    ];
    const { container } = render(<CumulativeDiffChart rows={rows} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(3);
  });
});
