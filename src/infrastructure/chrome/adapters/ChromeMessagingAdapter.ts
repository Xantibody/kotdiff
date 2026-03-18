import type { MessagingPort } from "../ports/MessagingPort";

export const chromeMessagingAdapter: MessagingPort = {
  onMessage(handler: (msg: unknown) => void): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
      // Only process messages from within this extension
      if (sender.id !== chrome.runtime.id) return;
      handler(message);
    });
  },

  async sendMessage(msg: unknown): Promise<void> {
    await chrome.runtime.sendMessage(msg);
  },

  getExtensionUrl(path: string): string {
    return chrome.runtime.getURL(path);
  },
};
