import { createContentScriptService } from "./application/ContentScriptService";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromePreferencesAdapter } from "./infrastructure/chrome/adapters/ChromePreferencesAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { browserTimerAdapter } from "./infrastructure/ui/BrowserTimerAdapter";
import { browserDomAdapter } from "./infrastructure/ui/BrowserDomAdapter";
import { DEFAULT_UI_PREFERENCES } from "./preferences";
import type { UiPreferences } from "./preferences";

async function savePreferences(next: UiPreferences): Promise<void> {
  try {
    await chromePreferencesAdapter.setUiPreferences(next);
  } catch (error: unknown) {
    console.debug("[kotdiff] failed to save preferences", error);
  }
}

// 注入する UI は設定で決まるため、設定を読んでから 1 回だけ走らせる。
// content script は IIFE にバンドルされ top-level await を使えないので async 関数で包む
async function main(): Promise<void> {
  let preferences = DEFAULT_UI_PREFERENCES;
  try {
    preferences = await chromePreferencesAdapter.getUiPreferences();
  } catch (error: unknown) {
    // 読めなかった場合は現行 UI（既定値）で注入する
    console.debug("[kotdiff] failed to read preferences", error);
  }

  createContentScriptService(
    chromeStorageAdapter,
    chromeMessagingAdapter,
    browserTimerAdapter,
    browserDomAdapter,
    {
      preferences,
      savePreferences: (next) => {
        void savePreferences(next);
      },
    },
  ).run();
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- esbuild の iife 出力は top-level await を扱えない
void main();
