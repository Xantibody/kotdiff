import { describe, expect, test } from "vitest";

import { defined } from "../../test-utils";
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
      {
        type: "work",
        startHour: 9,
        endHour: 18,
        startLabel: "09:00",
        endLabel: "18:00",
        durationLabel: "9時間0分",
      },
    ]);
  });

  test("9:00-18:00 休憩 12:00-13:00 → work, break, work の3セグメント", () => {
    const segments = buildTimelineSegments("9:00", "18:00", ["12:00"], ["13:00"]);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: "work",
      startHour: 9,
      endHour: 12,
      startLabel: "09:00",
      endLabel: "12:00",
      durationLabel: "3時間0分",
    });
    expect(segments[1]).toEqual({
      type: "break",
      startHour: 12,
      endHour: 13,
      startLabel: "12:00",
      endLabel: "13:00",
      durationLabel: "1時間0分",
    });
    expect(segments[2]).toEqual({
      type: "work",
      startHour: 13,
      endHour: 18,
      startLabel: "13:00",
      endLabel: "18:00",
      durationLabel: "5時間0分",
    });
  });

  test("複数休憩 → 交互のセグメント", () => {
    const segments = buildTimelineSegments("9:00", "18:00", ["12:00", "15:00"], ["13:00", "15:15"]);
    expect(segments).toHaveLength(5);
    expect(defined(segments[0]).type).toBe("work");
    expect(defined(segments[1]).type).toBe("break");
    expect(defined(segments[2]).type).toBe("work");
    expect(defined(segments[3]).type).toBe("break");
    expect(defined(segments[4]).type).toBe("work");
  });

  test("22:00-翌01:00 日付またぎ → work セグメント1つ（endHour=25）", () => {
    const segments = buildTimelineSegments("22:00", "1:00", [], []);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: "work",
      startHour: 22,
      endHour: 25,
      startLabel: "22:00",
      endLabel: "01:00",
      durationLabel: "3時間0分",
    });
  });

  test("22:00-翌01:00 休憩 23:30-翌00:30 → work, break, work の3セグメント", () => {
    const segments = buildTimelineSegments("22:00", "1:00", ["23:30"], ["0:30"]);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ type: "work", startHour: 22, endHour: 23.5 });
    expect(segments[1]).toMatchObject({ type: "break", startHour: 23.5, endHour: 24.5 });
    expect(segments[2]).toMatchObject({ type: "work", startHour: 24.5, endHour: 25 });
  });

  test("22:00-23:30 深夜のみ（日付またぎなし）→ work セグメント1つ", () => {
    const segments = buildTimelineSegments("22:00", "23:30", [], []);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: "work",
      startHour: 22,
      endHour: 23.5,
      startLabel: "22:00",
      endLabel: "23:30",
      durationLabel: "1時間30分",
    });
  });
});
