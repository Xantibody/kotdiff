import { useState } from "react";
import type { DashboardSummary } from "../../domain/aggregates/WorkMonth";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CumulativeDiffChart } from "./charts/CumulativeDiffChart";
import { DailyHoursChart } from "./charts/DailyHoursChart";
import { WorkRangeChart } from "./charts/WorkRangeChart";
import { OvertimeGauge } from "./charts/OvertimeGauge";
import { LeaveBalanceChart } from "./charts/LeaveBalanceChart";
import { WeekdayAvgChart } from "./charts/WeekdayAvgChart";

type ChartType =
  | "cumulative-diff"
  | "daily-hours"
  | "weekday-avg"
  | "work-range"
  | "overtime-gauge"
  | "leave-balance";

const CHARTS: { type: ChartType; label: string }[] = [
  { type: "cumulative-diff", label: "累積差分" },
  { type: "daily-hours", label: "日別労働時間" },
  { type: "weekday-avg", label: "曜日別平均" },
  { type: "work-range", label: "出退勤レンジ" },
  { type: "overtime-gauge", label: "残業ゲージ" },
  { type: "leave-balance", label: "休暇残日数" },
];

interface ChartPanelProps {
  summary: DashboardSummary;
}

export function ChartPanel({ summary }: ChartPanelProps) {
  const [active, setActive] = useState<ChartType>("cumulative-diff");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>チャート</CardTitle>
          <div className="flex gap-1">
            {CHARTS.map((c) => (
              <button
                key={c.type}
                onClick={() => setActive(c.type)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  active === c.type
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div key={active} className="chart-container">
          {active === "cumulative-diff" && <CumulativeDiffChart rows={summary.dailyRows} />}
          {active === "daily-hours" && <DailyHoursChart rows={summary.dailyRows} />}
          {active === "weekday-avg" && <WeekdayAvgChart rows={summary.dailyRows} />}
          {active === "work-range" && <WorkRangeChart rows={summary.dailyRows} />}
          {active === "overtime-gauge" && <OvertimeGauge totalOvertime={summary.totalOvertime} />}
          {active === "leave-balance" && (
            <LeaveBalanceChart leaveBalances={summary.leaveBalances} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
