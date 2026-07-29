// 見やすさ改修 (v2 UI) の切り替えと、注入 UI の表示状態。
// 新 UI はオプトイン（既定 false）で、ダッシュボードのトグルから有効化する。
export interface UiPreferences {
  readonly newUi: boolean;
  readonly bannerOpen: boolean;
  readonly calendarOpen: boolean;
  // KOT ページのどの部分を出すか。既定はすべて非表示で、拡張の表示だけを見せる。
  // 28 列の表も月次集計も、同じ情報を注入カードとカレンダーが持っているため
  readonly showTable: boolean;
  readonly showMonthlySummary: boolean;
  // 申請・勤怠確認状況・タイムカード・EXCEL 出力が並ぶツールバー。
  // 申請はカレンダーの各日から出せるので既定では隠す
  readonly showToolbar: boolean;
  // カレンダーの週合計列。7 列を広く使うため既定では隠す
  readonly weekTotalOpen: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  newUi: false,
  bannerOpen: false,
  calendarOpen: false,
  showTable: false,
  showMonthlySummary: false,
  showToolbar: false,
  weekTotalOpen: false,
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
  // showTable の前は tableCollapsed（表を隠すか）で持っていた
  const legacyShowTable =
    typeof o["tableCollapsed"] === "boolean"
      ? !o["tableCollapsed"]
      : DEFAULT_UI_PREFERENCES.showTable;

  return {
    newUi: boolOr(o["newUi"], DEFAULT_UI_PREFERENCES.newUi),
    bannerOpen: boolOr(o["bannerOpen"], DEFAULT_UI_PREFERENCES.bannerOpen),
    calendarOpen: boolOr(o["calendarOpen"], DEFAULT_UI_PREFERENCES.calendarOpen),
    showTable: boolOr(o["showTable"], legacyShowTable),
    showMonthlySummary: boolOr(o["showMonthlySummary"], DEFAULT_UI_PREFERENCES.showMonthlySummary),
    showToolbar: boolOr(o["showToolbar"], DEFAULT_UI_PREFERENCES.showToolbar),
    weekTotalOpen: boolOr(o["weekTotalOpen"], DEFAULT_UI_PREFERENCES.weekTotalOpen),
  };
}
