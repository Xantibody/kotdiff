import { describe, test, expect, vi, beforeEach } from "vitest";

import { defined } from "../../../test-utils";
import { chromeActionAdapter } from "./ChromeActionAdapter";

const mockSetBadgeText = vi.fn();
const mockSetBadgeBackgroundColor = vi.fn();
const mockAddListener = vi.fn();
const mockChrome = {
  action: {
    setBadgeText: mockSetBadgeText,
    setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
    onClicked: { addListener: mockAddListener },
  },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeActionAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("setBadge calls setBadgeText and setBadgeBackgroundColor", async () => {
    mockSetBadgeText.mockResolvedValue(undefined);
    mockSetBadgeBackgroundColor.mockResolvedValue(undefined);
    await chromeActionAdapter.setBadge("ON", "#4caf50");
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: "ON" });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#4caf50" });
  });

  test("setBadge with OFF state", async () => {
    mockSetBadgeText.mockResolvedValue(undefined);
    mockSetBadgeBackgroundColor.mockResolvedValue(undefined);
    await chromeActionAdapter.setBadge("OFF", "#9e9e9e");
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: "OFF" });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#9e9e9e" });
  });

  test("onClicked registers listener and calls handler with tabId", () => {
    const handler = vi.fn();
    chromeActionAdapter.onClicked(handler);
    expect(mockAddListener).toHaveBeenCalledOnce();

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    registeredListener({ id: 7 });
    expect(handler).toHaveBeenCalledWith(7);
  });

  test("onClicked does not call handler when tab.id is undefined", () => {
    const handler = vi.fn();
    chromeActionAdapter.onClicked(handler);

    const registeredListener = defined(mockAddListener.mock.calls[0]?.[0]);
    registeredListener({ id: undefined });
    expect(handler).not.toHaveBeenCalled();
  });
});
