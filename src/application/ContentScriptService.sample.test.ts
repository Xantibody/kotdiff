import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createContentScriptService } from "./ContentScriptService";
import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type { TimerPort } from "../infrastructure/ui/ports/TimerPort";

// 実際の KOT ページ (sample/) に対して v2 UI が崩れないことを確認する。
// 日跨ぎ勤務・月初のみ・休暇集計つきなど、手で組んだ fixture では再現しにくい形が入っている。

const SAMPLES: readonly [string, string][] = [
  ["normal", "sample/normal/KING OF TIME 勤怠管理.html"],
  ["休暇集計", "sample/休暇集計/KING OF TIME 勤怠管理.html"],
  ["初旬のみ表示", "sample/初旬のみ表示/初旬のみ勤怠表示パターン.html"],
  ["日跨ぎ勤務", "sample/退勤が日付けを越えた場合表示されない/KING OF TIME 勤怠管理.html"],
];

function createMockTimer(): TimerPort {
  return {
    setInterval: vi.fn().mockReturnValue(() => {}),
    observeRemoval: vi.fn().mockReturnValue(() => {}),
  };
}

function createMockStorage(): StoragePort {
  return {
    getDashboardData: vi.fn().mockResolvedValue(null),
    setDashboardData: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMessaging(): MessagingPort {
  return {
    onMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    getExtensionUrl: vi.fn().mockReturnValue("chrome-extension://id/dashboard.html"),
  };
}

function loadSample(path: string): void {
  const html = readFileSync(path, "utf8");
  const body = /<body[^>]*>([\S\s]*)<\/body>/.exec(html)?.[1] ?? "";
  document.body.innerHTML = body;
  // 一部の sample は拡張を入れたブラウザで保存されており、旧 UI の注入結果が残っている。
  // 素の KOT ページとして扱うために取り除く
  for (const injected of document.querySelectorAll(".kotdiff-injected")) {
    injected.remove();
  }
}

// sample/ は実勤怠データを含むため .gitignore 済み。CI や新しいクローンには無いので、
// 揃っているときだけ走らせる
const hasSamples = SAMPLES.every(([, path]) => existsSync(path));

describe.skipIf(!hasSamples).each(SAMPLES)("v2 UI against the %s sample", (_name, path) => {
  beforeEach(() => {
    loadSample(path);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.querySelector("#kotdiff-styles")?.remove();
  });

  test("injects the savings column right after the date column", () => {
    createContentScriptService(
      createMockStorage(),
      createMockMessaging(),
      createMockTimer(),
      undefined,
      { preferences: { newUi: true, bannerOpen: true, calendarOpen: true, tableCollapsed: false } },
    ).run();

    const table = document.querySelector(".htBlock-adjastableTableF_inner > table");
    expect(table).not.toBeNull();

    const rows = [...(table?.querySelectorAll("tbody tr") ?? [])];
    expect(rows.length).toBeGreaterThan(0);

    // 日付列は先頭とは限らない (実ページの 1 列目は「編集申請」)
    const dateIndex = [...(rows[0]?.querySelectorAll("td") ?? [])].findIndex(
      (cell) => cell.dataset["htSortIndex"] === "WORK_DAY",
    );
    expect(dateIndex).toBeGreaterThanOrEqual(0);

    const headers = table?.querySelectorAll("thead th") ?? [];
    expect(headers[dateIndex + 1]?.textContent).toBe("時間貯金");

    // どの行でも日付の直後が時間貯金列 = 列ずれがない
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      expect(cells[dateIndex + 1]?.classList.contains("kotdiff-savings")).toBe(true);
    }
  });

  test("renders the card and the calendar above the table", () => {
    createContentScriptService(
      createMockStorage(),
      createMockMessaging(),
      createMockTimer(),
      undefined,
      { preferences: { newUi: true, bannerOpen: true, calendarOpen: true, tableCollapsed: false } },
    ).run();

    const card = document.querySelector("div.kotdiff-card");
    const calendar = document.querySelector("div.kotdiff-calendar");
    expect(card?.textContent ?? "").toContain("今月");
    expect(calendar?.textContent ?? "").toContain("週合計");
    // 絵文字で階層を作らない
    expect(card?.textContent ?? "").not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
