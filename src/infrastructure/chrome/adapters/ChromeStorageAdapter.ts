import { isDashboardData } from "../../../types";
import type { DashboardData } from "../../../types";
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

// KOT ページ側の再注入で保存し直されたデータを、開きっぱなしの
// ダッシュボードにも反映するための購読 (issue #29)。
// content script では不要なため StoragePort には含めない。
// 戻り値の関数でリスナーを解除できる (React StrictMode の二重実行や
// 再マウントでリスナーが累積しないようにするため)
export function onDashboardDataChanged(handler: (data: DashboardData) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "local") {
      return;
    }
    const newValue = changes[DASHBOARD_DATA_KEY]?.newValue;
    if (isDashboardData(newValue)) {
      handler(newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
