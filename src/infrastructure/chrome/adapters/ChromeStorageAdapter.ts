import { DEFAULT_SETTINGS, isDashboardData, isKotdiffSettings } from "../../../types";
import type { DashboardData, KotdiffSettings } from "../../../types";
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

// KOT ページ側の再注入で保存し直されたデータを、開きっぱなしの
// ダッシュボードにも反映するための購読 (issue #29)。
// content script では不要なため StoragePort には含めない
export function onDashboardDataChanged(handler: (data: DashboardData) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    const newValue = changes[DASHBOARD_DATA_KEY]?.newValue;
    if (isDashboardData(newValue)) {
      handler(newValue);
    }
  });
}
