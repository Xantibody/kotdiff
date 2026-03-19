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

function createMockStorage(): StoragePort {
  return {
    getEnabled: vi.fn().mockResolvedValue(true),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    getDashboardEnabled: vi.fn().mockResolvedValue(false),
    setDashboardEnabled: vi.fn().mockResolvedValue(undefined),
    getDashboardData: vi.fn().mockResolvedValue(null),
    setDashboardData: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAction(): ActionPort {
  return {
    setBadge: vi.fn().mockResolvedValue(undefined),
    onClicked: vi.fn(),
  };
}

function createMockTabs(): TabsPort {
  return {
    openTab: vi.fn().mockResolvedValue(undefined),
    sendToTab: vi.fn().mockResolvedValue(undefined),
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
  });

  describe("onInstalled()", () => {
    test("updates badge based on storage enabled state", async () => {
      vi.mocked(storage.getEnabled).mockResolvedValue(true);
      await service.onInstalled();
      expect(action.setBadge).toHaveBeenCalledWith("ON", "#4caf50");
    });

    test("creates context menu with dashboard enabled state", async () => {
      vi.mocked(storage.getDashboardEnabled).mockResolvedValue(true);
      await service.onInstalled();
      expect(contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "kotdiff-dashboard",
          type: "checkbox",
          checked: true,
        }),
      );
    });

    test("creates context menu with dashboard disabled state", async () => {
      vi.mocked(storage.getDashboardEnabled).mockResolvedValue(false);
      await service.onInstalled();
      expect(contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "kotdiff-dashboard",
          checked: false,
        }),
      );
    });
  });

  describe("onStartup()", () => {
    test("updates badge based on storage enabled state", async () => {
      vi.mocked(storage.getEnabled).mockResolvedValue(false);
      await service.onStartup();
      expect(action.setBadge).toHaveBeenCalledWith("OFF", "#9e9e9e");
    });

    test("updates badge to ON when enabled", async () => {
      vi.mocked(storage.getEnabled).mockResolvedValue(true);
      await service.onStartup();
      expect(action.setBadge).toHaveBeenCalledWith("ON", "#4caf50");
    });
  });

  describe("handleActionClick (via init listener)", () => {
    test("toggles enabled from true to false, updates badge, sends message to tab", async () => {
      vi.mocked(storage.getEnabled).mockResolvedValue(true);
      service.init();

      const handler = defined(vi.mocked(action.onClicked).mock.calls[0]?.[0]);
      handler(42);
      // flush async work: the handler calls void handleActionClick which is async
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storage.setEnabled).toHaveBeenCalledWith(false);
      expect(action.setBadge).toHaveBeenCalledWith("OFF", "#9e9e9e");
      expect(tabs.sendToTab).toHaveBeenCalledWith(42, { type: "kotdiff-toggle", enabled: false });
    });

    test("toggles enabled from false to true", async () => {
      vi.mocked(storage.getEnabled).mockResolvedValue(false);
      service.init();

      const handler = defined(vi.mocked(action.onClicked).mock.calls[0]?.[0]);
      handler(1);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storage.setEnabled).toHaveBeenCalledWith(true);
      expect(action.setBadge).toHaveBeenCalledWith("ON", "#4caf50");
      expect(tabs.sendToTab).toHaveBeenCalledWith(1, { type: "kotdiff-toggle", enabled: true });
    });
  });

  describe("handleContextMenuClick (via init listener)", () => {
    test("updates dashboard enabled and sends message to tab", async () => {
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "kotdiff-dashboard", checked: true }, 10);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storage.setDashboardEnabled).toHaveBeenCalledWith(true);
      expect(tabs.sendToTab).toHaveBeenCalledWith(10, { type: "kotdiff-dashboard-changed" });
    });

    test("does not send to tab when tabId is undefined", async () => {
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "kotdiff-dashboard", checked: false }, undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storage.setDashboardEnabled).toHaveBeenCalledWith(false);
      expect(tabs.sendToTab).not.toHaveBeenCalled();
    });

    test("ignores unknown menuItemId", async () => {
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "some-other-menu" }, 5);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storage.setDashboardEnabled).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage (via init listener)", () => {
    test("opens dashboard tab when kotdiff-open-dashboard message received", async () => {
      vi.mocked(messaging.getExtensionUrl).mockReturnValue("chrome-extension://id/dashboard.html");
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
