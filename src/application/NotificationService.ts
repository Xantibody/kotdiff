import type {
  AlarmsPort,
  NotificationSettingsPort,
  NotificationsPort,
} from "../infrastructure/chrome/ports/NotificationPorts";
import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import { nextOccurrence } from "../domain/services/NotificationSchedule";
import { buildNotificationText } from "./NotificationInfo";

const ALARM_PREFIX = "kotdiff-notify-";
const NOTIFICATION_ID = "kotdiff-notify";
const DAY_MINUTES = 24 * 60;

export interface NotificationServiceInstance {
  init(): void;
  reschedule(): Promise<void>;
}

// 指定時刻に時間貯金をシステム通知で出す。アラームは設定から毎回作り直す。
// Chrome の service worker や Firefox の再起動でアラームが残っているかは
// 環境で違うため、残っていても消して張り直す方が単純で壊れにくい
export function createNotificationService(
  settings: NotificationSettingsPort,
  alarms: AlarmsPort,
  notifications: NotificationsPort,
  storage: Pick<StoragePort, "getDashboardData">,
  openKot: () => Promise<void>,
  now: () => Date = () => new Date(),
): NotificationServiceInstance {
  async function reschedule(): Promise<void> {
    await alarms.clearAll();
    const times = await settings.getTimes();
    await Promise.all(
      times.map(async (time) => {
        await alarms.create(
          ALARM_PREFIX + time,
          nextOccurrence(time, now()).getTime(),
          DAY_MINUTES,
        );
      }),
    );
  }

  async function notify(): Promise<void> {
    const data = await storage.getDashboardData();
    // KOT 画面を一度も開いていなければ出すものがない
    if (data === null) {
      return;
    }
    await notifications.show(NOTIFICATION_ID, buildNotificationText(data, now()));
  }

  return {
    init() {
      alarms.onAlarm((name) => {
        if (name.startsWith(ALARM_PREFIX)) {
          void notify();
        }
      });
      notifications.onClicked((id) => {
        if (id === NOTIFICATION_ID) {
          void openKot();
        }
      });
      settings.onTimesChanged(() => {
        void reschedule();
      });
      void reschedule();
    },
    reschedule,
  };
}
