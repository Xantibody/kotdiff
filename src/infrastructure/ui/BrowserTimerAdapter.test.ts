import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { browserTimerAdapter } from "./BrowserTimerAdapter";

describe("BrowserTimerAdapter", () => {
  describe("setInterval", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("calls callback after specified interval", () => {
      const callback = vi.fn();
      browserTimerAdapter.setInterval(callback, 1000);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    test("cleanup function cancels the interval", () => {
      const callback = vi.fn();
      const cleanup = browserTimerAdapter.setInterval(callback, 1000);
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      cleanup();
      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1); // no more calls after cleanup
    });
  });

  describe("observeRemoval", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    test("calls onRemoved when element is removed from DOM", async () => {
      const element = document.createElement("div");
      document.body.appendChild(element);
      const onRemoved = vi.fn();
      browserTimerAdapter.observeRemoval(element, onRemoved);
      // Remove the element — MutationObserver fires asynchronously in jsdom
      element.remove();
      // Flush microtasks so the MutationObserver callback runs
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onRemoved).toHaveBeenCalled();
    });

    test("cleanup function disconnects observer", () => {
      const element = document.createElement("div");
      document.body.appendChild(element);
      const onRemoved = vi.fn();
      const cleanup = browserTimerAdapter.observeRemoval(element, onRemoved);
      cleanup();
      element.remove();
      expect(onRemoved).not.toHaveBeenCalled();
    });
  });
});
