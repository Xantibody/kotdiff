import { NOTIFICATION_TIMES_KEY } from "../constants";
import type {
  AlarmsPort,
  NotificationSettingsPort,
  NotificationsPort,
} from "../ports/NotificationPorts";
import type { NotificationText } from "../../../application/NotificationInfo";

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

export const chromeNotificationSettingsAdapter = {
  async getTimes(): Promise<string[]> {
    const result = await chrome.storage.local.get(NOTIFICATION_TIMES_KEY);
    const value = result[NOTIFICATION_TIMES_KEY];
    return isStringArray(value) ? value : [];
  },

  async setTimes(times: string[]): Promise<void> {
    await chrome.storage.local.set({ [NOTIFICATION_TIMES_KEY]: times });
  },

  // ポップアップで保存した設定を background が受け取る経路
  onTimesChanged(handler: (times: string[]) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      const change = changes[NOTIFICATION_TIMES_KEY];
      if (change !== undefined) {
        handler(isStringArray(change.newValue) ? change.newValue : []);
      }
    });
  },
} satisfies NotificationSettingsPort;

export const chromeAlarmsAdapter = {
  async create(name: string, when: number, periodInMinutes: number): Promise<void> {
    await chrome.alarms.create(name, { when, periodInMinutes });
  },

  async clearAll(): Promise<void> {
    await chrome.alarms.clearAll();
  },

  onAlarm(handler: (name: string) => void): void {
    chrome.alarms.onAlarm.addListener((alarm) => {
      handler(alarm.name);
    });
  },
} satisfies AlarmsPort;

export const chromeNotificationsAdapter = {
  async show(id: string, text: NotificationText): Promise<void> {
    // Chrome は iconUrl がないと作成に失敗する
    await chrome.notifications.create(id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: text.title,
      message: text.message,
    });
  },

  onClicked(handler: (id: string) => void): void {
    chrome.notifications.onClicked.addListener(handler);
  },
} satisfies NotificationsPort;
