import { describe, expect, test } from "vitest";
import { buildTimelineSegments } from "./timeline";

describe("buildTimelineSegments", () => {
  test("startTime が null なら空配列", () => {
    expect(buildTimelineSegments(null, "18:00", [], [])).toEqual([]);
  });

  test("endTime が null なら空配列", () => {
    expect(buildTimelineSegments("9:00", null, [], [])).toEqual([]);
  });

  test("9:00-18:00 休憩なし → work セグメント1つ", () => {
    const segments = buildTimelineSegments("9:00", "18:00", [], []);
    expect(segments).toEqual([
      { type: "work", startPercent: (9 / 24) * 100, widthPercent: (9 / 24) * 100 },
    ]);
  });

  test("9:00-18:00 休憩 12:00-13:00 → work, break, work の3セグメント", () => {
    const segments = buildTimelineSegments("9:00", "18:00", ["12:00"], ["13:00"]);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: "work",
      startPercent: (9 / 24) * 100,
      widthPercent: (3 / 24) * 100,
    });
    expect(segments[1]).toEqual({
      type: "break",
      startPercent: (12 / 24) * 100,
      widthPercent: (1 / 24) * 100,
    });
    expect(segments[2]).toEqual({
      type: "work",
      startPercent: (13 / 24) * 100,
      widthPercent: (5 / 24) * 100,
    });
  });

  test("複数休憩 → 交互のセグメント", () => {
    const segments = buildTimelineSegments("9:00", "18:00", ["12:00", "15:00"], ["13:00", "15:15"]);
    expect(segments).toHaveLength(5);
    expect(segments[0].type).toBe("work");
    expect(segments[1].type).toBe("break");
    expect(segments[2].type).toBe("work");
    expect(segments[3].type).toBe("break");
    expect(segments[4].type).toBe("work");
  });
});
