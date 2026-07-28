import { describe, test, expect, vi, beforeEach } from "vitest";

import { createContentScriptService } from "./ContentScriptService";
import type { ContentScriptServiceInstance } from "./ContentScriptService";
import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type { TimerPort } from "../infrastructure/ui/ports/TimerPort";
import type { DomReadyPort } from "../infrastructure/ui/ports/DomReadyPort";

function createMockTimer(): TimerPort {
  return {
    setInterval: vi.fn().mockReturnValue(() => {}),
    observeRemoval: vi.fn().mockReturnValue(() => {}),
  };
}

// browserTimerAdapter.observeRemoval 相当の動きを手動で発火できるタイマー。
// 実 MutationObserver を使うとテスト間で監視が残るため、契約だけを再現する。
function createRemovalFiringTimer(): { timer: TimerPort; fireRemovals: () => void } {
  const watched: { el: Element; onRemoved: () => void }[] = [];
  const timer: TimerPort = {
    setInterval: vi.fn().mockReturnValue(() => {}),
    observeRemoval: vi.fn().mockImplementation((el: Element, onRemoved: () => void) => {
      const entry = { el, onRemoved };
      watched.push(entry);
      return () => {
        const i = watched.indexOf(entry);
        if (i !== -1) {
          watched.splice(i, 1);
        }
      };
    }),
  };
  return {
    timer,
    fireRemovals() {
      // 発火は一度きり (browserTimerAdapter は onRemoved 後に disconnect する)
      for (const { el, onRemoved } of watched.splice(0)) {
        if (!document.contains(el)) {
          onRemoved();
        }
      }
    },
  };
}

function createMockDom(): DomReadyPort {
  return {
    querySelector: vi.fn().mockReturnValue(null),
    querySelectorAll: vi.fn().mockReturnValue([]),
    createElement: vi
      .fn()
      .mockImplementation(<const K extends keyof HTMLElementTagNameMap>(tag: K) =>
        document.createElement(tag),
      ),
    waitForElement: vi.fn(),
    reload: vi.fn(),
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

function createKotRow(cellOverrides: Record<string, string> = {}): HTMLTableRowElement {
  const tr = document.createElement("tr");

  const cells: [string, string][] = (
    [
      ["WORK_DAY", "03/04"],
      ["WORK_DAY_TYPE", "平日"],
      ["SCHEDULE", ""],
      ["FIXED_WORK_MINUTE", "8.00"],
      ["ALL_WORK_MINUTE", "8.00"],
      ["REST_MINUTE", "1.00"],
      ["START_TIMERECORD", "09:00"],
      ["END_TIMERECORD", "18:00"],
      ["REST_START_TIMERECORD", ""],
      ["REST_END_TIMERECORD", ""],
    ] as [string, string][]
  ).map(([sortIndex, text]) => [sortIndex, cellOverrides[sortIndex] ?? text]);

  for (const [sortIndex, text] of cells) {
    const td = document.createElement("td");
    td.dataset.htSortIndex = sortIndex;
    if (
      ["FIXED_WORK_MINUTE", "ALL_WORK_MINUTE", "REST_MINUTE", "OVERTIME_WORK_MINUTE"].includes(
        sortIndex,
      )
    ) {
      const p = document.createElement("p");
      p.textContent = text;
      td.append(p);
    } else {
      td.textContent = text;
    }
    tr.append(td);
  }
  return tr;
}

function createKotTable(cellOverrides: Record<string, string> = {}): HTMLTableElement {
  const table = document.createElement("table");

  // ヘッダ行付きの thead
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const th = document.createElement("th");
  th.textContent = "日付";
  headerRow.append(th);
  thead.append(headerRow);

  // 勤務済み1行の tbody
  const tbody = document.createElement("tbody");
  tbody.append(createKotRow(cellOverrides));

  table.append(thead);
  table.append(tbody);
  return table;
}

describe("ContentScriptService", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let messaging: ReturnType<typeof createMockMessaging>;
  let service: ContentScriptServiceInstance;

  beforeEach(() => {
    storage = createMockStorage();
    messaging = createMockMessaging();
    service = createContentScriptService(storage, messaging);
    // Clean up any injected DOM elements from previous tests
    for (const el of document.querySelectorAll(".kotdiff-injected")) {
      el.remove();
    }
  });

  describe("run()", () => {
    test("returns early when the diff header already exists in the table", () => {
      // 注入済み状態を再現: 対象テーブル内に差分ヘッダ th がある
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      const th = document.createElement("th");
      th.classList.add("kotdiff-injected");
      table.querySelector("thead tr")?.append(th);
      wrapper.append(table);
      document.body.append(wrapper);

      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

      service.run();

      expect(consoleSpy).toHaveBeenCalledWith("[kotdiff] already injecting or injected");

      consoleSpy.mockRestore();
      wrapper.remove();
    });

    test("stale kotdiff element outside the table does not block injection", () => {
      // KOT の再描画でテーブルの差分列は消えるがバナー div は残る
      const staleBanner = document.createElement("div");
      staleBanner.classList.add("kotdiff-injected");
      document.body.append(staleBanner);

      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.append(table);
      document.body.append(wrapper);

      const localService = createContentScriptService(storage, messaging, createMockTimer());
      localService.run();

      expect(table.querySelector("thead tr th.kotdiff-injected")).not.toBeNull();

      wrapper.remove();
      staleBanner.remove();
    });

    test("repeated run() calls while waiting for the table do not double-inject", () => {
      const mockDom = createMockDom();
      const localService = createContentScriptService(
        storage,
        messaging,
        createMockTimer(),
        mockDom,
      );

      localService.run();
      localService.run();

      // Second call should be blocked by the injecting flag — waitForElement called at most once
      expect(mockDom.waitForElement).toHaveBeenCalledTimes(1);
    });

    test("resets injecting flag on waitForElement timeout so run() can retry", () => {
      const mockDom = createMockDom();
      const localService = createContentScriptService(
        storage,
        messaging,
        createMockTimer(),
        mockDom,
      );

      localService.run();
      expect(mockDom.waitForElement).toHaveBeenCalledTimes(1);

      // テーブルが現れないまま — アダプタが onTimeout を発火する
      const options = vi.mocked(mockDom.waitForElement).mock.calls[0]?.[2];
      options?.onTimeout?.();

      // injecting フラグが解放され、後続の run() が再び待機を開始できる
      localService.run();
      expect(mockDom.waitForElement).toHaveBeenCalledTimes(2);
    });
  });

  describe("inject() integration", () => {
    test("injects diff column header and cell into KOT-style table", () => {
      // Build DOM: .htBlock-adjastableTableF_inner > table
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.append(table);
      document.body.append(wrapper);

      const mockTimer = createMockTimer();
      const localStorage = createMockStorage();
      const localMessaging = createMockMessaging();

      const localService = createContentScriptService(localStorage, localMessaging, mockTimer);
      localService.run();

      // A kotdiff-injected marker should exist (from header or cell)
      expect(document.querySelector(".kotdiff-injected")).not.toBeNull();

      // Diff column header should be added
      const diffTh = table.querySelector("thead tr th.kotdiff-injected");
      expect(diffTh).not.toBeNull();
      expect(diffTh?.querySelector("p")?.textContent).toBe("差分");

      // tbody row should have an extra td cell
      const tbodyRow = table.querySelector("tbody tr");
      expect(tbodyRow).not.toBeNull();
      const extraTd = tbodyRow?.querySelector("td.kotdiff-injected");
      expect(extraTd).not.toBeNull();
      // 8h actual - 8h expected = 0 diff → "+0:00"
      expect(extraTd?.textContent).toBe("+0:00");

      // Clean up
      wrapper.remove();
    });

    test("cross-midnight in-progress row (uncomplete, dated yesterday) gets in-progress diff cell", () => {
      vi.useFakeTimers();
      // JST 07/03 00:08 — still working since 07/02 (UTC 表記でタイムゾーン非依存にする)
      vi.setSystemTime(new Date("2026-07-02T15:08:00Z"));

      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable({
        WORK_DAY: "07/02（木）",
        ALL_WORK_MINUTE: "",
        START_TIMERECORD: "A\n10:13\n",
        END_TIMERECORD: "",
        REST_START_TIMERECORD: "A\n11:48\nA\n20:13\n",
        REST_END_TIMERECORD: "A\n12:41\nA\n23:24\n",
      });
      // KOT marks the previous day's row as error work when midnight passes without clock-out
      table
        .querySelector('td[data-ht-sort-index="WORK_DAY"]')
        ?.classList.add("specific-uncomplete");
      wrapper.append(table);
      document.body.append(wrapper);

      const mockTimer = createMockTimer();
      const localService = createContentScriptService(
        createMockStorage(),
        createMockMessaging(),
        mockTimer,
      );
      localService.run();

      // Work 10:13→24:08 minus breaks (0:53 + 3:11) = 9:51 → diff vs 8h = +1:51
      const diffCell = table.querySelector<HTMLTableCellElement>("tbody tr td.kotdiff-injected");
      expect(diffCell).not.toBeNull();
      expect(diffCell?.textContent).toBe("+1:51");
      expect(diffCell?.style.fontStyle).toBe("italic");

      // Periodic updates must keep running for the cross-midnight row
      expect(mockTimer.setInterval).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
      wrapper.remove();
    });

    test("uncomplete yesterday row is not in-progress when today's row has a clock-in", () => {
      vi.useFakeTimers();
      // JST 07/03 10:00 — 今日09:00に出勤済み。前日行は退勤打刻忘れのエラーであり、
      // 日跨ぎ勤務の継続中ではない(UTC 表記でタイムゾーン非依存にする)
      vi.setSystemTime(new Date("2026-07-03T01:00:00Z"));

      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      // 前日: 出勤打刻あり・退勤打刻なし → KOT はエラー勤務にする
      const table = createKotTable({
        WORK_DAY: "07/02（木）",
        ALL_WORK_MINUTE: "",
        START_TIMERECORD: "A\n10:13\n",
        END_TIMERECORD: "",
      });
      table
        .querySelector('td[data-ht-sort-index="WORK_DAY"]')
        ?.classList.add("specific-uncomplete");
      // 当日: 出勤済みで勤務中
      table.querySelector("tbody")?.append(
        createKotRow({
          WORK_DAY: "07/03（金）",
          ALL_WORK_MINUTE: "",
          START_TIMERECORD: "A\n09:00\n",
          END_TIMERECORD: "",
        }),
      );
      wrapper.append(table);
      document.body.append(wrapper);

      const mockTimer = createMockTimer();
      const localService = createContentScriptService(
        createMockStorage(),
        createMockMessaging(),
        mockTimer,
      );
      localService.run();

      const diffCells = table.querySelectorAll<HTMLTableCellElement>(
        "tbody tr td.kotdiff-injected",
      );
      expect(diffCells).toHaveLength(2);

      // 前日行は単なる打刻エラー — 進行中差分は表示しない
      expect(diffCells[0]?.textContent).toBe("");
      expect(diffCells[0]?.style.fontStyle).not.toBe("italic");

      // 当日行が唯一の進行中行: 09:00→10:00 = 1h → 1h - 8h = -7:00
      expect(diffCells[1]?.textContent).toBe("-7:00");
      expect(diffCells[1]?.style.fontStyle).toBe("italic");

      // 定期更新ループはちょうど1つ
      expect(mockTimer.setInterval).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
      wrapper.remove();
    });

    test("banner shows clock-out target while working today (issue #53)", () => {
      vi.useFakeTimers();
      // JST 07/03 10:00 — 今日 09:00 出勤で勤務中（UTC 表記でタイムゾーン非依存にする）
      vi.setSystemTime(new Date("2026-07-03T01:00:00Z"));

      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable({
        WORK_DAY: "07/03（金）",
        ALL_WORK_MINUTE: "",
        START_TIMERECORD: "A\n09:00\n",
        END_TIMERECORD: "",
      });
      wrapper.append(table);
      document.body.append(wrapper);

      const localService = createContentScriptService(
        createMockStorage(),
        createMockMessaging(),
        createMockTimer(),
      );
      localService.run();

      // 貯金 0・実働 1h → 残り 7h、退勤目安 = 10:00 + 7h = 17:00
      const banner = document.querySelector("div.kotdiff-injected");
      expect(banner?.textContent).toContain("あと 7:00 で貯金±0");
      expect(banner?.textContent).toContain("退勤目安 17:00");

      vi.useRealTimers();
      wrapper.remove();
    });

    test("scrapes statutory overtime from flex summary table into dashboard data", () => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      wrapper.append(createKotTable());
      document.body.append(wrapper);

      // フレックスタイム集計 [残業時間詳細] 相当のテーブル
      const flexDiv = document.createElement("div");
      flexDiv.innerHTML = `
        <table>
          <thead><tr><th><p>基準内労働時間</p></th><th><p>基準外労働時間</p></th></tr></thead>
          <tbody><tr><td>152.00</td><td>5.31</td></tr></tbody>
        </table>
      `;
      document.body.append(flexDiv);

      const localStorage = createMockStorage();
      const localService = createContentScriptService(
        localStorage,
        createMockMessaging(),
        createMockTimer(),
      );
      localService.run();

      const saved = vi.mocked(localStorage.setDashboardData).mock.calls[0]?.[0];
      expect(saved?.statutoryOvertime).toBeCloseTo(5 + 31 / 60, 5);

      flexDiv.remove();
      wrapper.remove();
    });

    test("re-injects diff column when KOT replaces the table", async () => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.append(table);
      document.body.append(wrapper);

      const { timer, fireRemovals } = createRemovalFiringTimer();
      const localService = createContentScriptService(storage, messaging, timer);
      localService.run();
      expect(table.querySelector("thead tr th.kotdiff-injected")).not.toBeNull();

      // KOT の再描画: 差分列付きの旧テーブルが差し替えられ、バナーは残る
      const newTable = createKotTable();
      table.remove();
      wrapper.append(newTable);
      fireRemovals();

      await vi.waitFor(() => {
        expect(newTable.querySelector("thead tr th.kotdiff-injected")).not.toBeNull();
      });

      // 新テーブルの各行に差分セルがちょうど1つ注入される
      expect(newTable.querySelectorAll("tbody tr td.kotdiff-injected").length).toBe(1);
      // 再注入前に残骸バナーが除去され、バナーは1つだけ残る
      expect(document.querySelectorAll("div.kotdiff-injected").length).toBe(1);

      wrapper.remove();
    });

    test("does not re-inject when the new table already has a diff header", async () => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.append(table);
      document.body.append(wrapper);

      const { timer, fireRemovals } = createRemovalFiringTimer();
      const localService = createContentScriptService(storage, messaging, timer);
      localService.run();
      expect(storage.setDashboardData).toHaveBeenCalledTimes(1);

      // 旧ヘッダは除去されたが、テーブルには既に差分ヘッダが再度存在する
      // (例: 別の注入経路が先に再描画を処理済みのケース)
      table.querySelector("thead tr th.kotdiff-injected")?.remove();
      const replacementHeader = document.createElement("th");
      replacementHeader.classList.add("kotdiff-injected");
      table.querySelector("thead tr")?.append(replacementHeader);

      fireRemovals();
      await Promise.resolve();
      await Promise.resolve();

      // 2回目の注入は起きない
      expect(storage.setDashboardData).toHaveBeenCalledTimes(1);
      expect(table.querySelectorAll("thead tr th.kotdiff-injected").length).toBe(1);

      wrapper.remove();
    });

    test("injectDashboardButton is always called unconditionally", () => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.append(table);
      document.body.append(wrapper);

      const mockTimer = createMockTimer();
      const localStorage = createMockStorage();
      const localMessaging = createMockMessaging();

      const localService = createContentScriptService(localStorage, localMessaging, mockTimer);
      localService.run();

      // Dashboard button injection is unconditional — button should be inside the banner div
      const banner = document.querySelector("div.kotdiff-injected");
      expect(banner?.querySelector("button")).not.toBeNull();

      // Clean up
      wrapper.remove();
    });
  });
});

describe("ContentScriptService — v2 UI (newUi 有効時)", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let messaging: ReturnType<typeof createMockMessaging>;
  let wrapper: HTMLDivElement;
  let table: HTMLTableElement;

  const v2Prefs = { newUi: true, bannerOpen: false, calendarOpen: false, tableCollapsed: false };

  function mount(cellOverrides: Record<string, string> = {}): void {
    wrapper = document.createElement("div");
    wrapper.classList.add("htBlock-adjastableTableF_inner");
    table = createKotTable(cellOverrides);
    wrapper.append(table);
    document.body.append(wrapper);
  }

  beforeEach(() => {
    storage = createMockStorage();
    messaging = createMockMessaging();
    for (const el of document.querySelectorAll(".kotdiff-injected")) {
      el.remove();
    }
    document.querySelector(".htBlock-adjastableTableF_inner")?.remove();
  });

  test("renames the column to 時間貯金 and moves it next to the date", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: v2Prefs,
    }).run();

    const headers = table.querySelectorAll("thead th");
    expect(headers[1]?.textContent).toBe("時間貯金");

    const cells = table.querySelectorAll("tbody tr td");
    expect(cells[1]?.classList.contains("kotdiff-savings")).toBe(true);
    expect(cells[1]?.textContent).toContain("+0:00");

    wrapper.remove();
  });

  test("keeps the legacy 差分 column at the end when the flag is off", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer()).run();

    const headers = table.querySelectorAll("thead th");
    expect([...headers].at(-1)?.textContent).toBe("差分");

    wrapper.remove();
  });

  test("injects the summary card instead of the emoji banner", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: v2Prefs,
    }).run();

    const card = wrapper.querySelector("div.kotdiff-card");
    const calendar = wrapper.querySelector("div.kotdiff-calendar");
    expect(card).not.toBeNull();
    // カード → カレンダー → ダッシュボードボタン → 表 の順で表の上に積む
    expect(card?.nextElementSibling).toBe(calendar);
    expect(calendar?.nextElementSibling?.querySelector("button")).not.toBeNull();
    expect(calendar?.nextElementSibling?.nextElementSibling).toBe(table);
    // 絵文字はカードにもボタンにも出さない
    expect(wrapper.textContent ?? "").not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);

    wrapper.remove();
  });

  test("persists the open state when the card is toggled", () => {
    mount();
    const savePreferences = vi.fn();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: v2Prefs,
      savePreferences,
    }).run();

    wrapper.querySelector<HTMLElement>("div.kotdiff-card")?.click();

    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ newUi: true, bannerOpen: true }),
    );

    wrapper.remove();
  });

  test("marks a row with a missing clock-out as 未 and reports it on the card", () => {
    mount({ END_TIMERECORD: "", ALL_WORK_MINUTE: "" });
    // KOT はエラー勤務行に specific-uncomplete クラスを付ける
    const errorMark = document.createElement("span");
    errorMark.classList.add("specific-uncomplete");
    table.querySelector("tbody tr td")?.append(errorMark);

    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: v2Prefs,
    }).run();

    const cells = table.querySelectorAll("tbody tr td");
    expect(cells[1]?.textContent).toBe("未");
    expect(wrapper.querySelector("div.kotdiff-card")?.textContent).toContain("打刻が未入力");

    wrapper.remove();
  });
});

describe("ContentScriptService — 表の折りたたみ", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let messaging: ReturnType<typeof createMockMessaging>;
  let wrapper: HTMLDivElement;
  let table: HTMLTableElement;

  function mount(): void {
    wrapper = document.createElement("div");
    wrapper.classList.add("htBlock-adjastableTableF_inner");
    table = createKotTable();
    wrapper.append(table);
    document.body.append(wrapper);
  }

  function toggleButton(): HTMLButtonElement | null {
    for (const button of wrapper.querySelectorAll("button")) {
      if (button.textContent === "表をたたむ" || button.textContent === "表を表示する") {
        return button;
      }
    }
    return null;
  }

  beforeEach(() => {
    storage = createMockStorage();
    messaging = createMockMessaging();
    for (const el of document.querySelectorAll(".kotdiff-injected")) {
      el.remove();
    }
    document.querySelector(".htBlock-adjastableTableF_inner")?.remove();
  });

  test("shows the table as before until it is folded away", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: { newUi: true, bannerOpen: false, calendarOpen: false, tableCollapsed: false },
    }).run();

    expect(table.style.display).toBe("");
    expect(toggleButton()?.textContent).toBe("表をたたむ");

    wrapper.remove();
  });

  test("folds the table away and persists the choice", () => {
    mount();
    const savePreferences = vi.fn();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: { newUi: true, bannerOpen: false, calendarOpen: false, tableCollapsed: false },
      savePreferences,
    }).run();

    toggleButton()?.click();

    expect(table.style.display).toBe("none");
    expect(toggleButton()?.textContent).toBe("表を表示する");
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ tableCollapsed: true }));

    wrapper.remove();
  });

  test("opens the calendar when the table is folded away", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: { newUi: true, bannerOpen: false, calendarOpen: false, tableCollapsed: true },
    }).run();

    expect(table.style.display).toBe("none");
    // 表が無いぶんカレンダーが主役になるので展開して出す
    expect(wrapper.querySelector("div.kotdiff-calendar")?.textContent).toContain("週合計");

    wrapper.remove();
  });

  test("brings the table back", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer(), undefined, {
      preferences: { newUi: true, bannerOpen: false, calendarOpen: false, tableCollapsed: true },
    }).run();

    toggleButton()?.click();

    expect(table.style.display).toBe("");
    expect(toggleButton()?.textContent).toBe("表をたたむ");

    wrapper.remove();
  });

  test("keeps the fold control out of the legacy UI", () => {
    mount();
    createContentScriptService(storage, messaging, createMockTimer()).run();

    expect(toggleButton()).toBeNull();
    expect(table.style.display).toBe("");

    wrapper.remove();
  });
});
