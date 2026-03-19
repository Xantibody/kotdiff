import type { TimelineSegment } from "../lib/timeline";

interface TimelineBarProps {
  segments: TimelineSegment[];
}

export function TimelineBar({ segments }: TimelineBarProps) {
  if (segments.length === 0) {
    return <div className="h-5 min-w-[200px]" />;
  }

  const allHours = segments.flatMap((s) => [s.startHour, s.endHour]);
  const scaleMin = Math.floor(Math.min(...allHours));
  const scaleMax = Math.ceil(Math.max(...allHours));
  const span = scaleMax - scaleMin;
  if (span === 0) return <div className="h-5 min-w-[200px]" />;

  const toPercent = (h: number) => ((h - scaleMin) / span) * 100;

  // Guide lines: 3h step for spans ≤18h, 6h step otherwise
  const step = span > 18 ? 6 : 3;
  const guideHours: number[] = [];
  for (let h = Math.ceil(scaleMin / step) * step; h < scaleMax; h += step) {
    guideHours.push(h);
  }

  return (
    <div className="relative h-5 min-w-[200px] rounded bg-gray-100 overflow-visible">
      {/* Clipping mask for bar segments so they don't overflow the container visually */}
      <div className="absolute inset-0 rounded overflow-hidden pointer-events-none">
        {guideHours.map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full w-px bg-gray-300"
            style={{ left: `${toPercent(h)}%` }}
          />
        ))}
      </div>
      {segments.map((seg) => {
        const left = toPercent(seg.startHour);
        const width = toPercent(seg.endHour) - left;
        return (
          <div
            key={`${seg.type}-${seg.startHour}-${seg.endHour}`}
            className={`group absolute top-0 h-full rounded ${seg.type === "work" ? "bg-blue-400" : "bg-amber-200"}`}
            style={{
              left: `${left}%`,
              width: `${width}%`,
            }}
          >
            <span className="invisible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap group-hover:visible z-10 pointer-events-none">
              {seg.type === "work" ? "稼働" : "休憩"}: {seg.startLabel} 〜 {seg.endLabel}（
              {seg.durationLabel}）
            </span>
          </div>
        );
      })}
    </div>
  );
}
