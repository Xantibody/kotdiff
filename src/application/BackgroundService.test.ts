import { describe, test, expect, vi, beforeEach } from "vitest";

vi.stubGlobal("chrome", {
  contextMenus: {
    ContextType: { ACTION: "action" },
  },
});

import { defined } from "../test-utils";
import { createBackgroundService } from "./BackgroundService";
import type { BackgroundServiceInstance } from "./BackgroundService";
import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { ActionPort } from "../infrastructure/chrome/ports/ActionPort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type { ContextMenusPort } from "../infrastructure/chrome/ports/ContextMenusPort";
import { KOT_URL, KOT_URL_PATTERN } from "../infrastructure/chrome/constants";

function createMockStorage(): StoragePort {
  return {
    getDashboardData: vi.fn().mockResolvedValue(null),
    setDashboardData: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAction(): ActionPort {
  return {
    onClicked: vi.fn(),
  };
}

function createMockTabs(): TabsPort {
  return {
    openTab: vi.fn().mockResolvedValue(undefined),
    sendToTab: vi.fn().mockResolvedValue(undefined),
    queryByUrl: vi.fn().mockResolvedValue([]),
    activateTab: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMessaging(): MessagingPort {
  return {
    onMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    getExtensionUrl: vi.fn().mockReturnValue("chrome-extension://id/dashboard.html"),
  };
}

function createMockContextMenus(): ContextMenusPort {
  return {
    create: vi.fn(),
    onClicked: vi.fn(),
  };
}

describe("BackgroundService", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let action: ReturnType<typeof createMockAction>;
  let tabs: ReturnType<typeof createMockTabs>;
  let messaging: ReturnType<typeof createMockMessaging>;
  let contextMenus: ReturnType<typeof createMockContextMenus>;
  let service: BackgroundServiceInstance;

  beforeEach(() => {
    storage = createMockStorage();
    action = createMockAction();
    tabs = createMockTabs();
    messaging = createMockMessaging();
    contextMenus = createMockContextMenus();
    service = createBackgroundService(storage, action, tabs, messaging, contextMenus);
  });

  describe("init()", () => {
    test("registers listeners on action, contextMenus, and messaging", () => {
      service.init();
      expect(action.onClicked).toHaveBeenCalledTimes(1);
      expect(contextMenus.onClicked).toHaveBeenCalledTimes(1);
      expect(messaging.onMessage).toHaveBeenCalledTimes(1);
    });

    test("action.onClicked triggers openDashboardTab", async () => {
      vi.mocked(messaging.getExtensionUrl).mockReturnValue("chrome-extension://id/dashboard.html");
      vi.mocked(storage.getDashboardData).mockResolvedValue({
        rows: [],
        leaveBalances: [],
        generatedAt: "2024-01-01T00:00:00.000Z",
      });
      service.init();

      const handler = defined(vi.mocked(action.onClicked).mock.calls[0]?.[0]);
      handler(1);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(messaging.getExtensionUrl).toHaveBeenCalledWith("dashboard.html");
      expect(tabs.openTab).toHaveBeenCalledWith("chrome-extension://id/dashboard.html");
    });
  });

  describe("onInstalled()", () => {
    test("creates 'KOT 画面を開く' normal menu item", async () => {
      await service.onInstalled();
      expect(contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "open-kot",
          title: "KOT 画面を開く",
          type: "normal",
          contexts: ["action"],
        }),
      );
    });

    test("does not call storage methods", async () => {
      await service.onInstalled();
      expect(storage.getDashboardData).not.toHaveBeenCalled();
      expect(storage.setDashboardData).not.toHaveBeenCalled();
    });
  });

  describe("onStartup()", () => {
    test("completes without error", async () => {
      await expect(service.onStartup()).resolves.toBeUndefined();
    });
  });

  describe("handleContextMenuClick (via init listener)", () => {
    test("'open-kot' menu click calls openKotTab (no existing tab)", async () => {
      vi.mocked(tabs.queryByUrl).mockResolvedValue([]);
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "open-kot" }, undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(tabs.queryByUrl).toHaveBeenCalledWith(KOT_URL_PATTERN);
      expect(tabs.openTab).toHaveBeenCalledWith(KOT_URL);
      expect(tabs.activateTab).not.toHaveBeenCalled();
    });

    test("'open-kot' menu click calls openKotTab (existing tab found)", async () => {
      vi.mocked(tabs.queryByUrl).mockResolvedValue([1]);
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "open-kot" }, undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(tabs.queryByUrl).toHaveBeenCalledWith(KOT_URL_PATTERN);
      expect(tabs.activateTab).toHaveBeenCalledWith(1);
      expect(tabs.openTab).not.toHaveBeenCalled();
    });

    test("ignores unknown menuItemId", async () => {
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "some-other-menu" }, undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(tabs.queryByUrl).not.toHaveBeenCalled();
      expect(tabs.openTab).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage (via init listener)", () => {
    test("opens dashboard tab when kotdiff-open-dashboard message received", async () => {
      vi.mocked(messaging.getExtensionUrl).mockReturnValue("chrome-extension://id/dashboard.html");
      vi.mocked(storage.getDashboardData).mockResolvedValue({
        rows: [],
        leaveBalances: [],
        generatedAt: "2024-01-01T00:00:00.000Z",
      });
      service.init();

      const handler = defined(vi.mocked(messaging.onMessage).mock.calls[0]?.[0]);
      handler({ type: "kotdiff-open-dashboard" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(messaging.getExtensionUrl).toHaveBeenCalledWith("dashboard.html");
      expect(tabs.openTab).toHaveBeenCalledWith("chrome-extension://id/dashboard.html");
    });

    test("ignores unknown message types", async () => {
      service.init();

      const handler = defined(vi.mocked(messaging.onMessage).mock.calls[0]?.[0]);
      handler({ type: "unknown-message" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(tabs.openTab).not.toHaveBeenCalled();
    });
  });
});
