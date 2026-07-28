import type { ReactElement, ReactNode } from "react";
import type { SummaryModel } from "../../../application/SummaryModel";
import type { DashboardSummary } from "../../../domain/aggregates/WorkMonth";
import { formatHM } from "../../../domain/value-objects/WorkDuration";
import { OVERTIME_LIMIT } from "../../../domain/constants";
import { COLOR } from "../../lib/tokens";
import { dailyActuals, savingsSeries, weekdayAverages } from "../../lib/insights";

// 7b 上段 3 枚＋補助 4 枚。カードは radius 10px・枠 #e6ecec・影なしで統一する
// （影で階層を作ると、主役の数値より枠のほうが目立つため）

const CARD = "rounded-[10px] border bg-white px-[22px] py-5 flex flex-col gap-2.5 border-[#e6ecec]";
const LABEL = "text-[11px] font-bold tracking-[.1em]";
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
            className="flex justify-between text-[11px]"
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

export function MonthRequiredCard({
  model,
  summary,
}: {
  model: SummaryModel;
  summary: DashboardSummary;
}): ReactElement {
  const { month, outlook } = model;
  // スケールは所定と着地の振れ幅が必ず収まる範囲
  const scaleMax = Math.max(month.requiredTotal, outlook.forecast.high) * 1.04;
  const percent = (value: number): number =>
    scaleMax > 0 ? Math.min(100, Math.max(0, (value / scaleMax) * 100)) : 0;

  const todayPlanned = model.today.need ?? 0;
  const restPlanned = Math.max(0, outlook.forecast.point - month.actualTotal - todayPlanned);

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
      <div className="relative h-[46px]">
        <div
          className="absolute top-1.5 right-0 left-0 flex h-[22px] overflow-hidden rounded"
          style={{ backgroundColor: COLOR.divider }}
        >
          <div
            style={{
              backgroundColor: COLOR.neutralStrong,
              width: `${percent(month.actualTotal)}%`,
            }}
          />
          <div style={{ backgroundColor: COLOR.accent, width: `${percent(todayPlanned)}%` }} />
          <div style={{ backgroundColor: COLOR.neutralSoft, width: `${percent(restPlanned)}%` }} />
        </div>
        <div
          className="absolute top-px bottom-3.5 w-0.5"
          style={{ backgroundColor: COLOR.danger, left: `${percent(month.requiredTotal)}%` }}
        />
        <div
          className="absolute top-[31px] h-2 rounded"
          style={{
            backgroundColor: "#ffc98a",
            left: `${percent(outlook.forecast.low)}%`,
            width: `${percent(outlook.forecast.high) - percent(outlook.forecast.low)}%`,
          }}
        />
      </div>
      <span className="text-[13px] leading-[1.6]" style={{ color: COLOR.textPrimary }}>
        {outlook.sentence}
      </span>
      <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: COLOR.textMuted }}>
        <Legend color={COLOR.neutralStrong}>実績 {month.actualLabel}</Legend>
        <Legend color={COLOR.accent}>本日 {formatHM(todayPlanned)}</Legend>
        <Legend color={COLOR.neutralSoft}>
          残り {summary.remainingDays}日 {formatHM(restPlanned)}
        </Legend>
        <Legend color="#ffc98a">
          着地 {outlook.lowLabel}〜{outlook.highLabel}
        </Legend>
      </div>
    </Card>
  );
}

function Legend({ color, children }: { color: string; children: ReactNode }): ReactElement {
  return (
    <span className="flex items-center gap-1">
      <span
        className="h-[7px] w-[11px] rounded-[2px]"
        style={{ backgroundColor: color, display: "inline-block" }}
      />
      {children}
    </span>
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

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1.1fr] gap-3.5">
      <Card className="!px-[18px] !py-4">
        <span className="text-[11px] font-bold" style={{ color: COLOR.textTertiary }}>
          残業 {formatHM(OVERTIME_LIMIT)} まで
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-black" style={{ ...TABULAR, color: COLOR.textPrimary }}>
            {formatHM(summary.totalOvertime)}
          </span>
          <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
            深夜 {formatHM(summary.totalNightOvertime)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded" style={{ backgroundColor: COLOR.divider }}>
          <div
            className="h-full"
            style={{ backgroundColor: COLOR.neutralStrong, width: `${overtimePercent}%` }}
          />
        </div>
        <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
          残り {formatHM(Math.max(0, OVERTIME_LIMIT - summary.totalOvertime))}（
          {Math.round(overtimePercent)}%）
        </span>
      </Card>

      <Card className="!px-[18px] !py-4">
        <span className="text-[11px] font-bold" style={{ color: COLOR.textTertiary }}>
          1日あたり
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-black" style={{ ...TABULAR, color: COLOR.textPrimary }}>
            {formatHM(model.outlook.forecast.typicalDay)}
          </span>
          <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
            ふつうの日
          </span>
        </div>
        <span className="text-[11px]" style={{ color: COLOR.textQuaternary }}>
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
        <span className="text-[11px] font-bold" style={{ color: COLOR.textTertiary }}>
          曜日別平均
        </span>
        {averages.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2 text-[11px]">
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
        <span className="text-[11px] font-bold" style={{ color: COLOR.attentionStrong }}>
          要対応
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-[26px] font-black"
            style={{ ...TABULAR, color: COLOR.attentionStrong }}
          >
            {model.alerts.length}
          </span>
          <span className="text-xs" style={{ color: "#8a6a4a" }}>
            件
          </span>
        </div>
        <span className="text-xs leading-[1.6]" style={{ color: "#8a6a4a" }}>
          {model.alerts.length === 0 ? "打刻漏れはありません" : model.alerts.join(" / ")}
        </span>
      </Card>
    </div>
  );
}
