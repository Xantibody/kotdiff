import type { DailyRowSummary } from "../../../dashboard-data";
import { DEFAULT_EXPECTED_HOURS, formatHM } from "../../../worktime";
import { generateTicks, linearScale } from "../../lib/svg";

interface WeekdayAvgChartProps {
  rows: DailyRowSummary[];
}

const W = 700;
const H = 300;
const PAD = { top: 20, right: 30, bottom: 40, left: 50 };

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金"];

function extractWeekday(date: string): string | null {
  const m = date.match(/[（(]([月火水木金土日])[）)]/);
  return m ? m[1] : null;
}

export function WeekdayAvgChart({ rows }: WeekdayAvgChartProps) {
  const buckets = new Map<string, number[]>();
  for (const label of WEEKDAY_LABELS) {
    buckets.set(label, []);
  }

  for (const r of rows) {
    if (r.actual === null || r.isWeekend) continue;
    const wd = extractWeekday(r.date);
    if (wd && buckets.has(wd)) {
      buckets.get(wd)!.push(r.actual);
    }
  }

  const bars = WEEKDAY_LABELS.map((label, i) => {
    const vals = buckets.get(label)!;
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const count = vals.length;
    return { label, index: i, avg, count };
  }).filter((b) => b.count > 0);

  if (bars.length === 0) {
    return <p className="text-center text-gray-400 py-8">データがありません</p>;
  }

  const maxVal = Math.max(...bars.map((b) => b.avg), DEFAULT_EXPECTED_HOURS + 0.5);
  const ticks = generateTicks(0, maxVal, 6);

  const chartW = W - PAD.left - PAD.right;
  const barWidth = Math.min((chartW / bars.length) * 0.5, 60);
  const gap = (chartW - barWidth * bars.length) / (bars.length + 1);

  const yScale = linearScale([0, ticks[ticks.length - 1]], [H - PAD.bottom, PAD.top]);
  const refY = yScale(DEFAULT_EXPECTED_HOURS);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="曜日別平均労働時間チャート"
    >
      {/* Grid lines */}
      {ticks.map((t) => (
        <line
          key={t}
          x1={PAD.left}
          y1={yScale(t)}
          x2={W - PAD.right}
          y2={yScale(t)}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}
      {/* 8h reference line */}
      <line
        x1={PAD.left}
        y1={refY}
        x2={W - PAD.right}
        y2={refY}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={W - PAD.right + 4} y={refY + 4} fontSize="10" fill="#9ca3af">
        {DEFAULT_EXPECTED_HOURS}h
      </text>
      {/* Y-axis labels */}
      {ticks.map((t) => (
        <text
          key={t}
          x={PAD.left - 8}
          y={yScale(t) + 4}
          textAnchor="end"
          fontSize="11"
          fill="#6b7280"
        >
          {formatHM(t)}
        </text>
      ))}
      {/* Bars */}
      {bars.map((b) => {
        const x = PAD.left + gap + b.index * (barWidth + gap);
        const barH = yScale(0) - yScale(b.avg);
        const color = b.avg >= DEFAULT_EXPECTED_HOURS ? "#3b82f6" : "#f97316";
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={yScale(b.avg)}
              width={barWidth}
              height={barH}
              fill={color}
              rx={3}
              opacity={0.8}
              className="chart-bar"
              style={{ "--bar-delay": `${b.index * 0.08}s` } as React.CSSProperties}
            />
            {/* Value label on top */}
            <text
              x={x + barWidth / 2}
              y={yScale(b.avg) - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill={color}
            >
              {formatHM(b.avg)}
            </text>
            {/* Weekday label */}
            <text
              x={x + barWidth / 2}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize="13"
              fontWeight="bold"
              fill="#374151"
            >
              {b.label}
            </text>
            {/* Count */}
            <text
              x={x + barWidth / 2}
              y={H - PAD.bottom + 30}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              ({b.count}日)
            </text>
          </g>
        );
      })}
    </svg>
  );
}
