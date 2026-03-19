import { createBackgroundService } from "./application/BackgroundService";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeActionAdapter } from "./infrastructure/chrome/adapters/ChromeActionAdapter";
import { chromeTabsAdapter } from "./infrastructure/chrome/adapters/ChromeTabsAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { chromeContextMenusAdapter } from "./infrastructure/chrome/adapters/ChromeContextMenusAdapter";

const service = createBackgroundService(
  chromeStorageAdapter,
  chromeActionAdapter,
  chromeTabsAdapter,
  chromeMessagingAdapter,
  chromeContextMenusAdapter,
);

service.init();

chrome.runtime.onInstalled.addListener(() => {
  void service.onInstalled();
});

chrome.runtime.onStartup.addListener(() => {
  void service.onStartup();
});
