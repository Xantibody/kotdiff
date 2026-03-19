import { isDashboardData, type DashboardData } from "../../../types";
import { DASHBOARD_DATA_KEY } from "../constants";
import type { StoragePort } from "../ports/StoragePort";

export const chromeStorageAdapter = {
  async getDashboardData(): Promise<DashboardData | null> {
    const result = await chrome.storage.local.get(DASHBOARD_DATA_KEY);
    const value = result[DASHBOARD_DATA_KEY];
    return isDashboardData(value) ? value : null;
  },

  async setDashboardData(data: DashboardData): Promise<void> {
    await chrome.storage.local.set({ [DASHBOARD_DATA_KEY]: data });
  },
} satisfies StoragePort;
