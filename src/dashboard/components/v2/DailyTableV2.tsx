import type { ReactElement } from "react";
import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";
import { formatDiff, formatHM, isDiffNegative } from "../../../domain/value-objects/WorkDuration";
import { formatAttendance } from "../../lib/utils";
import { buildTimelineSegments } from "../../lib/timeline";
import { COLOR } from "../../lib/tokens";

// 7b の日別テーブル。時間貯金を主役の列に据え、行の状態は左端 3px で示す。

const TABULAR = { fontVariantNumeric: "tabular-nums" } as const;
const SCALE_MIN = 5;
const SCALE_SPAN = 24;
const GUIDE_HOURS = [12, 18, 24];

function savingsColor(cumulativeDiff: number | null): string {
  if (cumulativeDiff === null) {
    return COLOR.textFaint;
  }
  return isDiffNegative(cumulativeDiff) ? COLOR.danger : COLOR.kotGreen;
}

function stripeColor(row: DailyRowSummary): string {
  if (row.diff === null) {
    const hasStart = row.startTime !== null && row.startTime !== "";
    return hasStart ? COLOR.attention : "transparent";
  }
  return isDiffNegative(row.diff) ? COLOR.danger : COLOR.kotGreen;
}

interface DailyTableV2Props {
  readonly rows: readonly DailyRowSummary[];
  readonly highlightedDate: string | null;
}

export function DailyTableV2({ rows, highlightedDate }: DailyTableV2Props): ReactElement {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e6ecec] bg-white">
      <div className="flex items-baseline justify-between border-b border-[#eef2f2] px-5 pt-4 pb-3">
        <span className="text-sm font-bold" style={{ color: COLOR.textPrimary }}>
          日別勤怠
        </span>
        <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
          カレンダーのセルをクリックすると該当行にスクロール
        </span>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#eef2f2]">
            <Th>日付</Th>
            <Th align="right">実績</Th>
            <Th align="right">当日</Th>
            <Th align="right" accent>
              時間貯金
            </Th>
            <Th align="right">休憩</Th>
            <Th className="min-w-[220px]">一日の流れ</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const segments = buildTimelineSegments(
              row.startTime,
              row.endTime,
              row.breakStarts,
              row.breakEnds,
            );
            const highlighted = highlightedDate === row.date;
            return (
              <tr
                key={row.date}
                id={`daily-row-${row.date.slice(0, 5).replace("/", "-")}`}
                className="border-b border-[#f4f7f7] transition-colors"
                style={{ backgroundColor: highlighted ? COLOR.accentPale : undefined }}
              >
                <td
                  className="px-3 py-[9px]"
                  style={{ borderLeft: `3px solid ${stripeColor(row)}` }}
                >
                  <div className="flex items-center gap-[7px]">
                    <span className="font-bold" style={{ ...TABULAR, color: COLOR.textPrimary }}>
                      {row.date.slice(0, 5)}
                    </span>
                    <span className="text-[11px]" style={{ color: COLOR.textMuted }}>
                      {row.date.slice(5)}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ ...TABULAR, color: COLOR.textFaint }}>
                    {formatAttendance(row.startTime, row.endTime)}
                  </span>
                </td>
                <td
                  className="px-3 py-[9px] text-right"
                  style={{ ...TABULAR, color: COLOR.textPrimary }}
                >
                  {row.actual === null ? "—" : formatHM(row.actual)}
                </td>
                <td
                  className="px-3 py-[9px] text-right text-xs"
                  style={{ ...TABULAR, color: COLOR.textQuaternary }}
                >
                  {row.diff === null ? "" : formatDiff(row.diff)}
                </td>
                <td
                  className="px-3 py-[9px] text-right text-[15px] font-bold"
                  style={{ ...TABULAR, color: savingsColor(row.cumulativeDiff) }}
                >
                  {row.cumulativeDiff === null ? "—" : formatDiff(row.cumulativeDiff)}
                </td>
                <td
                  className="px-3 py-[9px] text-right"
                  style={{ ...TABULAR, color: COLOR.textTertiary }}
                >
                  {row.breakTime === null ? "" : formatHM(row.breakTime)}
                </td>
                <td className="px-3 py-[9px]">
                  <div
                    className="relative h-4 overflow-hidden rounded"
                    style={{ backgroundColor: COLOR.surface }}
                  >
                    {GUIDE_HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute inset-y-0 w-px"
                        style={{
                          backgroundColor: COLOR.border,
                          left: `${((hour - SCALE_MIN) / SCALE_SPAN) * 100}%`,
                        }}
                      />
                    ))}
                    {segments.map((segment) => {
                      const left = Math.max(
                        0,
                        ((segment.startHour - SCALE_MIN) / SCALE_SPAN) * 100,
                      );
                      const right = Math.min(
                        100,
                        ((segment.endHour - SCALE_MIN) / SCALE_SPAN) * 100,
                      );
                      return (
                        <div
                          key={`${segment.type}-${segment.startLabel}-${segment.endLabel}`}
                          className="absolute top-0 h-full"
                          style={{
                            backgroundColor: segment.type === "work" ? COLOR.work : COLOR.rest,
                            left: `${left}%`,
                            width: `${Math.max(0, right - left)}%`,
                          }}
                          title={`${segment.type === "work" ? "稼働" : "休憩"}: ${segment.startLabel} 〜 ${segment.endLabel}（${segment.durationLabel}）`}
                        />
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
  accent = false,
  className = "",
}: {
  children: string;
  align?: "left" | "right";
  accent?: boolean;
  className?: string;
}): ReactElement {
  return (
    <th
      className={`h-[34px] px-3 text-[11px] font-bold ${align === "right" ? "text-right" : "text-left"} ${className}`}
      style={{ color: accent ? COLOR.accent : COLOR.textMuted }}
    >
      {children}
    </th>
  );
}
