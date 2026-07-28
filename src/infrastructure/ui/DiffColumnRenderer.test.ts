import { describe, test, expect } from "vitest";
import {
  createDiffCell,
  createDiffHeader,
  updateDiffCell,
  createInProgressDiffCell,
  createEmptyDiffCell,
  highlightBreakCellIfInsufficient,
  updateEstimatedWorkCell,
  createSavingsHeader,
  createSavingsCell,
  createMissingSavingsCell,
  updateSavingsCell,
  applyRowStripe,
  insertSavingsCell,
  insertSavingsHeader,
  dateColumnIndex,
} from "./DiffColumnRenderer";
import { KOTDIFF_MARKER_CLASS, KOTDIFF_SAVINGS_CLASS } from "./styles";

describe("createDiffHeader", () => {
  test("creates th with '差分' text", () => {
    const th = createDiffHeader();
    expect(th.tagName).toBe("TH");
    const p = th.querySelector("p");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("差分");
  });

  test("has correct marker class", () => {
    const th = createDiffHeader();
    expect(th.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
  });
});

describe("createDiffCell", () => {
  test("positive value shows '+' prefix and green color", () => {
    const td = createDiffCell(2);
    expect(td.textContent).toMatch(/^\+/);
    expect(td.style.color).toBe("green");
  });

  test("zero value shows '+' prefix and green color", () => {
    const td = createDiffCell(0);
    expect(td.textContent).toMatch(/^\+/);
    expect(td.style.color).toBe("green");
  });

  test("negative value shows '-' prefix and red color", () => {
    const td = createDiffCell(-1);
    expect(td.textContent).toMatch(/^-/);
    expect(td.style.color).toBe("red");
  });

  test("has correct marker class", () => {
    const td = createDiffCell(1);
    expect(td.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
  });
});

describe("createInProgressDiffCell", () => {
  test("has italic style", () => {
    const td = createInProgressDiffCell(1);
    expect(td.style.fontStyle).toBe("italic");
  });

  test("has opacity 0.5", () => {
    const td = createInProgressDiffCell(1);
    expect(td.style.opacity).toBe("0.5");
  });

  test("inherits diff cell behavior for positive value", () => {
    const td = createInProgressDiffCell(3);
    expect(td.textContent).toMatch(/^\+/);
    expect(td.style.color).toBe("green");
  });

  test("inherits diff cell behavior for negative value", () => {
    const td = createInProgressDiffCell(-2);
    expect(td.textContent).toMatch(/^-/);
    expect(td.style.color).toBe("red");
  });
});

describe("createEmptyDiffCell", () => {
  test("creates td with marker class and no text", () => {
    const td = createEmptyDiffCell();
    expect(td.tagName).toBe("TD");
    expect(td.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
    expect(td.textContent).toBe("");
  });
});

describe("updateDiffCell", () => {
  test("changes text and color for positive value", () => {
    const td = document.createElement("td");
    updateDiffCell(td, 3);
    expect(td.textContent).toMatch(/^\+/);
    expect(td.style.color).toBe("green");
  });

  test("changes text and color for negative value", () => {
    const td = document.createElement("td");
    updateDiffCell(td, -2);
    expect(td.textContent).toMatch(/^-/);
    expect(td.style.color).toBe("red");
  });

  test("updates existing cell text", () => {
    const td = createDiffCell(1);
    updateDiffCell(td, -5);
    expect(td.textContent).toMatch(/^-/);
    expect(td.style.color).toBe("red");
  });
});

describe("highlightBreakCellIfInsufficient", () => {
  test("highlights REST_MINUTE cell when break is insufficient", () => {
    const row = document.createElement("tr");
    const breakCell = document.createElement("td");
    breakCell.dataset.htSortIndex = "REST_MINUTE";
    row.append(breakCell);

    // 8h work with 0.5h break — insufficient (6h 超の勤務には 45 分必要)
    highlightBreakCellIfInsufficient(row, 8, 0.5);
    expect(breakCell.style.backgroundColor).toBe("rgb(255, 204, 204)"); // WARNING_COLOR
  });

  test("does not highlight when break is sufficient", () => {
    const row = document.createElement("tr");
    const breakCell = document.createElement("td");
    breakCell.dataset.htSortIndex = "REST_MINUTE";
    row.append(breakCell);

    // 8h work with 1h break — sufficient
    highlightBreakCellIfInsufficient(row, 8, 1);
    expect(breakCell.style.backgroundColor).toBe("");
  });

  test("does nothing when REST_MINUTE cell not found", () => {
    const row = document.createElement("tr");
    // No break cell — should not throw
    expect(() => highlightBreakCellIfInsufficient(row, 8, 0.5)).not.toThrow();
  });
});

describe("updateEstimatedWorkCell", () => {
  test("updates p element text and applies italic+opacity styles", () => {
    const cell = document.createElement("td");
    const p = document.createElement("p");
    p.textContent = "old";
    cell.append(p);

    updateEstimatedWorkCell(cell, 7.5);
    expect(p.textContent).toBe("7:30");
    expect(p.style.fontStyle).toBe("italic");
    expect(p.style.opacity).toBe("0.5");
  });

  test("does nothing when p element not found", () => {
    const cell = document.createElement("td");
    expect(() => updateEstimatedWorkCell(cell, 7.5)).not.toThrow();
  });
});

function rowWithDateCell(): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.innerHTML = `<td data-ht-sort-index="WORK_DAY">02/20（金）</td><td data-ht-sort-index="SCHEDULE"></td>`;
  return row;
}

describe("時間貯金列 (v2)", () => {
  test("header is labelled 時間貯金", () => {
    const th = createSavingsHeader();
    expect(th.querySelector("p")?.textContent).toBe("時間貯金");
    expect(th.classList.contains(KOTDIFF_SAVINGS_CLASS)).toBe(true);
    expect(th.classList.contains(KOTDIFF_MARKER_CLASS)).toBe(true);
  });

  test("cell stacks the cumulative total over the day's own diff", () => {
    const td = createSavingsCell(-0.017, 0.5);
    const [primary, secondary] = td.querySelectorAll("div");
    expect(primary?.textContent).toBe("-0:01");
    expect(primary?.style.fontSize).toBe("15px");
    expect(secondary?.textContent).toBe("当日 +0:30");
    expect(secondary?.style.fontSize).toBe("10px");
  });

  test("cell omits the second line when the day has no diff of its own", () => {
    const td = createSavingsCell(1, null);
    expect(td.querySelectorAll("div").length).toBe(1);
  });

  test("missing clock-out shows 未 instead of a number", () => {
    const td = createMissingSavingsCell();
    expect(td.textContent).toBe("未");
  });

  test("in-progress rows are toned down", () => {
    const td = createSavingsCell(1, 0.5, true);
    const primary = td.querySelector("div");
    expect(primary?.style.fontStyle).toBe("italic");
  });

  test("update rewrites both lines in place", () => {
    const td = createSavingsCell(1, 0.5, true);
    updateSavingsCell(td, 2, 1.5);
    const [primary, secondary] = td.querySelectorAll("div");
    expect(primary?.textContent).toBe("+2:00");
    expect(secondary?.textContent).toBe("当日 +1:30");
  });

  test("stripe marks the row state on the date cell", () => {
    const row = rowWithDateCell();
    applyRowStripe(row, "under");
    const dateCell = row.querySelector<HTMLTableCellElement>('td[data-ht-sort-index="WORK_DAY"]');
    expect(dateCell?.style.borderLeft).toContain("3px solid");
    applyRowStripe(row, "none");
    expect(dateCell?.style.borderLeft).toContain("transparent");
  });

  test("cell is inserted right after the date cell", () => {
    const row = rowWithDateCell();
    insertSavingsCell(row, createSavingsCell(1, null));
    const cells = row.querySelectorAll("td");
    expect(cells[1]?.classList.contains(KOTDIFF_SAVINGS_CLASS)).toBe(true);
  });

  test("cell falls back to the end of the row when there is no date cell", () => {
    const row = document.createElement("tr");
    row.innerHTML = `<td data-ht-sort-index="SCHEDULE"></td>`;
    insertSavingsCell(row, createSavingsCell(1, null));
    expect(row.querySelectorAll("td")[1]?.classList.contains(KOTDIFF_SAVINGS_CLASS)).toBe(true);
  });

  test("header goes into the same column position as the cells", () => {
    // 実ページの 1 列目は「編集申請」で、日付は 2 列目
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `<th>編集申請</th><th>日付</th><th>スケジュール</th>`;
    insertSavingsHeader(headerRow, createSavingsHeader(), 1);
    expect(headerRow.querySelectorAll("th")[2]?.textContent).toBe("時間貯金");
  });

  test("header falls back to the end of the row when the date column is unknown", () => {
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `<th>日付</th>`;
    insertSavingsHeader(headerRow, createSavingsHeader(), -1);
    expect([...headerRow.querySelectorAll("th")].at(-1)?.textContent).toBe("時間貯金");
  });

  test("dateColumnIndex finds the date column even when it is not first", () => {
    const tbody = document.createElement("tbody");
    const row = document.createElement("tr");
    row.innerHTML = `<td></td><td data-ht-sort-index="WORK_DAY">02/20</td>`;
    tbody.append(row);
    expect(dateColumnIndex(tbody)).toBe(1);
    expect(dateColumnIndex(document.createElement("tbody"))).toBe(-1);
  });
});
