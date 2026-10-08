import { describe, test, expect, vi, beforeEach } from "vitest";
import { defined } from "../test-utils";
import { createBackgroundService } from "./BackgroundService";
import type { BackgroundServiceInstance } from "./BackgroundService";
import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type { ContextMenusPort } from "../infrastructure/chrome/ports/ContextMenusPort";
import type { AutoLoginServiceInstance } from "./AutoLoginService";

// import はモジュール評価前に巻き上げられるため、stubGlobal は import 後で問題ない
// (chrome API は onInstalled() 呼び出し時に初めて参照される)
vi.stubGlobal("chrome", {
  contextMenus: {
    ContextType: { ACTION: "action" },
  },
});

// 実際の KOT ページは s2.ta.kingoftime.jp ドメイン。
// 定数を import すると定数の値が間違っていても通ってしまうため、リテラルで検証する。
const EXPECTED_KOT_URL = "https://s2.ta.kingoftime.jp/admin";
const EXPECTED_KOT_URL_PATTERN = "*://*.kingoftime.jp/*";
// ログイン画面の content script からの問い合わせ
const KOT_SENDER = { url: "https://s2.ta.kingoftime.jp/admin" };

function createMockStorage(): StoragePort {
  return {
    getDashboardData: vi.fn().mockResolvedValue(null),
    setDashboardData: vi.fn().mockResolvedValue(undefined),
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
    onRequest: vi.fn(),
    request: vi.fn().mockResolvedValue(undefined),
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
  let tabs: ReturnType<typeof createMockTabs>;
  let messaging: ReturnType<typeof createMockMessaging>;
  let contextMenus: ReturnType<typeof createMockContextMenus>;
  let autoLogin: AutoLoginServiceInstance;
  let service: BackgroundServiceInstance;

  beforeEach(() => {
    storage = createMockStorage();
    tabs = createMockTabs();
    messaging = createMockMessaging();
    contextMenus = createMockContextMenus();
    autoLogin = { requestCredentials: vi.fn().mockResolvedValue({ status: "skip" }) };
    service = createBackgroundService(storage, tabs, messaging, contextMenus, autoLogin);
  });

  describe("init()", () => {
    test("registers listeners on contextMenus and messaging", () => {
      service.init();
      expect(contextMenus.onClicked).toHaveBeenCalledTimes(1);
      expect(messaging.onMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("onInstalled()", () => {
    test("creates 'KOT 画面を開く' normal menu item", () => {
      service.onInstalled();
      expect(contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "open-kot",
          title: "KOT 画面を開く",
          type: "normal",
          contexts: ["action"],
        }),
      );
    });

    test("does not call storage methods", () => {
      service.onInstalled();
      expect(storage.getDashboardData).not.toHaveBeenCalled();
      expect(storage.setDashboardData).not.toHaveBeenCalled();
    });
  });

  describe("handleContextMenuClick (via init listener)", () => {
    test("'open-kot' menu click calls openKotTab (no existing tab)", async () => {
      vi.mocked(tabs.queryByUrl).mockResolvedValue([]);
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "open-kot" }, undefined);
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(tabs.queryByUrl).toHaveBeenCalledWith(EXPECTED_KOT_URL_PATTERN);
      expect(tabs.openTab).toHaveBeenCalledWith(EXPECTED_KOT_URL);
      expect(tabs.activateTab).not.toHaveBeenCalled();
    });

    test("'open-kot' menu click calls openKotTab (existing tab found)", async () => {
      vi.mocked(tabs.queryByUrl).mockResolvedValue([1]);
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "open-kot" }, undefined);
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(tabs.queryByUrl).toHaveBeenCalledWith(EXPECTED_KOT_URL_PATTERN);
      expect(tabs.activateTab).toHaveBeenCalledWith(1);
      expect(tabs.openTab).not.toHaveBeenCalled();
    });

    test("ignores unknown menuItemId", async () => {
      service.init();

      const handler = defined(vi.mocked(contextMenus.onClicked).mock.calls[0]?.[0]);
      handler({ menuItemId: "some-other-menu" }, undefined);
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

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
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(messaging.getExtensionUrl).toHaveBeenCalledWith("dashboard.html");
      expect(tabs.openTab).toHaveBeenCalledWith("chrome-extension://id/dashboard.html");
    });

    test("activates existing KOT tab when kotdiff-open-kot message received", async () => {
      vi.mocked(tabs.queryByUrl).mockResolvedValue([1]);
      service.init();

      const handler = defined(vi.mocked(messaging.onMessage).mock.calls[0]?.[0]);
      handler({ type: "kotdiff-open-kot" });
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(tabs.queryByUrl).toHaveBeenCalledWith(EXPECTED_KOT_URL_PATTERN);
      expect(tabs.activateTab).toHaveBeenCalledWith(1);
    });

    test("ignores unknown message types", async () => {
      service.init();

      const handler = defined(vi.mocked(messaging.onMessage).mock.calls[0]?.[0]);
      handler({ type: "unknown-message" });
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(tabs.openTab).not.toHaveBeenCalled();
    });
  });

  describe("handleRequest (via init listener)", () => {
    test("answers kotdiff-auto-login with the auto-login service result", async () => {
      service.init();

      const handler = defined(vi.mocked(messaging.onRequest).mock.calls[0]?.[1]);

      await expect(handler({ type: "kotdiff-auto-login" }, KOT_SENDER)).resolves.toEqual({
        status: "skip",
      });
      expect(autoLogin.requestCredentials).toHaveBeenCalledTimes(1);
    });

    test("KOT のページ以外（ポップアップなど）からの問い合わせには認証情報を出さない", async () => {
      service.init();
      vi.mocked(autoLogin.requestCredentials).mockResolvedValue({
        status: "credentials",
        credentials: { username: "user01", password: "secret" },
      });

      const handler = defined(vi.mocked(messaging.onRequest).mock.calls[0]?.[1]);

      await expect(
        handler({ type: "kotdiff-auto-login" }, { url: "chrome-extension://id/popup.html" }),
      ).resolves.toEqual({ status: "skip" });
      expect(autoLogin.requestCredentials).not.toHaveBeenCalled();
    });

    test("自動ログインサービスが例外を投げてもエラー応答にして返す（応答がないと content 側で握り潰される）", async () => {
      service.init();
      vi.mocked(autoLogin.requestCredentials).mockRejectedValue(new Error("storage unavailable"));

      const handler = defined(vi.mocked(messaging.onRequest).mock.calls[0]?.[1]);

      await expect(handler({ type: "kotdiff-auto-login" }, KOT_SENDER)).resolves.toEqual({
        status: "error",
        message: "storage unavailable",
      });
    });

    test("does not answer other messages", () => {
      service.init();

      const accepts = defined(vi.mocked(messaging.onRequest).mock.calls[0]?.[0]);

      expect(accepts({ type: "kotdiff-auto-login" })).toBe(true);
      expect(accepts({ type: "kotdiff-open-dashboard" })).toBe(false);
    });
  });
});
