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
          className={`absolute top-0 h-full rounded ${seg.type === "work" ? "bg-blue-400" : "bg-amber-200"}`}
          style={{
            left: `${seg.startPercent}%`,
            width: `${seg.widthPercent}%`,
          }}
        />
      ))}
    </div>
  );
}
