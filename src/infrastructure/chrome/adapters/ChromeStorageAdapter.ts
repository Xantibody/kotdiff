import type { DashboardData } from "../../../types";
import {
  STORAGE_KEY,
  DEFAULT_ENABLED,
  DASHBOARD_KEY,
  DEFAULT_DASHBOARD,
  DASHBOARD_DATA_KEY,
} from "../constants";
import type { StoragePort } from "../ports/StoragePort";

export const chromeStorageAdapter: StoragePort = {
  async getEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
    return result[STORAGE_KEY] as boolean;
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  },

  async getDashboardEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get({ [DASHBOARD_KEY]: DEFAULT_DASHBOARD });
    return result[DASHBOARD_KEY] as boolean;
  },

  async setDashboardEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [DASHBOARD_KEY]: enabled });
  },

  async getDashboardData(): Promise<DashboardData | null> {
    const result = await chrome.storage.local.get(DASHBOARD_DATA_KEY);
    return (result[DASHBOARD_DATA_KEY] as DashboardData) ?? null;
  },

  async setDashboardData(data: DashboardData): Promise<void> {
    await chrome.storage.local.set({ [DASHBOARD_DATA_KEY]: data });
  },
};
