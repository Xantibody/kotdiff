import type { ReactElement, ReactNode } from "react";
import type { SummaryModel } from "../../../application/SummaryModel";
import type { DashboardSummary } from "../../../domain/aggregates/WorkMonth";
import { formatHM } from "../../../domain/value-objects/WorkDuration";
import { OVERTIME_LIMIT } from "../../../domain/constants";
import { COLOR } from "../../lib/tokens";
import {
  dailyActuals,
  insufficientBreakDays,
  savingsSeries,
  weekdayAverages,
} from "../../lib/insights";

// 7b 上段 3 枚＋補助 4 枚。カードは radius 10px・枠 #e6ecec・影なしで統一する
// （影で階層を作ると、主役の数値より枠のほうが目立つため）

const CARD = "rounded-[10px] border bg-white px-[22px] py-5 flex flex-col gap-2.5 border-[#e6ecec]";
const LABEL = "text-xs font-bold tracking-[.1em]";
const TABULAR = { fontVariantNumeric: "tabular-nums" } as const;

// 実績のドットプロットは 5:00〜11:00 を軸に取る（日本の勤務時間の実用域）
function dotScale(value: number): number {
  return Math.min(100, Math.max(0, ((value - 5) / 6) * 100));
}

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

function Card({ children, className = "", style }: CardProps): ReactElement {
  return (
    <div className={`${CARD} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function TodayCard({ model }: { model: SummaryModel }): ReactElement {
  const { today } = model;
  const working = today.state === "working" || today.state === "onBreak";

  return (
    <Card style={{ borderColor: "#cfe0dd" }}>
      <span className={LABEL} style={{ color: COLOR.accent }}>
        今日 {today.dateLabel} {today.stateLabel}
      </span>
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-[44px] leading-none font-black tracking-[-.02em]"
          style={{ ...TABULAR, color: COLOR.accent }}
        >
          {working ? today.remainingLabel : model.month.remainingRequiredLabel}
        </span>
        <span className="text-[13px] leading-[1.5]" style={{ color: COLOR.textSecondary }}>
          {working ? "で貯金 ±0:00" : `を残り ${model.month.remainingDays}日で`}
          <br />
          <span style={{ color: COLOR.textQuaternary }}>
            {working ? "退勤目安 " : "1日あたり "}
            <b style={{ color: COLOR.textPrimary }}>
              {working ? today.leaveAtLabel : model.month.avgPerDayLabel}
            </b>
          </span>
        </span>
      </div>
      {working && (
        <>
          <div
            className="relative h-3.5 overflow-hidden rounded-[7px]"
            style={{ backgroundColor: COLOR.divider }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{ backgroundColor: COLOR.accentSoft, width: `${today.progressPercent}%` }}
            />
            {today.breakSegments.map((seg) => (
              <div
                key={`${seg.leftPercent}-${seg.widthPercent}`}
                className="absolute inset-y-0"
                style={{
                  backgroundColor: COLOR.restBar,
                  left: `${seg.leftPercent}%`,
                  width: `${seg.widthPercent}%`,
                }}
              />
            ))}
            <div
              className="absolute inset-y-0 w-0.5"
              style={{ backgroundColor: COLOR.accent, left: `${today.progressPercent}%` }}
            />
          </div>
          <div
            className="flex justify-between text-xs"
            style={{ color: COLOR.textMuted, ...TABULAR }}
          >
            <span>出勤 {today.startLabel}</span>
            <span>
              実労働 {today.netLabel} / {today.needLabel}
            </span>
            <span>目安 {today.leaveAtLabel}</span>
          </div>
        </>
      )}
    </Card>
  );
}

function Sparkline({ values }: { values: readonly number[] }): ReactElement | null {
  if (values.length < 2) {
    return null;
  }
  const width = 400;
  const height = 70;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const y = (v: number): number => height - ((v - min) / span) * height;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="54" preserveAspectRatio="none">
      <line
        x1="0"
        y1={y(0)}
        x2={width}
        y2={y(0)}
        stroke="#dbe4e5"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <polyline points={points} fill="none" stroke={COLOR.neutralStrong} strokeWidth="2" />
    </svg>
  );
}

export function SavingsCard({
  model,
  summary,
}: {
  model: SummaryModel;
  summary: DashboardSummary;
}): ReactElement {
  return (
    <Card>
      <span className={LABEL} style={{ color: COLOR.textMuted }}>
        時間貯金
      </span>
      <span
        className="text-[44px] leading-none font-black tracking-[-.02em]"
        style={{
          ...TABULAR,
          color: model.month.savingsNegative ? COLOR.danger : COLOR.accent,
        }}
      >
        {model.month.savingsLabel}
      </span>
      <span className="text-xs" style={{ color: COLOR.textQuaternary }}>
        {summary.workedDays} / {summary.totalWorkDays}日 ・ 8:00 基準
      </span>
      <Sparkline values={savingsSeries(summary.dailyRows)} />
    </Card>
  );
}

export function MonthRequiredCard({ model }: { model: SummaryModel }): ReactElement {
  const { month, outlook } = model;
  // KOT 側の着地バーと同じ 0 起点。所定を 90% に置くと目盛りが 22.5/45/67.5% に収まる
  const axisMax = month.requiredTotal > 0 ? month.requiredTotal / 0.9 : 1;
  const percent = (value: number): number => Math.min(100, Math.max(0, (value / axisMax) * 100));

  const actualEnd = percent(month.actualTotal);
  const lowEnd = Math.max(actualEnd, percent(outlook.forecast.low));
  const highEnd = Math.max(lowEnd, percent(outlook.forecast.high));
  const goal = percent(month.requiredTotal);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className={LABEL} style={{ color: COLOR.textMuted }}>
          今月の必須 {month.requiredLabel}
        </span>
        <span className="text-xs" style={{ color: COLOR.textQuaternary }}>
          残り必要{" "}
          <b style={{ color: COLOR.textPrimary, ...TABULAR }}>{month.remainingRequiredLabel}</b>
        </span>
      </div>
      <span className="text-xs" style={{ color: COLOR.textQuaternary }}>
        月に積み上がる勤務時間の合計
      </span>
      <div className="relative h-[58px]">
        <span
          className="absolute top-0 -translate-x-1/2 text-xs font-bold whitespace-nowrap"
          style={{ ...TABULAR, color: COLOR.neutralStrong, left: `${actualEnd}%` }}
        >
          実働済み {month.actualLabel}
        </span>
        <div
          className="absolute top-[18px] right-0 left-0 h-4 rounded-[3px]"
          style={{ backgroundColor: COLOR.railTrack }}
        />
        <div
          className="absolute top-[18px] left-0 h-4 rounded-l-[3px]"
          style={{ backgroundColor: COLOR.neutralStrong, width: `${actualEnd}%` }}
        />
        <div
          className="absolute top-[18px] h-4"
          style={{
            backgroundColor: COLOR.accentSoft,
            left: `${actualEnd}%`,
            width: `${lowEnd - actualEnd}%`,
          }}
        />
        <div
          className="absolute top-[18px] h-4 rounded-r-[3px]"
          style={{
            background: `repeating-linear-gradient(115deg, ${COLOR.accentSoft} 0 4px, ${COLOR.accentStripe} 4px 8px)`,
            left: `${lowEnd}%`,
            width: `${highEnd - lowEnd}%`,
          }}
        />
        <div
          className="absolute top-3 h-7 w-0.5"
          style={{ backgroundColor: COLOR.danger, left: `${goal}%` }}
        />
        {[0.25, 0.5, 0.75].map((ratio) => (
          <span key={ratio}>
            <span
              className="absolute top-[34px] h-[5px] w-px"
              style={{ backgroundColor: COLOR.cardBorder, left: `${goal * ratio}%` }}
            />
            <span
              className="absolute top-[41px] -translate-x-1/2 text-xs whitespace-nowrap"
              style={{ ...TABULAR, color: COLOR.textQuaternary, left: `${goal * ratio}%` }}
            >
              {ratio * 100}% ・ {formatHM(month.requiredTotal * ratio)}
            </span>
          </span>
        ))}
        <span
          className="absolute top-[41px] -translate-x-1/2 text-xs font-bold whitespace-nowrap"
          style={{ ...TABULAR, color: COLOR.danger, left: `${goal}%` }}
        >
          所定 100% ・ {month.requiredLabel}
        </span>
      </div>
      <span className="text-[13px] leading-[1.6]" style={{ color: COLOR.textPrimary }}>
        {outlook.sentence}
      </span>
      <span className="text-xs" style={{ ...TABULAR, color: COLOR.textTertiary }}>
        斜線＝月末の着地の振れ幅 {outlook.lowLabel} 〜 {outlook.highLabel}（10回のうち8回）
      </span>
    </Card>
  );
}

export function SupportCards({
  model,
  summary,
}: {
  model: SummaryModel;
  summary: DashboardSummary;
}): ReactElement {
  const overtimePercent = Math.min(100, (summary.totalOvertime / OVERTIME_LIMIT) * 100);
  const averages = weekdayAverages(summary.dailyRows);
  const maxAverage = Math.max(11, ...averages.map((a) => a.average));
  const actuals = dailyActuals(summary.dailyRows);
  const shortBreaks = insufficientBreakDays(summary.dailyRows);
  const todoCount = model.alerts.length + shortBreaks.length;

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.1fr] gap-3.5">
      <Card className="!px-[18px] !py-4">
        <span className="text-xs font-bold" style={{ color: COLOR.textTertiary }}>
          残業 {formatHM(OVERTIME_LIMIT)} まで
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-black" style={{ ...TABULAR, color: COLOR.textPrimary }}>
            {formatHM(summary.totalOvertime)}
          </span>
          <span className="text-xs" style={{ color: COLOR.textMuted }}>
            深夜 {formatHM(summary.totalNightOvertime)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded" style={{ backgroundColor: COLOR.divider }}>
          <div
            className="h-full"
            style={{ backgroundColor: COLOR.neutralStrong, width: `${overtimePercent}%` }}
          />
        </div>
        <span className="text-xs" style={{ color: COLOR.textMuted }}>
          残り {formatHM(Math.max(0, OVERTIME_LIMIT - summary.totalOvertime))}（
          {Math.round(overtimePercent)}%）
        </span>
      </Card>

      <Card className="!px-[18px] !py-4">
        <span className="text-xs font-bold" style={{ color: COLOR.textTertiary }}>
          1日あたり
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-black" style={{ ...TABULAR, color: COLOR.textPrimary }}>
            {formatHM(model.outlook.forecast.typicalDay)}
          </span>
          <span className="text-xs" style={{ color: COLOR.textMuted }}>
            ふつうの日
          </span>
        </div>
        <span className="text-xs" style={{ color: COLOR.textQuaternary }}>
          短い日 {formatHM(Math.max(0, model.outlook.forecast.shortDay))} ／ 長い日{" "}
          {formatHM(model.outlook.forecast.longDay)}
        </span>
        <div className="relative h-4">
          <div
            className="absolute top-[7px] right-0 left-0 h-0.5"
            style={{ backgroundColor: COLOR.divider }}
          />
          {actuals.map((value, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key -- 同じ実績の日が複数あり値だけでは一意にならない
              key={`${value}-${index}`}
              className="absolute top-[3px] -ml-1 h-[9px] w-[9px] rounded-full opacity-70"
              style={{ backgroundColor: "#8c9ea3", left: `${dotScale(value)}%` }}
            />
          ))}
        </div>
      </Card>

      <Card className="!gap-[7px] !px-[18px] !py-4">
        <span className="text-xs font-bold" style={{ color: COLOR.textTertiary }}>
          曜日別平均
        </span>
        {averages.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 text-xs">
            <span className="w-3" style={{ color: COLOR.textQuaternary }}>
              {entry.label}
            </span>
            <div
              className="h-[7px] flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: COLOR.divider }}
            >
              <div
                className="h-full"
                style={{
                  backgroundColor: "#8c9ea3",
                  width: `${(entry.average / maxAverage) * 100}%`,
                }}
              />
            </div>
            <span className="w-[34px] text-right" style={{ ...TABULAR, color: COLOR.textTertiary }}>
              {entry.count > 0 ? formatHM(entry.average) : "—"}
            </span>
          </div>
        ))}
      </Card>

      <Card
        className="!px-[18px] !py-4"
        style={{ backgroundColor: COLOR.attentionSurface, borderColor: "#f3ddc4" }}
      >
        <span className="text-xs font-bold" style={{ color: COLOR.attentionStrong }}>
          要対応
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[26px] font-black"
            style={{ ...TABULAR, color: COLOR.attentionStrong }}
          >
            {todoCount}
          </span>
          <span className="text-xs" style={{ color: "#8a6a4a" }}>
            件
          </span>
        </div>
        <span className="text-[13px] leading-[1.6]" style={{ color: "#8a6a4a" }}>
          {model.alerts.length === 0 ? "打刻漏れはありません" : model.alerts.join(" / ")}
          <br />
          <span style={{ color: "#b3987c" }}>
            休憩不足の日：{shortBreaks.length === 0 ? "なし" : shortBreaks.join("、")}
          </span>
        </span>
      </Card>
    </div>
  );
}
