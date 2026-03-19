import type { DailyRowSummary, WorkedDailyRow } from "../../../domain/aggregates/WorkMonth";
import { formatDiff } from "../../../domain/value-objects/WorkDuration";
import { generateTicks, linearScale } from "../../lib/svg";

interface CumulativeDiffChartProps {
  rows: readonly DailyRowSummary[];
}

const W = 700;
const H = 300;
const PAD = { top: 20, right: 30, bottom: 40, left: 60 };

export function CumulativeDiffChart({ rows }: CumulativeDiffChartProps) {
  const points = rows
    .filter((r): r is WorkedDailyRow => r.type === "worked")
    .map((r, i) => ({ index: i, value: r.cumulativeDiff, date: r.date }));

  if (points.length === 0) {
    return <p className="text-center text-gray-400 py-8">データがありません</p>;
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const ticks = generateTicks(minVal, maxVal, 6);

  const xScale = linearScale([0, points.length - 1], [PAD.left, W - PAD.right]);
  const yScale = linearScale(
    [ticks[0] ?? 0, ticks[ticks.length - 1] ?? 0],
    [H - PAD.bottom, PAD.top],
  );

  const polylinePoints = points.map((p) => `${xScale(p.index)},${yScale(p.value)}`).join(" ");
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const dx = xScale(curr.index) - xScale(prev.index);
    const dy = yScale(curr.value) - yScale(prev.value);
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  const zeroY = yScale(0);
  const lastPoint = points[points.length - 1];
  const lastValue = lastPoint?.value ?? 0;
  const lineColor = lastValue >= 0 ? "#16a34a" : "#dc2626";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="累積差分チャート"
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
      {/* Zero line */}
      <line
        x1={PAD.left}
        y1={zeroY}
        x2={W - PAD.right}
        y2={zeroY}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
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
          {formatDiff(t)}
        </text>
      ))}
      <g>
        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          className="chart-line"
          style={{ "--line-length": totalLength }}
        />
        {/* Area fill */}
        <polygon
          points={`${xScale(0)},${zeroY} ${polylinePoints} ${xScale(points.length - 1)},${zeroY}`}
          fill={lineColor}
          opacity={0.1}
          className="chart-area"
        />
        {/* Dots */}
        {points.map((p) => (
          <circle
            key={p.index}
            cx={xScale(p.index)}
            cy={yScale(p.value)}
            r={3}
            fill={p.value >= 0 ? "#16a34a" : "#dc2626"}
            className="chart-dot"
            style={{ "--dot-delay": `${p.index * 0.03}s` }}
          />
        ))}
      </g>
      {/* X-axis labels (every few) */}
      {points
        .filter(
          (_, i) =>
            i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === points.length - 1,
        )
        .map((p) => (
          <text
            key={p.index}
            x={xScale(p.index)}
            y={H - PAD.bottom + 18}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {p.date.slice(0, 5)}
          </text>
        ))}
    </svg>
  );
}
