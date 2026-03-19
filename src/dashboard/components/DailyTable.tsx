import type { DailyRowSummary } from "../../domain/aggregates/WorkMonth";
import { formatAttendance } from "../lib/utils";
import { formatDiff, formatHM } from "../../domain/value-objects/WorkDuration";
import { buildTimelineSegments } from "../lib/timeline";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { TimelineBar } from "./TimelineBar";
import { BreakTooltip } from "./BreakTooltip";

interface DailyTableProps {
  rows: readonly DailyRowSummary[];
}

export function DailyTable({ rows }: DailyTableProps) {
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

            return (
              <TableRow
                key={row.date}
                className={row.isWeekend ? "bg-blue-50/40 text-gray-400" : ""}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{row.date}</span>
                    {row.schedule && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {row.schedule}
                      </Badge>
                    )}
                  </div>
                  {attendance && <div className="text-xs text-gray-400">{attendance}</div>}
                </TableCell>
                <TableCell>
                  {row.actual !== null ? (
                    formatHM(row.actual)
                  ) : row.isWeekend || row.expected === 0 ? (
                    <span className="italic text-gray-300">OFF</span>
                  ) : (
                    "-"
                  )}
                </TableCell>
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
