import type { TabsPort } from "../ports/TabsPort";

export const chromeTabsAdapter: TabsPort = {
  async openTab(url: string): Promise<void> {
    await chrome.tabs.create({ url });
  },

  async sendToTab(tabId: number, message: unknown): Promise<void> {
    await chrome.tabs.sendMessage(tabId, message);
  },
};
