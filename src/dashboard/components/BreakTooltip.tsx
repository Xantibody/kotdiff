import { useRef, useState } from "react";
import { formatBreakPairs } from "../lib/utils";
import { formatHM } from "../../domain/value-objects/WorkDuration";

interface BreakTooltipProps {
  breakTime: number | null;
  breakStarts: readonly string[];
  breakEnds: readonly string[];
}

export function BreakTooltip({ breakTime, breakStarts, breakEnds }: BreakTooltipProps) {
  if (breakTime === null) return <span>-</span>;

  const pairs = formatBreakPairs(breakStarts, breakEnds);

  if (pairs.length === 0) {
    return <span>{formatHM(breakTime)}</span>;
  }

  return <BreakTooltipWithPairs breakTime={breakTime} pairs={pairs} />;
}

function BreakTooltipWithPairs({ breakTime, pairs }: { breakTime: number; pairs: string[] }) {
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; flipY: boolean }>({
    x: 0,
    y: 0,
    flipY: false,
  });
  const anchorRef = useRef<HTMLSpanElement>(null);

  function handleMouseEnter() {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const estimatedHeight = pairs.length * 20 + 16;
      const flipY = rect.top < estimatedHeight;
      setTooltipPos({ x: rect.right, y: flipY ? rect.bottom : rect.top, flipY });
      setVisible(true);
    }
  }

  function handleMouseLeave() {
    setVisible(false);
  }

  return (
    <span
      ref={anchorRef}
      className="group cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {formatHM(breakTime)}
      <span
        className="fixed z-50 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap pointer-events-none"
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: tooltipPos.flipY ? "translate(-100%, 0)" : "translate(-100%, -100%)",
          visibility: visible ? "visible" : "hidden",
        }}
      >
        {pairs.map((pair, i) => (
          <span key={i} className="block">
            {pair}
          </span>
        ))}
      </span>
    </span>
  );
}
