import type { ReactElement, ReactNode } from "react";
import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { formatAttendance } from "../lib/utils";
import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
import { requiredBreakFor } from "../../domain/services/BreakSufficiencyService";
import { buildTimelineSegments } from "../lib/timeline";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { TimelineBar } from "./TimelineBar";
import { BreakTooltip } from "./BreakTooltip";

interface DailyTableProps {
  rows: readonly DailyRowSummary[];
}

export function DailyTable({ rows }: DailyTableProps): ReactElement {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="p-6 pb-4">
        <h2 className="font-semibold leading-none tracking-tight">日別勤怠</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>実績</TableHead>
            <TableHead className="text-right">差分</TableHead>
            <TableHead className="text-right">累積差分</TableHead>
            <TableHead className="text-right">休憩</TableHead>
            <TableHead className="min-w-[200px]">一日の流れ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const segments = buildTimelineSegments(
              row.startTime,
              row.endTime,
              row.breakStarts,
              row.breakEnds,
            );
            const attendance = formatAttendance(row.startTime, row.endTime);

            // 行の背景色 (ネストした三項演算子を避けるため変数に抽出)
            let rowClassName = "";
            if (row.isPublicHoliday) {
              rowClassName = "bg-purple-50/40 text-gray-400";
            } else if (row.isWeekend) {
              rowClassName = "bg-blue-50/40 text-gray-400";
            }

            // 実績セルの表示内容 (公休日は "OFF" を表示しない)
            let actualContent: ReactNode;
            if (row.actual !== null) {
              actualContent = formatHM(row.actual);
            } else if (!row.isPublicHoliday && (row.isWeekend || row.expected === 0)) {
              actualContent = <span className="italic text-gray-300">OFF</span>;
            } else {
              actualContent = "-";
            }

            return (
              <TableRow key={row.date} className={rowClassName}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{row.date}</span>
                    {row.schedule !== null && row.schedule !== "" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {row.schedule}
                      </Badge>
                    )}
                  </div>
                  {attendance && <div className="text-xs text-gray-400">{attendance}</div>}
                </TableCell>
                <TableCell>{actualContent}</TableCell>
                <TableCell className="text-right">
                  {row.diff !== null ? (
                    <Badge variant={row.diff >= 0 ? "success" : "destructive"}>
                      {formatDiff(row.diff)}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${row.cumulativeDiff !== null ? (row.cumulativeDiff >= 0 ? "text-green-600" : "text-red-600") : ""}`}
                >
                  {row.cumulativeDiff !== null ? formatDiff(row.cumulativeDiff) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <BreakTooltip
                    breakTime={row.breakTime}
                    expectedBreak={row.actual !== null ? requiredBreakFor(row.actual) : 0}
                    breakStarts={row.breakStarts}
                    breakEnds={row.breakEnds}
                  />
                </TableCell>
                <TableCell>
                  <TimelineBar segments={segments} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
