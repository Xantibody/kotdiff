import { describe, test, expect, vi, beforeEach } from "vitest";
import { createDashboardButton, injectDashboardButton } from "./DashboardButtonRenderer";
import { KOTDIFF_MARKER_CLASS } from "./styles";
import type { StoragePort } from "../chrome/ports/StoragePort";
import type { MessagingPort } from "../chrome/ports/MessagingPort";

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

function createKotTable(): HTMLTableElement {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.append(thead);
  table.append(tbody);
  return table;
}

function createKotRow(data: Record<string, string>): HTMLTableRowElement {
  const tr = document.createElement("tr");
  for (const [sortIndex, text] of Object.entries(data)) {
    const td = document.createElement("td");
    td.dataset.htSortIndex = sortIndex;
    td.textContent = text;
    tr.append(td);
  }
  return tr;
}

function createKotTableWithRows(rows: Record<string, string>[]): HTMLTableElement {
  const table = createKotTable();
  const tbody = table.querySelector("tbody");
  for (const row of rows) {
    tbody?.append(createKotRow(row));
  }
  return table;
}

describe("createDashboardButton", () => {
  test("returns a button element", () => {
    const table = createKotTable();
    const btn = createDashboardButton(table, createMockStorage(), createMockMessaging());
    expect(btn.tagName).toBe("BUTTON");
  });

  test("button has dashboard label text", () => {
    const table = createKotTable();
    const btn = createDashboardButton(table, createMockStorage(), createMockMessaging());
    expect(btn.textContent).toContain("ダッシュボード");
  });

  test("clicking button calls storage.setDashboardData and messaging.sendMessage", async () => {
    const table = createKotTable();
    const storage = createMockStorage();
    const messaging = createMockMessaging();
    const btn = createDashboardButton(table, storage, messaging);

    btn.click();
    // Allow async handlers to settle
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.setDashboardData).toHaveBeenCalledTimes(1);
    expect(messaging.sendMessage).toHaveBeenCalledWith({ type: "kotdiff-open-dashboard" });
  });

  // #15 の回帰テスト: スケジュールあり・実績なしの行(未来の平日)でクラッシュしていた
  test("clicking button calls setDashboardData even when a row has schedule text and no actual work", async () => {
    const table = createKotTableWithRows([
      { WORK_DAY: "07/10", WORK_DAY_TYPE: "平日", SCHEDULE: "複数回休憩" },
    ]);
    const storage = createMockStorage();
    const messaging = createMockMessaging();
    const btn = createDashboardButton(table, storage, messaging);

    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(storage.setDashboardData).toHaveBeenCalledTimes(1);
    expect(messaging.sendMessage).toHaveBeenCalledWith({ type: "kotdiff-open-dashboard" });
  });
});

describe("injectDashboardButton", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("does nothing when no banner element exists", () => {
    const table = createKotTable();
    // No banner in DOM
    expect(() => {
      injectDashboardButton(table, createMockStorage(), createMockMessaging());
    }).not.toThrow();
  });

  test("appends button to banner when banner exists", () => {
    const banner = document.createElement("div");
    banner.classList.add(KOTDIFF_MARKER_CLASS);
    document.body.append(banner);

    const table = createKotTable();
    injectDashboardButton(table, createMockStorage(), createMockMessaging());

    const btn = banner.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain("ダッシュボード");
  });
});
