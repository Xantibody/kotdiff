import { Clock, CalendarDays, TrendingUp, AlertTriangle } from "lucide-react";
import type { DashboardSummary } from "../../domain/aggregates/WorkMonth";
import { DEFAULT_EXPECTED_HOURS, OVERTIME_LIMIT } from "../../domain/constants";
import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { SemicircleProgress } from "./SemicircleProgress";

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const remainingRequired = summary.remainingDays * DEFAULT_EXPECTED_HOURS - summary.cumulativeDiff;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">時間貯金</CardTitle>
          <Clock className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`text-2xl font-bold ${summary.cumulativeDiff >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatDiff(summary.cumulativeDiff)}
              </div>
              <p className="text-xs text-gray-500">
                {summary.workedDays}日勤務済み / {summary.totalWorkDays}日
              </p>
            </div>
            <SemicircleProgress percent={summary.progressPercent} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">残り日数</CardTitle>
          <CalendarDays className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.remainingDays}日</div>
          <p className="text-xs text-gray-500">
            {remainingRequired > 0 ? `必要時間 ${formatHM(remainingRequired)}` : "目標クリア済み"}
          </p>
          {summary.projectedTotal > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              着地予想 {formatHM(summary.projectedTotal)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">1日あたり平均</CardTitle>
          <TrendingUp className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {summary.workedDays > 0 ? formatHM(summary.avgWorkTime) : "-"}
            </span>
            {summary.workedDays > 0 && summary.avgWorkTime > DEFAULT_EXPECTED_HOURS && (
              <Badge variant="success">余裕あり</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {summary.remainingDays > 0 && remainingRequired > 0
              ? `目標達成には ${formatHM(remainingRequired / summary.remainingDays)}/日`
              : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">残業</CardTitle>
          <AlertTriangle className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHM(summary.totalOvertime)}</div>
          {summary.totalNightOvertime > 0 && (
            <p className="text-xs text-gray-500">うち深夜 {formatHM(summary.totalNightOvertime)}</p>
          )}
          <div className="mt-1">
            {summary.totalOvertime >= OVERTIME_LIMIT ? (
              <Badge variant="destructive">45時間超過</Badge>
            ) : summary.totalOvertime > OVERTIME_LIMIT * 0.8 ? (
              <Badge variant="warning">注意</Badge>
            ) : (
              <Badge variant="success">正常</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
