import type { DomReadyPort, WaitForElementOptions } from "./ports/DomReadyPort";

// テーブルの無いページ(ログイン等)で body 監視の observer が永続しないよう打ち切る
const DEFAULT_WAIT_TIMEOUT_MS = 30_000;

export const browserDomAdapter: DomReadyPort = {
  querySelector<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  },

  querySelectorAll<T extends Element>(selector: string): T[] {
    return [...document.querySelectorAll<T>(selector)];
  },

  createElement<const K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
    return document.createElement(tag);
  },

  waitForElement(
    selector: string,
    onFound: (el: Element) => void,
    options?: WaitForElementOptions,
  ): void {
    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timeoutId);
        obs.disconnect();
        onFound(el);
      }
    });
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      options?.onTimeout?.();
    }, options?.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS);
    observer.observe(document.body, { childList: true, subtree: true });
  },

  reload(): void {
    location.reload();
  },
};
