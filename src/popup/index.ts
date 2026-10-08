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
import type { CredentialSource } from "../infrastructure/chrome/ports/AutoLoginPorts";
import type { KotdiffMessage } from "../application/types";
import { renderPopup } from "./PopupRenderer";
import { renderAutoLoginSettings } from "./AutoLoginSettings";

function requestAndClose(type: KotdiffMessage["type"]): () => void {
  return () => {
    void chromeMessagingAdapter.sendMessage({ type }).finally(() => {
      window.close();
    });
  };
}

// 1Password を選ぶときだけ nativeMessaging の許可（Firefox では認証情報を扱う同意も）を求める。
// permissions.request はユーザー操作の中で呼ぶ必要があるため、最初の await より前に呼ぶ
async function setSource(source: CredentialSource): Promise<CredentialSource> {
  if (source === "1password") {
    const granted = await chrome.permissions.request(
      autoLoginPermissions(isFirefoxRuntime(chrome.runtime)),
    );
    if (!granted) {
      return "browser";
    }
  }
  await chromeAutoLoginSettingsAdapter.setSource(source);
  return source;
}

// 1Password を選んだまま許可だけ外されていたら、ブラウザの保存パスワードに戻す
async function currentSource(): Promise<CredentialSource> {
  const source = await chromeAutoLoginSettingsAdapter.getSource();
  if (source === "1password" && !(await chromeNativeMessagingPermissionAdapter.isGranted())) {
    await chromeAutoLoginSettingsAdapter.setSource("browser");
    return "browser";
  }
  return source;
}

const root = document.querySelector<HTMLElement>("#root");
if (root) {
  const data = await chromeStorageAdapter.getDashboardData();
  renderPopup(root, data, new Date(), {
    openDashboard: requestAndClose("kotdiff-open-dashboard"),
    openKot: requestAndClose("kotdiff-open-kot"),
  });
  renderAutoLoginSettings(
    root,
    { enabled: await chromeAutoLoginSettingsAdapter.isEnabled(), source: await currentSource() },
    {
      onEnabledChange: async (enabled) => {
        await chromeAutoLoginSettingsAdapter.setEnabled(enabled);
      },
      onSourceChange: setSource,
    },
  );
}
