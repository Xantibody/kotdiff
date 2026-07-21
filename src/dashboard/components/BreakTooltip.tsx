import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { formatBreakPairs } from "../lib/utils";
import { formatHM } from "../../domain/value-objects/WorkDuration";

interface BreakTooltipProps {
  breakTime: number | null;
  // 想定休憩時間（労基法の必要休憩）。0 のときは表示しない
  expectedBreak: number;
  breakStarts: readonly string[];
  breakEnds: readonly string[];
}

function ExpectedBreak({ expectedBreak }: { expectedBreak: number }) {
  if (expectedBreak === 0) {
    return null;
  }
  return <span className="text-xs text-gray-400">{`/ 想定 ${formatHM(expectedBreak)}`}</span>;
}

export function BreakTooltip({
  breakTime,
  expectedBreak,
  breakStarts,
  breakEnds,
}: BreakTooltipProps): ReactElement {
  if (breakTime === null) {
    return (
      <span>
        <span>-</span> <ExpectedBreak expectedBreak={expectedBreak} />
      </span>
    );
  }

  const pairs = formatBreakPairs(breakStarts, breakEnds);

  if (pairs.length === 0) {
    return (
      <span>
        <span>{formatHM(breakTime)}</span> <ExpectedBreak expectedBreak={expectedBreak} />
      </span>
    );
  }

  return (
    <span>
      <BreakTooltipWithPairs breakTime={breakTime} pairs={pairs} />{" "}
      <ExpectedBreak expectedBreak={expectedBreak} />
    </span>
  );
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
        {/* 休憩ペアは同一日の重複しない時間帯なので文字列自体が一意なキーになる */}
        {pairs.map((pair) => (
          <span key={pair} className="block">
            {pair}
          </span>
        ))}
      </span>
    </span>
  );
}
