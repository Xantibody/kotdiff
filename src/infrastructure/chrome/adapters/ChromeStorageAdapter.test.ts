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

  test("getSettings returns stored settings", async () => {
    const settings = { customLeaveKeywords: ["サバティカル"] };
    mockGet.mockResolvedValue({ kotdiff_settings: settings });
    expect(await chromeStorageAdapter.getSettings()).toEqual(settings);
    expect(mockGet).toHaveBeenCalledWith("kotdiff_settings");
  });

  test("getSettings returns defaults when not set or invalid", async () => {
    mockGet.mockResolvedValue({});
    expect(await chromeStorageAdapter.getSettings()).toEqual({ customLeaveKeywords: [] });
    mockGet.mockResolvedValue({ kotdiff_settings: { customLeaveKeywords: [42] } });
    expect(await chromeStorageAdapter.getSettings()).toEqual({ customLeaveKeywords: [] });
  });

  test("setSettings calls chrome.storage.local.set", async () => {
    const settings = { customLeaveKeywords: ["サバティカル"] };
    mockSet.mockResolvedValue(undefined);
    await chromeStorageAdapter.setSettings(settings);
    expect(mockSet).toHaveBeenCalledWith({ kotdiff_settings: settings });
  });
});
