import type { ActionPort, HexColor } from "../ports/ActionPort";

export const chromeActionAdapter = {
  async setBadge(text: string, color: HexColor): Promise<void> {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  },

  onClicked(handler: (tabId: number) => void): void {
    chrome.action.onClicked.addListener((tab) => {
      if (tab.id !== undefined) handler(tab.id);
    });
  },
} satisfies ActionPort;
