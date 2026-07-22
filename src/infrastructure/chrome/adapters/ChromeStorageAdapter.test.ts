import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromeStorageAdapter, onDashboardDataChanged } from "./ChromeStorageAdapter";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();
const mockChrome = {
  storage: {
    local: { get: mockGet, set: mockSet },
    onChanged: { addListener: mockAddListener, removeListener: mockRemoveListener },
  },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeStorageAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getDashboardData returns stored data", async () => {
    const data = { rows: [], leaveBalances: [], generatedAt: "2024-01-01T00:00:00.000Z" };
    mockGet.mockResolvedValue({ kotdiff_dashboard_data: data });
    expect(await chromeStorageAdapter.getDashboardData()).toEqual(data);
    expect(mockGet).toHaveBeenCalledWith("kotdiff_dashboard_data");
  });

  test("getDashboardData returns null when not set", async () => {
    mockGet.mockResolvedValue({});
    expect(await chromeStorageAdapter.getDashboardData()).toBeNull();
  });

  test("setDashboardData calls chrome.storage.local.set", async () => {
    const data = { rows: [], leaveBalances: [], generatedAt: "2024-01-01T00:00:00.000Z" };
    mockSet.mockResolvedValue(undefined);
    await chromeStorageAdapter.setDashboardData(data);
    expect(mockSet).toHaveBeenCalledWith({ kotdiff_dashboard_data: data });
  });
});

describe("onDashboardDataChanged", () => {
  const validData = { rows: [], leaveBalances: [], generatedAt: "2024-01-01T00:00:00.000Z" };

  function captureListener(handler: (data: unknown) => void) {
    onDashboardDataChanged(handler);
    return mockAddListener.mock.calls[0]?.[0] as (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => void;
  }

  test("calls handler when dashboard data changes in local storage", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ kotdiff_dashboard_data: { newValue: validData } }, "local");
    expect(handler).toHaveBeenCalledWith(validData);
  });

  test("ignores changes to other keys", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ some_other_key: { newValue: { foo: "bar" } } }, "local");
    expect(handler).not.toHaveBeenCalled();
  });

  test("ignores changes outside the local area", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ kotdiff_dashboard_data: { newValue: validData } }, "sync");
    expect(handler).not.toHaveBeenCalled();
  });

  test("ignores invalid or removed data", () => {
    const handler = vi.fn();
    const listener = captureListener(handler);
    listener({ kotdiff_dashboard_data: { newValue: { bogus: true } } }, "local");
    listener({ kotdiff_dashboard_data: {} }, "local");
    expect(handler).not.toHaveBeenCalled();
  });

  test("returns an unsubscribe function that removes the registered listener", () => {
    const unsubscribe = onDashboardDataChanged(vi.fn());
    const registered = mockAddListener.mock.calls.at(-1)?.[0] as unknown;
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalledWith(registered);
  });
});
