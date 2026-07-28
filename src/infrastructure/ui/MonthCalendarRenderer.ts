import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
// カレンダーの組み立ては純粋な表示モデルなので、ダッシュボードと同じものを使う
// （面ごとに別実装にすると、週の区切りや状態判定がずれる）
import { buildMiniBars, buildMonthCalendar } from "../../dashboard/lib/calendar";
import type { CalendarDay, CalendarDayState, CalendarWeek } from "../../dashboard/lib/calendar";
import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { el, append } from "./dom";
import { COLOR, KOT_FONT, TABULAR } from "./theme";
import { KOTDIFF_CALENDAR_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";

// 1-D: 注入カードの下に置く月カレンダー。既定はたたんだ状態。

export interface MonthCalendarHandle {
  readonly element: HTMLDivElement;
  // 表をたたんだときはカレンダーが主役になるので展開して見せる
  setOpen(open: boolean): void;
}

const SCALE_MIN = 5;
const SCALE_SPAN = 24;
const GUIDE_HOURS = [12, 18, 24];

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
    return "#e05c55";
  }
  if (weekday === 6) {
    return "#4b74c4";
  }
  return COLOR.textTertiary;
}

function cellSurface(day: CalendarDay): string {
  const diff = day.diff ?? 0;
  if (day.state === "over") {
    return `background-color:${diff >= 1.5 ? "#c8e6c9" : "#e8f5e9"}; border:1px solid #a5d6a7`;
  }
  if (day.state === "under") {
    return `background-color:${diff <= -1.5 ? "#ffcdd2" : "#ffebee"}; border:1px solid #ef9a9a`;
  }
  if (day.state === "attention") {
    return `background-color:${COLOR.attentionSurface}; border:1px solid ${COLOR.attentionBorder}`;
  }
  if (day.state === "holiday") {
    return "background-color:#fafafa; border:1px solid #eceff1";
  }
  // これからの稼働日は「まだ何も起きていない」ことが伝わるよう破線にする
  return "background-color:#fff; border:1px dashed #cfd8dc";
}

function valueColor(day: CalendarDay): string {
  if (day.state === "over") {
    return "#2e7d32";
  }
  if (day.state === "under") {
    return COLOR.danger;
  }
  if (day.state === "attention") {
    return COLOR.attention;
  }
  return COLOR.textFaint;
}

function miniTimeline(day: CalendarDay): HTMLElement {
  const track = el(
    "div",
    "position:relative; height:6px; border-radius:3px; background-color:#fff; border:1px solid #edf1f1; overflow:hidden",
  );
  for (const hour of GUIDE_HOURS) {
    track.append(
      el(
        "div",
        `position:absolute; top:0; bottom:0; width:1px; background-color:#f0f3f3; left:${((hour - SCALE_MIN) / SCALE_SPAN) * 100}%`,
      ),
    );
  }
  for (const segment of day.segments) {
    const left = Math.max(0, ((segment.startHour - SCALE_MIN) / SCALE_SPAN) * 100);
    const right = Math.min(100, ((segment.endHour - SCALE_MIN) / SCALE_SPAN) * 100);
    const bar = el(
      "div",
      `position:absolute; top:0; height:100%; background-color:${segment.type === "work" ? COLOR.work : COLOR.rest}; left:${left}%; width:${Math.max(0, right - left)}%`,
    );
    bar.title = `${segment.type === "work" ? "稼働" : "休憩"}: ${segment.startLabel} 〜 ${segment.endLabel}（${segment.durationLabel}）`;
    track.append(bar);
  }
  return track;
}

function dayCell(day: CalendarDay, paceLabel: string | null): HTMLElement {
  const cell = el(
    "div",
    `border-radius:7px; padding:7px 9px 8px; min-height:84px; display:flex; flex-direction:column; gap:6px; ${cellSurface(day)}`,
  );

  const head = el(
    "div",
    "display:flex; align-items:baseline; justify-content:space-between; gap:4px",
  );
  append(
    head,
    el(
      "span",
      `font-size:11px; font-weight:700; ${TABULAR}; color:${weekdayColor(day.weekday)}`,
      String(day.day),
    ),
  );
  if (day.isToday) {
    head.append(
      el(
        "span",
        `font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; background-color:${COLOR.accent}; color:#fff`,
        "今日",
      ),
    );
  }
  head.append(
    el(
      "span",
      `font-size:14px; font-weight:900; ${TABULAR}; letter-spacing:-.01em; color:${valueColor(day)}`,
      day.diff === null ? "—" : formatDiff(day.diff),
    ),
  );

  const attendance = el(
    "div",
    "display:flex; align-items:baseline; justify-content:space-between; gap:6px; font-size:10px; line-height:1.5",
  );
  const range =
    day.startTime === null || day.startTime === "" ? "" : `${day.startTime} – ${day.endTime ?? ""}`;
  append(
    attendance,
    el("span", `color:#8c9ea3; ${TABULAR}`, range),
    el(
      "span",
      `color:${COLOR.textTertiary}; font-weight:700; ${TABULAR}`,
      day.actual === null ? "" : formatHM(day.actual),
    ),
  );

  const footer = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; gap:6px; font-size:10px; color:${COLOR.textFaint}; line-height:1.5`,
  );
  append(
    footer,
    el("span", "", day.breakTime === null ? "" : `休憩 ${formatHM(day.breakTime)}`),
    el(
      "span",
      `color:${COLOR.textMuted}; ${TABULAR}`,
      day.state === "future" && paceLabel !== null ? paceLabel : "",
    ),
  );

  return append(cell, head, miniTimeline(day), attendance, footer);
}

function weekTotalCell(week: CalendarWeek): HTMLElement {
  const cell = el(
    "div",
    `border-radius:7px; padding:7px 10px 8px; background-color:${COLOR.surfaceSoft}; border:1px solid #e0eaea; display:flex; flex-direction:column; justify-content:center; gap:2px; text-align:right`,
  );
  return append(
    cell,
    el("span", `font-size:10px; color:${COLOR.textMuted}`, `${week.label} ・ ${week.workedDays}日`),
    el(
      "span",
      `font-size:15px; font-weight:900; ${TABULAR}; color:${COLOR.textPrimary}`,
      formatHM(week.total),
    ),
    el(
      "span",
      `font-size:12px; font-weight:700; ${TABULAR}; color:${week.diff < 0 ? COLOR.danger : "#2e7d32"}`,
      formatDiff(week.diff),
    ),
  );
}

function renderExpanded(weeks: readonly CalendarWeek[], paceLabel: string | null): HTMLElement {
  const grid = el(
    "div",
    "display:grid; grid-template-columns:repeat(7, 1fr) 104px; gap:7px; margin-top:14px",
  );
  for (const [index, label] of WEEKDAY_LABELS.entries()) {
    grid.append(
      el(
        "span",
        `font-size:11px; font-weight:700; text-align:center; color:${weekdayColor(index)}`,
        label,
      ),
    );
  }
  grid.append(
    el(
      "span",
      `font-size:11px; font-weight:700; text-align:right; color:${COLOR.textMuted}`,
      "週合計",
    ),
  );

  for (const week of weeks) {
    for (const cell of week.cells) {
      grid.append(cell === null ? el("div") : dayCell(cell, paceLabel));
    }
    grid.append(weekTotalCell(week));
  }
  return grid;
}

function swatch(style: string, text: string): HTMLElement {
  return append(
    el("span", "display:flex; align-items:center; gap:5px"),
    el("span", style),
    el("span", "", text),
  );
}

function renderLegend(paceLabel: string | null): HTMLElement {
  const legend = el(
    "div",
    `display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-size:11px; color:#8c9ea3; padding-top:10px; margin-top:14px; border-top:1px solid ${COLOR.divider}`,
  );
  return append(
    legend,
    swatch(`width:20px; height:6px; border-radius:3px; background-color:${COLOR.work}`, "稼働"),
    swatch(`width:20px; height:6px; border-radius:3px; background-color:${COLOR.rest}`, "休憩"),
    swatch(
      "width:13px; height:13px; border-radius:3px; background-color:#c8e6c9; border:1px solid #a5d6a7",
      "+1:30 以上",
    ),
    swatch(
      "width:13px; height:13px; border-radius:3px; background-color:#ffcdd2; border:1px solid #ef9a9a",
      "-1:30 以下",
    ),
    swatch(
      "width:13px; height:13px; border-radius:3px; background-color:#fff; border:1px dashed #cfd8dc",
      paceLabel === null
        ? "これからの稼働日"
        : `これからの稼働日（薄い数字＝推奨ペース ${paceLabel}）`,
    ),
  );
}

function renderSummaryRow(
  weeks: readonly CalendarWeek[],
  open: boolean,
  savingsLabel: string,
  savingsNegative: boolean,
): HTMLElement {
  const bars = buildMiniBars(weeks);
  const row = el(
    "div",
    `display:flex; align-items:center; gap:14px; border:1px solid ${COLOR.divider}; border-radius:6px; padding:9px 14px; background-color:${COLOR.surfaceFaint}; cursor:pointer`,
  );

  const strip = el("div", "flex:1; display:flex; align-items:center; gap:2px; height:28px");
  for (const bar of bars) {
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

  const total = el("span", `font-size:11px; color:${COLOR.textTertiary}`);
  total.append(
    document.createTextNode("累計 "),
    el("b", `${TABULAR}; color:${savingsNegative ? COLOR.danger : COLOR.accent}`, savingsLabel),
  );

  return append(
    row,
    el(
      "span",
      `font-size:11px; color:${COLOR.accent}; font-weight:700`,
      open ? "▾ 今月のカレンダー" : "▸ 今月のカレンダー",
    ),
    el("span", `font-size:11px; color:${COLOR.textMuted}`, bars.at(0)?.date.slice(0, 5) ?? ""),
    strip,
    el("span", `font-size:11px; color:${COLOR.textMuted}`, bars.at(-1)?.date.slice(0, 5) ?? ""),
    total,
  );
}

export interface MonthCalendarOptions {
  readonly rows: readonly DailyRowSummary[];
  readonly now: Date;
  readonly open: boolean;
  readonly savingsLabel: string;
  readonly savingsNegative: boolean;
  readonly paceLabel: string | null;
  readonly onToggle: (open: boolean) => void;
}

export function createMonthCalendar(options: MonthCalendarOptions): MonthCalendarHandle {
  const element = document.createElement("div");
  element.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_CALENDAR_CLASS);
  element.style.cssText = `border:1px solid ${COLOR.border}; border-radius:6px; background-color:#fff; padding:16px 18px; margin-bottom:8px; font-family:${KOT_FONT}`;

  const weeks = buildMonthCalendar(options.rows, options.now);
  let { open } = options;

  const render = (): void => {
    element.textContent = "";
    const summary = renderSummaryRow(weeks, open, options.savingsLabel, options.savingsNegative);
    summary.addEventListener("click", () => {
      open = !open;
      options.onToggle(open);
      render();
    });
    element.append(summary);
    if (open) {
      element.append(renderExpanded(weeks, options.paceLabel), renderLegend(options.paceLabel));
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
