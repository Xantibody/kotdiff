import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type {
  ContextMenusPort,
  ContextMenuInfo,
} from "../infrastructure/chrome/ports/ContextMenusPort";
import { isKotdiffMessage } from "./types";
import { openKotTab } from "./KotTab";

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
): BackgroundServiceInstance {
  async function openDashboardTab(): Promise<void> {
    const data = await storage.getDashboardData();
    if (data === null) {
      await openKotTab(tabs);
    } else {
      await tabs.openTab(messaging.getExtensionUrl("dashboard.html"));
    }
  }

  async function handleContextMenuClick(info: ContextMenuInfo): Promise<void> {
    if (info.menuItemId === OPEN_KOT_MENU_ID) {
      await openKotTab(tabs);
    }
  }

  async function handleMessage(msg: unknown): Promise<void> {
    if (!isKotdiffMessage(msg)) {
      return;
    }
    if (msg.type === "kotdiff-open-dashboard") {
      await openDashboardTab();
    } else {
      await openKotTab(tabs);
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
