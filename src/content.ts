import { createContentScriptService } from "./application/ContentScriptService";
import { runAutoLogin, trackLogout } from "./application/AutoLoginClient";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { chromeAutoLoginSettingsAdapter } from "./infrastructure/chrome/adapters/ChromeAutoLoginAdapters";
import { browserTimerAdapter } from "./infrastructure/ui/BrowserTimerAdapter";
import { browserDomAdapter } from "./infrastructure/ui/BrowserDomAdapter";
import { findLoginForm } from "./infrastructure/kot/KotLoginForm";
import { watchLogoutClick } from "./infrastructure/kot/KotLogoutButton";
import { showLoginNotice } from "./infrastructure/ui/LoginNoticeRenderer";

// content script は classic script のため top-level await が使えず、同期の main から起動する
function main(): void {
  const loginForm = findLoginForm(document);
  if (loginForm) {
    // セッション切れでログイン画面に戻されたとき。おまけ機能が無効なら何も起きない
    void runAutoLogin(loginForm, chromeMessagingAdapter, browserTimerAdapter, (text) => {
      showLoginNotice(document, text);
    });
    return;
  }
  trackLogout(chromeAutoLoginSettingsAdapter, (onLogout) => watchLogoutClick(document, onLogout));
  const service = createContentScriptService(
    chromeStorageAdapter,
    chromeMessagingAdapter,
    browserTimerAdapter,
    browserDomAdapter,
  );
  service.run();
}

main();
