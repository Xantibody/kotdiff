import type { TabsPort } from "../ports/TabsPort";

export const chromeTabsAdapter = {
  async openTab(url: string): Promise<void> {
    await chrome.tabs.create({ url });
  },

  async sendToTab(tabId: number, message: unknown): Promise<void> {
    await chrome.tabs.sendMessage(tabId, message);
  },

  async queryByUrl(url: string): Promise<number[]> {
    const tabs = await chrome.tabs.query({ url });
    return tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
  },

  async activateTab(tabId: number): Promise<void> {
    await chrome.tabs.update(tabId, { active: true });
  },
} satisfies TabsPort;
