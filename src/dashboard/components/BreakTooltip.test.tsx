import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BreakTooltip } from "./BreakTooltip";

describe("BreakTooltip", () => {
  test("renders a dash when breakTime is null", () => {
    render(<BreakTooltip breakTime={null} breakStarts={[]} breakEnds={[]} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  test("renders formatted break time when breakTime is provided with no pairs", () => {
    render(<BreakTooltip breakTime={1} breakStarts={[]} breakEnds={[]} />);
    // 1 hour formatted as HM => "1:00"
    expect(screen.getByText("1:00")).toBeInTheDocument();
  });

  test("renders break time with tooltip span when pairs exist", () => {
    const { container } = render(
      <BreakTooltip breakTime={1} breakStarts={["12:00"]} breakEnds={["13:00"]} />,
    );
    // The outer span with group class should be present
    const groupSpan = container.querySelector("span.group");
    expect(groupSpan).toBeInTheDocument();
    // formatBreakPairs uses " ~ " separator
    expect(screen.getByText("12:00 ~ 13:00")).toBeInTheDocument();
  });

  test("renders break time of zero as 0:00", () => {
    render(<BreakTooltip breakTime={0} breakStarts={[]} breakEnds={[]} />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  test("renders multiple break pairs in tooltip", () => {
    render(
      <BreakTooltip
        breakTime={2}
        breakStarts={["10:00", "15:00"]}
        breakEnds={["11:00", "16:00"]}
      />,
    );
    expect(screen.getByText("10:00 ~ 11:00")).toBeInTheDocument();
    expect(screen.getByText("15:00 ~ 16:00")).toBeInTheDocument();
  });
});
