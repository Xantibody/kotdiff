import { describe, test, expect } from "vitest";
import { scrapeLeaveBalances } from "./LeaveBalanceScraper";

import { defined } from "../../test-utils";

describe("scrapeLeaveBalances", () => {
  test("returns empty array when no elements found", () => {
    const div = document.createElement("div");
    expect(scrapeLeaveBalances(div)).toEqual([]);
  });

  test("parses a leave balance entry", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li>
          <label>年次有給休暇</label>
          <div>5.0 残10.0</div>
        </li>
      </ul>
    `;
    const result = scrapeLeaveBalances(div);
    expect(result).toHaveLength(1);
    expect(defined(result[0]).label).toBe("年次有給休暇");
    expect(defined(result[0]).used).toBe(5);
    expect(defined(result[0]).remaining).toBe(10);
  });

  test("parses multiple leave balance entries", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li>
          <label>年次有給休暇</label>
          <div>3.0 残7.0</div>
        </li>
        <li>
          <label>特別休暇</label>
          <div>1.0 残4.0</div>
        </li>
      </ul>
    `;
    const result = scrapeLeaveBalances(div);
    expect(result).toHaveLength(2);
    expect(defined(result[0]).label).toBe("年次有給休暇");
    expect(defined(result[0]).used).toBe(3);
    expect(defined(result[0]).remaining).toBe(7);
    expect(defined(result[1]).label).toBe("特別休暇");
    expect(defined(result[1]).used).toBe(1);
    expect(defined(result[1]).remaining).toBe(4);
  });

  test("skips entries without label or div", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li>
          <div>5.0 残10.0</div>
        </li>
        <li>
          <label>有効なエントリ</label>
          <div>2.0 残8.0</div>
        </li>
      </ul>
    `;
    const result = scrapeLeaveBalances(div);
    expect(result).toHaveLength(1);
    expect(defined(result[0]).label).toBe("有効なエントリ");
  });

  test("skips entries without remaining notation (not balance-managed)", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li>
          <label>消化済み休暇</label>
          <div>5.0</div>
        </li>
      </ul>
    `;
    expect(scrapeLeaveBalances(div)).toEqual([]);
  });

  test("skips non-leave summary columns like 平日/遅刻/早退", () => {
    // KOT の日数集計は休暇以外の集計列も同じリストに並べる。
    // 残数表記「(残 x.x)」を持つ列だけが休暇残数として意味を持つ
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li><label>平日</label><div>19.0</div></li>
        <li><label>遅刻</label><div>0</div></li>
        <li><label>早退</label><div>0</div></li>
        <li><label>公休</label><div>7.0 (残&nbsp;1.0 )</div></li>
        <li><label>振替休暇（フレックス用）</label><div>4.0 (残&nbsp;0.0 )</div></li>
      </ul>
    `;
    const result = scrapeLeaveBalances(div);
    expect(result.map((b) => b.label)).toEqual(["公休", "振替休暇（フレックス用）"]);
    expect(defined(result[1]).used).toBe(4);
    expect(defined(result[1]).remaining).toBe(0);
  });
});
