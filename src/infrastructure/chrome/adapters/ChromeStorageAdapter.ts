import {
  DEFAULT_SETTINGS,
  isDashboardData,
  isKotdiffSettings,
  type DashboardData,
  type KotdiffSettings,
} from "../../../types";
import { DASHBOARD_DATA_KEY, SETTINGS_KEY } from "../constants";
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

  async getSettings(): Promise<KotdiffSettings> {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const value = result[SETTINGS_KEY];
    return isKotdiffSettings(value) ? value : DEFAULT_SETTINGS;
  },

  async setSettings(settings: KotdiffSettings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  },
} satisfies StoragePort;
