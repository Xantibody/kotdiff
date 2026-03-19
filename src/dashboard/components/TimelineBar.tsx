import type { TimelineSegment } from "../lib/timeline";

interface TimelineBarProps {
  segments: TimelineSegment[];
}

export function TimelineBar({ segments }: TimelineBarProps) {
  if (segments.length === 0) {
    return <div className="h-5 min-w-[200px]" />;
  }

  const scaleMin = 5;
  const scaleMax = 29;
  const span = scaleMax - scaleMin; // 24

  const toPercent = (h: number) => ((h - scaleMin) / span) * 100;

  // Guide lines: 6h step over fixed [5, 29] range → 6, 12, 18, 24
  const guideHours: number[] = [];
  for (let h = 6; h < scaleMax; h += 6) {
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
      {segments.map((seg, i) => {
        const left = toPercent(seg.startHour);
        const width = toPercent(seg.endHour) - left;
        return (
          <div
            key={i}
            className={`group absolute top-0 h-full rounded ${seg.type === "work" ? "bg-blue-400" : "bg-amber-200"}`}
            style={{
              left: `${left}%`,
              width: `${width}%`,
            }}
          >
            <span className="invisible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap group-hover:visible z-50 pointer-events-none">
              {seg.type === "work" ? "稼働" : "休憩"}: {seg.startLabel} 〜 {seg.endLabel}（
              {seg.durationLabel}）
            </span>
          </div>
        );
      })}
    </div>
  );
}
