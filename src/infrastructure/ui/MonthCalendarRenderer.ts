import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
// カレンダーの組み立ては純粋な表示モデルなので、ダッシュボードと同じものを使う
// （面ごとに別実装にすると、週の区切りや状態判定がずれる）
import {
  buildMiniBars,
  buildMonthCalendar,
  countMonthDays,
  MINI_BAR_FULL_SCALE,
} from "../../dashboard/lib/calendar";
import type { CalendarDay, CalendarDayState, CalendarWeek } from "../../dashboard/lib/calendar";
import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { el, append } from "./dom";
import { COLOR, KOT_FONT, TABULAR } from "./theme";
import { KOTDIFF_CALENDAR_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";
import { toDateKey } from "../kot/KotRowActions";
import { createDayDetailPanel } from "./DayDetailPanel";
import type { RowAction } from "../kot/KotRowActions";

// 注入カードの下に置く月カレンダー。
// セルは白のまま、状態は左 3px のライン、過不足は中央基準の差分バーで見せる。
// 塗り・セル内タイムライン・休憩表示は置かない（読むものが多すぎた）。

export interface MonthCalendarHandle {
  readonly element: HTMLDivElement;
  // 表を出していないときはカレンダーが主役になるので展開して見せる
  setOpen(open: boolean): void;
}

const BAR_COLORS: Record<CalendarDayState, string> = {
  over: "#4caf50",
  under: "#e57373",
  attention: "#ef6c00",
  holiday: "#eceff1",
  future: "#eceff1",
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function weekdayColor(weekday: number): string {
  if (weekday === 0) {
    return COLOR.sunday;
  }
  if (weekday === 6) {
    return COLOR.saturday;
  }
  return COLOR.textSecondary;
}

function stateLineColor(day: CalendarDay): string {
  if (day.state === "over") {
    return COLOR.overText;
  }
  if (day.state === "under") {
    return COLOR.danger;
  }
  return COLOR.attention;
}

// 中央を 8:00 とみなし、±3:00 で片側いっぱいに振り切る
function diffBar(day: CalendarDay): HTMLElement {
  const attention = day.state === "attention";
  const track = el(
    "div",
    `position:relative; height:12px; background-color:${attention ? "#fdf1e3" : COLOR.diffTrack}; border-radius:2px`,
  );
  track.append(
    el(
      "div",
      `position:absolute; top:0; bottom:0; left:50%; width:1px; background-color:${attention ? "#e8c9a3" : COLOR.diffCenter}`,
    ),
  );

  const { diff } = day;
  if (diff !== null && Math.round(diff * 60) !== 0) {
    const ratio = Math.min(1, Math.abs(diff) / MINI_BAR_FULL_SCALE) * 50;
    track.append(
      el(
        "div",
        diff > 0
          ? `position:absolute; top:2px; bottom:2px; left:50%; width:${ratio}%; background-color:${COLOR.diffOver}; border-radius:0 2px 2px 0`
          : `position:absolute; top:2px; bottom:2px; left:${50 - ratio}%; width:${ratio}%; background-color:${COLOR.diffUnder}; border-radius:2px 0 0 2px`,
      ),
    );
  }
  return track;
}

// 日付そのものが「その日の明細」を開くハンドル。申請もパネルの中にあるので、
// セル内に別のメニューを置くと役割が重なる
function dateHandle(day: CalendarDay, interactive: boolean): HTMLElement {
  const number = el(
    "span",
    `font-size:14px; font-weight:700; color:${day.isToday ? COLOR.textPrimary : weekdayColor(day.weekday)}; ${TABULAR}`,
    String(day.day),
  );

  if (!interactive) {
    return number;
  }

  const trigger = el(
    "span",
    `display:inline-flex; align-items:center; gap:5px; margin:-4px -7px; padding:4px 7px; border-radius:5px; cursor:pointer`,
  );
  trigger.append(number, el("span", `font-size:11px; color:${COLOR.accent}`, "▾"));
  trigger.title = "この日の明細と申請";
  trigger.tabIndex = 0;
  trigger.setAttribute("aria-haspopup", "true");
  trigger.addEventListener("mouseenter", () => {
    trigger.style.backgroundColor = COLOR.handleHover;
  });
  trigger.addEventListener("mouseleave", () => {
    trigger.style.backgroundColor = "";
  });
  return trigger;
}

function offDayCell(day: CalendarDay): HTMLElement {
  const cell = el(
    "div",
    `min-height:112px; padding:13px 14px; border-radius:8px; background-color:#fafbfb`,
  );
  cell.append(
    el(
      "span",
      `font-size:14px; font-weight:700; color:${weekdayColor(day.weekday)}; ${TABULAR}`,
      String(day.day),
    ),
  );
  return cell;
}

function futureCell(day: CalendarDay, paceLabel: string | null): HTMLElement {
  const cell = el(
    "div",
    `min-height:112px; padding:13px 14px; border:1px dashed ${COLOR.dashedBorder}; border-radius:8px; background-color:#fff; display:flex; flex-direction:column`,
  );
  cell.append(
    el(
      "span",
      `font-size:14px; font-weight:700; color:${weekdayColor(day.weekday)}; ${TABULAR}`,
      String(day.day),
    ),
  );
  if (paceLabel !== null) {
    // 唯一意図的に薄い値。まだ起きていないことを示す
    cell.append(
      el(
        "span",
        `margin-top:auto; margin-left:auto; font-size:13px; color:${COLOR.textMuted}; ${TABULAR}`,
        paceLabel,
      ),
    );
  }
  return cell;
}

function workedCell(
  day: CalendarDay,
  actions: readonly RowAction[],
  onSelect: ((date: string) => void) | null,
): HTMLElement {
  const attention = day.state === "attention";
  const border = attention
    ? `border:1px solid ${COLOR.attentionBorder}; border-left:3px solid ${COLOR.attention}; background-color:${COLOR.attentionSurface}`
    : `border:1px solid ${COLOR.border}; border-left:3px solid ${stateLineColor(day)}; background-color:#fff`;

  const cell = el(
    "div",
    `position:relative; min-height:112px; padding:13px 14px 12px; ${border}; border-radius:8px; display:flex; flex-direction:column; gap:11px`,
  );
  if (day.isToday) {
    cell.style.border = `2px solid ${COLOR.accent}`;
  }
  if (onSelect) {
    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => {
      onSelect(day.date);
    });
  }

  const head = el(
    "div",
    "display:flex; align-items:center; justify-content:space-between; gap:6px",
  );
  const handle = dateHandle(day, true);
  head.append(handle);
  if (day.isToday) {
    head.append(
      el(
        "span",
        `font-size:12px; font-weight:700; padding:2px 7px; border-radius:9px; background-color:${COLOR.accent}; color:#fff`,
        "今日",
      ),
    );
  }

  // 打刻漏れ・勤務中はダッシュを出さず、何が起きているかを言葉で書く
  if (attention) {
    head.append(
      el(
        "span",
        `font-size:13px; font-weight:800; color:${day.isToday ? COLOR.accent : COLOR.attentionStrong}`,
        day.isToday ? "勤務中" : "打刻漏れ",
      ),
    );
  } else {
    head.append(
      el(
        "span",
        `font-size:20px; font-weight:800; ${TABULAR}; letter-spacing:-.02em; color:${day.diff !== null && day.diff < 0 ? COLOR.danger : COLOR.overText}`,
        day.diff === null ? "—" : formatDiff(day.diff),
      ),
    );
  }

  const footer = attention
    ? el(
        "div",
        `font-size:12px; color:${COLOR.attentionStrong}; ${TABULAR}`,
        day.startTime === null || day.startTime === ""
          ? "打刻なし"
          : `${day.startTime}– ${day.isToday ? "勤務中" : "退勤なし"}`,
      )
    : append(
        el("div", "display:flex; align-items:baseline; justify-content:space-between; gap:6px"),
        el(
          "span",
          `font-size:12px; color:${COLOR.textQuaternary}; ${TABULAR}`,
          day.startTime === null || day.startTime === ""
            ? ""
            : `${day.startTime}–${day.endTime ?? ""}`,
        ),
        el(
          "b",
          `font-size:13px; color:${COLOR.textPrimary}; ${TABULAR}`,
          day.actual === null ? "" : formatHM(day.actual),
        ),
      );

  append(cell, head, diffBar(day), footer);

  // セルから外した情報（帯・休憩の内訳・所定との差）と申請は日付を押すと出る
  const detail = createDayDetailPanel(day, actions, onSelect);
  cell.append(detail.element);
  detail.attach(handle);
  return cell;
}

function dayCell(
  day: CalendarDay,
  paceLabel: string | null,
  actions: readonly RowAction[],
  onSelect: ((date: string) => void) | null,
): HTMLElement {
  if (day.state === "holiday") {
    return offDayCell(day);
  }
  if (day.state === "future") {
    return futureCell(day, paceLabel);
  }
  return workedCell(day, actions, onSelect);
}

function weekTotalCell(week: CalendarWeek): HTMLElement {
  const cell = el(
    "div",
    `border-radius:8px; padding:13px 14px; background-color:${COLOR.surfaceSoft}; border:1px solid #e0eaea; display:flex; flex-direction:column; justify-content:center; gap:4px; text-align:right`,
  );
  if (week.workedDays === 0) {
    // 0:00 / +0:00 を並べても読むものが無い
    return append(
      cell,
      el("span", `font-size:12px; color:${COLOR.textQuaternary}`, `${week.label} ・ 未稼働`),
      el(
        "span",
        `font-size:19px; font-weight:900; color:${COLOR.textQuaternary}; ${TABULAR}`,
        "0:00",
      ),
    );
  }
  return append(
    cell,
    el(
      "span",
      `font-size:12px; color:${COLOR.textQuaternary}`,
      `${week.label} ・ ${week.workedDays}日`,
    ),
    el(
      "span",
      `font-size:19px; font-weight:900; ${TABULAR}; color:${COLOR.textPrimary}`,
      formatHM(week.total),
    ),
    el(
      "span",
      `font-size:14px; font-weight:700; ${TABULAR}; color:${week.diff < 0 ? COLOR.danger : COLOR.overText}`,
      formatDiff(week.diff),
    ),
  );
}

interface GridOptions {
  readonly weeks: readonly CalendarWeek[];
  readonly paceLabel: string | null;
  readonly actions: ReadonlyMap<string, readonly RowAction[]>;
  readonly onSelectDate: ((date: string) => void) | null;
  readonly weekTotal: boolean;
}

function renderGrid(options: GridOptions): HTMLElement {
  const columns = options.weekTotal ? "repeat(7, 1fr) 132px" : "repeat(7, 1fr)";
  const grid = el("div", `display:grid; grid-template-columns:${columns}; gap:14px`);

  for (const [index, day] of WEEKDAY_LABELS.entries()) {
    grid.append(
      el(
        "span",
        `font-size:13px; font-weight:700; text-align:center; color:${weekdayColor(index)}`,
        day,
      ),
    );
  }
  if (options.weekTotal) {
    grid.append(
      el(
        "span",
        `font-size:13px; font-weight:700; text-align:right; color:${COLOR.textQuaternary}`,
        "週合計",
      ),
    );
  }

  for (const week of options.weeks) {
    for (const cell of week.cells) {
      grid.append(
        cell === null
          ? el("div")
          : dayCell(
              cell,
              options.paceLabel,
              options.actions.get(toDateKey(cell.date) ?? "") ?? [],
              options.onSelectDate,
            ),
      );
    }
    if (options.weekTotal) {
      grid.append(weekTotalCell(week));
    }
  }
  return grid;
}

function swatch(children: readonly HTMLElement[], text: string): HTMLElement {
  return append(
    el("span", "display:flex; align-items:center; gap:7px"),
    ...children,
    el("span", "", text),
  );
}

// 5 項目あった凡例を 3 つに。省いた情報の在り処は右端に一行で書く
function renderLegend(paceLabel: string | null, clickable: boolean): HTMLElement {
  const legend = el(
    "div",
    `display:flex; align-items:center; gap:26px; flex-wrap:wrap; padding-top:16px; border-top:1px solid ${COLOR.divider}; font-size:12px; color:${COLOR.textTertiary}`,
  );
  const line = (color: string): HTMLElement =>
    el("span", `width:3px; height:16px; background-color:${color}; border-radius:2px`);
  const bar = (color: string): HTMLElement =>
    el("span", `width:26px; height:10px; background-color:${color}; border-radius:2px`);

  return append(
    legend,
    swatch([line(COLOR.overText), bar(COLOR.diffOver)], "8:00 より多い"),
    swatch([line(COLOR.danger), bar(COLOR.diffUnder)], "足りない"),
    swatch(
      [
        el(
          "span",
          `width:16px; height:16px; border:1px dashed ${COLOR.dashedBorder}; border-radius:3px`,
        ),
      ],
      paceLabel === null
        ? "これからの稼働日"
        : `これからの稼働日（薄い数字＝推奨ペース ${paceLabel}）`,
    ),
    el(
      "span",
      `margin-left:auto; color:${COLOR.textQuaternary}`,
      clickable
        ? "日付をクリックで明細と申請 ／ セルをクリックで表の該当行へ"
        : "日付をクリックで明細と申請",
    ),
  );
}

interface HeadingOptions {
  readonly open: boolean;
  readonly rangeLabel: string;
  readonly daysLabel: string;
  readonly savingsLabel: string;
  readonly savingsNegative: boolean;
  readonly weekTotal: boolean;
  readonly onToggleWeekTotal: () => void;
}

function renderHeading(options: HeadingOptions): HTMLElement {
  const row = el(
    "div",
    `display:flex; align-items:center; gap:14px; flex-wrap:wrap; padding-bottom:16px; border-bottom:1px solid ${COLOR.divider}; cursor:pointer`,
  );

  const total = el("span", `font-size:13px; color:${COLOR.textTertiary}`);
  total.append(
    document.createTextNode("累計 "),
    el(
      "b",
      `font-size:15px; ${TABULAR}; color:${options.savingsNegative ? COLOR.danger : COLOR.accent}`,
      options.savingsLabel,
    ),
  );

  append(
    row,
    el(
      "span",
      `font-size:14px; font-weight:700; color:${COLOR.accent}`,
      options.open ? "▾ 今月のカレンダー" : "▸ 今月のカレンダー",
    ),
    el("span", `font-size:13px; color:${COLOR.textQuaternary}; ${TABULAR}`, options.rangeLabel),
    el("span", `font-size:13px; color:${COLOR.textTertiary}`, options.daysLabel),
    el("span", "flex:1"),
  );

  if (options.open) {
    row.append(
      el(
        "span",
        `font-size:13px; color:${COLOR.textQuaternary}`,
        "バーは 8:00 を中心に ±3:00 で振り切り",
      ),
    );
    const chip = el(
      "span",
      `padding:5px 12px; border:1px solid ${COLOR.dashedBorder}; border-radius:14px; background-color:#fff; color:${COLOR.textTertiary}; font-size:12px; cursor:pointer`,
      options.weekTotal ? "▾ 週合計" : "▸ 週合計",
    );
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      options.onToggleWeekTotal();
    });
    row.append(chip);
  }

  row.append(total);
  return row;
}

// たたんだ状態のミニバー帯。開いている間はグリッドが同じことを描くので出さない
function renderMiniBars(weeks: readonly CalendarWeek[]): HTMLElement {
  const strip = el("div", "display:flex; align-items:center; gap:2px; height:28px");
  for (const bar of buildMiniBars(weeks)) {
    const column = el(
      "div",
      "flex:1; height:100%; display:flex; flex-direction:column; justify-content:center",
    );
    const up = el("div", "height:12px; display:flex; align-items:flex-end");
    up.append(
      el("div", `width:100%; background-color:${BAR_COLORS[bar.state]}; height:${bar.upPixels}px`),
    );
    const down = el("div", "height:12px");
    down.append(
      el(
        "div",
        `width:100%; background-color:${BAR_COLORS[bar.state]}; height:${bar.downPixels}px`,
      ),
    );
    append(column, up, el("div", "height:1px; background-color:#dde5e6"), down);
    strip.append(column);
  }
  return strip;
}

export interface MonthCalendarOptions {
  readonly rows: readonly DailyRowSummary[];
  readonly now: Date;
  readonly open: boolean;
  readonly weekTotalOpen: boolean;
  readonly savingsLabel: string;
  readonly savingsNegative: boolean;
  readonly paceLabel: string | null;
  readonly onToggle: (open: boolean) => void;
  readonly onToggleWeekTotal: (open: boolean) => void;
  // 日付ごとの申請メニュー。表を隠していても申請できるようにする
  readonly actions?: ReadonlyMap<string, readonly RowAction[]>;
  // セルクリックで表の該当行へ飛ばす。表を出していないときは渡さない
  readonly onSelectDate?: ((date: string) => void) | null;
}

export function createMonthCalendar(options: MonthCalendarOptions): MonthCalendarHandle {
  const element = document.createElement("div");
  element.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_CALENDAR_CLASS);
  element.style.cssText = `border:1px solid ${COLOR.border}; border-radius:6px; background-color:#fff; padding:22px 24px 24px; margin-bottom:8px; font-family:${KOT_FONT}; display:flex; flex-direction:column; gap:18px`;

  const weeks = buildMonthCalendar(options.rows, options.now);
  const bars = buildMiniBars(weeks);
  const rangeLabel =
    bars.length === 0
      ? ""
      : `${bars.at(0)?.date.slice(0, 5) ?? ""} – ${bars.at(-1)?.date.slice(0, 5) ?? ""}`;

  const counts = countMonthDays(options.rows);
  const daysLabel = `稼働 ${counts.workDays}日 ・ 休み ${counts.offDays}日`;

  let { open } = options;
  let weekTotal = options.weekTotalOpen;

  const render = (): void => {
    element.textContent = "";
    const heading = renderHeading({
      open,
      rangeLabel,
      daysLabel,
      savingsLabel: options.savingsLabel,
      savingsNegative: options.savingsNegative,
      weekTotal,
      onToggleWeekTotal: () => {
        weekTotal = !weekTotal;
        options.onToggleWeekTotal(weekTotal);
        render();
      },
    });
    heading.addEventListener("click", () => {
      open = !open;
      options.onToggle(open);
      render();
    });
    element.append(heading);

    if (open) {
      element.append(
        renderGrid({
          weeks,
          paceLabel: options.paceLabel,
          actions: options.actions ?? new Map(),
          onSelectDate: options.onSelectDate ?? null,
          weekTotal,
        }),
        renderLegend(options.paceLabel, Boolean(options.onSelectDate)),
      );
    } else {
      element.append(renderMiniBars(weeks));
    }
  };

  render();
  return {
    element,
    setOpen(next: boolean): void {
      if (next === open) {
        return;
      }
      open = next;
      render();
    },
  };
}
