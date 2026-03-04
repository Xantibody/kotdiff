import { DEFAULT_ENABLED, STORAGE_KEY } from "./storage";

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

chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});
