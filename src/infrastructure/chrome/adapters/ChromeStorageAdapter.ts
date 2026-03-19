import { isDashboardData, type DashboardData } from "../../../types";
import {
  STORAGE_KEY,
  DEFAULT_ENABLED,
  DASHBOARD_KEY,
  DEFAULT_DASHBOARD,
  DASHBOARD_DATA_KEY,
} from "../constants";
import type { StoragePort } from "../ports/StoragePort";

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export const chromeStorageAdapter = {
  async getEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_ENABLED });
    const value = result[STORAGE_KEY];
    return isBoolean(value) ? value : DEFAULT_ENABLED;
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  },

  async getDashboardEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get({ [DASHBOARD_KEY]: DEFAULT_DASHBOARD });
    const value = result[DASHBOARD_KEY];
    return isBoolean(value) ? value : DEFAULT_DASHBOARD;
  },

  async setDashboardEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [DASHBOARD_KEY]: enabled });
  },

  async getDashboardData(): Promise<DashboardData | null> {
    const result = await chrome.storage.local.get(DASHBOARD_DATA_KEY);
    const value = result[DASHBOARD_DATA_KEY];
    return isDashboardData(value) ? value : null;
  },

  async setDashboardData(data: DashboardData): Promise<void> {
    await chrome.storage.local.set({ [DASHBOARD_DATA_KEY]: data });
  },
} satisfies StoragePort;
