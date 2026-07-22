import { describe, expect, test } from "vitest";
import { isLeaveSchedule } from "./LeaveScheduleDetector";

describe("isLeaveSchedule", () => {
  test("有休 annotation is a leave", () => {
    expect(isLeaveSchedule("複数回休憩(有休)")).toBe(true);
  });

  test("company-defined leave names containing 休暇 are leaves", () => {
    expect(isLeaveSchedule("複数回休憩(夏季休暇)")).toBe(true);
    expect(isLeaveSchedule("複数回休憩(リフレッシュ休暇)")).toBe(true);
    expect(isLeaveSchedule("複数回休憩(振替休暇（フレックス用）)")).toBe(true);
    expect(isLeaveSchedule("--(振替休暇（フレックス用）)")).toBe(true);
  });

  test("代休/振休/休業/欠勤 are leaves", () => {
    expect(isLeaveSchedule("複数回休憩(代休)")).toBe(true);
    expect(isLeaveSchedule("複数回休憩(振休)")).toBe(true);
    expect(isLeaveSchedule("複数回休憩(育児休業)")).toBe(true);
    expect(isLeaveSchedule("複数回休憩(欠勤)")).toBe(true);
  });

  test("plain schedule name is not a leave (休憩 must not match)", () => {
    expect(isLeaveSchedule("複数回休憩")).toBe(false);
  });

  test("公休 is not a leave (handled separately as public holiday)", () => {
    expect(isLeaveSchedule("複数回休憩(公休)")).toBe(false);
  });

  test("empty text is not a leave", () => {
    expect(isLeaveSchedule("")).toBe(false);
  });

  test("company-specific leave name not covered by built-in keywords is not a leave", () => {
    expect(isLeaveSchedule("複数回休憩(サバティカル)")).toBe(false);
  });
});
