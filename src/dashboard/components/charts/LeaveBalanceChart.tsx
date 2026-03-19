import type { LeaveBalance } from "../../../types";

interface LeaveBalanceChartProps {
  leaveBalances: readonly LeaveBalance[];
}

const W = 700;
const ROW_H = 32;
const PAD = { top: 10, right: 60, bottom: 10, left: 120 };

export function LeaveBalanceChart({ leaveBalances }: LeaveBalanceChartProps) {
  const tracked = leaveBalances.filter((b) => b.remaining !== null);

  if (tracked.length === 0) {
    return <p className="text-center text-gray-400 py-8">休暇データがありません</p>;
  }

  const H = PAD.top + tracked.length * ROW_H + PAD.bottom;
  const barAreaW = W - PAD.left - PAD.right;
  const maxTotal = Math.max(...tracked.map((b) => b.used + (b.remaining ?? 0)), 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="休暇残日数チャート"
    >
      {tracked.map((b, i) => {
        const y = PAD.top + i * ROW_H;
        const total = b.used + (b.remaining ?? 0);
        const usedW = (b.used / maxTotal) * barAreaW;
        const totalW = (total / maxTotal) * barAreaW;

        return (
          <g key={b.label}>
            {/* Label */}
            <text
              x={PAD.left - 8}
              y={y + ROW_H / 2 + 4}
              textAnchor="end"
              fontSize="12"
              fill="#374151"
            >
              {b.label}
            </text>
            {/* Total bar (remaining) */}
            <rect x={PAD.left} y={y + 4} width={totalW} height={ROW_H - 8} fill="#e5e7eb" rx={4} />
            {/* Total bar (animated) */}
            {/* Used bar */}
            {b.used > 0 && (
              <rect
                x={PAD.left}
                y={y + 4}
                width={usedW}
                height={ROW_H - 8}
                fill="#3b82f6"
                rx={4}
                opacity={0.8}
                className="chart-bar-x"
                style={{ "--bar-delay": `${i * 0.1}s` }}
              />
            )}
            {/* Value text */}
            <text x={PAD.left + totalW + 8} y={y + ROW_H / 2 + 4} fontSize="11" fill="#6b7280">
              {b.used} / {total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
