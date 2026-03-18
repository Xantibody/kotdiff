import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelineBar } from "./TimelineBar";
import type { TimelineSegment } from "../lib/timeline";

describe("TimelineBar", () => {
  test("renders an empty div when segments is empty", () => {
    const { container } = render(<TimelineBar segments={[]} />);
    const div = container.firstElementChild;
    expect(div).toBeInTheDocument();
    expect(div?.classList.contains("h-5")).toBe(true);
    // No guide line divs rendered when no segments
    expect(container.querySelectorAll(".bg-gray-300").length).toBe(0);
  });

  test("renders guide hour markers when segments are present", () => {
    const segments: TimelineSegment[] = [{ type: "work", startPercent: 37.5, widthPercent: 37.5 }];
    const { container } = render(<TimelineBar segments={segments} />);
    const guideLines = container.querySelectorAll(".bg-gray-300");
    // GUIDE_HOURS = [6, 12, 18] => 3 markers
    expect(guideLines.length).toBe(3);
  });

  test("renders work segment with blue background", () => {
    const segments: TimelineSegment[] = [{ type: "work", startPercent: 37.5, widthPercent: 37.5 }];
    const { container } = render(<TimelineBar segments={segments} />);
    const workDiv = container.querySelector(".bg-blue-400");
    expect(workDiv).toBeInTheDocument();
  });

  test("renders break segment with amber background", () => {
    const segments: TimelineSegment[] = [{ type: "break", startPercent: 50, widthPercent: 4.17 }];
    const { container } = render(<TimelineBar segments={segments} />);
    const breakDiv = container.querySelector(".bg-amber-200");
    expect(breakDiv).toBeInTheDocument();
  });

  test("renders multiple segments", () => {
    const segments: TimelineSegment[] = [
      { type: "work", startPercent: 37.5, widthPercent: 12.5 },
      { type: "break", startPercent: 50, widthPercent: 4.17 },
      { type: "work", startPercent: 54.17, widthPercent: 20.83 },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    expect(container.querySelectorAll(".bg-blue-400").length).toBe(2);
    expect(container.querySelectorAll(".bg-amber-200").length).toBe(1);
  });

  test("segment has correct left and width styles", () => {
    const segments: TimelineSegment[] = [{ type: "work", startPercent: 40, widthPercent: 30 }];
    const { container } = render(<TimelineBar segments={segments} />);
    const workDiv = container.querySelector(".bg-blue-400") as HTMLElement;
    expect(workDiv.style.left).toBe("40%");
    expect(workDiv.style.width).toBe("30%");
  });
});
