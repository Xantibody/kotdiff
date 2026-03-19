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

  test("startHour === endHour のセグメントは幅ゼロで描画される", () => {
    const segments: TimelineSegment[] = [
      {
        type: "work",
        startHour: 9,
        endHour: 9,
        startLabel: "09:00",
        endLabel: "09:00",
        durationLabel: "0時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    const workDiv = container.querySelector(".bg-blue-400") as HTMLElement;
    expect(workDiv).toBeInTheDocument();
    expect(workDiv.style.width).toBe("0%");
  });

  test("renders guide hour markers when segments are present", () => {
    // Fixed range [5, 29], step=6 → guide hours: 6, 12, 18, 24 → 4 markers
    const segments: TimelineSegment[] = [
      {
        type: "work",
        startHour: 9,
        endHour: 18,
        startLabel: "09:00",
        endLabel: "18:00",
        durationLabel: "9時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    const guideLines = container.querySelectorAll(".bg-gray-300");
    expect(guideLines.length).toBe(4);
  });

  test("renders work segment with blue background", () => {
    const segments: TimelineSegment[] = [
      {
        type: "work",
        startHour: 9,
        endHour: 18,
        startLabel: "09:00",
        endLabel: "18:00",
        durationLabel: "9時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    const workDiv = container.querySelector(".bg-blue-400");
    expect(workDiv).toBeInTheDocument();
  });

  test("renders break segment with amber background", () => {
    const segments: TimelineSegment[] = [
      {
        type: "break",
        startHour: 12,
        endHour: 13,
        startLabel: "12:00",
        endLabel: "13:00",
        durationLabel: "1時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    const breakDiv = container.querySelector(".bg-amber-200");
    expect(breakDiv).toBeInTheDocument();
  });

  test("renders multiple segments", () => {
    const segments: TimelineSegment[] = [
      {
        type: "work",
        startHour: 9,
        endHour: 12,
        startLabel: "09:00",
        endLabel: "12:00",
        durationLabel: "3時間0分",
      },
      {
        type: "break",
        startHour: 12,
        endHour: 13,
        startLabel: "12:00",
        endLabel: "13:00",
        durationLabel: "1時間0分",
      },
      {
        type: "work",
        startHour: 13,
        endHour: 18,
        startLabel: "13:00",
        endLabel: "18:00",
        durationLabel: "5時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    expect(container.querySelectorAll(".bg-blue-400").length).toBe(2);
    expect(container.querySelectorAll(".bg-amber-200").length).toBe(1);
  });

  test("segment has correct left and width styles", () => {
    // Fixed range [5, 29], span=24
    // 9:00-18:00 → left = (9-5)/24*100 ≈ 16.67%, width = (18-9)/24*100 = 37.5%
    const segments: TimelineSegment[] = [
      {
        type: "work",
        startHour: 9,
        endHour: 18,
        startLabel: "09:00",
        endLabel: "18:00",
        durationLabel: "9時間0分",
      },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    const workDiv = container.querySelector(".bg-blue-400") as HTMLElement;
    expect(workDiv.style.left).toBe("16.666666666666664%");
    expect(workDiv.style.width).toBe("37.5%");
  });
});
