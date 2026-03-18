import type { DomReadyPort } from "./ports/DomReadyPort";

export const browserDomAdapter: DomReadyPort = {
  isAlreadyInjected(markerClass: string): boolean {
    return document.querySelector(`.${markerClass}`) !== null;
  },

  querySelector<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  },

  querySelectorAll<T extends Element>(selector: string): T[] {
    return Array.from(document.querySelectorAll<T>(selector));
  },

  createElement<T extends HTMLElement>(tag: string): T {
    return document.createElement(tag) as T;
  },

  waitForElement(selector: string, onFound: (el: Element) => void): void {
    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        onFound(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  reload(): void {
    location.reload();
  },
};
