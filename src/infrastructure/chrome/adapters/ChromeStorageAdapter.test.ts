import { describe, test, expect, vi, beforeEach } from "vitest";
import { chromeStorageAdapter } from "./ChromeStorageAdapter";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockChrome = {
  storage: { local: { get: mockGet, set: mockSet } },
};
vi.stubGlobal("chrome", mockChrome);

describe("ChromeStorageAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getEnabled returns stored value", async () => {
    mockGet.mockResolvedValue({ kotdiff_enabled: false });
    expect(await chromeStorageAdapter.getEnabled()).toBe(false);
    expect(mockGet).toHaveBeenCalledWith({ kotdiff_enabled: true });
  });

  test("getEnabled returns default when not set", async () => {
    mockGet.mockResolvedValue({ kotdiff_enabled: true });
    expect(await chromeStorageAdapter.getEnabled()).toBe(true);
  });

  test("setEnabled calls chrome.storage.local.set", async () => {
    mockSet.mockResolvedValue(undefined);
    await chromeStorageAdapter.setEnabled(true);
    expect(mockSet).toHaveBeenCalledWith({ kotdiff_enabled: true });
  });

  test("setEnabled with false", async () => {
    mockSet.mockResolvedValue(undefined);
    await chromeStorageAdapter.setEnabled(false);
    expect(mockSet).toHaveBeenCalledWith({ kotdiff_enabled: false });
  });

  test("getDashboardEnabled returns stored value", async () => {
    mockGet.mockResolvedValue({ kotdiff_dashboard: true });
    expect(await chromeStorageAdapter.getDashboardEnabled()).toBe(true);
    expect(mockGet).toHaveBeenCalledWith({ kotdiff_dashboard: false });
  });

  test("setDashboardEnabled calls chrome.storage.local.set", async () => {
    mockSet.mockResolvedValue(undefined);
    await chromeStorageAdapter.setDashboardEnabled(true);
    expect(mockSet).toHaveBeenCalledWith({ kotdiff_dashboard: true });
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
