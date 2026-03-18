import { describe, test, expect } from "vitest";
import { scrapeLeaveBalances } from "./LeaveBalanceScraper";

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
    expect(result[0].label).toBe("年次有給休暇");
    expect(result[0].used).toBe(5.0);
    expect(result[0].remaining).toBe(10.0);
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
    expect(result[0].label).toBe("年次有給休暇");
    expect(result[0].used).toBe(3.0);
    expect(result[0].remaining).toBe(7.0);
    expect(result[1].label).toBe("特別休暇");
    expect(result[1].used).toBe(1.0);
    expect(result[1].remaining).toBe(4.0);
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
    expect(result[0].label).toBe("有効なエントリ");
  });

  test("handles entry with no remaining value", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul class="specific-daysCount_1">
        <li>
          <label>消化済み休暇</label>
          <div>5.0</div>
        </li>
      </ul>
    `;
    const result = scrapeLeaveBalances(div);
    expect(result).toHaveLength(1);
    expect(result[0].used).toBe(5.0);
    expect(result[0].remaining).toBeNull();
  });
});
