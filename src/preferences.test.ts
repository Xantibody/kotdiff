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

  it("carries over the old tableCollapsed setting", () => {
    // showTable の前は tableCollapsed（隠すか）で持っていた
    expect(parseUiPreferences({ tableCollapsed: false }).showTable).toBe(true);
    expect(parseUiPreferences({ tableCollapsed: true }).showTable).toBe(false);
    // 新しい設定が入っていればそちらが優先される
    expect(parseUiPreferences({ tableCollapsed: true, showTable: true }).showTable).toBe(true);
  });

  it("reads all known fields", () => {
    expect(
      parseUiPreferences({
        newUi: true,
        bannerOpen: true,
        calendarOpen: true,
        showTable: true,
        showMonthlySummary: true,
        showToolbar: true,
        weekTotalOpen: true,
      }),
    ).toEqual({
      newUi: true,
      bannerOpen: true,
      calendarOpen: true,
      showTable: true,
      showMonthlySummary: true,
      showToolbar: true,
      weekTotalOpen: true,
    });
  });
});

describe("DEFAULT_UI_PREFERENCES", () => {
  it("keeps the redesigned UI opt-in", () => {
    expect(DEFAULT_UI_PREFERENCES.newUi).toBe(false);
  });

  it("hides the KOT page furniture by default", () => {
    // 28 列の表も月次集計も同じ情報を拡張が持つので、新 UI では最初から隠す
    expect(DEFAULT_UI_PREFERENCES.showTable).toBe(false);
    expect(DEFAULT_UI_PREFERENCES.showMonthlySummary).toBe(false);
    expect(DEFAULT_UI_PREFERENCES.showToolbar).toBe(false);
  });
});
