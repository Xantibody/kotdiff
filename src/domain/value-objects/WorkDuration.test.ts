import { describe, expect, test } from "vitest";
import {
  formatHM,
  formatDiff,
  formatTimeOfDay,
  formatClockOutTime,
  isDiffNegative,
  createWorkDuration,
} from "./WorkDuration";

describe("createWorkDuration", () => {
  test("creates WorkDuration with given hours", () => {
    const wd = createWorkDuration(8);
    expect(wd.hours).toBe(8);
  });

  test("zero hours is valid", () => {
    const wd = createWorkDuration(0);
    expect(wd.hours).toBe(0);
  });

  test("fractional hours are valid", () => {
    const wd = createWorkDuration(8.5);
    expect(wd.hours).toBe(8.5);
  });

  test("negative hours throws", () => {
    expect(() => createWorkDuration(-1)).toThrow("WorkDuration: hours (-1) must be >= 0");
  });
});

describe("formatHM", () => {
  test("0 → 0:00", () => {
    expect(formatHM(0)).toBe("0:00");
  });

  test("8 → 8:00", () => {
    expect(formatHM(8)).toBe("8:00");
  });

  test("8.5 → 8:30", () => {
    expect(formatHM(8.5)).toBe("8:30");
  });

  test("-2.25 → 2:15 (absolute value)", () => {
    expect(formatHM(-2.25)).toBe("2:15");
  });

  test("0.9917 → 1:00 (0→1 繰り上がり: m=60 → h=1, m=0)", () => {
    expect(formatHM(0.9917)).toBe("1:00");
  });

  test("2.9917 → 3:00 (N→N+1 繰り上がり)", () => {
    expect(formatHM(2.9917)).toBe("3:00");
  });

  test("2.991 → 2:59 (閾値直下: 繰り上がらない)", () => {
    expect(formatHM(2.991)).toBe("2:59");
  });

  test("-2.9917 → 3:00 (負数での繰り上がり)", () => {
    expect(formatHM(-2.9917)).toBe("3:00");
  });

  test("99.9917 → 100:00 (大きな値での繰り上がり)", () => {
    expect(formatHM(99.9917)).toBe("100:00");
  });
});

describe("formatDiff", () => {
  test("0 → +0:00", () => {
    expect(formatDiff(0)).toBe("+0:00");
  });

  test("1.5 → +1:30", () => {
    expect(formatDiff(1.5)).toBe("+1:30");
  });

  test("-0.5 → -0:30", () => {
    expect(formatDiff(-0.5)).toBe("-0:30");
  });

  test("2.9917 → +3:00 (正の繰り上がり + 符号)", () => {
    expect(formatDiff(2.9917)).toBe("+3:00");
  });

  test("-2.9917 → -3:00 (負の繰り上がり + 符号)", () => {
    expect(formatDiff(-2.9917)).toBe("-3:00");
  });

  test("浮動小数点残差の負のゼロは +0:00 に正規化する", () => {
    expect(formatDiff(-4e-16)).toBe("+0:00");
  });
});

describe("isDiffNegative", () => {
  test("分に丸めて負なら true", () => {
    expect(isDiffNegative(-0.5)).toBe(true);
  });

  test("正およびゼロは false", () => {
    expect(isDiffNegative(1.5)).toBe(false);
    expect(isDiffNegative(0)).toBe(false);
  });

  test("浮動小数点残差の負のゼロは false (丸め後 0 のため)", () => {
    expect(isDiffNegative(-4e-16)).toBe(false);
  });
});

describe("formatTimeOfDay", () => {
  test("19.4 → 19:24", () => {
    expect(formatTimeOfDay(19.4)).toBe("19:24");
  });

  test("24h 以上の値はそのまま表示する（呼び出し側で日数分解する前提）", () => {
    expect(formatTimeOfDay(27.5)).toBe("27:30");
  });

  test("分の繰り上がり (18.9999 → 19:00)", () => {
    expect(formatTimeOfDay(18.9999)).toBe("19:00");
  });
});

describe("formatClockOutTime", () => {
  // JST の瞬間を UTC 文字列で表しタイムゾーン非依存にする
  const jst0702 = new Date("2026-07-02T05:00:00Z"); // JST 2026-07-02 14:00

  test("当日中の目安は時刻のみ表示する", () => {
    expect(formatClockOutTime(19.4, jst0702)).toBe("19:24");
  });

  test("日を跨ぐ目安は翌日の日付と時刻で表示する (28.67h → 7/3 4:40)", () => {
    expect(formatClockOutTime(28 + 40 / 60, jst0702)).toBe("7/3 4:40");
  });

  test("月末の跨ぎは翌月の日付になる", () => {
    const jst0731 = new Date("2026-07-31T05:00:00Z"); // JST 2026-07-31 14:00
    expect(formatClockOutTime(25.5, jst0731)).toBe("8/1 1:30");
  });
});
