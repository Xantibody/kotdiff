import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";
import { parseTimeRecord } from "../../../domain/value-objects/TimeRecord";
import { linearScale } from "../../lib/svg";

interface WorkRangeChartProps {
  rows: readonly DailyRowSummary[];
}

const W = 700;
const H = 300;
const PAD = { top: 20, right: 30, bottom: 40, left: 50 };
const TIME_MIN = 6;
const TIME_MAX = 24;
const GUIDE_HOURS = [9, 12, 18];

export function WorkRangeChart({ rows }: WorkRangeChartProps) {
  const items = rows
    .filter((r) => r.type === "worked" && r.startTime !== null && r.endTime !== null)
    .flatMap((r, i) => {
      if (r.startTime === null || r.endTime === null) return [];
      const start = parseTimeRecord(r.startTime);
      const end = parseTimeRecord(r.endTime);
      if (start === null || end === null) return [];
      const breaks: { start: number; end: number }[] = [];
      const pairCount = Math.min(r.breakStarts.length, r.breakEnds.length);
      for (let j = 0; j < pairCount; j++) {
        const bs = parseTimeRecord(r.breakStarts[j] ?? "");
        const be = parseTimeRecord(r.breakEnds[j] ?? "");
        if (bs !== null && be !== null) breaks.push({ start: bs, end: be });
      }
      return [{ index: i, start, end, breaks, date: r.date }];
    });

  if (items.length === 0) {
    return <p className="text-center text-gray-400 py-8">データがありません</p>;
  }

  const chartW = W - PAD.left - PAD.right;
  const barWidth = Math.min((chartW / items.length) * 0.6, 20);
  const gap = (chartW - barWidth * items.length) / (items.length + 1);

  const yScale = linearScale([TIME_MIN, TIME_MAX], [PAD.top, H - PAD.bottom]);

  const timeLabels = [6, 9, 12, 15, 18, 21, 24];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="出退勤レンジチャート"
    >
      {/* Guide lines */}
      {GUIDE_HOURS.map((h) => (
        <line
          key={h}
          x1={PAD.left}
          y1={yScale(h)}
          x2={W - PAD.right}
          y2={yScale(h)}
          stroke="#e5e7eb"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}
      {/* Y-axis time labels */}
      {timeLabels.map((h) => (
        <text
          key={h}
          x={PAD.left - 8}
          y={yScale(h) + 4}
          textAnchor="end"
          fontSize="11"
          fill="#6b7280"
        >
          {h}:00
        </text>
      ))}
      {/* Work range bars */}
      {items.map((item) => {
        const x = PAD.left + gap + item.index * (barWidth + gap);
        const y1 = yScale(item.start);
        const y2 = yScale(item.end);

        const segments: { y: number; h: number; type: "work" | "break" }[] = [];
        let cursor = item.start;
        const sortedBreaks = item.breaks.toSorted((a, b) => a.start - b.start);

        for (const brk of sortedBreaks) {
          if (brk.start > cursor) {
            segments.push({
              y: yScale(cursor),
              h: yScale(brk.start) - yScale(cursor),
              type: "work",
            });
          }
          segments.push({
            y: yScale(brk.start),
            h: yScale(brk.end) - yScale(brk.start),
            type: "break",
          });
          cursor = brk.end;
        }
        if (cursor < item.end) {
          segments.push({ y: yScale(cursor), h: yScale(item.end) - yScale(cursor), type: "work" });
        }

        return (
          <g key={item.index}>
            {/* Full range background */}
            <rect x={x} y={y1} width={barWidth} height={y2 - y1} fill="#e5e7eb" rx={2} />
            {/* Segments */}
            {segments.map((seg, si) => (
              <rect
                key={si}
                x={x}
                y={seg.y}
                width={barWidth}
                height={seg.h}
                fill={seg.type === "work" ? "#3b82f6" : "#fbbf24"}
                rx={2}
                opacity={0.8}
                className="chart-bar"
                style={{ "--bar-delay": `${item.index * 0.03}s` }}
              />
            ))}
            {/* X label */}
            {item.index % Math.max(1, Math.floor(items.length / 12)) === 0 && (
              <text
                x={x + barWidth / 2}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {item.date.slice(0, 5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
