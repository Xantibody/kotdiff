import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SemicircleProgress } from "./SemicircleProgress";

describe("SemicircleProgress", () => {
  test("renders an SVG element", () => {
    const { container } = render(<SemicircleProgress percent={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  test("displays the percentage text", () => {
    render(<SemicircleProgress percent={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  test("rounds the percentage to nearest integer", () => {
    render(<SemicircleProgress percent={66.6} />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  test("uses orange color when percent < 80", () => {
    const { container } = render(<SemicircleProgress percent={50} />);
    const progressPath = container.querySelectorAll("path")[1];
    expect(progressPath).toHaveAttribute("stroke", "#ea580c");
  });

  test("uses blue color when percent >= 80 and < 100", () => {
    const { container } = render(<SemicircleProgress percent={85} />);
    const progressPath = container.querySelectorAll("path")[1];
    expect(progressPath).toHaveAttribute("stroke", "#2563eb");
  });

  test("uses green color when percent >= 100", () => {
    const { container } = render(<SemicircleProgress percent={110} />);
    const progressPath = container.querySelectorAll("path")[1];
    expect(progressPath).toHaveAttribute("stroke", "#16a34a");
  });

  test("renders with default size of 80", () => {
    const { container } = render(<SemicircleProgress percent={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "80");
  });

  test("renders with custom size", () => {
    const { container } = render(<SemicircleProgress percent={50} size={120} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
  });
});
