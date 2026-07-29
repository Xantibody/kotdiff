import { formatDiff, formatHM, formatTimeOfDay } from "../domain/value-objects/WorkDuration";
import { forecastMonth, reachPhrase } from "../domain/services/ForecastService";
import type { Forecast } from "../domain/services/ForecastService";
import { DEFAULT_EXPECTED_HOURS, OVERTIME_LIMIT } from "../domain/constants";

// 注入カード (7a) とダッシュボードの「今日」カード (7b) が共有する表示モデル。
// 絵文字つきの文字列を組み立てていた buildBannerLines と違い、レンダラが
// レイアウトを決められるように値と表示文字列を構造のまま返す。

export type WorkState = "working" | "onBreak" | "afterWork" | "offDay";

export interface BreakSpan {
  readonly start: number;
  readonly end: number;
}

export interface TodayInput {
  readonly status: "working" | "onBreak";
  // すべて decimal hours。日跨ぎは出勤時刻を起点に +24 して単調増加させた値を渡す
  readonly startTime: number;
  readonly now: number;
  readonly netWorkTime: number;
  readonly breaks: readonly BreakSpan[];
  // 貯金 ±0 まで残り (負なら達成済み)
  readonly remainingHours: number;
  readonly targetLabel: string;
  readonly targetTime: number;
}

export interface SummaryInput {
  readonly totalWorkDays: number;
  readonly workedDays: number;
  readonly remainingDays: number;
  readonly totalActual: number;
  readonly cumulativeDiff: number;
  readonly overtime: number;
  // 勤務済み日の実績（予測に使う）
  readonly actuals: readonly number[];
  readonly today: TodayInput | null;
  readonly dateLabel: string;
  readonly nowLabel: string;
  readonly alerts: readonly string[];
}

export interface BarSegment {
  readonly leftPercent: number;
  readonly widthPercent: number;
}

export interface TodayModel {
  readonly state: WorkState;
  readonly dateLabel: string;
  readonly nowLabel: string;
  readonly stateLabel: string;
  // 「あと これだけ」。勤務中のみ。達成済みなら 0
  readonly remaining: number | null;
  readonly remainingLabel: string;
  readonly leaveAtLabel: string | null;
  readonly net: number | null;
  readonly netLabel: string;
  readonly need: number | null;
  readonly needLabel: string;
  readonly elapsedLabel: string;
  readonly startLabel: string | null;
  // 進行バー: 経過フィル・休憩区間・現在位置（すべて 0〜100）
  readonly progressPercent: number;
  readonly breakSegments: readonly BarSegment[];
  readonly breakTotalLabel: string;
  readonly breakRangeLabel: string | null;
  // 「本日の必要」に対する実労働の達成率
  readonly todayDonePercent: number;
  // 休憩中の注記（例「休憩中 13:04 から 0:26」）
  readonly breakNoteLabel: string | null;
}

export interface MonthModel {
  readonly requiredTotal: number;
  readonly requiredLabel: string;
  readonly actualTotal: number;
  readonly actualLabel: string;
  readonly progressPercent: number;
  readonly savings: number;
  readonly savingsLabel: string;
  readonly savingsNegative: boolean;
  readonly overtime: number;
  readonly overtimeLabel: string;
  readonly overtimeLimitLabel: string;
  readonly remainingDays: number;
  readonly remainingRequired: number;
  readonly remainingRequiredLabel: string;
  readonly avgPerDay: number;
  readonly avgPerDayLabel: string;
}

export interface OutlookModel {
  readonly forecast: Forecast;
  readonly sentence: string;
  readonly emphasis: string;
  readonly paceLabel: string | null;
  readonly lowLabel: string;
  readonly highLabel: string;
  readonly reachPhrase: string;
}

export interface SummaryModel {
  readonly today: TodayModel;
  readonly month: MonthModel;
  readonly outlook: OutlookModel;
  readonly alerts: readonly string[];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

const STATE_LABELS: Record<WorkState, string> = {
  working: "勤務中",
  onBreak: "休憩中",
  afterWork: "退勤後",
  offDay: "非勤務日",
};

function buildToday(input: SummaryInput): TodayModel {
  const { today } = input;

  if (!today) {
    // 退勤後・非勤務日は「今月あと N日 × M で ±0」が主役になる
    return {
      state: input.remainingDays > 0 ? "afterWork" : "offDay",
      dateLabel: input.dateLabel,
      nowLabel: input.nowLabel,
      stateLabel: STATE_LABELS[input.remainingDays > 0 ? "afterWork" : "offDay"],
      remaining: null,
      remainingLabel: "—",
      leaveAtLabel: null,
      net: null,
      netLabel: "—",
      need: null,
      needLabel: "—",
      elapsedLabel: "—",
      startLabel: null,
      progressPercent: 0,
      breakSegments: [],
      breakTotalLabel: "0:00",
      breakRangeLabel: null,
      todayDonePercent: 0,
      breakNoteLabel: null,
    };
  }

  const state: WorkState = today.status === "onBreak" ? "onBreak" : "working";
  const remaining = Math.max(0, today.remainingHours);
  const need = today.netWorkTime + today.remainingHours;
  const elapsed = today.now - today.startTime;
  // 現在位置と目安のどちらも「出勤からの経過」で測るので分母は同じ span
  const span = today.targetTime - today.startTime;
  const completedBreak = today.breaks.reduce((acc, b) => acc + Math.max(0, b.end - b.start), 0);

  const breakSegments = today.breaks
    .filter((b) => b.end > b.start)
    .map((b) => ({
      leftPercent: clampPercent(((b.start - today.startTime) / span) * 100),
      widthPercent: clampPercent(((b.end - b.start) / span) * 100),
    }));

  const first = today.breaks.at(0);
  const last = today.breaks.at(-1);
  const breakRangeLabel =
    first && last ? `${formatTimeOfDay(first.start % 24)}–${formatTimeOfDay(last.end % 24)}` : null;

  // 休憩中は実労働が進まないため、経過フィルも最後の休憩開始で止める
  const progressBase = today.status === "onBreak" && last ? last.start : today.now;

  let breakNoteLabel: string | null = null;
  if (today.status === "onBreak" && last) {
    breakNoteLabel = `休憩中 ${formatTimeOfDay(last.start % 24)} から ${formatHM(today.now - last.start)}`;
  }

  return {
    state,
    dateLabel: input.dateLabel,
    nowLabel: input.nowLabel,
    stateLabel: STATE_LABELS[state],
    remaining,
    remainingLabel: formatHM(remaining),
    leaveAtLabel: today.targetLabel,
    net: today.netWorkTime,
    netLabel: formatHM(today.netWorkTime),
    need,
    needLabel: formatHM(need),
    elapsedLabel: formatHM(elapsed),
    startLabel: formatTimeOfDay(today.startTime % 24),
    progressPercent: span > 0 ? clampPercent(((progressBase - today.startTime) / span) * 100) : 100,
    breakSegments,
    breakTotalLabel: formatHM(completedBreak),
    breakRangeLabel,
    todayDonePercent: need > 0 ? clampPercent((today.netWorkTime / need) * 100) : 100,
    breakNoteLabel,
  };
}

export function buildSummaryModel(input: SummaryInput): SummaryModel {
  const requiredTotal = input.totalWorkDays * DEFAULT_EXPECTED_HOURS;
  const remainingRequired = input.remainingDays * DEFAULT_EXPECTED_HOURS - input.cumulativeDiff;
  const avgPerDay = input.remainingDays > 0 ? remainingRequired / input.remainingDays : 0;

  const month: MonthModel = {
    requiredTotal,
    requiredLabel: formatHM(requiredTotal),
    actualTotal: input.totalActual,
    actualLabel: formatHM(input.totalActual),
    progressPercent:
      requiredTotal > 0 ? clampPercent((input.totalActual / requiredTotal) * 100) : 0,
    savings: input.cumulativeDiff,
    savingsLabel: formatDiff(input.cumulativeDiff),
    savingsNegative: Math.round(input.cumulativeDiff * 60) < 0,
    overtime: input.overtime,
    overtimeLabel: formatHM(input.overtime),
    overtimeLimitLabel: formatHM(OVERTIME_LIMIT),
    remainingDays: input.remainingDays,
    remainingRequired,
    remainingRequiredLabel: formatHM(remainingRequired),
    avgPerDay,
    avgPerDayLabel: formatHM(avgPerDay),
  };

  const today = buildToday(input);

  // 本日の見込みは「退勤目安まで働いた場合」。勤務中でなければ 0
  const todayPlanned = input.today ? input.today.netWorkTime + input.today.remainingHours : 0;
  const forecast = forecastMonth({
    actuals: input.actuals,
    // 本日の行は todayPlanned に含めるので残り日数から外す
    remainingDays: input.today ? Math.max(0, input.remainingDays - 1) : input.remainingDays,
    completedTotal: input.totalActual,
    todayPlanned,
    requiredTotal,
  });

  const paceLabel =
    forecast.paceForConfidence === null ? null : formatHM(forecast.paceForConfidence);
  const sentence =
    paceLabel === null
      ? `このままだと ${forecast.shortLabel}。`
      : `このままだと ${forecast.shortLabel}。1日 ${paceLabel} にすれば、まず届きます。`;

  return {
    today,
    month,
    outlook: {
      forecast,
      sentence,
      emphasis: forecast.shortLabel,
      paceLabel,
      lowLabel: formatHM(Math.max(0, forecast.low)),
      highLabel: formatHM(Math.max(0, forecast.high)),
      reachPhrase: reachPhrase(forecast.reachProbability),
    },
    alerts: [...input.alerts],
  };
}
