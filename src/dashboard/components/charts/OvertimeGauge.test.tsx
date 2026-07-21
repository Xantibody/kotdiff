import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OvertimeGauge } from "./OvertimeGauge";

/** Extracts the start/end coordinates from an SVG arc path ("M x y A rx ry rot laf swf x y"). */
function extractArcEndpoints(d: string): { x: number; y: number }[] {
  const m = d.match(/^M (-?[\d.]+) (-?[\d.]+) A -?[\d.]+ -?[\d.]+ \d \d \d (-?[\d.]+) (-?[\d.]+)$/);
  if (!m) {
    throw new Error(`unexpected arc path: ${d}`);
  }
  return [
    { x: Number(m[1]), y: Number(m[2]) },
    { x: Number(m[3]), y: Number(m[4]) },
  ];
}

function getViewBox(svg: SVGSVGElement): { width: number; height: number } {
  const parts = (svg.getAttribute("viewBox") ?? "").split(" ").map(Number);
  return { width: parts[2] ?? 0, height: parts[3] ?? 0 };
}

describe("OvertimeGauge", () => {
  test("renders an SVG element", () => {
    const { container } = render(<OvertimeGauge totalOvertime={10} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("displays the formatted overtime value", () => {
    render(<OvertimeGauge totalOvertime={10} />);
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  test("displays the limit reference text", () => {
    render(<OvertimeGauge totalOvertime={10} />);
    expect(screen.getByText("/ 45h")).toBeInTheDocument();
  });

  test("shows remaining hours when below limit", () => {
    render(<OvertimeGauge totalOvertime={10} />);
    // remaining = 45 - 10 = 35
    expect(screen.getByText("残り 35:00")).toBeInTheDocument();
  });

  test("shows 上限超過 when overtime exceeds limit", () => {
    render(<OvertimeGauge totalOvertime={50} />);
    expect(screen.getByText("上限超過")).toBeInTheDocument();
  });

  test("uses green color when percent < 60", () => {
    // 60% of 45 = 27; 20h is < 60%
    const { container } = render(<OvertimeGauge totalOvertime={20} />);
    // The center text showing the time should be green (#16a34a)
    const centerText = container.querySelector("text[font-weight='bold']");
    expect(centerText).toHaveAttribute("fill", "#16a34a");
  });

  test("uses amber color when percent >= 60 and < 80", () => {
    // 60% of 45 = 27, 80% of 45 = 36; use 30h
    const { container } = render(<OvertimeGauge totalOvertime={30} />);
    const centerText = container.querySelector("text[font-weight='bold']");
    expect(centerText).toHaveAttribute("fill", "#f59e0b");
  });

  test("uses red color when percent >= 80", () => {
    // 80% of 45 = 36; use 40h
    const { container } = render(<OvertimeGauge totalOvertime={40} />);
    const centerText = container.querySelector("text[font-weight='bold']");
    expect(centerText).toHaveAttribute("fill", "#dc2626");
  });

  test("renders zero overtime correctly", () => {
    render(<OvertimeGauge totalOvertime={0} />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getByText("残り 45:00")).toBeInTheDocument();
  });

  test("progress arc stays within the viewBox for low overtime", () => {
    // 4.5h = 上限45hの10%。短い進捗弧はゲージ始点付近にあり、
    // 描画領域の外にクリップされてはならない(issue #16)
    const { container } = render(<OvertimeGauge totalOvertime={4.5} />);
    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error("svg not found");
    }
    const { width, height } = getViewBox(svg);
    const progress = container.querySelector("path.chart-gauge");
    expect(progress).toBeInTheDocument();
    for (const { x, y } of extractArcEndpoints(progress?.getAttribute("d") ?? "")) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(height);
    }
  });

  test("all arc endpoints stay within the viewBox", () => {
    const { container } = render(<OvertimeGauge totalOvertime={45} />);
    const svg = container.querySelector("svg");
    if (!svg) {
      throw new Error("svg not found");
    }
    const { width, height } = getViewBox(svg);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      for (const { x, y } of extractArcEndpoints(path.getAttribute("d") ?? "")) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
  });

  test("progress arc starts at the bottom-left of the gauge", () => {
    const { container } = render(<OvertimeGauge totalOvertime={4.5} />);
    const progress = container.querySelector("path.chart-gauge");
    const [start] = extractArcEndpoints(progress?.getAttribute("d") ?? "");
    if (!start) {
      throw new Error("start point not found");
    }
    // ゲージ中心は (120, 120)。開口部が真下の270°ゲージは
    // 225°、つまり中心より左下から始まる
    expect(start.x).toBeLessThan(120);
    expect(start.y).toBeGreaterThan(120);
  });
});
