// 月末着地の推定。確定値（時間貯金・残り必要）と違い、これは幅を伴う予測である。
// 画面には統計用語を出さない方針のため、この層で「10回のうち N 回」「所定に届くか半々」
// といった日常語へ翻訳した結果まで組み立てて返す。

export interface ForecastInput {
  // 勤務済み日の実績（decimal hours）。本日進行中の分は含めない
  readonly actuals: readonly number[];
  // 本日を除く残り稼働日数
  readonly remainingDays: number;
  readonly completedTotal: number;
  // 本日の見込み労働（勤務中なら退勤目安までの労働。対象なしなら 0）
  readonly todayPlanned: number;
  // 月の所定合計（稼働日数 × 8h）
  readonly requiredTotal: number;
}

export type ForecastVerdict = "reach" | "likely" | "even" | "unlikely" | "miss";

export interface Forecast {
  readonly mean: number;
  readonly sd: number;
  readonly typicalDay: number;
  readonly shortDay: number;
  readonly longDay: number;
  // 月末着地の点推定と 80% 予測区間
  readonly point: number;
  readonly low: number;
  readonly high: number;
  readonly reachProbability: number;
  // 「10回のうち N 回」の N
  readonly outOfTen: number;
  readonly verdict: ForecastVerdict;
  // STATE A・カード用の短い判定（例「所定に届くか半々」）
  readonly label: string;
  // 見通し文の強調部（例「届くかは半々」）
  readonly shortLabel: string;
  // 80% の確度で所定に届く 1 日あたりの労働時間。残り 0 日なら null
  readonly paceForConfidence: number | null;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// 標本標準偏差 (n-1)。母集団ではなく「この人のこの月の働き方」の推定に使うため
export function sampleStdDev(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Student の t 分布の累積分布。自由度が整数のときの閉形式 (Abramowitz & Stegun 26.7.3/26.7.4)
// を使う。不完全ベータ関数の連分数展開より短く、係数テーブルを持たずに済むため。
export function studentTCdf(t: number, df: number): number {
  if (df <= 0) {
    return t >= 0 ? 1 : 0;
  }
  // 自由度は「勤務済み日数 − 1」なので常に整数。念のため丸めておく
  const v = Math.round(df);
  const theta = Math.atan(t / Math.sqrt(v));
  const cos2 = Math.cos(theta) ** 2;

  if (v % 2 === 0) {
    let term = 1;
    let sum = 1;
    for (let j = 2; j <= v - 2; j += 2) {
      term *= ((j - 1) / j) * cos2;
      sum += term;
    }
    return 0.5 + (Math.sin(theta) * sum) / 2;
  }

  let term = Math.cos(theta);
  let sum = term;
  for (let j = 3; j <= v - 2; j += 2) {
    term *= ((j - 1) / j) * cos2;
    sum += term;
  }
  // v = 1 では総和が空になり 1/2 + θ/π に退化する
  const bracket = v === 1 ? theta : theta + Math.sin(theta) * sum;
  return 0.5 + bracket / Math.PI;
}

// 片側 90%（＝両側 80% 予測区間）の t 値
const T_TABLE_90: readonly number[] = [
  3.078, 1.886, 1.638, 1.533, 1.476, 1.44, 1.415, 1.397, 1.383, 1.372, 1.363, 1.356, 1.35, 1.345,
  1.341, 1.337, 1.333, 1.33, 1.328, 1.325, 1.323, 1.321, 1.319, 1.318, 1.316, 1.315, 1.314, 1.313,
  1.311, 1.31,
];
const NORMAL_QUANTILE_90 = 1.282;

export function tValue90(df: number): number {
  if (df <= 0) {
    return T_TABLE_90[0] ?? NORMAL_QUANTILE_90;
  }
  if (df <= T_TABLE_90.length) {
    return T_TABLE_90[df - 1] ?? NORMAL_QUANTILE_90;
  }
  return NORMAL_QUANTILE_90;
}

export function reachPhrase(probability: number): string {
  const times = Math.min(10, Math.max(0, Math.round(probability * 10)));
  return `10回のうち${times}回`;
}

interface VerdictWording {
  readonly verdict: ForecastVerdict;
  readonly label: string;
  readonly shortLabel: string;
}

function wordVerdict(probability: number): VerdictWording {
  if (probability >= 0.8) {
    return { verdict: "reach", label: "所定にまず届く", shortLabel: "まず届く" };
  }
  if (probability >= 0.6) {
    return { verdict: "likely", label: "所定にたぶん届く", shortLabel: "たぶん届く" };
  }
  if (probability >= 0.4) {
    return { verdict: "even", label: "所定に届くか半々", shortLabel: "届くかは半々" };
  }
  if (probability >= 0.2) {
    return { verdict: "unlikely", label: "所定にたぶん届かない", shortLabel: "たぶん届かない" };
  }
  return { verdict: "miss", label: "所定に届かない見込み", shortLabel: "届かない見込み" };
}

export function forecastMonth(input: ForecastInput): Forecast {
  const n = input.actuals.length;
  const k = Math.max(0, input.remainingDays);
  const m = mean(input.actuals);
  const sd = sampleStdDev(input.actuals);

  // 残り k 日の合計に対する予測標準誤差。1/n は「平均自体の不確かさ」の上乗せ
  const se = n > 0 && k > 0 ? sd * Math.sqrt(k) * Math.sqrt(1 + 1 / n) : 0;
  const t = tValue90(n - 1);
  const margin = t * se;

  const point = input.completedTotal + input.todayPlanned + m * k;
  const shortfall = input.requiredTotal - input.completedTotal - input.todayPlanned;

  let reachProbability: number;
  if (se === 0) {
    reachProbability = point >= input.requiredTotal ? 1 : 0;
  } else {
    reachProbability = 1 - studentTCdf((input.requiredTotal - point) / se, n - 1);
  }

  const wording = wordVerdict(reachProbability);

  return {
    mean: m,
    sd,
    typicalDay: m,
    shortDay: m - sd,
    longDay: m + sd,
    point,
    low: point - margin,
    high: point + margin,
    reachProbability,
    outOfTen: Math.min(10, Math.max(0, Math.round(reachProbability * 10))),
    ...wording,
    // 幅のぶんを上乗せして割ることで「80% の確度で届く」1 日あたりになる
    paceForConfidence: k > 0 ? Math.max(0, (shortfall + margin) / k) : null,
  };
}
