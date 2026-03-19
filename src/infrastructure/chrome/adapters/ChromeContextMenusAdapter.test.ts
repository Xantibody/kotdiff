import { describe, test, expect, vi, beforeEach } from "vitest";

import { defined } from "../../../test-utils";
import { chromeContextMenusAdapter } from "./ChromeContextMenusAdapter";

const mockCreate = vi.fn();
const mockAddListener = vi.fn();
const mockChrome = {
  contextMenus: {
    create: mockCreate,
    onClicked: { addListener: mockAddListener },
    ContextType: {
      ACTION: "action",
    },
  },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeContextMenusAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("create delegates to chrome.contextMenus.create with full props", () => {
    chromeContextMenusAdapter.create({
      id: "kotdiff-dashboard",
      title: "ダッシュボード",
      type: "checkbox",
      contexts: [chrome.contextMenus.ContextType.ACTION],
      checked: false,
    });
    expect(mockCreate).toHaveBeenCalledWith({
      id: "kotdiff-dashboard",
      title: "ダッシュボード",
      type: "checkbox",
      contexts: ["action"],
      checked: false,
    });
  });

  test("create with minimal props", () => {
    chromeContextMenusAdapter.create({ id: "menu-1", title: "Menu Item" });
    expect(mockCreate).toHaveBeenCalledWith({
      id: "menu-1",
      title: "Menu Item",
    });
  });

  test("onClicked registers listener and calls handler with menuItemId and tabId", () => {
    const handler = vi.fn();
    chromeContextMenusAdapter.onClicked(handler);
    expect(mockAddListener).toHaveBeenCalledOnce();

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    registeredListener({ menuItemId: "kotdiff-dashboard", checked: true }, { id: 5 });
    expect(handler).toHaveBeenCalledWith({ menuItemId: "kotdiff-dashboard", checked: true }, 5);
  });

  test("onClicked passes undefined tabId when tab is undefined", () => {
    const handler = vi.fn();
    chromeContextMenusAdapter.onClicked(handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    registeredListener({ menuItemId: "kotdiff-dashboard", checked: false }, undefined);
    expect(handler).toHaveBeenCalledWith(
      { menuItemId: "kotdiff-dashboard", checked: false },
      undefined,
    );
  });
});
