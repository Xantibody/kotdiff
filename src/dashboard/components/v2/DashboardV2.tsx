import { useState } from "react";
import type { ReactElement } from "react";
import type { DashboardSummary } from "../../../domain/aggregates/WorkMonth";
import { buildDashboardSummaryModel, parseMonthDay } from "../../lib/summary";
import { buildMonthCalendar } from "../../lib/calendar";
import { COLOR } from "../../lib/tokens";
import { MonthRequiredCard, SavingsCard, SupportCards, TodayCard } from "./Cards";
import { MonthCalendar } from "./MonthCalendar";
import { DailyTableV2 } from "./DailyTableV2";
import { ChartPanel } from "../ChartPanel";

interface DashboardV2Props {
  readonly summary: DashboardSummary;
  readonly generatedAt: string;
  readonly calendarOpen: boolean;
  readonly onCalendarToggle: (open: boolean) => void;
  readonly now?: Date;
}

const HIGHLIGHT_MS = 1000;

function rowElementId(date: string): string {
  return `daily-row-${date.slice(0, 5).replace("/", "-")}`;
}

function monthTitle(rows: DashboardSummary["dailyRows"], generatedAt: string): string {
  const first = rows.at(0);
  const parsed = first ? parseMonthDay(first.date) : null;
  const year = generatedAt === "" ? new Date().getFullYear() : new Date(generatedAt).getFullYear();
  return parsed === null ? "今月" : `${year}年 ${parsed.month}月`;
}

export function DashboardV2({
  summary,
  generatedAt,
  calendarOpen,
  onCalendarToggle,
  now = new Date(),
}: DashboardV2Props): ReactElement {
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  const model = buildDashboardSummaryModel(summary, now);
  const weeks = buildMonthCalendar(summary.dailyRows, now);

  const selectDate = (date: string): void => {
    setHighlightedDate(date);
    const element = document.querySelector(`#${rowElementId(date)}`);
    if (element) {
      // scrollIntoView は親要素まで巻き込んでスクロールするため window 側で位置を決める
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - 80,
        behavior: "smooth",
      });
    }
    setTimeout(() => {
      setHighlightedDate(null);
    }, HIGHLIGHT_MS);
  };

  return (
    <div
      className="min-h-screen p-[26px]"
      style={{ backgroundColor: COLOR.surface, fontFamily: '"Noto Sans JP", sans-serif' }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-[18px]">
        <div className="flex items-end justify-between">
          <h1
            className="text-[26px] font-black tracking-[-.01em]"
            style={{ color: COLOR.textPrimary }}
          >
            {monthTitle(summary.dailyRows, generatedAt)}
          </h1>
          <span className="text-xs" style={{ color: COLOR.textMuted }}>
            {generatedAt === "" ? "" : `${new Date(generatedAt).toLocaleString("ja-JP")} 更新`} ・
            KOT ページを開くと自動で同期
          </span>
        </div>

        <div className="grid grid-cols-[1.25fr_1fr_1.35fr] gap-3.5">
          <TodayCard model={model} />
          <SavingsCard model={model} summary={summary} />
          <MonthRequiredCard model={model} />
        </div>

        <SupportCards model={model} summary={summary} />

        <MonthCalendar
          weeks={weeks}
          open={calendarOpen}
          onToggle={onCalendarToggle}
          onSelectDate={selectDate}
          savingsLabel={model.month.savingsLabel}
          savingsNegative={model.month.savingsNegative}
          paceLabel={model.outlook.paceLabel}
        />

        <DailyTableV2 rows={summary.dailyRows} highlightedDate={highlightedDate} />

        <ChartPanel summary={summary} />
      </div>
    </div>
  );
}
