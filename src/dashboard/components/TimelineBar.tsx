import type { TimelineSegment } from "../lib/timeline";

interface TimelineBarProps {
  segments: TimelineSegment[];
}

const GUIDE_HOURS = [6, 12, 18];

export function TimelineBar({ segments }: TimelineBarProps) {
  if (segments.length === 0) {
    return <div className="h-5 min-w-[200px]" />;
  }

  return (
    <div className="relative h-5 min-w-[200px] rounded bg-gray-100">
      {GUIDE_HOURS.map((h) => (
        <div
          key={h}
          className="absolute top-0 h-full w-px bg-gray-300"
          style={{ left: `${(h / 24) * 100}%` }}
        />
      ))}
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`group absolute top-0 h-full rounded ${seg.type === "work" ? "bg-blue-400" : "bg-amber-200"}`}
          style={{
            left: `${seg.startPercent}%`,
            width: `${seg.widthPercent}%`,
          }}
        >
          <span className="invisible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap group-hover:visible z-10 pointer-events-none">
            {seg.type === "work" ? "稼働" : "休憩"}: {seg.startLabel} 〜 {seg.endLabel}（{seg.durationLabel}）
          </span>
        </div>
      ))}
    </div>
  );
}
