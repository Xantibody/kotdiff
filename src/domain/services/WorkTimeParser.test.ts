import { describe, expect, test } from "vitest";
import { extractTimeStrings, parseAllTimeRecords } from "./WorkTimeParser";

describe("extractTimeStrings", () => {
  test("空文字 → []", () => {
    expect(extractTimeStrings("")).toEqual([]);
  });

  test("単一時刻", () => {
    expect(extractTimeStrings("12:00")).toEqual(["12:00"]);
  });

  test("複数時刻（テキスト混在）", () => {
    expect(extractTimeStrings("A 18:45\nA 20:03")).toEqual(["18:45", "20:03"]);
  });
});

describe("parseAllTimeRecords", () => {
  test("空文字 → []", () => {
    expect(parseAllTimeRecords("")).toEqual([]);
  });

  test("単一時刻", () => {
    expect(parseAllTimeRecords("11:30")).toEqual([11.5]);
  });

  test("複数時刻（改行・テキスト混在）", () => {
    const text = "A\n11:25\nA\n19:24\n";
    const result = parseAllTimeRecords(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(11 + 25 / 60);
    expect(result[1]).toBeCloseTo(19 + 24 / 60);
  });

  test("時刻なしテキスト → []", () => {
    expect(parseAllTimeRecords("hello world")).toEqual([]);
  });
});
