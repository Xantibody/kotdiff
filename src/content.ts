import { createContentScriptService } from "./application/ContentScriptService";
import { chromeStorageAdapter } from "./infrastructure/chrome/adapters/ChromeStorageAdapter";
import { chromeMessagingAdapter } from "./infrastructure/chrome/adapters/ChromeMessagingAdapter";
import { browserTimerAdapter } from "./infrastructure/ui/BrowserTimerAdapter";
import { browserDomAdapter } from "./infrastructure/ui/BrowserDomAdapter";

const service = createContentScriptService(
  chromeStorageAdapter,
  chromeMessagingAdapter,
  browserTimerAdapter,
  browserDomAdapter,
);

service.listenForMessages();
void service.run();
