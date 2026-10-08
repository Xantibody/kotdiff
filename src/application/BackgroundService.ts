import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { MessagingPort, RequestSender } from "../infrastructure/chrome/ports/MessagingPort";
import { isKotPageUrl } from "../infrastructure/kot/KotUrl";
import type {
  ContextMenusPort,
  ContextMenuInfo,
} from "../infrastructure/chrome/ports/ContextMenusPort";
import { isKotdiffMessage, isAutoLoginRequest } from "./types";
import type { AutoLoginServiceInstance, AutoLoginResponse } from "./AutoLoginService";
import { errorMessage } from "./errorMessage";
import { KOT_URL, KOT_URL_PATTERN } from "../infrastructure/chrome/constants";

const OPEN_KOT_MENU_ID = "open-kot";

export interface BackgroundServiceInstance {
  init(): void;
  onInstalled(): void;
}

export function createBackgroundService(
  storage: StoragePort,
  tabs: TabsPort,
  messaging: MessagingPort,
  contextMenus: ContextMenusPort,
  autoLogin: AutoLoginServiceInstance,
): BackgroundServiceInstance {
  async function openDashboardTab(): Promise<void> {
    const data = await storage.getDashboardData();
    if (data === null) {
      await openKotTab();
    } else {
      await tabs.openTab(messaging.getExtensionUrl("dashboard.html"));
    }
  }

  async function openKotTab(): Promise<void> {
    const tabIds = await tabs.queryByUrl(KOT_URL_PATTERN);
    if (tabIds.length > 0 && tabIds[0] !== undefined) {
      await tabs.activateTab(tabIds[0]);
    } else {
      await tabs.openTab(KOT_URL);
    }
  }

  async function handleContextMenuClick(info: ContextMenuInfo): Promise<void> {
    if (info.menuItemId === OPEN_KOT_MENU_ID) {
      await openKotTab();
    }
  }

  // 例外のまま抜けると sendResponse が呼ばれず、content 側は理由を知れないまま黙る
  async function handleAutoLoginRequest(
    _msg: unknown,
    sender: RequestSender,
  ): Promise<AutoLoginResponse> {
    // 認証情報を渡す相手は KOT のページに限る（拡張内の他のページからは出さない）
    if (!isKotPageUrl(sender.url)) {
      return { status: "skip" };
    }
    try {
      return await autoLogin.requestCredentials(Date.now());
    } catch (error) {
      return { status: "error", message: errorMessage(error) };
    }
  }

  async function handleMessage(msg: unknown): Promise<void> {
    if (!isKotdiffMessage(msg)) {
      return;
    }
    if (msg.type === "kotdiff-open-dashboard") {
      await openDashboardTab();
    } else {
      await openKotTab();
    }
  }

  return {
    init() {
      contextMenus.onClicked((info) => {
        void handleContextMenuClick(info);
      });
      messaging.onMessage((msg) => {
        void handleMessage(msg);
      });
      messaging.onRequest(isAutoLoginRequest, handleAutoLoginRequest);
    },
    onInstalled() {
      contextMenus.create({
        id: OPEN_KOT_MENU_ID,
        title: "KOT 画面を開く",
        type: "normal",
        contexts: [chrome.contextMenus.ContextType.ACTION],
      });
    },
  };
}
