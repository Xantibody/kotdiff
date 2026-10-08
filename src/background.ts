import { createBackgroundService } from "./application/BackgroundService";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeTabsAdapter } from "./infrastructure/chrome/adapters/ChromeTabsAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { chromeContextMenusAdapter } from "./infrastructure/chrome/adapters/ChromeContextMenusAdapter";

const service = createBackgroundService(
  chromeStorageAdapter,
  chromeTabsAdapter,
  chromeMessagingAdapter,
  chromeContextMenusAdapter,
);

service.init();

chrome.runtime.onInstalled.addListener(() => {
  service.onInstalled();
});
