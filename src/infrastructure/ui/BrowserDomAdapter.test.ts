import { describe, test, expect, vi, beforeEach } from "vitest";
import { browserDomAdapter } from "./BrowserDomAdapter";

describe("browserDomAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("querySelector", () => {
    test("returns null when selector matches nothing", () => {
      expect(browserDomAdapter.querySelector(".nonexistent")).toBeNull();
    });

    test("returns the element when selector matches", () => {
      const el = document.createElement("div");
      el.classList.add("target");
      document.body.append(el);
      expect(browserDomAdapter.querySelector<HTMLDivElement>(".target")).toBe(el);
    });
  });

  describe("querySelectorAll", () => {
    test("returns empty array when selector matches nothing", () => {
      expect(browserDomAdapter.querySelectorAll(".nonexistent")).toHaveLength(0);
    });

    test("returns all matching elements as an array", () => {
      for (let i = 0; i < 3; i++) {
        const el = document.createElement("span");
        el.classList.add("item");
        document.body.append(el);
      }
      expect(browserDomAdapter.querySelectorAll(".item")).toHaveLength(3);
    });
  });

  describe("createElement", () => {
    test("creates an element with the given tag", () => {
      const btn = browserDomAdapter.createElement("button");
      expect(btn.tagName).toBe("BUTTON");
    });

    test("creates a div element", () => {
      const div = browserDomAdapter.createElement("div");
      expect(div.tagName).toBe("DIV");
    });
  });

  describe("waitForElement", () => {
    test("calls onFound when element appears after a DOM mutation", async () => {
      const el = document.createElement("table");
      el.classList.add("existing-table");
      document.body.append(el);

      const onFound = vi.fn();
      browserDomAdapter.waitForElement(".existing-table", onFound);

      // Trigger the MutationObserver by mutating the DOM
      document.body.append(document.createElement("div"));

      // MutationObserver callbacks are microtasks — flush the queue
      await Promise.resolve();

      expect(onFound).toHaveBeenCalled();
    });

    test("does not call onFound when element never appears", () => {
      const onFound = vi.fn();
      browserDomAdapter.waitForElement(".never-appears", onFound);
      expect(onFound).not.toHaveBeenCalled();
    });

    test("calls onTimeout and stops observing when element does not appear within the default 30s", async () => {
      vi.useFakeTimers();
      const onFound = vi.fn();
      const onTimeout = vi.fn();
      browserDomAdapter.waitForElement(".never-appears", onFound, { onTimeout });

      vi.advanceTimersByTime(29_999);
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // observer は解放済みでなければならない — 遅れて現れた要素は無視される
      const el = document.createElement("table");
      el.classList.add("never-appears");
      document.body.append(el);
      await Promise.resolve();

      expect(onFound).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    test("respects a custom timeoutMs", () => {
      vi.useFakeTimers();
      const onTimeout = vi.fn();
      browserDomAdapter.waitForElement(".never-appears", vi.fn(), { timeoutMs: 5000, onTimeout });

      vi.advanceTimersByTime(5000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    test("does not call onTimeout after the element was found", async () => {
      vi.useFakeTimers();
      const onFound = vi.fn();
      const onTimeout = vi.fn();
      browserDomAdapter.waitForElement(".appears-later", onFound, { onTimeout });

      const el = document.createElement("table");
      el.classList.add("appears-later");
      document.body.append(el);
      await Promise.resolve();
      expect(onFound).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60_000);
      expect(onTimeout).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("reload", () => {
    test("calls location.reload()", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(globalThis, "location", {
        value: { reload: reloadMock },
        writable: true,
        configurable: true,
      });
      browserDomAdapter.reload();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });
});
