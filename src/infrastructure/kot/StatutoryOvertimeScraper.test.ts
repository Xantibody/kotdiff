import { describe, test, expect } from "vitest";
import { scrapeStatutoryOvertime } from "./StatutoryOvertimeScraper";

// KOT のフレックスタイム集計 [残業時間詳細] テーブルを模した DOM
function makeFlexSummaryTable(cellValue: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = `
    <table>
      <thead>
        <tr>
          <th><p>元の基準時間</p></th>
          <th colspan="1"><p>前月までの繰越時間</p></th>
          <th><p>月初の残基準時間</p></th>
          <th><p>当月の基準時間</p></th>
          <th><p>当月精算の基準時間</p></th>
          <th><p>基準内労働時間</p></th>
          <th><p>繰越時間</p></th>
          <th><p>基準外労働時間</p></th>
          <th><p>割増対象時間</p></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td rowspan="1">152.00</td>
          <td>--</td>
          <td rowspan="1">152.00</td>
          <td rowspan="1">152.00</td>
          <td rowspan="1">--</td>
          <td rowspan="1">152.00</td>
          <td rowspan="1"></td>
          <td rowspan="1">${cellValue}</td>
          <td rowspan="1"></td>
        </tr>
      </tbody>
    </table>
  `;
  return div;
}

describe("scrapeStatutoryOvertime", () => {
  test("parses 基準外労働時間 from the flex summary table (dot notation)", () => {
    const container = makeFlexSummaryTable("5.31");
    expect(scrapeStatutoryOvertime(container)).toBeCloseTo(5 + 31 / 60, 5);
  });

  test("returns null when the cell is empty", () => {
    const container = makeFlexSummaryTable("");
    expect(scrapeStatutoryOvertime(container)).toBeNull();
  });

  test("returns null when the cell is a placeholder --", () => {
    const container = makeFlexSummaryTable("--");
    expect(scrapeStatutoryOvertime(container)).toBeNull();
  });

  test("returns null when no flex summary table exists (non-flex account)", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <table>
        <thead><tr><th>日付</th><th>労働合計</th></tr></thead>
        <tbody><tr><td>07/01</td><td>8.00</td></tr></tbody>
      </table>
    `;
    expect(scrapeStatutoryOvertime(div)).toBeNull();
  });
});
