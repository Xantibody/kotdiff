import type { TimerPort } from "./ports/TimerPort";

export const browserTimerAdapter: TimerPort = {
  setInterval(callback: () => void, ms: number): () => void {
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
  },

  observeRemoval(element: Element, onRemoved: () => void): () => void {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        onRemoved();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  },
};
