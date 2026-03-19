import { describe, test, expect, vi, beforeEach } from "vitest";

import { defined } from "../../../test-utils";
import { chromeActionAdapter } from "./ChromeActionAdapter";

const mockAddListener = vi.fn();
const mockChrome = {
  action: {
    onClicked: { addListener: mockAddListener },
  },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeActionAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
