import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromeTabsAdapter } from "./ChromeTabsAdapter";

const mockCreate = vi.fn();
const mockSendMessage = vi.fn();
const mockQuery = vi.fn();
const mockUpdate = vi.fn();
const mockChrome = {
  tabs: { create: mockCreate, sendMessage: mockSendMessage, query: mockQuery, update: mockUpdate },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeTabsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("openTab calls chrome.tabs.create with url", async () => {
    mockCreate.mockResolvedValue(undefined);
    await chromeTabsAdapter.openTab("https://example.com");
    expect(mockCreate).toHaveBeenCalledWith({ url: "https://example.com" });
  });

  test("sendToTab calls chrome.tabs.sendMessage with tabId and message", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const message = { type: "kotdiff-open-dashboard" } as const;
    await chromeTabsAdapter.sendToTab(42, message);
    expect(mockSendMessage).toHaveBeenCalledWith(42, message);
  });

  test("sendToTab passes arbitrary message payload", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    await chromeTabsAdapter.sendToTab(1, { type: "kotdiff-open-dashboard" });
    expect(mockSendMessage).toHaveBeenCalledWith(1, { type: "kotdiff-open-dashboard" });
  });

  test("queryByUrl returns array of tab IDs matching the URL", async () => {
    mockQuery.mockResolvedValue([{ id: 10 }, { id: 20 }]);
    const result = await chromeTabsAdapter.queryByUrl("https://example.com/*");
    expect(mockQuery).toHaveBeenCalledWith({ url: "https://example.com/*" });
    expect(result).toEqual([10, 20]);
  });

  test("queryByUrl returns empty array when no tabs match", async () => {
    mockQuery.mockResolvedValue([]);
    const result = await chromeTabsAdapter.queryByUrl("https://example.com/*");
    expect(result).toEqual([]);
  });

  test("queryByUrl filters out tabs with undefined id", async () => {
    mockQuery.mockResolvedValue([{ id: 5 }, { id: undefined }, { id: 15 }]);
    const result = await chromeTabsAdapter.queryByUrl("https://example.com/*");
    expect(result).toEqual([5, 15]);
  });

  test("activateTab calls chrome.tabs.update with active: true", async () => {
    mockUpdate.mockResolvedValue(undefined);
    await chromeTabsAdapter.activateTab(99);
    expect(mockUpdate).toHaveBeenCalledWith(99, { active: true });
  });
});
