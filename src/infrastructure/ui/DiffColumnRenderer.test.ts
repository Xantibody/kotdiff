import { describe, test, expect } from "vitest";
import {
  createDiffCell,
  createDiffHeader,
  updateDiffCell,
  createInProgressDiffCell,
  createEmptyDiffCell,
  highlightBreakCellIfInsufficient,
  updateEstimatedWorkCell,
} from "./DiffColumnRenderer";
import { KOTDIFF_MARKER_CLASS } from "./styles";

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
    breakCell.setAttribute("data-ht-sort-index", "REST_MINUTE");
    row.appendChild(breakCell);

    // 8h work with 0.5h break — insufficient (needs 1h for 8h+ work)
    highlightBreakCellIfInsufficient(row, 8, 0.5);
    expect(breakCell.style.backgroundColor).toBe("rgb(255, 204, 204)"); // WARNING_COLOR
  });

  test("does not highlight when break is sufficient", () => {
    const row = document.createElement("tr");
    const breakCell = document.createElement("td");
    breakCell.setAttribute("data-ht-sort-index", "REST_MINUTE");
    row.appendChild(breakCell);

    // 8h work with 1h break — sufficient
    highlightBreakCellIfInsufficient(row, 8, 1.0);
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
    cell.appendChild(p);

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
