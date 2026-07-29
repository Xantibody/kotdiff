import type { DailyRowSummary } from "../domain/aggregates/WorkMonth";
import type { SummaryModel } from "./SummaryModel";
import type { UiPreferences } from "../preferences";
import type { RowAction } from "../infrastructure/kot/KotRowActions";
import {
  findDateHeading,
  findRowByDate,
  revealRow,
  setDailyHeadingHidden,
  setElementHidden,
  setMonthlySummaryHidden,
  setToolbarHidden,
} from "../infrastructure/kot/KotSections";
import { toDateKey } from "../infrastructure/kot/KotRowActions";
import { createSummaryCard } from "../infrastructure/ui/SummaryCardRenderer";
import type { SummaryCardHandle } from "../infrastructure/ui/SummaryCardRenderer";
import { createMonthCalendar } from "../infrastructure/ui/MonthCalendarRenderer";
import { createActionsRow } from "../infrastructure/ui/ActionsRowRenderer";
import { COLOR, KOT_FONT } from "../infrastructure/ui/theme";
import { createDisplayMenu, hiddenSummary } from "../infrastructure/ui/DisplayMenuRenderer";

function createHiddenSummary(prefs: UiPreferences): HTMLElement {
  const span = document.createElement("span");
  span.style.cssText = `font-size:12px; color:${COLOR.textTertiary}; font-family:${KOT_FONT}`;
  span.textContent = hiddenSummary(prefs);
  return span;
}

// v2 UI の組み立て。表の上に カード → カレンダー → 操作行 を積み、
// KOT ページ側のどこを出すかを設定に従って切り替える。

export interface V2UiOptions {
  readonly table: HTMLTableElement;
  readonly model: SummaryModel;
  readonly rows: readonly DailyRowSummary[];
  // 日付ごとの申請メニュー。表をたたんでもカレンダーから申請できるようにする
  readonly actions: ReadonlyMap<string, readonly RowAction[]>;
  readonly preferences: UiPreferences;
  readonly save: (next: UiPreferences) => void;
}

// v2 の表の上に積む要素をまとめて作る: カード → カレンダー → 操作行 → 表
export function injectV2Ui(options: V2UiOptions): SummaryCardHandle {
  const { table, model, rows } = options;
  const rowActions = options.actions;
  let prefs = options.preferences;
  const update = (patch: Partial<UiPreferences>): void => {
    prefs = { ...prefs, ...patch };
    options.save(prefs);
  };

  const card = createSummaryCard(model, prefs.bannerOpen, (open) => {
    update({ bannerOpen: open });
  });
  table.parentElement?.insertBefore(card.element, table);

  // 表を出しているときだけ、セルクリックで該当行へ飛ばせる
  const selectDate = prefs.showTable
    ? (date: string): void => {
        const row = findRowByDate(table, toDateKey(date) ?? "");
        if (row) {
          revealRow(row);
        }
      }
    : null;

  const calendar = createMonthCalendar({
    rows,
    actions: rowActions,
    onSelectDate: selectDate,
    now: new Date(),
    // 表を出していない間はカレンダーが主役なので開いた状態で出す
    open: prefs.calendarOpen || !prefs.showTable,
    weekTotalOpen: prefs.weekTotalOpen,
    savingsLabel: model.month.savingsLabel,
    savingsNegative: model.month.savingsNegative,
    paceLabel: model.outlook.paceLabel,
    onToggle: (open) => {
      update({ calendarOpen: open });
    },
    onToggleWeekTotal: (weekTotalOpen) => {
      update({ weekTotalOpen });
    },
  });
  table.parentElement?.insertBefore(calendar.element, table);

  // KOT ページのどこを出すかは設定で決まる。既定はすべて隠して拡張の表示だけを見せる
  const applyKotVisibility = (): void => {
    setElementHidden(table, !prefs.showTable);
    setDailyHeadingHidden(!prefs.showTable);
    setMonthlySummaryHidden(table, !prefs.showMonthlySummary);
    setToolbarHidden(!prefs.showToolbar);
    if (!prefs.showTable) {
      // 表が無いぶんカレンダーが主役になる
      calendar.setOpen(true);
    }
  };

  const onDisplayChange = (
    key: "showTable" | "showMonthlySummary" | "showToolbar",
    show: boolean,
  ): void => {
    update({ [key]: show });
    applyKotVisibility();
    summary.textContent = hiddenSummary(prefs);
  };

  const actions = createActionsRow();
  actions.append(createDisplayMenu(prefs, onDisplayChange));
  table.parentElement?.insertBefore(actions, table);

  // 既定でほとんど隠れているので、戻す手段が画面下端だけだと気づけない。
  // 期間の見出しの右端にも同じメニューを置く
  const summary = createHiddenSummary(prefs);
  const heading = findDateHeading();
  if (heading) {
    const row = createActionsRow();
    row.style.marginTop = "8px";
    row.append(summary, createDisplayMenu(prefs, onDisplayChange));
    heading.after(row);
  }

  applyKotVisibility();

  return card;
}
