import type { ReactElement, ReactNode } from "react";
import type { CalendarDay, CalendarDayState, CalendarWeek } from "../../lib/calendar";
import { buildMiniBars } from "../../lib/calendar";
import { formatDiff, formatHM } from "../../../domain/value-objects/WorkDuration";
import { formatAttendance } from "../../lib/utils";
import { COLOR } from "../../lib/tokens";

// 1-D のカレンダー。月全体の「働いた形」を 1 画面で見せる。
// たたんだ状態は ± のミニバーだけ、開くと週合計つきの詳細セル。

const TABULAR = { fontVariantNumeric: "tabular-nums" } as const;

// TimelineBar と同じ 5:00〜翌 5:00 の座標系
const SCALE_MIN = 5;
const SCALE_SPAN = 24;
const GUIDE_HOURS = [12, 18, 24];
// 凡例に出す目盛。6:00 から 6 時間おき
const AXIS_HOURS = [6, 12, 18, 24];

function toPercent(hour: number): number {
  return ((hour - SCALE_MIN) / SCALE_SPAN) * 100;
}

const STATE_COLORS: Record<CalendarDayState, string> = {
  over: "#4caf50",
  under: "#e57373",
  attention: "#ef6c00",
  holiday: "#eceff1",
  future: "#eceff1",
};

interface CellStyle {
  readonly background: string;
  readonly border: string;
}

function cellStyle(day: CalendarDay): CellStyle {
  const diff = day.diff ?? 0;
  if (day.state === "over") {
    return {
      background: diff >= 1.5 ? "#c8e6c9" : "#e8f5e9",
      border: "1px solid #a5d6a7",
    };
  }
  if (day.state === "under") {
    return {
      background: diff <= -1.5 ? "#ffcdd2" : "#ffebee",
      border: "1px solid #ef9a9a",
    };
  }
  if (day.state === "attention") {
    return { background: COLOR.attentionSurface, border: `1px solid ${COLOR.attentionBorder}` };
  }
  if (day.state === "holiday") {
    return { background: "#fafafa", border: "1px solid #eceff1" };
  }
  // これからの稼働日は「まだ何も起きていない」ことが伝わるよう破線にする
  return { background: "#fff", border: "1px dashed #cfd8dc" };
}

function weekdayColor(weekday: number): string {
  if (weekday === 0) {
    return "#e05c55";
  }
  if (weekday === 6) {
    return "#4b74c4";
  }
  return COLOR.textTertiary;
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

function MiniTimeline({ day }: { day: CalendarDay }): ReactElement {
  return (
    <div
      className="relative h-1.5 overflow-hidden rounded-[3px] bg-white"
      style={{ border: "1px solid #edf1f1" }}
    >
      {GUIDE_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-y-0 w-px"
          style={{ backgroundColor: "#f0f3f3", left: `${toPercent(hour)}%` }}
        />
      ))}
      {day.segments.map((segment) => {
        const left = Math.max(0, toPercent(segment.startHour));
        const width = Math.max(0, Math.min(100, toPercent(segment.endHour)) - left);
        return (
          <div
            key={`${segment.type}-${segment.startLabel}-${segment.endLabel}`}
            className="absolute top-0 h-full"
            style={{
              backgroundColor: segment.type === "work" ? COLOR.work : COLOR.rest,
              left: `${left}%`,
              width: `${width}%`,
            }}
            title={`${segment.type === "work" ? "稼働" : "休憩"}: ${segment.startLabel} 〜 ${segment.endLabel}（${segment.durationLabel}）`}
          />
        );
      })}
    </div>
  );
}

interface DayCellProps {
  readonly day: CalendarDay;
  readonly paceLabel: string | null;
  readonly onSelect: (date: string) => void;
}

function DayCell({ day, paceLabel, onSelect }: DayCellProps): ReactElement {
  const style = cellStyle(day);
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(day.date);
      }}
      className="flex min-h-[84px] flex-col gap-1.5 rounded-[7px] px-[9px] pt-[7px] pb-2 text-left"
      style={{ background: style.background, border: style.border }}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span
          className="text-xs font-bold"
          style={{ ...TABULAR, color: weekdayColor(day.weekday) }}
        >
          {day.day}
        </span>
        {day.isToday && (
          <span
            className="rounded-lg px-1.5 py-px text-xs font-bold"
            style={{ backgroundColor: COLOR.accent, color: "#fff" }}
          >
            今日
          </span>
        )}
        <span
          className="text-[14px] font-black tracking-[-.01em]"
          style={{ ...TABULAR, color: valueColor(day) }}
        >
          {day.diff === null ? "—" : formatDiff(day.diff)}
        </span>
      </div>
      <MiniTimeline day={day} />
      <div className="flex items-baseline justify-between gap-1.5 text-xs leading-[1.5]">
        <span style={{ ...TABULAR, color: "#8c9ea3" }}>
          {formatAttendance(day.startTime, day.endTime)}
        </span>
        <span style={{ ...TABULAR, color: COLOR.textTertiary, fontWeight: 700 }}>
          {day.actual === null ? "" : formatHM(day.actual)}
        </span>
      </div>
      <div
        className="flex items-baseline justify-between gap-1.5 text-xs leading-[1.5]"
        style={{ color: COLOR.textQuaternary }}
      >
        <span>{day.breakTime === null ? "" : `休憩 ${formatHM(day.breakTime)}`}</span>
        {day.state === "future" && paceLabel !== null && (
          <span style={{ ...TABULAR, color: COLOR.textMuted }}>{paceLabel}</span>
        )}
      </div>
    </button>
  );
}

interface MonthCalendarProps {
  readonly weeks: readonly CalendarWeek[];
  readonly daysLabel: string;
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
  readonly onSelectDate: (date: string) => void;
  readonly savingsLabel: string;
  readonly savingsNegative: boolean;
  readonly paceLabel: string | null;
}

export function MonthCalendar({
  weeks,
  daysLabel,
  open,
  onToggle,
  onSelectDate,
  savingsLabel,
  savingsNegative,
  paceLabel,
}: MonthCalendarProps): ReactElement {
  const bars = buildMiniBars(weeks);
  const first = bars.at(0);
  const last = bars.at(-1);

  return (
    <div className="rounded-[10px] border border-[#e6ecec] bg-white px-[18px] py-4">
      <button
        type="button"
        onClick={() => {
          onToggle(!open);
        }}
        className="flex w-full items-center gap-3.5 rounded-md border border-[#eef2f2] px-3.5 py-[9px]"
        style={{ backgroundColor: COLOR.surfaceFaint }}
      >
        <span className="text-xs font-bold" style={{ color: COLOR.accent }}>
          {open ? "▾ 今月のカレンダー" : "▸ 今月のカレンダー"}
        </span>
        <span className="text-xs" style={{ color: COLOR.textMuted }}>
          {first?.date.slice(0, 5)}
        </span>
        <span className="text-xs" style={{ color: COLOR.textTertiary }}>
          {daysLabel}
        </span>
        <div className="flex h-7 flex-1 items-center gap-0.5">
          {bars.map((bar) => (
            <div key={bar.date} className="flex h-full flex-1 flex-col justify-center">
              <div className="flex h-3 items-end">
                <div
                  className="w-full"
                  style={{ backgroundColor: STATE_COLORS[bar.state], height: bar.upPixels }}
                />
              </div>
              <div className="h-px" style={{ backgroundColor: "#dde5e6" }} />
              <div className="h-3">
                <div
                  className="w-full"
                  style={{ backgroundColor: STATE_COLORS[bar.state], height: bar.downPixels }}
                />
              </div>
            </div>
          ))}
        </div>
        <span className="text-xs" style={{ color: COLOR.textMuted }}>
          {last?.date.slice(0, 5)}
        </span>
        <span className="text-xs" style={{ color: COLOR.textTertiary }}>
          累計{" "}
          <b style={{ ...TABULAR, color: savingsNegative ? COLOR.danger : COLOR.accent }}>
            {savingsLabel}
          </b>
        </span>
      </button>

      {open && (
        <div className="mt-3.5 flex flex-col gap-3.5">
          {/* 各セルの帯が何時を指すかは凡例が 1 本ないと読めない */}
          <div className="flex items-end justify-end gap-2.5">
            <span className="pb-0.5 text-xs" style={{ color: COLOR.textMuted }}>
              帯の時間軸
            </span>
            <div className="flex w-[250px] flex-col gap-[3px]">
              <div className="relative h-[7px] rounded" style={{ backgroundColor: COLOR.divider }}>
                {AXIS_HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-y-0 w-px"
                    style={{ backgroundColor: "#cfd8dc", left: `${toPercent(hour)}%` }}
                  />
                ))}
              </div>
              <div className="relative h-3 text-xs" style={{ color: COLOR.textQuaternary }}>
                {AXIS_HOURS.map((hour) => (
                  <span
                    key={hour}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${toPercent(hour)}%` }}
                  >
                    {hour % 24 === 0 ? 24 : hour % 24}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(7,1fr)_104px] gap-[7px]">
            {["日", "月", "火", "水", "木", "金", "土"].map((label, index) => (
              <span
                key={label}
                className="text-center text-xs font-bold"
                style={{ color: weekdayColor(index) }}
              >
                {label}
              </span>
            ))}
            <span className="text-right text-xs font-bold" style={{ color: COLOR.textMuted }}>
              週合計
            </span>
            {weeks.map((week) => (
              <WeekRow
                key={week.label}
                week={week}
                paceLabel={paceLabel}
                onSelectDate={onSelectDate}
              />
            ))}
          </div>
          <div
            className="flex flex-wrap items-center gap-4 border-t border-[#eef2f2] pt-2.5 text-xs"
            style={{ color: COLOR.textTertiary }}
          >
            <LegendSwatch color={COLOR.work}>稼働</LegendSwatch>
            <LegendSwatch color={COLOR.rest}>休憩</LegendSwatch>
            <LegendBox background="#c8e6c9" border="#a5d6a7">
              +1:30 以上
            </LegendBox>
            <LegendBox background="#ffcdd2" border="#ef9a9a">
              -1:30 以下
            </LegendBox>
            <LegendBox background="#fff" border="#cfd8dc" dashed>
              これからの稼働日{paceLabel === null ? "" : `（薄い数字＝推奨ペース ${paceLabel}）`}
            </LegendBox>
            <span className="ml-auto">セルをクリック → 日別テーブルの該当行へ</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekRow({
  week,
  paceLabel,
  onSelectDate,
}: {
  week: CalendarWeek;
  paceLabel: string | null;
  onSelectDate: (date: string) => void;
}): ReactElement {
  return (
    <>
      {week.cells.map((cell, index) =>
        cell === null ? (
          // eslint-disable-next-line react/no-array-index-key -- 空きマスは日付を持たないので位置が唯一の識別子
          <div key={`${week.label}-empty-${index}`} />
        ) : (
          <DayCell key={cell.date} day={cell} paceLabel={paceLabel} onSelect={onSelectDate} />
        ),
      )}
      <div
        className="flex flex-col justify-center gap-0.5 rounded-[7px] border border-[#e0eaea] px-2.5 pt-[7px] pb-2 text-right"
        style={{ backgroundColor: COLOR.surfaceSoft }}
      >
        <span className="text-xs" style={{ color: COLOR.textMuted }}>
          {week.label} ・ {week.workedDays}日
        </span>
        <span className="text-[15px] font-black" style={{ ...TABULAR, color: COLOR.textPrimary }}>
          {formatHM(week.total)}
        </span>
        <span
          className="text-xs font-bold"
          style={{ ...TABULAR, color: week.diff < 0 ? COLOR.danger : "#2e7d32" }}
        >
          {formatDiff(week.diff)}
        </span>
      </div>
    </>
  );
}

function LegendSwatch({ color, children }: { color: string; children: string }): ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-5 rounded-[3px]"
        style={{ backgroundColor: color, display: "inline-block" }}
      />
      {children}
    </span>
  );
}

function LegendBox({
  background,
  border,
  dashed = false,
  children,
}: {
  background: string;
  border: string;
  dashed?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-[13px] w-[13px] rounded-[3px]"
        style={{
          background,
          border: `1px ${dashed ? "dashed" : "solid"} ${border}`,
          display: "inline-block",
        }}
      />
      {children}
    </span>
  );
}
