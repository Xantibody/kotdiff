import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
import { isBreakSufficient, requiredBreakFor } from "../../domain/services/BreakSufficiencyService";
import type { CalendarDay } from "../../dashboard/lib/calendar";
import type { RowAction } from "../kot/KotRowActions";
import { triggerRowAction } from "../kot/KotRowActions";
import { el, append } from "./dom";
import { COLOR, TABULAR } from "./theme";

// カレンダーのセルから外した情報（稼働・休憩の帯 / 休憩の内訳 / 所定との差）の置き場。
// セルに全部載せると読むものが多すぎるので、要るときだけホバーで出す。

const PANEL_WIDTH = 420;
// 実測できない環境（レイアウト前）の保険。実際の高さはだいたいこのくらい
const FALLBACK_PANEL_HEIGHT = 360;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

// 既存 TimelineBar と同じ 5:00〜翌 5:00 の座標系
const SCALE_MIN = 5;
const SCALE_SPAN = 24;

export interface DayDetailHandle {
  readonly element: HTMLElement;
  // 日付そのものを押したときに開く。開くのはいつもひとつだけ
  attach(trigger: HTMLElement): void;
}

let closeOpenPanel: (() => void) | null = null;

function toPercent(hour: number): number {
  return ((hour - SCALE_MIN) / SCALE_SPAN) * 100;
}

function shape(day: CalendarDay): HTMLElement {
  const track = el(
    "div",
    `position:relative; height:18px; border-radius:3px; background-color:${COLOR.diffTrack}; border:1px solid #edf1f1; overflow:hidden`,
  );
  for (const segment of day.segments) {
    const left = Math.max(0, toPercent(segment.startHour));
    const right = Math.min(100, toPercent(segment.endHour));
    track.append(
      el(
        "div",
        `position:absolute; top:0; bottom:0; background-color:${segment.type === "work" ? COLOR.work : COLOR.rest}; left:${left}%; width:${Math.max(0, right - left)}%`,
      ),
    );
  }

  const axis = el(
    "div",
    `position:relative; height:16px; font-size:12px; color:${COLOR.textQuaternary}`,
  );
  append(
    axis,
    el("span", `position:absolute; left:0; ${TABULAR}`, "5:00"),
    el(
      "span",
      `position:absolute; left:${toPercent(12)}%; transform:translateX(-50%); ${TABULAR}`,
      "12:00",
    ),
    el(
      "span",
      `position:absolute; left:${toPercent(18)}%; transform:translateX(-50%); ${TABULAR}`,
      "18:00",
    ),
    el("span", `position:absolute; right:0; ${TABULAR}`, "翌5:00"),
  );

  return append(
    el("div", "padding:18px; display:flex; flex-direction:column; gap:9px"),
    el(
      "span",
      `font-size:12px; font-weight:700; letter-spacing:.08em; color:${COLOR.textQuaternary}`,
      "働いた形",
    ),
    track,
    axis,
  );
}

function detailRow(name: string, main: string, sub: string | null, warn = false): HTMLElement {
  const row = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:9px 0; border-top:1px solid ${COLOR.divider}; font-size:13px`,
  );
  const amount = el("b", `color:${warn ? COLOR.danger : COLOR.textPrimary}; ${TABULAR}`, main);
  if (sub !== null) {
    amount.append(el("span", `font-weight:400; color:${COLOR.textQuaternary}`, ` / ${sub}`));
  }
  return append(row, el("span", `color:${COLOR.textSecondary}`, name), amount);
}

function breakPairs(day: CalendarDay): string {
  const pairs: string[] = [];
  for (const [index, start] of day.breakStarts.entries()) {
    pairs.push(`${start}–${day.breakEnds[index] ?? ""}`);
  }
  return pairs.join(" ／ ");
}

function details(day: CalendarDay): HTMLElement {
  const box = el("div", "padding:0 18px 18px; display:flex; flex-direction:column");

  box.append(
    detailRow(
      "出勤 – 退勤",
      day.startTime === null || day.startTime === ""
        ? "打刻なし"
        : `${day.startTime} – ${day.endTime ?? "（退勤なし）"}`,
      null,
    ),
  );

  if (day.breakStarts.length > 0) {
    box.append(detailRow(`休憩 ${day.breakStarts.length}回`, breakPairs(day), null));
  }

  if (day.actual !== null) {
    // 労基法 34 条に足りない日はここで警告する
    const enough = isBreakSufficient(day.actual, day.breakTime ?? 0);
    box.append(
      detailRow(
        "休憩 合計",
        formatHM(day.breakTime ?? 0),
        enough ? null : `必要 ${formatHM(requiredBreakFor(day.actual))}`,
        !enough,
      ),
      // 差分は 8:00 基準、KOT の所定はシフトの値。食い違うので両方を並べる
      detailRow(
        "実働 / 所定",
        formatHM(day.actual),
        day.fixedWork === null ? null : formatHM(day.fixedWork),
      ),
    );
  }

  if (day.nightOvertime !== null && day.nightOvertime > 0) {
    box.append(detailRow("深夜 所定", formatHM(day.nightOvertime), null));
  }

  return box;
}

function clamp(value: number, max: number): number {
  return Math.min(
    Math.max(VIEWPORT_MARGIN, value),
    Math.max(VIEWPORT_MARGIN, max - VIEWPORT_MARGIN),
  );
}

function footer(
  actions: readonly RowAction[],
  close: () => void,
  onSelect: (() => void) | null,
): HTMLElement {
  const row = el(
    "div",
    `padding:12px 18px 14px; border-top:1px solid ${COLOR.divider}; background-color:${COLOR.surfaceSoft}; display:flex; align-items:center; gap:10px; flex-wrap:wrap`,
  );
  row.append(el("span", `font-size:12px; color:${COLOR.textTertiary}`, "申請"));
  for (const action of actions) {
    const button = el(
      "button",
      `padding:6px 13px; border:1px solid ${COLOR.cardBorder}; border-radius:3px; background-color:#fff; color:${COLOR.accent}; font-size:12px; cursor:pointer`,
      action.label,
    );
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      triggerRowAction(action.targetId);
    });
    row.append(button);
  }
  if (onSelect) {
    const jump = el(
      "button",
      `margin-left:auto; padding:6px 13px; border:1px solid ${COLOR.cardBorder}; border-radius:3px; background-color:#fff; color:${COLOR.textTertiary}; font-size:12px; cursor:pointer`,
      "表の該当行へ",
    );
    jump.type = "button";
    jump.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      onSelect();
    });
    row.append(jump);
  }
  return row;
}

export function createDayDetailPanel(
  day: CalendarDay,
  actions: readonly RowAction[],
  onSelectDate: ((date: string) => void) | null = null,
): DayDetailHandle {
  // position:fixed で出す。KOT の .htBlock-box は overflow:hidden なので、
  // セルを起点にした absolute だとパネルの上側が切り取られてしまう
  const panel = el(
    "div",
    `position:fixed; top:0; left:0; z-index:2147483000; display:none; width:${PANEL_WIDTH}px; border:1px solid ${COLOR.cardBorder}; border-radius:8px; background-color:#fff; box-shadow:0 8px 24px rgba(27,42,46,.16); overflow:hidden; text-align:left; cursor:default`,
  );

  const head = el(
    "div",
    `padding:14px 18px; border-bottom:1px solid ${COLOR.divider}; background-color:${COLOR.surfaceSoft}; display:flex; align-items:baseline; gap:10px`,
  );
  append(
    head,
    el("b", `font-size:15px; color:${COLOR.textPrimary}`, day.date),
    el("span", `font-size:12px; color:${COLOR.textTertiary}`, day.schedule ?? ""),
    el("span", "flex:1"),
    el(
      "span",
      `font-size:15px; font-weight:800; ${TABULAR}; color:${day.diff !== null && day.diff < 0 ? COLOR.danger : COLOR.overText}`,
      day.diff === null ? "" : formatDiff(day.diff),
    ),
  );

  const close = (): void => {
    panel.style.display = "none";
  };

  panel.append(head, shape(day), details(day));
  if (actions.length > 0 || onSelectDate !== null) {
    panel.append(
      footer(
        actions,
        close,
        onSelectDate === null
          ? null
          : () => {
              onSelectDate(day.date);
            },
      ),
    );
  }
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // セルは画面の端にも並ぶ。はみ出す側と反対に開き、それでも収まらなければ画面内に寄せる
  const place = (trigger: HTMLElement): void => {
    const rect = trigger.getBoundingClientRect();
    const height = panel.offsetHeight > 0 ? panel.offsetHeight : FALLBACK_PANEL_HEIGHT;

    let top = rect.bottom + GAP;
    if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = rect.top - GAP - height;
    }
    top = clamp(top, window.innerHeight - height);

    let { left } = rect;
    if (left + PANEL_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = rect.right - PANEL_WIDTH;
    }
    left = clamp(left, window.innerWidth - PANEL_WIDTH);

    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
  };

  return {
    element: panel,
    attach(trigger: HTMLElement): void {
      const hide = (): void => {
        close();
        document.removeEventListener("click", onDocumentClick);
        document.removeEventListener("keydown", onKeyDown);
        globalThis.removeEventListener("scroll", hide);
        closeOpenPanel = null;
      };

      function onDocumentClick(event: MouseEvent): void {
        if (!panel.contains(event.target as Node) && !trigger.contains(event.target as Node)) {
          hide();
        }
      }

      function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
          hide();
        }
      }

      const show = (): void => {
        closeOpenPanel?.();
        panel.style.display = "block";
        place(trigger);
        document.addEventListener("click", onDocumentClick);
        document.addEventListener("keydown", onKeyDown);
        // fixed なのでスクロールすると位置がずれる。開いたまま流さず閉じる
        globalThis.addEventListener("scroll", hide, { passive: true });
        closeOpenPanel = hide;
      };

      trigger.addEventListener("click", (event) => {
        // セル本体のクリック（表の該当行へ）とは分ける
        event.stopPropagation();
        if (panel.style.display === "none") {
          show();
        } else {
          hide();
        }
      });
      // ポインタが無い環境でも開けるようキーボードのフォーカスにも反応する
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          show();
        }
      });
    },
  };
}
