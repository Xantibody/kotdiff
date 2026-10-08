import { createBackgroundService } from "./application/BackgroundService";
import { createNotificationService } from "./application/NotificationService";
import { openKotTab } from "./application/KotTab";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeTabsAdapter } from "./infrastructure/chrome/adapters/ChromeTabsAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { chromeContextMenusAdapter } from "./infrastructure/chrome/adapters/ChromeContextMenusAdapter";
import {
  chromeAlarmsAdapter,
  chromeNotificationSettingsAdapter,
  chromeNotificationsAdapter,
} from "./infrastructure/chrome/adapters/ChromeNotificationAdapters";

const service = createBackgroundService(
  chromeStorageAdapter,
  chromeTabsAdapter,
  chromeMessagingAdapter,
  chromeContextMenusAdapter,
);

const notificationService = createNotificationService(
  chromeNotificationSettingsAdapter,
  chromeAlarmsAdapter,
  chromeNotificationsAdapter,
  chromeStorageAdapter,
  async () => {
    await openKotTab(chromeTabsAdapter);
  },
);

service.init();
notificationService.init();

chrome.runtime.onInstalled.addListener(() => {
  service.onInstalled();
});
