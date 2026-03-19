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

  test("全セグメントが同一時刻 (span=0) → 空コンテナを返す", () => {
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
    const div = container.firstElementChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.querySelector("[class*='bg-blue']")).toBeNull();
  });

  test("renders guide hour markers when segments are present", () => {
    // 9:00-18:00 → scaleMin=9, scaleMax=18, span=9 (≤18), step=3
    // guide hours: 12, 15 → 2 markers (9 and 18 are excluded as boundaries)
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
    // step=3, guides from ceil(9/3)*3=9 (excluded <18): 9,12,15 → 3 markers
    expect(guideLines.length).toBe(3);
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
      { type: "work", startHour: 9, endHour: 12, startLabel: "09:00", endLabel: "12:00", durationLabel: "3時間0分" },
      { type: "break", startHour: 12, endHour: 13, startLabel: "12:00", endLabel: "13:00", durationLabel: "1時間0分" },
      { type: "work", startHour: 13, endHour: 18, startLabel: "13:00", endLabel: "18:00", durationLabel: "5時間0分" },
    ];
    const { container } = render(<TimelineBar segments={segments} />);
    expect(container.querySelectorAll(".bg-blue-400").length).toBe(2);
    expect(container.querySelectorAll(".bg-amber-200").length).toBe(1);
  });

  test("segment has correct left and width styles", () => {
    // single segment 9:00-18:00 → scaleMin=9, scaleMax=18, span=9
    // left = (9-9)/9*100 = 0%, width = (18-9)/9*100 = 100%
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
    expect(workDiv.style.left).toBe("0%");
    expect(workDiv.style.width).toBe("100%");
  });
});
