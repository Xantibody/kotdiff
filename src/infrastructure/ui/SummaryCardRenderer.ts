import type { SummaryModel, TodayModel } from "../../application/SummaryModel";
import { formatHM } from "../../domain/value-objects/WorkDuration";
import { el, append } from "./dom";
import { COLOR, KOT_FONT, TABULAR } from "./theme";
import { KOTDIFF_CARD_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";

// 7a の注入カード。たたんだ状態 (40px・sticky) と開いた状態の 2 形態を持つ。
// 開閉のたびに作り直すのは、KOT 側のテーブル再描画で部分更新が壊れやすく、
// 30 秒ごとの再計算でもどうせ全面更新になるため。
//
// 最小フォントは 12px。10px / 11px は使わない（キャレットの記号だけ例外）。

export interface SummaryCardHandle {
  readonly element: HTMLDivElement;
  update(model: SummaryModel): void;
}

const CARD_FRAME = `border:1px solid ${COLOR.cardBorder}; border-left:3px solid ${COLOR.accent}; border-radius:3px; background-color:#fff; overflow:hidden; font-family:${KOT_FONT}; margin-bottom:8px`;

// 所定を 90% の位置に置くと、目盛り (25/50/75%) が 22.5/45/67.5% に収まって読みやすい
const GOAL_POSITION = 0.9;

function isWorking(today: TodayModel): boolean {
  return today.state === "working" || today.state === "onBreak";
}

function caret(open: boolean): HTMLElement {
  return el(
    "span",
    `width:30px; display:flex; align-items:center; justify-content:center; color:${COLOR.accent}; font-size:11px`,
    open ? "▾" : "▸",
  );
}

function segment(...children: readonly HTMLElement[]): HTMLElement {
  return append(
    el(
      "span",
      `padding:0 18px; display:flex; align-items:center; gap:9px; border-left:1px solid ${COLOR.divider}`,
    ),
    ...children,
  );
}

function label(text: string, color: string = COLOR.textTertiary): HTMLElement {
  return el("span", `color:${color}; font-size:13px`, text);
}

function value(text: string, style = ""): HTMLElement {
  return el("b", `color:${COLOR.textPrimary}; ${TABULAR}; font-weight:800; ${style}`, text);
}

function savingsColor(negative: boolean): string {
  return negative ? COLOR.danger : COLOR.accent;
}

// たたんだ状態は 3 項目だけ。退勤目安と実労働は開いた状態に置く
function collapsedSegments(model: SummaryModel): HTMLElement[] {
  const { today, month, outlook } = model;

  if (isWorking(today)) {
    return [
      segment(
        label("あと"),
        value(today.remainingLabel, `font-size:17px; color:${COLOR.accent}; letter-spacing:-.01em`),
        label("で貯金 ±0"),
      ),
      segment(label("退勤目安"), value(today.leaveAtLabel ?? "—", "font-size:15px")),
      segment(
        label("実労働"),
        value(today.netLabel, "font-size:15px"),
        label(`/ ${today.needLabel}`, COLOR.textQuaternary),
      ),
    ];
  }

  return [
    segment(
      label("今月あと"),
      value(
        month.remainingRequiredLabel,
        `font-size:17px; color:${COLOR.accent}; letter-spacing:-.01em`,
      ),
    ),
    segment(
      label("時間貯金"),
      value(month.savingsLabel, `font-size:15px; color:${savingsColor(month.savingsNegative)}`),
    ),
    segment(
      label("月末"),
      el(
        "b",
        `color:${COLOR.textPrimary}; font-size:14px; font-weight:700`,
        outlook.forecast.label,
      ),
    ),
  ];
}

function renderCollapsed(model: SummaryModel): HTMLElement[] {
  const percent = isWorking(model.today)
    ? model.today.todayDonePercent
    : model.month.progressPercent;

  const track = el(
    "span",
    `width:132px; height:6px; border-radius:3px; background-color:${COLOR.accentTrack}; display:block; overflow:hidden`,
  );
  track.append(
    el("span", `display:block; height:100%; background-color:${COLOR.accent}; width:${percent}%`),
  );
  const gauge = append(
    el(
      "span",
      `padding:0 18px; display:flex; align-items:center; gap:12px; border-left:1px solid ${COLOR.divider}; background-color:${COLOR.surfaceSoft}`,
    ),
    track,
    el(
      "span",
      `color:${COLOR.textTertiary}; font-size:13px; ${TABULAR}`,
      `${Math.round(percent)}%`,
    ),
  );

  // 打刻漏れはたたんだ状態でも見えないと埋もれる
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

// 状態は独立した行を持たずヘッダーのバッジで示す
function renderHeader(model: SummaryModel): HTMLElement {
  const header = el(
    "div",
    `height:44px; display:flex; align-items:center; gap:14px; padding:0 22px; border-bottom:1px solid ${COLOR.divider}; background-color:${COLOR.surfaceSoft}`,
  );
  append(
    header,
    caret(true),
    el("b", `color:${COLOR.textPrimary}; font-size:15px`, `本日 ${model.today.dateLabel}`),
    el(
      "span",
      `padding:3px 11px; border-radius:11px; background-color:${COLOR.accentPale}; color:${COLOR.accent}; font-weight:700; font-size:12px`,
      model.today.stateLabel,
    ),
  );
  if (model.alerts.length > 0) {
    header.append(
      el("span", `color:${COLOR.attention}; font-size:12px`, model.alerts.join(" ／ ")),
    );
  }
  return append(
    header,
    el("span", "flex:1"),
    el(
      "span",
      `color:${COLOR.textQuaternary}; font-size:12px`,
      `${model.today.nowLabel} 時点 ・ 30 秒ごとに更新`,
    ),
    el("span", `color:${COLOR.textTertiary}; font-size:13px`, "たたむ"),
  );
}

// 主役の数字ゾーン。退勤後は「今月あと」、勤務中は「あと これだけ」
function renderHeadlineZone(model: SummaryModel, width: number): HTMLElement {
  const zone = el(
    "div",
    `width:${width}px; padding:32px; display:flex; flex-direction:column; gap:12px; background-color:${COLOR.surfaceSoft}`,
  );
  const working = isWorking(model.today);

  const supplement = el("span", `font-size:15px; color:${COLOR.textSecondary}; line-height:1.7`);
  if (working) {
    supplement.append(
      document.createTextNode("退勤目安 "),
      el("b", TABULAR, model.today.leaveAtLabel ?? "—"),
      el("br"),
      el("span", `color:${COLOR.textTertiary}; font-size:13px`, "これ以上休憩を取らない場合"),
    );
  } else {
    supplement.append(
      document.createTextNode(`残り ${model.month.remainingDays}日 ・ 1日 `),
      el("b", TABULAR, model.month.avgPerDayLabel),
      document.createTextNode(" で ±0"),
      el("br"),
      el(
        "span",
        `color:${COLOR.textTertiary}; font-size:13px`,
        model.outlook.paceLabel === null
          ? ""
          : `まず届かせたい場合は 1日 ${model.outlook.paceLabel}`,
      ),
    );
  }

  return append(
    zone,
    el(
      "span",
      `font-size:12px; font-weight:800; letter-spacing:.1em; color:${COLOR.accent}`,
      working ? "あと これだけ" : "今月 あと これだけ",
    ),
    el(
      "span",
      `font-size:60px; line-height:1; font-weight:900; color:${COLOR.accent}; ${TABULAR}; letter-spacing:-.03em`,
      working ? model.today.remainingLabel : model.month.remainingRequiredLabel,
    ),
    supplement,
  );
}

function metricRow(name: string, main: string, sub: string | null, color: string): HTMLElement {
  const row = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:11px 0; white-space:nowrap`,
  );
  const amount = el("span", `font-size:17px; font-weight:800; color:${color}; ${TABULAR}`, main);
  if (sub !== null) {
    amount.append(
      el("span", `font-size:13px; font-weight:400; color:${COLOR.textQuaternary}`, ` / ${sub}`),
    );
  }
  return append(row, el("span", `font-size:14px; color:${COLOR.textSecondary}`, name), amount);
}

// 進捗バーは着地バーの濃い部分が同じことを描いているので、ここは数値だけにする
function renderMonthZone(model: SummaryModel): HTMLElement {
  const zone = el(
    "div",
    "flex:1; padding:26px 32px; display:flex; flex-direction:column; justify-content:center",
  );
  const { month, outlook } = model;
  const rows = [
    metricRow("実績 / 必須", month.actualLabel, month.requiredLabel, COLOR.textPrimary),
    metricRow("時間貯金", month.savingsLabel, null, savingsColor(month.savingsNegative)),
    metricRow("残業", month.overtimeLabel, month.overtimeLimitLabel, COLOR.textPrimary),
    metricRow("月末の着地", `${outlook.lowLabel} 〜 ${outlook.highLabel}`, null, COLOR.textPrimary),
  ];
  for (const [index, row] of rows.entries()) {
    if (index < rows.length - 1) {
      row.style.borderBottom = `1px solid ${COLOR.divider}`;
    }
    zone.append(row);
  }
  return zone;
}

function renderProgressZone(model: SummaryModel): HTMLElement {
  const { today } = model;
  const zone = el(
    "div",
    "flex:1; min-width:320px; padding:28px 32px; display:flex; flex-direction:column; gap:14px",
  );

  const headingRow = el(
    "div",
    `display:flex; align-items:baseline; justify-content:space-between; gap:16px; font-size:14px; color:${COLOR.textSecondary}`,
  );
  const stats = el("span");
  stats.append(
    document.createTextNode("実労働 "),
    el(
      "b",
      `font-size:17px; font-weight:800; color:${COLOR.textPrimary}; ${TABULAR}`,
      today.netLabel,
    ),
    document.createTextNode(" ／ 経過 "),
    el("span", TABULAR, today.elapsedLabel),
  );
  append(
    headingRow,
    el(
      "span",
      `font-size:12px; font-weight:800; letter-spacing:.1em; color:${COLOR.textQuaternary}`,
      "今日の進行",
    ),
    stats,
  );

  const track = el(
    "div",
    `position:relative; height:24px; border-radius:4px; background-color:${COLOR.divider}; overflow:hidden`,
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
    `position:relative; height:18px; font-size:12px; color:${COLOR.textTertiary}`,
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
    el("div", `font-size:12px; color:${COLOR.textTertiary}`, note),
  );
}

// 0 起点の 1 本バー。「区間だけ浮いた帯」は横軸が何なのか読めないので、
// 既に理解されている進捗バーと同じ形にして目盛りを刻む
function renderLandingBar(model: SummaryModel): HTMLElement {
  const { month, outlook } = model;
  const axisMax = month.requiredTotal > 0 ? month.requiredTotal / GOAL_POSITION : 1;
  const percent = (value_: number): number => Math.min(100, Math.max(0, (value_ / axisMax) * 100));

  const actualEnd = percent(month.actualTotal);
  const lowEnd = Math.max(actualEnd, percent(outlook.forecast.low));
  const highEnd = Math.max(lowEnd, percent(outlook.forecast.high));
  const goal = percent(month.requiredTotal);

  const bar = el("div", "position:relative; height:58px");
  append(
    bar,
    el(
      "span",
      `position:absolute; top:0; left:${actualEnd}%; transform:translateX(-50%); white-space:nowrap; font-size:12px; font-weight:700; color:${COLOR.neutralStrong}; ${TABULAR}`,
      `実働済み ${month.actualLabel}`,
    ),
    el(
      "div",
      `position:absolute; top:18px; left:0; right:0; height:16px; border-radius:3px; background-color:${COLOR.railTrack}`,
    ),
    el(
      "div",
      `position:absolute; top:18px; left:0; width:${actualEnd}%; height:16px; border-radius:3px 0 0 3px; background-color:${COLOR.neutralStrong}`,
    ),
    el(
      "div",
      `position:absolute; top:18px; left:${actualEnd}%; width:${lowEnd - actualEnd}%; height:16px; background-color:${COLOR.accentSoft}`,
    ),
    el(
      "div",
      `position:absolute; top:18px; left:${lowEnd}%; width:${highEnd - lowEnd}%; height:16px; border-radius:0 3px 3px 0; background:repeating-linear-gradient(115deg, ${COLOR.accentSoft} 0 4px, ${COLOR.accentStripe} 4px 8px)`,
    ),
    el(
      "div",
      `position:absolute; top:12px; height:28px; left:${goal}%; width:2px; background-color:${COLOR.danger}`,
    ),
  );

  // 所定に対する 25 / 50 / 75% に目盛りを立て、％と時間を併記する
  for (const ratio of [0.25, 0.5, 0.75]) {
    const left = goal * ratio;
    append(
      bar,
      el(
        "div",
        `position:absolute; top:34px; left:${left}%; width:1px; height:5px; background-color:${COLOR.cardBorder}`,
      ),
      el(
        "span",
        `position:absolute; top:41px; left:${left}%; transform:translateX(-50%); white-space:nowrap; font-size:12px; color:${COLOR.textQuaternary}; ${TABULAR}`,
        `${ratio * 100}% ・ ${formatHM(month.requiredTotal * ratio)}`,
      ),
    );
  }
  bar.append(
    el(
      "span",
      `position:absolute; top:41px; left:${goal}%; transform:translateX(-50%); white-space:nowrap; font-size:12px; font-weight:700; color:${COLOR.danger}; ${TABULAR}`,
      `所定 100% ・ ${month.requiredLabel}`,
    ),
  );

  const conclusion = `斜線＝月末の着地の振れ幅 ${outlook.lowLabel} 〜 ${outlook.highLabel}（10回のうち8回）。${goalPositionSentence(model)}`;

  return append(
    el("div", "flex:1; display:flex; flex-direction:column; gap:6px"),
    el("span", `font-size:12px; color:${COLOR.textQuaternary}`, "月に積み上がる勤務時間の合計"),
    bar,
    el("span", `font-size:12px; color:${COLOR.textTertiary}; ${TABULAR}`, conclusion),
  );
}

function goalPositionSentence(model: SummaryModel): string {
  const { forecast } = model.outlook;
  const goal = model.month.requiredTotal;
  const verdict = forecast.shortLabel;
  if (goal < forecast.low) {
    return `所定ラインが振れ幅より手前にあるので「${verdict}」。`;
  }
  if (goal > forecast.high) {
    return `所定ラインが振れ幅より先にあるので「${verdict}」。`;
  }
  return `所定ラインがその範囲の中にあるので「${verdict}」。`;
}

function renderOutlookRow(model: SummaryModel): HTMLElement {
  const { outlook, month } = model;
  const row = el(
    "div",
    `border-top:1px solid ${COLOR.divider}; padding:20px 32px; display:flex; align-items:center; gap:32px; background-color:${COLOR.surfaceSoft}; flex-wrap:wrap`,
  );

  const sentence = el("span", `font-size:15px; color:${COLOR.textPrimary}; line-height:1.7`);
  const [before, after] = outlook.sentence.split(outlook.emphasis);
  sentence.append(
    document.createTextNode(before ?? ""),
    el("b", `color:${COLOR.accent}`, outlook.emphasis),
    document.createTextNode(after ?? ""),
  );

  // 「届くか半々」が何を仮定した判定なのかを画面に置く
  const assumption = el(
    "span",
    `font-size:12px; color:${COLOR.textTertiary}; line-height:1.6`,
    `これまでと同じ働き方で、残り ${month.remainingDays}日 すべて働いた場合の見込み` +
      `（ふつうの日 ${formatHM(outlook.forecast.typicalDay)} / 短い日 ${formatHM(Math.max(0, outlook.forecast.shortDay))} / 長い日 ${formatHM(outlook.forecast.longDay)}）`,
  );

  const text = append(
    el("div", "width:430px; display:flex; flex-direction:column; gap:7px"),
    sentence,
    assumption,
  );

  return append(row, text, renderLandingBar(model));
}

function renderExpanded(model: SummaryModel): HTMLElement[] {
  const body = el("div", "display:flex; align-items:stretch; flex-wrap:wrap");
  const divider = (): HTMLElement => el("div", `width:1px; background-color:${COLOR.divider}`);

  if (isWorking(model.today)) {
    append(
      body,
      renderHeadlineZone(model, 300),
      divider(),
      renderProgressZone(model),
      divider(),
      renderMonthZone(model),
    );
  } else {
    // 退勤後・非勤務日は「今日の進行」が空になるので 2 ゾーンに畳む
    append(body, renderHeadlineZone(model, 420), divider(), renderMonthZone(model));
  }

  return [renderHeader(model), body, renderOutlookRow(model)];
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
      element.style.cssText = `${CARD_FRAME}; height:40px; display:flex; align-items:stretch; font-size:14px; cursor:pointer`;
      element.append(...renderCollapsed(model));
    }
  };

  element.addEventListener("click", (event) => {
    // 開いた状態はヘッダー行だけをトグルにする。本文のテキスト選択で閉じないように
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
