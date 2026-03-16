import type { DailyRowSummary } from "../../../worktime";
import { DEFAULT_EXPECTED_HOURS, formatHM } from "../../../worktime";
import { generateTicks, linearScale } from "../../lib/svg";

interface DailyHoursChartProps {
  rows: DailyRowSummary[];
}

const W = 700;
const H = 300;
const PAD = { top: 20, right: 30, bottom: 40, left: 50 };

export function DailyHoursChart({ rows }: DailyHoursChartProps) {
  const bars = rows
    .filter((r) => r.actual !== null && !r.isWeekend)
    .map((r, i) => ({ index: i, actual: r.actual!, date: r.date }));

  if (bars.length === 0) {
    return <p className="text-center text-gray-400 py-8">データがありません</p>;
  }

  const maxVal = Math.max(...bars.map((b) => b.actual), DEFAULT_EXPECTED_HOURS + 1);
  const ticks = generateTicks(0, maxVal, 6);

  const chartW = W - PAD.left - PAD.right;
  const barWidth = Math.min((chartW / bars.length) * 0.7, 30);
  const gap = (chartW - barWidth * bars.length) / (bars.length + 1);

  const yScale = linearScale([0, ticks[ticks.length - 1]], [H - PAD.bottom, PAD.top]);
  const refY = yScale(DEFAULT_EXPECTED_HOURS);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="日別労働時間チャート"
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
        const barH = yScale(0) - yScale(b.actual);
        const color = b.actual >= DEFAULT_EXPECTED_HOURS ? "#3b82f6" : "#f97316";
        return (
          <g key={b.index}>
            <rect
              x={x}
              y={yScale(b.actual)}
              width={barWidth}
              height={barH}
              fill={color}
              rx={2}
              opacity={0.8}
              className="chart-bar"
              style={{ "--bar-delay": `${b.index * 0.03}s` } as React.CSSProperties}
            />
            {b.index % Math.max(1, Math.floor(bars.length / 12)) === 0 && (
              <text
                x={x + barWidth / 2}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {b.date.slice(0, 5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
