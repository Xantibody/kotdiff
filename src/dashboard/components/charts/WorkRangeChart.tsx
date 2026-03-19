import { useMemo, useState } from "react";
import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";
import { parseTimeRecord } from "../../../domain/value-objects/TimeRecord";
import { linearScale } from "../../lib/svg";
import { extractWeekday } from "../../lib/chart-calculations";

interface WorkRangeChartProps {
  rows: readonly DailyRowSummary[];
}

const W = 700;
const H = 300;
const PAD = { top: 20, right: 30, bottom: 40, left: 50 };

function fmtHour(h: number): string {
  const hh = h % 24;
  return `${hh}:00`;
}

function fmtTime(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

type TooltipState = { cx: number; cy: number; date: string; start: number; end: number } | null;

export function WorkRangeChart({ rows }: WorkRangeChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const { items, yScale, timeLabels, barWidth, gap, weekdayAvgRange } = useMemo(() => {
    const items = rows
      .filter((r) => r.type === "worked" && r.startTime !== null && r.endTime !== null)
      .flatMap((r, i) => {
        if (r.startTime === null || r.endTime === null) return [];
        const start = parseTimeRecord(r.startTime);
        let end = parseTimeRecord(r.endTime);
        if (start === null || end === null) return [];
        // Day-crossing: end time is next-day (e.g. 01:00 after a night shift starting at 20:00)
        if (end <= start) end = end + 24;
        const breaks: { start: number; end: number }[] = [];
        const pairCount = Math.min(r.breakStarts.length, r.breakEnds.length);
        for (let j = 0; j < pairCount; j++) {
          const bs = parseTimeRecord(r.breakStarts[j] ?? "");
          const be = parseTimeRecord(r.breakEnds[j] ?? "");
          if (bs !== null && be !== null) {
            // Align break times to the same domain as start/end
            const adjBs = bs < start ? bs + 24 : bs;
            const adjBe = be < start ? be + 24 : be;
            breaks.push({ start: adjBs, end: adjBe });
          }
        }
        return [{ index: i, start, end, breaks, date: r.date }];
      });

    if (items.length === 0) {
      return {
        items,
        yScale: linearScale([0, 24], [PAD.top, H - PAD.bottom]),
        timeLabels: [],
        barWidth: 20,
        gap: 0,
        weekdayAvgRange: new Map<string, { avgStart: number; avgEnd: number }>(),
      };
    }

    // Compute dynamic time bounds from actual data
    const allStarts = items.map((it) => it.start);
    const allEnds = items.map((it) => it.end);
    const rawMin = Math.min(...allStarts);
    const rawMax = Math.max(...allEnds);
    const TIME_MIN = Math.floor(rawMin) - 1;
    const TIME_MAX = Math.ceil(rawMax) + 1;

    const chartW = W - PAD.left - PAD.right;
    const barWidth = Math.min((chartW / items.length) * 0.6, 20);
    const gap = (chartW - barWidth * items.length) / (items.length + 1);

    const yScale = linearScale([TIME_MIN, TIME_MAX], [PAD.top, H - PAD.bottom]);

    // Compute weekday average start/end times for reference lines
    const weekdayBuckets = new Map<string, { starts: number[]; ends: number[] }>();
    for (const item of items) {
      const wd = extractWeekday(item.date);
      if (wd === null) continue;
      const bucket = weekdayBuckets.get(wd);
      if (bucket !== undefined) {
        bucket.starts.push(item.start);
        bucket.ends.push(item.end);
      } else {
        weekdayBuckets.set(wd, { starts: [item.start], ends: [item.end] });
      }
    }
    const weekdayAvgRange = new Map<string, { avgStart: number; avgEnd: number }>();
    for (const [wd, { starts, ends }] of weekdayBuckets) {
      if (starts.length === 0) continue;
      const avgStart = starts.reduce((a, b) => a + b, 0) / starts.length;
      const avgEnd = ends.reduce((a, b) => a + b, 0) / ends.length;
      weekdayAvgRange.set(wd, { avgStart, avgEnd });
    }

    // Generate hourly labels every 3h within bounds
    const timeLabels: number[] = [];
    const labelStep = TIME_MAX - TIME_MIN > 18 ? 6 : 3;
    for (let h = Math.ceil(TIME_MIN / labelStep) * labelStep; h <= TIME_MAX; h += labelStep) {
      timeLabels.push(h);
    }

    return { items, yScale, timeLabels, barWidth, gap, weekdayAvgRange };
  }, [rows]);

  if (items.length === 0) {
    return <p className="text-center text-gray-400 py-8">データがありません</p>;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="出退勤レンジチャート"
    >
      {/* Guide lines */}
      {timeLabels.map((h) => (
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
          {fmtHour(h)}
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

        const cx = Math.min(Math.max(x + barWidth / 2, 50), W - 50);
        const cy = y1 < 60 ? y2 + 48 : y1 - 8;

        const wd = extractWeekday(item.date);
        const avgRange = wd !== null ? weekdayAvgRange.get(wd) : undefined;

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
            {/* Weekday average reference lines */}
            {avgRange !== undefined && (
              <>
                <line
                  x1={x - 2}
                  y1={yScale(avgRange.avgStart)}
                  x2={x + barWidth + 2}
                  y2={yScale(avgRange.avgStart)}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  pointerEvents="none"
                />
                <line
                  x1={x - 2}
                  y1={yScale(avgRange.avgEnd)}
                  x2={x + barWidth + 2}
                  y2={yScale(avgRange.avgEnd)}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  pointerEvents="none"
                />
              </>
            )}
            {/* Tooltip hit area */}
            <rect
              x={x}
              y={y1}
              width={barWidth}
              height={y2 - y1}
              fill="transparent"
              stroke="none"
              pointerEvents="all"
              style={{ cursor: "default" }}
              onMouseEnter={() =>
                setTooltip({ cx, cy, date: item.date, start: item.start, end: item.end })
              }
              onMouseLeave={() => setTooltip(null)}
            />
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
      {/* Tooltip */}
      {tooltip && (
        <g pointerEvents="none">
          <rect
            x={tooltip.cx - 48}
            y={tooltip.cy - 40}
            width={96}
            height={36}
            fill="#1f2937"
            rx={4}
          />
          <text
            x={tooltip.cx}
            y={tooltip.cy - 24}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="white"
          >
            {tooltip.date.slice(0, 5)}
          </text>
          <text x={tooltip.cx} y={tooltip.cy - 10} textAnchor="middle" fontSize="10" fill="#d1d5db">
            {fmtTime(tooltip.start)} – {fmtTime(tooltip.end)}
          </text>
        </g>
      )}
    </svg>
  );
}
