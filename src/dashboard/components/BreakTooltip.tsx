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

  return (
    <span className="group relative cursor-default">
      {formatHM(breakTime)}
      <span className="invisible absolute bottom-full right-0 mb-1 rounded bg-gray-800 px-2 py-1 text-xs text-white whitespace-nowrap group-hover:visible z-10">
        {pairs.map((pair, i) => (
          <span key={i} className="block">
            {pair}
          </span>
        ))}
      </span>
    </span>
  );
}
