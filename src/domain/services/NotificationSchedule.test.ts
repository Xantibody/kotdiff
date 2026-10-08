import { describe, test, expect } from "vitest";
import { parseNotificationTimes, nextOccurrence } from "./NotificationSchedule";

describe("parseNotificationTimes", () => {
  test("空なら時刻なし", () => {
    expect(parseNotificationTimes("")).toEqual([]);
    expect(parseNotificationTimes(" , ")).toEqual([]);
  });

  test("1 つの時刻を HH:MM に正規化する", () => {
    expect(parseNotificationTimes("9:5")).toEqual(["09:05"]);
  });

  test("複数はカンマ・空白・読点で区切り、昇順にして重複を除く", () => {
    expect(parseNotificationTimes("17:30, 12:00、12:00 9:00")).toEqual(["09:00", "12:00", "17:30"]);
  });

  test.each(["25:00", "12:60", "noon", "12", "1200"])(
    "%s は時刻として読めないので null",
    (text) => {
      expect(parseNotificationTimes(text)).toBeNull();
    },
  );
});

describe("nextOccurrence", () => {
  // 2026-07-02 10:00 JST
  const NOW = new Date("2026-07-02T01:00:00.000Z");

  test("今日まだ来ていない時刻なら今日のその時刻（JST）", () => {
    expect(nextOccurrence("12:00", NOW).toISOString()).toBe("2026-07-02T03:00:00.000Z");
  });

  test("今日もう過ぎた時刻なら明日", () => {
    expect(nextOccurrence("09:00", NOW).toISOString()).toBe("2026-07-03T00:00:00.000Z");
  });

  test("ちょうど今の時刻は過ぎたものとして明日", () => {
    expect(nextOccurrence("10:00", NOW).toISOString()).toBe("2026-07-03T01:00:00.000Z");
  });
});
