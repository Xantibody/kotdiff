import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OvertimeGauge } from "./OvertimeGauge";

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
});
