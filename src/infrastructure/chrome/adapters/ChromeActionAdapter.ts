import type { ActionPort } from "../ports/ActionPort";

export const chromeActionAdapter: ActionPort = {
  async setBadge(text: string, color: string): Promise<void> {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  },

  onClicked(handler: (tabId: number) => void): void {
    chrome.action.onClicked.addListener((tab) => {
      if (tab.id !== undefined) handler(tab.id);
    });
  },
};
