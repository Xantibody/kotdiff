import type { SummaryModel, TodayModel } from "../../application/SummaryModel";
import { el, append } from "./dom";
import { COLOR, KOT_FONT, TABULAR } from "./theme";
import { KOTDIFF_CARD_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";

// 7a の注入カード。たたんだ状態 (30px・sticky) と開いた状態の 2 形態を持つ。
// 開閉のたびに作り直すのは、KOT 側のテーブル再描画で部分更新が壊れやすく、
// 30 秒ごとの再計算でもどうせ全面更新になるため。

export interface SummaryCardHandle {
  readonly element: HTMLDivElement;
  update(model: SummaryModel): void;
}

const CARD_FRAME = `border:1px solid ${COLOR.cardBorder}; border-left:3px solid ${COLOR.accent}; border-radius:3px; background-color:#fff; overflow:hidden; font-family:${KOT_FONT}; margin-bottom:8px`;

function isWorking(today: TodayModel): boolean {
  return today.state === "working" || today.state === "onBreak";
}

function caret(open: boolean): HTMLElement {
  return el(
    "span",
    `width:26px; display:flex; align-items:center; justify-content:center; color:${COLOR.accent}; font-size:11px`,
    open ? "▾" : "▸",
  );
}

function segment(...children: readonly HTMLElement[]): HTMLElement {
  return append(
    el(
      "span",
      `padding:0 12px; display:flex; align-items:center; gap:7px; border-left:1px solid ${COLOR.divider}`,
    ),
    ...children,
  );
}

function label(text: string, color: string = COLOR.textMuted): HTMLElement {
  return el("span", `color:${color}`, text);
}

function value(text: string, style = ""): HTMLElement {
  return el("b", `color:${COLOR.textPrimary}; ${TABULAR}; ${style}`, text);
}

function bar(widthPercent: number, trackStyle: string, fillColor: string): HTMLElement {
  const track = el("span", `${trackStyle}; overflow:hidden; display:block`);
  track.append(
    el("span", `display:block; height:100%; background-color:${fillColor}; width:${widthPercent}%`),
  );
  return track;
}

function collapsedSegments(model: SummaryModel): HTMLElement[] {
  const { today, month, outlook } = model;

  if (!isWorking(today)) {
    return [
      segment(
        label("今月あと", COLOR.textTertiary),
        value(`${month.remainingDays}日 × ${month.avgPerDayLabel}`, `font-size:15px`),
        label("で ±0", COLOR.textTertiary),
      ),
      segment(
        label("時間貯金"),
        value(
          month.savingsLabel,
          `color:${month.savingsNegative ? COLOR.danger : COLOR.accent}; font-weight:700`,
        ),
      ),
      segment(label("今月"), value(outlook.forecast.label)),
    ];
  }

  return [
    segment(
      label("あと", COLOR.textTertiary),
      value(
        today.remainingLabel,
        `font-size:15px; color:${COLOR.accent}; font-weight:700; letter-spacing:-.01em`,
      ),
      label("で貯金 ±0", COLOR.textTertiary),
    ),
    segment(label("退勤目安"), value(today.leaveAtLabel ?? "—")),
    segment(label("実労働"), value(today.netLabel), label(`/ ${today.needLabel}`, COLOR.textFaint)),
    segment(label("今月"), value(outlook.forecast.label)),
  ];
}

function renderCollapsed(model: SummaryModel): HTMLElement[] {
  const percent = isWorking(model.today)
    ? model.today.todayDonePercent
    : model.month.progressPercent;

  const gauge = append(
    el(
      "span",
      `padding:0 14px; display:flex; align-items:center; gap:9px; border-left:1px solid ${COLOR.divider}; background-color:${COLOR.surfaceSoft}`,
    ),
    bar(
      percent,
      `width:110px; height:6px; border-radius:3px; background-color:${COLOR.accentTrack}`,
      COLOR.accent,
    ),
    el("span", `color:${COLOR.textTertiary}; ${TABULAR}`, `${Math.round(percent)}%`),
  );

  // 打刻漏れはたたんだ状態でも見えないと埋もれるので、spacer の前に出す
  const [firstAlert, ...restAlerts] = model.alerts;
  const alert =
    firstAlert === undefined
      ? []
      : [
          segment(
            label(
              restAlerts.length === 0 ? firstAlert : `${firstAlert} 他 ${restAlerts.length}件`,
              COLOR.attention,
            ),
          ),
        ];

  return [
    caret(false),
    ...collapsedSegments(model),
    ...alert,
    el("span", `flex:1; border-left:1px solid ${COLOR.divider}`),
    gauge,
  ];
}

function renderHeader(model: SummaryModel): HTMLElement {
  const header = el(
    "div",
    `height:32px; display:flex; align-items:center; gap:10px; padding:0 14px; border-bottom:1px solid ${COLOR.divider}; font-size:12px; background-color:${COLOR.surfaceSoft}`,
  );
  return append(
    header,
    caret(true),
    el(
      "b",
      `color:${COLOR.textPrimary}; font-size:13px`,
      `本日 ${model.today.dateLabel} ${model.today.stateLabel}`,
    ),
    label(`${model.today.nowLabel} 時点 ・ 30 秒ごとに更新`),
    el("span", "flex:1"),
    label("たたむ", COLOR.textTertiary),
  );
}

function renderRemainingZone(model: SummaryModel): HTMLElement {
  const zone = el(
    "div",
    "width:250px; padding:18px 22px; display:flex; flex-direction:column; gap:4px",
  );
  const heading = el(
    "span",
    `font-size:11px; font-weight:700; letter-spacing:.1em; color:${COLOR.accent}`,
  );

  if (!isWorking(model.today)) {
    heading.textContent = "今月 あと これだけ";
    return append(
      zone,
      heading,
      el(
        "span",
        `font-size:40px; line-height:1.05; font-weight:900; color:${COLOR.accent}; ${TABULAR}; letter-spacing:-.02em`,
        model.month.remainingRequiredLabel,
      ),
      el(
        "span",
        `font-size:13px; color:${COLOR.textSecondary}; line-height:1.7`,
        `残り ${model.month.remainingDays}日 ・ 1日 ${model.month.avgPerDayLabel} で ±0`,
      ),
    );
  }

  heading.textContent = "あと これだけ";
  const leave = el("span", `font-size:13px; color:${COLOR.textSecondary}; line-height:1.7`);
  leave.append(
    document.createTextNode("退勤目安 "),
    el(
      "b",
      `font-size:15px; color:${COLOR.textPrimary}; ${TABULAR}`,
      model.today.leaveAtLabel ?? "—",
    ),
    el("br"),
    el("span", `color:${COLOR.textMuted}; font-size:12px`, "これ以上休憩を取らない場合"),
  );

  return append(
    zone,
    heading,
    el(
      "span",
      `font-size:40px; line-height:1.05; font-weight:900; color:${COLOR.accent}; ${TABULAR}; letter-spacing:-.02em`,
      model.today.remainingLabel,
    ),
    leave,
  );
}

function renderProgressZone(model: SummaryModel): HTMLElement {
  const { today } = model;
  const zone = el(
    "div",
    "flex:1; min-width:320px; padding:18px 22px; display:flex; flex-direction:column; gap:9px",
  );

  const headingRow = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; font-size:12px; color:${COLOR.textTertiary}`,
  );
  const stats = el("span");
  stats.append(
    document.createTextNode("実労働 "),
    value(today.netLabel),
    document.createTextNode(" ／ 経過 "),
    el("span", TABULAR, today.elapsedLabel),
  );
  append(
    headingRow,
    el(
      "span",
      `font-size:11px; font-weight:700; letter-spacing:.1em; color:${COLOR.textMuted}`,
      "今日の進行",
    ),
    stats,
  );

  const track = el(
    "div",
    `position:relative; height:20px; border-radius:4px; background-color:${COLOR.divider}; overflow:hidden`,
  );
  track.append(
    el(
      "div",
      `position:absolute; top:0; bottom:0; left:0; background-color:${COLOR.accentSoft}; width:${today.progressPercent}%`,
    ),
  );
  for (const seg of today.breakSegments) {
    track.append(
      el(
        "div",
        `position:absolute; top:0; bottom:0; background-color:${COLOR.restBar}; left:${seg.leftPercent}%; width:${seg.widthPercent}%`,
      ),
    );
  }
  track.append(
    el(
      "div",
      `position:absolute; top:0; bottom:0; width:2px; background-color:${COLOR.accent}; left:${today.progressPercent}%`,
    ),
  );

  const ticks = el(
    "div",
    `position:relative; height:14px; font-size:10px; color:${COLOR.textMuted}`,
  );
  append(
    ticks,
    el("span", "position:absolute; left:0", `出勤 ${today.startLabel ?? "—"}`),
    el(
      "span",
      `position:absolute; left:${today.progressPercent}%; transform:translateX(-50%); color:${COLOR.accent}; font-weight:700`,
      `現在 ${today.nowLabel}`,
    ),
    el("span", "position:absolute; right:0", `目安 ${today.leaveAtLabel ?? "—"}`),
  );

  const note =
    today.breakRangeLabel === null
      ? "休憩の打刻はまだありません"
      : `オレンジ＝休憩 ${today.breakRangeLabel}（${today.breakTotalLabel}）／ 休憩中は実労働が進みません`;

  return append(
    zone,
    headingRow,
    track,
    ticks,
    el("div", `font-size:10px; color:${COLOR.textFaint}`, note),
  );
}

function metricRow(name: string, ...values: readonly HTMLElement[]): HTMLElement {
  const row = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; font-size:12px; color:${COLOR.textTertiary}`,
  );
  return append(row, el("span", "", name), ...values);
}

function renderMonthZone(model: SummaryModel): HTMLElement {
  const { month } = model;
  const zone = el(
    "div",
    "width:312px; padding:16px 22px 18px; display:flex; flex-direction:column; gap:12px",
  );

  const progress = el("div", "display:flex; flex-direction:column; gap:4px");
  append(
    progress,
    metricRow(`必須 ${month.requiredLabel} まで`, value(month.actualLabel)),
    bar(
      month.progressPercent,
      `height:10px; border-radius:5px; background-color:${COLOR.divider}`,
      COLOR.neutralStrong,
    ),
  );

  const overtime = el("span");
  overtime.append(
    value(month.overtimeLabel),
    el("span", `color:${COLOR.textFaint}`, ` / ${month.overtimeLimitLabel}`),
  );

  return append(
    zone,
    el(
      "span",
      `font-size:11px; font-weight:700; letter-spacing:.1em; color:${COLOR.textMuted}`,
      "今月",
    ),
    progress,
    metricRow(
      "時間貯金",
      value(
        month.savingsLabel,
        `font-size:15px; font-weight:700; color:${month.savingsNegative ? COLOR.danger : COLOR.accent}`,
      ),
    ),
    metricRow("残業", overtime),
  );
}

function renderOutlookRow(model: SummaryModel): HTMLElement {
  const { outlook, month } = model;
  const row = el(
    "div",
    `border-top:1px solid ${COLOR.divider}; padding:13px 22px; display:flex; align-items:center; gap:20px; background-color:${COLOR.surfaceSoft}`,
  );

  const sentence = el("span", `font-size:14px; color:${COLOR.textPrimary}; line-height:1.6`);
  const [before, after] = outlook.sentence.split(outlook.emphasis);
  sentence.append(
    document.createTextNode(before ?? ""),
    el("b", `color:${COLOR.accent}`, outlook.emphasis),
    document.createTextNode(after ?? ""),
  );

  // 帯のスケールは着地の振れ幅と所定ラインが必ず収まるように取る
  const low = Math.min(outlook.forecast.low, month.requiredTotal);
  const high = Math.max(outlook.forecast.high, month.requiredTotal);
  const pad = Math.max(1, (high - low) * 0.2);
  const scaleMin = low - pad;
  const span = high + pad - scaleMin;
  const toPercent = (v: number): number => ((v - scaleMin) / span) * 100;

  const band = el("div", "flex:1; position:relative; height:24px; min-width:240px");
  append(
    band,
    el(
      "div",
      `position:absolute; top:10px; left:0; right:0; height:4px; background-color:${COLOR.border}; border-radius:2px`,
    ),
    el(
      "div",
      `position:absolute; top:7px; height:10px; border-radius:5px; background-color:${COLOR.accentSoft}; left:${toPercent(outlook.forecast.low)}%; width:${toPercent(outlook.forecast.high) - toPercent(outlook.forecast.low)}%`,
    ),
    el(
      "div",
      `position:absolute; top:4px; width:3px; height:16px; border-radius:2px; background-color:${COLOR.accent}; left:${toPercent(outlook.forecast.point)}%`,
    ),
    el(
      "div",
      `position:absolute; top:1px; bottom:1px; width:2px; background-color:${COLOR.danger}; left:${toPercent(month.requiredTotal)}%`,
    ),
    el(
      "span",
      `position:absolute; top:-1px; font-size:10px; color:${COLOR.danger}; left:${toPercent(month.requiredTotal)}%; margin-left:6px`,
      `所定 ${month.requiredLabel}`,
    ),
  );

  const range = el(
    "span",
    `font-size:11px; color:${COLOR.textMuted}; width:150px; line-height:1.6`,
  );
  range.append(
    document.createTextNode("着地の振れ幅"),
    el("br"),
    document.createTextNode(`${outlook.lowLabel}〜${outlook.highLabel}`),
  );

  return append(row, sentence, band, range);
}

function renderStatusRow(model: SummaryModel): HTMLElement {
  const row = el(
    "div",
    `border-top:1px solid ${COLOR.divider}; padding:10px 22px; display:flex; align-items:center; gap:16px; font-size:11px; color:${COLOR.textMuted}; background-color:#fff`,
  );

  append(
    row,
    el("span", `color:${COLOR.textTertiary}; font-weight:700`, "状態"),
    el(
      "span",
      `padding:2px 9px; border-radius:10px; background-color:${COLOR.accentPale}; color:${COLOR.accent}; font-weight:700`,
      model.today.stateLabel,
    ),
  );

  if (model.today.breakNoteLabel !== null) {
    row.append(el("span", "", `${model.today.breakNoteLabel} ／ 実労働は止まっています`));
  } else if (!isWorking(model.today)) {
    row.append(
      el(
        "span",
        "",
        `今月あと ${model.month.remainingDays}日 × ${model.month.avgPerDayLabel} で ±0`,
      ),
    );
  }

  if (model.alerts.length > 0) {
    row.append(el("span", `margin-left:auto; color:${COLOR.attention}`, model.alerts.join(" ／ ")));
  }

  return row;
}

function renderExpanded(model: SummaryModel): HTMLElement[] {
  // 3 ゾーンは狭いモニターでは潰れるより折り返したほうが読める
  const body = el("div", "display:flex; align-items:stretch; flex-wrap:wrap");
  const divider = (): HTMLElement => el("div", `width:1px; background-color:${COLOR.divider}`);

  if (isWorking(model.today)) {
    append(
      body,
      renderRemainingZone(model),
      divider(),
      renderProgressZone(model),
      divider(),
      renderMonthZone(model),
    );
  } else {
    // 勤務中でなければ「今日の進行」は空になるので 2 ゾーンに畳む
    append(body, renderRemainingZone(model), divider(), renderMonthZone(model));
  }

  return [renderHeader(model), body, renderOutlookRow(model), renderStatusRow(model)];
}

export function createSummaryCard(
  initialModel: SummaryModel,
  initialOpen: boolean,
  onToggle: (open: boolean) => void,
): SummaryCardHandle {
  const element = document.createElement("div");
  element.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_CARD_CLASS);

  let model = initialModel;
  let open = initialOpen;

  const render = (): void => {
    element.textContent = "";
    element.classList.toggle("kotdiff-card--open", open);
    if (open) {
      element.style.cssText = CARD_FRAME;
      element.append(...renderExpanded(model));
    } else {
      element.style.cssText = `${CARD_FRAME}; height:30px; display:flex; align-items:stretch; font-size:13px; cursor:pointer`;
      element.append(...renderCollapsed(model));
    }
  };

  element.addEventListener("click", (event) => {
    // 開いた状態はヘッダー行（1 段目）だけをトグルにする。本文のテキスト選択で
    // 閉じてしまうのを避けるため
    const target = event.target as Node;
    const header = element.firstElementChild;
    if (open && (!header || !header.contains(target))) {
      return;
    }
    open = !open;
    onToggle(open);
    render();
  });

  render();

  return {
    element,
    update(next: SummaryModel): void {
      model = next;
      render();
    },
  };
}
