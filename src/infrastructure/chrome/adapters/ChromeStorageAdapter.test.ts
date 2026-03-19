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
});
