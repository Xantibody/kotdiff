import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromeMessagingAdapter } from "./ChromeMessagingAdapter";

const mockAddListener = vi.fn();
const mockSendMessage = vi.fn();
const mockGetURL = vi.fn();
const mockChrome = {
  runtime: {
    onMessage: { addListener: mockAddListener },
    sendMessage: mockSendMessage,
    getURL: mockGetURL,
    id: "test-extension-id",
  },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeMessagingAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("onMessage registers listener and delegates messages", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onMessage(handler);
    expect(mockAddListener).toHaveBeenCalledOnce();

    const registeredListener = mockAddListener.mock.calls[0][0];
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "test-extension-id" });
    expect(handler).toHaveBeenCalledWith(msg);
  });

  test("onMessage processes message from same extension ID", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onMessage(handler);

    const registeredListener = mockAddListener.mock.calls[0][0];
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "test-extension-id" });
    expect(handler).toHaveBeenCalledWith(msg);
  });

  test("onMessage ignores message from different sender ID", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onMessage(handler);

    const registeredListener = mockAddListener.mock.calls[0][0];
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "some-other-extension-id" });
    expect(handler).not.toHaveBeenCalled();
  });

  test("sendMessage calls chrome.runtime.sendMessage", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const msg = { type: "kotdiff-open-dashboard" };
    await chromeMessagingAdapter.sendMessage(msg);
    expect(mockSendMessage).toHaveBeenCalledWith(msg);
  });

  test("getExtensionUrl returns chrome.runtime.getURL result", () => {
    mockGetURL.mockReturnValue("chrome-extension://abc123/dashboard.html");
    const url = chromeMessagingAdapter.getExtensionUrl("dashboard.html");
    expect(url).toBe("chrome-extension://abc123/dashboard.html");
    expect(mockGetURL).toHaveBeenCalledWith("dashboard.html");
  });
});
