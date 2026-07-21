import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekdayAvgChart } from "./WeekdayAvgChart";
import type { DailyRowSummary } from "../../../domain/aggregates/WorkMonth";
import { makeWorkedRow, makeUnworkedRow, makeRow } from "../../test-helpers";

describe("WeekdayAvgChart", () => {
  test("shows no-data message when rows is empty", () => {
    render(<WeekdayAvgChart rows={[]} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when all rows are weekends or have null actual", () => {
    const rows: DailyRowSummary[] = [makeUnworkedRow(), makeWorkedRow({ isWeekend: true })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when data is present", () => {
    const rows = [makeRow({ date: "03/01（月）", actual: 8, isWeekend: false })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByRole("img", { name: "曜日別平均労働時間チャート" })).toBeInTheDocument();
  });

  test("renders weekday labels for days with data", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 7, isWeekend: false }),
    ];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("月")).toBeInTheDocument();
    expect(screen.getByText("火")).toBeInTheDocument();
  });

  test("displays count label for each weekday", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/10（月）", actual: 9, isWeekend: false }),
    ];
    render(<WeekdayAvgChart rows={rows} />);
    // Two Monday entries => (2日)
    expect(screen.getByText("(2日)")).toBeInTheDocument();
  });

  test("renders chart bars for each represented weekday", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 7, isWeekend: false }),
    ];
    const { container } = render(<WeekdayAvgChart rows={rows} />);
    const bars = container.querySelectorAll("rect.chart-bar");
    expect(bars.length).toBe(2);
  });

  test("shows the grand average reference label", () => {
    const rows = [makeRow({ date: "03/03（月）", actual: 8, isWeekend: false })];
    render(<WeekdayAvgChart rows={rows} />);
    expect(screen.getByText("avg")).toBeInTheDocument();
  });

  test("all bars fit within the viewBox when leading weekdays have no data", () => {
    // 水木金のみデータあり。棒は元の曜日 index ではなく描画順で配置しないと
    // viewBox(W=700)からはみ出す。
    const rows = [
      makeRow({ date: "03/04（水）", actual: 8, isWeekend: false }),
      makeRow({ date: "03/05（木）", actual: 7, isWeekend: false }),
      makeRow({ date: "03/06（金）", actual: 9, isWeekend: false }),
    ];
    const { container } = render(<WeekdayAvgChart rows={rows} />);
    const bars = container.querySelectorAll("rect.chart-bar");
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      const x = Number(bar.getAttribute("x"));
      const width = Number(bar.getAttribute("width"));
      expect(x + width).toBeLessThanOrEqual(700);
    }
  });

  // issue #30: 基準線は「曜日別平均の平均」ではなく全対象日の平均にする。
  // 月 2 日 (10h,10h)・火 1 日 (4h)・水 1 日 (7.5h) の場合、
  // 全体平均 = 31.5/4 = 7.875 なので水 (7.5) は平均未満 → orange。
  // 平均の平均 (7.17) を使うと誤って blue になる
  test("grand average is weighted by day count, not an average of averages", () => {
    const rows = [
      makeRow({ date: "03/03（月）", actual: 10, isWeekend: false }),
      makeRow({ date: "03/10（月）", actual: 10, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 4, isWeekend: false }),
      makeRow({ date: "03/05（水）", actual: 7.5, isWeekend: false }),
    ];
    const { container } = render(<WeekdayAvgChart rows={rows} />);
    const bars = container.querySelectorAll("rect.chart-bar");
    expect(bars).toHaveLength(3);
    // 水曜バー (index 2) は全体平均 7.875 未満なので orange
    expect((bars[2] as SVGRectElement).getAttribute("fill")).toBe("#f97316");
  });

  test("bar fill is blue when avg >= grandAvg and orange when avg < grandAvg", () => {
    // Monday avg=10, Tuesday avg=6 → grandAvg=8
    // Monday (10 >= 8) → blue (#3b82f6), Tuesday (6 < 8) → orange (#f97316)
    const rows = [
      makeRow({ date: "03/03（月）", actual: 10, isWeekend: false }),
      makeRow({ date: "03/04（火）", actual: 6, isWeekend: false }),
    ];
    const { container } = render(<WeekdayAvgChart rows={rows} />);
    const bars = container.querySelectorAll("rect.chart-bar");
    expect(bars).toHaveLength(2);
    expect((bars[0] as SVGRectElement).getAttribute("fill")).toBe("#3b82f6");
    expect((bars[1] as SVGRectElement).getAttribute("fill")).toBe("#f97316");
  });
});
