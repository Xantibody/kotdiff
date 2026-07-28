import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromePreferencesAdapter, onUiPreferencesChanged } from "./ChromePreferencesAdapter";
import { DEFAULT_UI_PREFERENCES } from "../../../preferences";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();
vi.stubGlobal("chrome", {
  storage: {
    local: { get: mockGet, set: mockSet },
    onChanged: { addListener: mockAddListener, removeListener: mockRemoveListener },
  },
});

describe("chromePreferencesAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the defaults when nothing is stored", async () => {
    mockGet.mockResolvedValue({});
    expect(await chromePreferencesAdapter.getUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES);
    expect(mockGet).toHaveBeenCalledWith("kotdiff_ui_preferences");
  });

  test("merges stored fields over the defaults", async () => {
    mockGet.mockResolvedValue({ kotdiff_ui_preferences: { newUi: true } });
    expect(await chromePreferencesAdapter.getUiPreferences()).toEqual({
      ...DEFAULT_UI_PREFERENCES,
      newUi: true,
    });
  });

  test("setUiPreferences writes under the preferences key", async () => {
    mockSet.mockResolvedValue(undefined);
    await chromePreferencesAdapter.setUiPreferences({
      newUi: true,
      bannerOpen: true,
      calendarOpen: false,
      tableCollapsed: false,
    });
    expect(mockSet).toHaveBeenCalledWith({
      kotdiff_ui_preferences: {
        newUi: true,
        bannerOpen: true,
        calendarOpen: false,
        tableCollapsed: false,
      },
    });
  });
});

describe("onUiPreferencesChanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function captureListener(handler: (prefs: unknown) => void) {
    onUiPreferencesChanged(handler);
    return mockAddListener.mock.calls[0]?.[0] as (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => void;
  }

  test("notifies with parsed preferences", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ kotdiff_ui_preferences: { newValue: { newUi: true } } }, "local");
    expect(handler).toHaveBeenCalledWith({ ...DEFAULT_UI_PREFERENCES, newUi: true });
  });

  test("ignores other keys and areas", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ other: { newValue: {} } }, "local");
    listener({ kotdiff_ui_preferences: { newValue: {} } }, "sync");
    expect(handler).not.toHaveBeenCalled();
  });

  test("returns an unsubscribe function", () => {
    const unsubscribe = onUiPreferencesChanged(vi.fn());
    const registered = mockAddListener.mock.calls.at(-1)?.[0] as unknown;
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalledWith(registered);
  });
});
