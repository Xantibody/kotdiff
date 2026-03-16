import { formatHM, OVERTIME_LIMIT } from "../../../lib";

interface OvertimeGaugeProps {
  totalOvertime: number;
}

const SIZE = 240;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;

// 270-degree arc from 135deg to 405deg (bottom-left to bottom-right)
const START_ANGLE = 135;
const END_ANGLE = 405;
const ARC_DEGREES = END_ANGLE - START_ANGLE;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export function OvertimeGauge({ totalOvertime }: OvertimeGaugeProps) {
  const percent = Math.min((totalOvertime / OVERTIME_LIMIT) * 100, 120);
  const progressAngle = START_ANGLE + (ARC_DEGREES * Math.min(percent, 100)) / 100;
  const remaining = Math.max(0, OVERTIME_LIMIT - totalOvertime);

  let color: string;
  if (percent >= 80) color = "#dc2626";
  else if (percent >= 60) color = "#f59e0b";
  else color = "#16a34a";

  // Zone arcs
  const zone60End = START_ANGLE + ARC_DEGREES * 0.6;
  const zone80End = START_ANGLE + ARC_DEGREES * 0.8;

  return (
    <div className="flex flex-col items-center py-4">
      <svg width={SIZE} height={SIZE * 0.7} viewBox={`0 0 ${SIZE} ${SIZE * 0.7}`}>
        {/* Background zone arcs */}
        <path
          d={describeArc(CX, CY, RADIUS, START_ANGLE, zone60End)}
          fill="none"
          stroke="#dcfce7"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        <path
          d={describeArc(CX, CY, RADIUS, zone60End, zone80End)}
          fill="none"
          stroke="#fef9c3"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        <path
          d={describeArc(CX, CY, RADIUS, zone80End, END_ANGLE)}
          fill="none"
          stroke="#fee2e2"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        {/* Progress arc */}
        {percent > 0 && (
          <path
            d={describeArc(CX, CY, RADIUS, START_ANGLE, progressAngle)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="28" fontWeight="bold" fill={color}>
          {formatHM(totalOvertime)}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="14" fill="#6b7280">
          / {OVERTIME_LIMIT}h
        </text>
      </svg>
      <p className="text-sm text-gray-500 mt-2">
        {remaining > 0 ? `残り ${formatHM(remaining)}` : "上限超過"}
      </p>
    </div>
  );
}
