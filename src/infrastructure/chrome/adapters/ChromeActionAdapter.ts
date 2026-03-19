import type { ActionPort } from "../ports/ActionPort";

export const chromeActionAdapter = {
  onClicked(handler: (tabId: number) => void): void {
    chrome.action.onClicked.addListener((tab) => {
      if (tab.id !== undefined) handler(tab.id);
    });
  },
} satisfies ActionPort;
