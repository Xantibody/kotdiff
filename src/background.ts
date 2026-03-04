import { DEFAULT_ENABLED, DEFAULT_SIMPLE_MODE, SIMPLE_MODE_KEY, STORAGE_KEY } from "./storage";

const SIMPLE_MODE_MENU_ID = "kotdiff-simple-mode";

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
  if (info.menuItemId === SIMPLE_MODE_MENU_ID) {
    const checked = info.checked ?? false;
    await chrome.storage.local.set({ [SIMPLE_MODE_KEY]: checked });
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, { type: "kotdiff-simple-mode-changed" }).catch(() => {
        // Content script may not be loaded on this tab
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);

  const result = await chrome.storage.local.get({ [SIMPLE_MODE_KEY]: DEFAULT_SIMPLE_MODE });
  const simpleMode = result[SIMPLE_MODE_KEY];
  chrome.contextMenus.create({
    id: SIMPLE_MODE_MENU_ID,
    title: "簡易表示モード",
    type: "checkbox",
    contexts: ["action"],
    checked: simpleMode,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});
