import { describe, test, expect, vi, beforeEach } from "vitest";

import { defined } from "../../../test-utils";
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
    expect(mockAddListener).toHaveBeenCalledTimes(1);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "test-extension-id" });
    expect(handler).toHaveBeenCalledWith(msg);
  });

  test("onMessage processes message from same extension ID", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onMessage(handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "test-extension-id" });
    expect(handler).toHaveBeenCalledWith(msg);
  });

  test("onMessage ignores message from different sender ID", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onMessage(handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    const msg = { type: "kotdiff-toggle", enabled: true };
    registeredListener(msg, { id: "some-other-extension-id" });
    expect(handler).not.toHaveBeenCalled();
  });

  test("onRequest responds asynchronously with the handler result", async () => {
    const handler = vi.fn().mockResolvedValue({ status: "skip" });
    chromeMessagingAdapter.onRequest(() => true, handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    const sendResponse = vi.fn();
    const keepChannelOpen = registeredListener(
      { type: "kotdiff-auto-login" },
      { id: "test-extension-id", url: "https://s2.ta.kingoftime.jp/admin" },
      sendResponse,
    );
    await Promise.resolve();

    expect(keepChannelOpen).toBe(true);
    expect(handler).toHaveBeenCalledWith(
      { type: "kotdiff-auto-login" },
      { url: "https://s2.ta.kingoftime.jp/admin" },
    );
    expect(sendResponse).toHaveBeenCalledWith({ status: "skip" });
  });

  test("onRequest passes a null url when the sender has none", () => {
    const handler = vi.fn().mockResolvedValue({ status: "skip" });
    chromeMessagingAdapter.onRequest(() => true, handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    registeredListener({ type: "kotdiff-auto-login" }, { id: "test-extension-id" }, vi.fn());

    expect(handler).toHaveBeenCalledWith({ type: "kotdiff-auto-login" }, { url: null });
  });

  test("onRequest leaves messages it does not accept to other listeners", () => {
    const handler = vi.fn();
    chromeMessagingAdapter.onRequest(() => false, handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    const keepChannelOpen = registeredListener(
      { type: "kotdiff-open-dashboard" },
      { id: "test-extension-id" },
      vi.fn(),
    );

    expect(keepChannelOpen).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });

  test("request returns the response of chrome.runtime.sendMessage", async () => {
    mockSendMessage.mockResolvedValue({ status: "skip" });

    await expect(chromeMessagingAdapter.request({ type: "kotdiff-auto-login" })).resolves.toEqual({
      status: "skip",
    });
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
