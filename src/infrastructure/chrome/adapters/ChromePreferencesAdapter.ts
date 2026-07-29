import { parseUiPreferences } from "../../../preferences";
import type { UiPreferences } from "../../../preferences";
import { UI_PREFERENCES_KEY } from "../constants";
import type { PreferencesPort } from "../ports/PreferencesPort";

export const chromePreferencesAdapter = {
  async getUiPreferences(): Promise<UiPreferences> {
    const result = await chrome.storage.local.get(UI_PREFERENCES_KEY);
    return parseUiPreferences(result[UI_PREFERENCES_KEY]);
  },

  async setUiPreferences(prefs: UiPreferences): Promise<void> {
    await chrome.storage.local.set({ [UI_PREFERENCES_KEY]: prefs });
  },
} satisfies PreferencesPort;

// KOT ページとダッシュボードを両方開いている間も設定を同期させるための購読。
// 戻り値の関数でリスナーを解除できる (onDashboardDataChanged と同じ規約)
export function onUiPreferencesChanged(handler: (prefs: UiPreferences) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "local") {
      return;
    }
    if (!(UI_PREFERENCES_KEY in changes)) {
      return;
    }
    handler(parseUiPreferences(changes[UI_PREFERENCES_KEY]?.newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
