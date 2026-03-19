import { describe, test, expect, vi, beforeEach } from "vitest";
import { browserDomAdapter } from "./BrowserDomAdapter";

describe("browserDomAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("isAlreadyInjected", () => {
    test("returns false when no element with markerClass exists", () => {
      expect(browserDomAdapter.isAlreadyInjected("kotdiff-injected")).toBe(false);
    });

    test("returns true when element with markerClass exists", () => {
      const el = document.createElement("div");
      el.classList.add("kotdiff-injected");
      document.body.appendChild(el);
      expect(browserDomAdapter.isAlreadyInjected("kotdiff-injected")).toBe(true);
    });
  });

  describe("querySelector", () => {
    test("returns null when selector matches nothing", () => {
      expect(browserDomAdapter.querySelector(".nonexistent")).toBeNull();
    });

    test("returns the element when selector matches", () => {
      const el = document.createElement("div");
      el.classList.add("target");
      document.body.appendChild(el);
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
        document.body.appendChild(el);
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
      document.body.appendChild(el);

      const onFound = vi.fn();
      browserDomAdapter.waitForElement(".existing-table", onFound);

      // Trigger the MutationObserver by mutating the DOM
      document.body.appendChild(document.createElement("div"));

      // MutationObserver callbacks are microtasks — flush the queue
      await Promise.resolve();

      expect(onFound).toHaveBeenCalled();
    });

    test("does not call onFound when element never appears", () => {
      const onFound = vi.fn();
      browserDomAdapter.waitForElement(".never-appears", onFound);
      expect(onFound).not.toHaveBeenCalled();
    });
  });

  describe("reload", () => {
    test("calls location.reload()", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
        configurable: true,
      });
      browserDomAdapter.reload();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });
});
