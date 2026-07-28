// 見やすさ改修 (v2 UI) の切り替えと、注入 UI の開閉状態。
// 新 UI はオプトイン（既定 false）で、ダッシュボードのトグルから有効化する。
export interface UiPreferences {
  readonly newUi: boolean;
  readonly bannerOpen: boolean;
  readonly calendarOpen: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  newUi: false,
  bannerOpen: false,
  calendarOpen: false,
};

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

// 設定は後方互換のため「欠けていれば既定値」で読む（isDashboardData のような
// 全か無かの検証にすると、フィールド追加のたびに既存ユーザーの設定が消えるため）
export function parseUiPreferences(value: unknown): UiPreferences {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_UI_PREFERENCES;
  }
  const o = value as Record<string, unknown>;
  return {
    newUi: boolOr(o["newUi"], DEFAULT_UI_PREFERENCES.newUi),
    bannerOpen: boolOr(o["bannerOpen"], DEFAULT_UI_PREFERENCES.bannerOpen),
    calendarOpen: boolOr(o["calendarOpen"], DEFAULT_UI_PREFERENCES.calendarOpen),
  };
}
