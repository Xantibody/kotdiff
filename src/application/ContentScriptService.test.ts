import { describe, test, expect, vi, beforeEach } from "vitest";

import {
  createContentScriptService,
  type ContentScriptServiceInstance,
} from "./ContentScriptService";
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

function createMockDom(): DomReadyPort {
  return {
    isAlreadyInjected: vi.fn().mockReturnValue(false),
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

function createKotTable(): HTMLTableElement {
  const table = document.createElement("table");

  // thead with a header row
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const th = document.createElement("th");
  th.textContent = "日付";
  headerRow.appendChild(th);
  thead.appendChild(headerRow);

  // tbody with one worked row
  const tbody = document.createElement("tbody");
  const tr = document.createElement("tr");

  const cells: [string, string][] = [
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
  ];

  for (const [sortIndex, text] of cells) {
    const td = document.createElement("td");
    td.setAttribute("data-ht-sort-index", sortIndex);
    if (
      ["FIXED_WORK_MINUTE", "ALL_WORK_MINUTE", "REST_MINUTE", "OVERTIME_WORK_MINUTE"].includes(
        sortIndex,
      )
    ) {
      const p = document.createElement("p");
      p.textContent = text;
      td.appendChild(p);
    } else {
      td.textContent = text;
    }
    tr.appendChild(td);
  }
  tbody.appendChild(tr);

  table.appendChild(thead);
  table.appendChild(tbody);
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
    document.querySelectorAll(".kotdiff-injected").forEach((el) => el.remove());
  });

  describe("run()", () => {
    test("returns early when already injected", async () => {
      // Inject a marker element to simulate already injected state
      const marker = document.createElement("div");
      marker.classList.add("kotdiff-injected");
      document.body.appendChild(marker);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await service.run();

      expect(consoleSpy).toHaveBeenCalledWith("[kotdiff] already injecting or injected");

      consoleSpy.mockRestore();
      marker.remove();
    });

    test("concurrent run() calls do not double-inject", async () => {
      const mockDom = createMockDom();
      const localService = createContentScriptService(
        storage,
        messaging,
        createMockTimer(),
        mockDom,
      );

      await Promise.all([localService.run(), localService.run()]);

      // Second call should be blocked by the injecting flag — waitForElement called at most once
      expect(mockDom.waitForElement).toHaveBeenCalledTimes(1);
    });
  });

  describe("listenForMessages()", () => {
    test("is a no-op", () => {
      service.listenForMessages();
      expect(messaging.onMessage).not.toHaveBeenCalled();
    });
  });

  describe("inject() integration", () => {
    test("injects diff column header and cell into KOT-style table", async () => {
      // Build DOM: .htBlock-adjastableTableF_inner > table
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);

      const mockTimer = createMockTimer();
      const localStorage = createMockStorage();
      const localMessaging = createMockMessaging();

      const localService = createContentScriptService(localStorage, localMessaging, mockTimer);
      await localService.run();

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

    test("injectDashboardButton is always called unconditionally", async () => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("htBlock-adjastableTableF_inner");
      const table = createKotTable();
      wrapper.appendChild(table);
      document.body.appendChild(wrapper);

      const mockTimer = createMockTimer();
      const localStorage = createMockStorage();
      const localMessaging = createMockMessaging();

      const localService = createContentScriptService(localStorage, localMessaging, mockTimer);
      await localService.run();

      // Dashboard button injection is unconditional — button should be inside the banner div
      const banner = document.querySelector("div.kotdiff-injected");
      expect(banner?.querySelector("button")).not.toBeNull();

      // Clean up
      wrapper.remove();
    });
  });
});
