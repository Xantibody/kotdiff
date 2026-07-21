import type { ReactElement } from "react";

interface SemicircleProgressProps {
  percent: number;
  size?: number;
}

export function SemicircleProgress({ percent, size = 80 }: SemicircleProgressProps): ReactElement {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Semicircle arc length
  const arcLength = Math.PI * radius;
  // クランプは弧の描画にのみ適用: 100%超では弧を満了状態で維持する
  // (dashoffset が負になると弧の先頭が欠けて見えるため)
  const clampedPercent = Math.max(0, Math.min(percent, 100));
  const offset = arcLength - (clampedPercent / 100) * arcLength;

  let color: string;
  if (percent >= 100) {
    color = "#16a34a";
  } else if (percent >= 80) {
    color = "#2563eb";
  } else {
    color = "#ea580c";
  }

  return (
    <svg
      width={size}
      height={size / 2 + strokeWidth}
      viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
    >
      {/* Background arc */}
      <path
        d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <path
        d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={arcLength}
        strokeDashoffset={offset}
      />
      {/* Percentage text */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>
        {Math.round(percent)}%
      </text>
    </svg>
  );
}
