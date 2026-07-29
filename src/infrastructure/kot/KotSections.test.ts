import { describe, test, expect } from "vitest";
import {
  setDailyHeadingHidden,
  setElementHidden,
  setMonthlySummaryHidden,
  setToolbarHidden,
} from "./KotSections";

function buildPage(): { root: HTMLDivElement; table: HTMLTableElement } {
  const root = document.createElement("div");
  root.innerHTML = `
    <button id="apply">スケジュール申請</button>
    <h4 class="htBlock-box_subTitle">月別データ</h4>
    <p id="totals">時間集計</p>
    <div id="summary" style="display: block;">平日 / 休日 法定 法定外</div>
    <h4 class="htBlock-box_subTitle">日別データ</h4>
    <div class="htBlock-adjastableTableF" style="display: block;">
      <div class="htBlock-adjastableTableF_inner">
        <div class="kotdiff-card">注入カード</div>
        <table><tbody><tr><td>03/01</td></tr></tbody></table>
      </div>
    </div>
  `;
  const table = root.querySelector("table");
  if (table === null) {
    throw new Error("fixture: table not found");
  }
  return { root, table };
}

describe("setElementHidden", () => {
  test("restores the inline display KOT had set", () => {
    const el = document.createElement("div");
    el.style.display = "block";
    setElementHidden(el, true);
    expect(el.style.display).toBe("none");
    setElementHidden(el, false);
    expect(el.style.display).toBe("block");
  });

  test("leaves no leftover inline display when there was none", () => {
    const el = document.createElement("div");
    setElementHidden(el, true);
    setElementHidden(el, false);
    expect(el.style.display).toBe("");
  });
});

describe("setMonthlySummaryHidden / setDailyHeadingHidden / setToolbarHidden", () => {
  test("hides the monthly summary and both section headings", () => {
    const { root, table } = buildPage();
    setMonthlySummaryHidden(table, true, root);
    setDailyHeadingHidden(true, root);

    const hidden = (selector: string): string =>
      root.querySelector<HTMLElement>(selector)?.style.display ?? "";
    expect(hidden("#totals")).toBe("none");
    expect(hidden("#summary")).toBe("none");
    for (const subtitle of root.querySelectorAll<HTMLElement>("h4")) {
      expect(subtitle.style.display).toBe("none");
    }
  });

  test("keeps the injected UI visible", () => {
    const { root, table } = buildPage();
    setMonthlySummaryHidden(table, true, root);
    setDailyHeadingHidden(true, root);
    // 表を含む節ごと隠すと注入した UI まで消えるので触らない
    expect(root.querySelector<HTMLElement>(".htBlock-adjastableTableF")?.style.display).toBe(
      "block",
    );
    expect(root.querySelector<HTMLElement>(".kotdiff-card")?.style.display).toBe("");
  });

  test("hides the toolbar (申請・確認状況・タイムカード・出力) on its own switch", () => {
    const { root, table } = buildPage();
    const toolbar = document.createElement("div");
    toolbar.className = "htBlock-toolbar";
    toolbar.textContent = "スケジュール申請 勤怠確認状況 タイムカード EXCEL 出力";
    root.prepend(toolbar);

    setMonthlySummaryHidden(table, true, root);
    expect(toolbar.style.display).toBe("");

    setToolbarHidden(true, root);
    expect(toolbar.style.display).toBe("none");
    setToolbarHidden(false, root);
    expect(toolbar.style.display).toBe("");
  });

  test("does not touch anything outside the sections it owns", () => {
    const { root, table } = buildPage();
    setMonthlySummaryHidden(table, true, root);
    setDailyHeadingHidden(true, root);
    // ツールバーは別のスイッチで扱う
    expect(root.querySelector<HTMLElement>("#apply")?.style.display).toBe("");
  });

  test("puts everything back", () => {
    const { root, table } = buildPage();
    setMonthlySummaryHidden(table, true, root);
    setDailyHeadingHidden(true, root);
    setMonthlySummaryHidden(table, false, root);
    setDailyHeadingHidden(false, root);
    expect(root.querySelector<HTMLElement>("#totals")?.style.display).toBe("");
    expect(root.querySelector<HTMLElement>("#summary")?.style.display).toBe("block");
    expect(root.querySelector<HTMLElement>("h4")?.style.display).toBe("");
  });
});
