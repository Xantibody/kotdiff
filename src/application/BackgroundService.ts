import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { TabsPort } from "../infrastructure/chrome/ports/TabsPort";
import type { ActionPort } from "../infrastructure/chrome/ports/ActionPort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type {
  ContextMenusPort,
  ContextMenuInfo,
} from "../infrastructure/chrome/ports/ContextMenusPort";

const DASHBOARD_MENU_ID = "kotdiff-dashboard";

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
  async function updateBadge(enabled: boolean): Promise<void> {
    await action.setBadge(enabled ? "ON" : "OFF", enabled ? "#4caf50" : "#9e9e9e");
  }

  async function handleActionClick(tabId: number): Promise<void> {
    const current = await storage.getEnabled();
    const next = !current;
    await storage.setEnabled(next);
    await updateBadge(next);
    await tabs.sendToTab(tabId, { type: "kotdiff-toggle", enabled: next }).catch(() => {});
  }

  async function handleContextMenuClick(info: ContextMenuInfo, tabId?: number): Promise<void> {
    if (info.menuItemId === DASHBOARD_MENU_ID) {
      const checked = info.checked ?? false;
      await storage.setDashboardEnabled(checked);
      if (tabId !== undefined) {
        await tabs.sendToTab(tabId, { type: "kotdiff-dashboard-changed" }).catch(() => {});
      }
    }
  }

  async function handleMessage(msg: unknown): Promise<void> {
    if (typeof msg !== "object" || msg === null || !("type" in msg)) return;
    const message = msg as { type: string };
    if (message.type === "kotdiff-open-dashboard") {
      const url = messaging.getExtensionUrl("dashboard.html");
      await tabs.openTab(url);
    }
  }

  return {
    init() {
      action.onClicked((tabId) => {
        void handleActionClick(tabId);
      });
      contextMenus.onClicked((info, tabId) => {
        void handleContextMenuClick(info, tabId);
      });
      messaging.onMessage((msg) => {
        void handleMessage(msg);
      });
    },
    async onInstalled() {
      const enabled = await storage.getEnabled();
      await updateBadge(enabled);
      const dashboardEnabled = await storage.getDashboardEnabled();
      contextMenus.create({
        id: DASHBOARD_MENU_ID,
        title: "ダッシュボード",
        type: "checkbox",
        contexts: ["action"],
        checked: dashboardEnabled,
      });
    },
    async onStartup() {
      const enabled = await storage.getEnabled();
      await updateBadge(enabled);
    },
  };
}
