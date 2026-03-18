import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromeTabsAdapter } from "./ChromeTabsAdapter";

const mockCreate = vi.fn();
const mockSendMessage = vi.fn();
const mockChrome = {
  tabs: { create: mockCreate, sendMessage: mockSendMessage },
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
    const message = { type: "kotdiff-toggle", enabled: true };
    await chromeTabsAdapter.sendToTab(42, message);
    expect(mockSendMessage).toHaveBeenCalledWith(42, message);
  });

  test("sendToTab passes arbitrary message payload", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    await chromeTabsAdapter.sendToTab(1, { type: "kotdiff-dashboard-changed" });
    expect(mockSendMessage).toHaveBeenCalledWith(1, { type: "kotdiff-dashboard-changed" });
  });
});
