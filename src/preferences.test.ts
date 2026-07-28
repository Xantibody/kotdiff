import { describe, it, expect } from "vitest";
import { DEFAULT_UI_PREFERENCES, parseUiPreferences } from "./preferences";

describe("parseUiPreferences", () => {
  it("falls back to the defaults for non-object values", () => {
    expect(parseUiPreferences(null)).toEqual(DEFAULT_UI_PREFERENCES);
    expect(parseUiPreferences(undefined)).toEqual(DEFAULT_UI_PREFERENCES);
    expect(parseUiPreferences("newUi")).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("keeps the defaults for missing or non-boolean fields", () => {
    // 旧バージョンの保存データにはフィールドが存在しないため、部分的な欠落を許容する
    expect(parseUiPreferences({ newUi: true })).toEqual({
      ...DEFAULT_UI_PREFERENCES,
      newUi: true,
    });
    expect(parseUiPreferences({ newUi: "yes" })).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("reads all known fields", () => {
    expect(
      parseUiPreferences({
        newUi: true,
        bannerOpen: true,
        calendarOpen: true,
        tableCollapsed: true,
      }),
    ).toEqual({ newUi: true, bannerOpen: true, calendarOpen: true, tableCollapsed: true });
  });
});

describe("DEFAULT_UI_PREFERENCES", () => {
  it("keeps the redesigned UI opt-in", () => {
    expect(DEFAULT_UI_PREFERENCES.newUi).toBe(false);
  });

  it("folds the KOT table away by default", () => {
    // 28 列の表はモニターに収まらないので、新 UI では最初からたたんでおく
    expect(DEFAULT_UI_PREFERENCES.tableCollapsed).toBe(true);
  });
});
