import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { ActionPort } from "../infrastructure/chrome/ports/ActionPort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type {
  ContextMenusPort,
  ContextMenuInfo,
} from "../infrastructure/chrome/ports/ContextMenusPort";
import { isKotdiffMessage } from "./types";
import { KOT_URL, KOT_URL_PATTERN } from "../infrastructure/chrome/constants";

const OPEN_KOT_MENU_ID = "open-kot";

export interface BackgroundServiceInstance {
  init(): void;
  onInstalled(): Promise<void>;
  onStartup(): Promise<void>;
}

export function createBackgroundService(
  storage: StoragePort,
  action: ActionPort,
  tabs: TabsPort,
  messaging: MessagingPort,
  contextMenus: ContextMenusPort,
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

  async function handleMessage(msg: unknown): Promise<void> {
    if (!isKotdiffMessage(msg)) return;
    if (msg.type === "kotdiff-open-dashboard") {
      await openDashboardTab();
    }
  }

  return {
    init() {
      action.onClicked(() => {
        void openDashboardTab();
      });
      contextMenus.onClicked((info) => {
        void handleContextMenuClick(info);
      });
      messaging.onMessage((msg) => {
        void handleMessage(msg);
      });
    },
    async onInstalled() {
      contextMenus.create({
        id: OPEN_KOT_MENU_ID,
        title: "KOT 画面を開く",
        type: "normal",
        contexts: [chrome.contextMenus.ContextType.ACTION],
      });
    },
    async onStartup() {},
  };
}
