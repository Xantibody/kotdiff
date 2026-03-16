import { DASHBOARD_KEY, DEFAULT_DASHBOARD, DEFAULT_ENABLED, STORAGE_KEY } from "./storage";

const DASHBOARD_MENU_ID = "kotdiff-dashboard";

async function getEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
  return result[STORAGE_KEY];
}

async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
}

async function updateBadge(enabled: boolean): Promise<void> {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#4caf50" : "#9e9e9e",
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  const current = await getEnabled();
  const next = !current;
  await setEnabled(next);
  await updateBadge(next);

  if (tab.id !== undefined) {
    chrome.tabs.sendMessage(tab.id, { type: "kotdiff-toggle", enabled: next }).catch(() => {
      // Content script may not be loaded on this tab
    });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === DASHBOARD_MENU_ID) {
    const checked = info.checked ?? false;
    await chrome.storage.local.set({ [DASHBOARD_KEY]: checked });
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, { type: "kotdiff-dashboard-changed" }).catch(() => {
        // Content script may not be loaded on this tab
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "kotdiff-open-dashboard") {
    const url = chrome.runtime.getURL("dashboard.html");
    chrome.tabs.create({ url });
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);

  const result = await chrome.storage.local.get({ [DASHBOARD_KEY]: DEFAULT_DASHBOARD });
  const dashboard = result[DASHBOARD_KEY];
  chrome.contextMenus.create({
    id: DASHBOARD_MENU_ID,
    title: "ダッシュボード",
    type: "checkbox",
    contexts: ["action"],
    checked: dashboard,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});
