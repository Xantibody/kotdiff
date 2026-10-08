import type { MessagingPort, RequestSender } from "../ports/MessagingPort";

export const chromeMessagingAdapter = {
  onMessage(handler: (msg: unknown) => void): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
      // Only process messages from within this extension
      if (sender.id !== chrome.runtime.id) {
        return;
      }
      handler(message);
    });
  },

  onRequest(
    accepts: (msg: unknown) => boolean,
    handler: (msg: unknown, sender: RequestSender) => Promise<unknown>,
  ): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id || !accepts(message)) {
        return undefined;
      }
      void handler(message, { url: sender.url ?? null }).then(sendResponse);
      // true を返すと sendResponse を非同期に呼ぶまでチャネルが開いたままになる
      return true;
    });
  },

  async sendMessage(msg: unknown): Promise<void> {
    await chrome.runtime.sendMessage(msg);
  },

  async request(msg: unknown): Promise<unknown> {
    return (await chrome.runtime.sendMessage(msg)) as unknown;
  },

  getExtensionUrl(path: string): string {
    return chrome.runtime.getURL(path);
  },
} satisfies MessagingPort;
