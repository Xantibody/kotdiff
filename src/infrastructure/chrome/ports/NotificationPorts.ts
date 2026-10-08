import type { NotificationText } from "../../../application/NotificationInfo";

// 通知時刻（"HH:MM" の一覧）の読み書きと、ポップアップで変えたときの購読
export interface NotificationSettingsPort {
  getTimes(): Promise<string[]>;
  setTimes(times: string[]): Promise<void>;
  onTimesChanged(handler: (times: string[]) => void): void;
}

// 指定時刻に background を起こすアラーム
export interface AlarmsPort {
  create(name: string, when: number, periodInMinutes: number): Promise<void>;
  clearAll(): Promise<void>;
  onAlarm(handler: (name: string) => void): void;
}

// OS のシステム通知
export interface NotificationsPort {
  show(id: string, text: NotificationText): Promise<void>;
  onClicked(handler: (id: string) => void): void;
}
