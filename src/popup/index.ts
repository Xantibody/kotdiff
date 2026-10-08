import { chromeStorageAdapter } from "../infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeMessagingAdapter } from "../infrastructure/chrome/adapters/ChromeMessagingAdapter";
import {
  chromeAutoLoginSettingsAdapter,
  chromeNativeMessagingPermissionAdapter,
} from "../infrastructure/chrome/adapters/ChromeAutoLoginAdapters";
import {
  autoLoginPermissions,
  isFirefoxRuntime,
} from "../infrastructure/chrome/AutoLoginPermissions";
import type { KotdiffMessage } from "../application/types";
import { renderPopup } from "./PopupRenderer";
import { renderAutoLoginToggle } from "./AutoLoginToggle";

function requestAndClose(type: KotdiffMessage["type"]): () => void {
  return () => {
    void chromeMessagingAdapter.sendMessage({ type }).finally(() => {
      window.close();
    });
  };
}

// ON にするときだけ nativeMessaging の許可（Firefox では認証情報を扱う同意も）を求める。
// permissions.request はユーザー操作の中で呼ぶ必要があるため、最初の await より前に呼ぶ
async function setAutoLogin(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const granted = await chrome.permissions.request(
      autoLoginPermissions(isFirefoxRuntime(chrome.runtime)),
    );
    if (!granted) {
      return false;
    }
  }
  await chromeAutoLoginSettingsAdapter.setEnabled(enabled);
  return enabled;
}

const root = document.querySelector<HTMLElement>("#root");
if (root) {
  const data = await chromeStorageAdapter.getDashboardData();
  renderPopup(root, data, new Date(), {
    openDashboard: requestAndClose("kotdiff-open-dashboard"),
    openKot: requestAndClose("kotdiff-open-kot"),
  });
  const autoLoginEnabled =
    (await chromeAutoLoginSettingsAdapter.isEnabled()) &&
    (await chromeNativeMessagingPermissionAdapter.isGranted());
  renderAutoLoginToggle(root, autoLoginEnabled, setAutoLogin);
}
