import { chromeStorageAdapter } from "../infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeMessagingAdapter } from "../infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { chromeNotificationSettingsAdapter } from "../infrastructure/chrome/adapters/ChromeNotificationAdapters";
import type { KotdiffMessage } from "../application/types";
import { renderPopup } from "./PopupRenderer";
import { renderNotificationSettings } from "./NotificationSettings";

function requestAndClose(type: KotdiffMessage["type"]): () => void {
  return () => {
    void chromeMessagingAdapter.sendMessage({ type }).finally(() => {
      window.close();
    });
  };
}

const root = document.querySelector<HTMLElement>("#root");
if (root) {
  const data = await chromeStorageAdapter.getDashboardData();
  renderPopup(root, data, new Date(), {
    openDashboard: requestAndClose("kotdiff-open-dashboard"),
    openKot: requestAndClose("kotdiff-open-kot"),
  });
  renderNotificationSettings(
    root,
    await chromeNotificationSettingsAdapter.getTimes(),
    async (times) => {
      await chromeNotificationSettingsAdapter.setTimes(times);
    },
  );
}
