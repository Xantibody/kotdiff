import { describe, test, expect, vi } from "vitest";
import { defined } from "../test-utils";
import { createNotificationService } from "./NotificationService";
import type {
  AlarmsPort,
  NotificationSettingsPort,
  NotificationsPort,
} from "../infrastructure/chrome/ports/NotificationPorts";
import type { DashboardData } from "../types";

// 2026-07-02 10:00 JST
const NOW = new Date("2026-07-02T01:00:00.000Z");
const DATA: DashboardData = {
  rows: [],
  leaveBalances: [],
  generatedAt: "2026-07-02T00:05:00.000Z",
};

function setup(times: string[], data: DashboardData | null = DATA) {
  const settings: NotificationSettingsPort = {
    getTimes: vi.fn().mockResolvedValue(times),
    setTimes: vi.fn().mockResolvedValue(undefined),
    onTimesChanged: vi.fn(),
  };
  const alarms: AlarmsPort = {
    create: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    onAlarm: vi.fn(),
  };
  const notifications: NotificationsPort = {
    show: vi.fn().mockResolvedValue(undefined),
    onClicked: vi.fn(),
  };
  const storage = { getDashboardData: vi.fn().mockResolvedValue(data) };
  const openKot = vi.fn().mockResolvedValue(undefined);
  const service = createNotificationService(
    settings,
    alarms,
    notifications,
    storage,
    openKot,
    () => NOW,
  );
  return { service, settings, alarms, notifications, storage, openKot };
}

describe("NotificationService.reschedule", () => {
  test("通知時刻がなければアラームを消すだけ", async () => {
    const { service, alarms } = setup([]);

    await service.reschedule();

    expect(alarms.clearAll).toHaveBeenCalledTimes(1);
    expect(alarms.create).not.toHaveBeenCalled();
  });

  test("時刻ごとに次回の発火時刻で毎日のアラームを張る", async () => {
    const { service, alarms } = setup(["09:00", "12:00"]);

    await service.reschedule();

    expect(alarms.create).toHaveBeenCalledWith(
      "kotdiff-notify-09:00",
      Date.parse("2026-07-03T00:00:00.000Z"),
      24 * 60,
    );
    expect(alarms.create).toHaveBeenCalledWith(
      "kotdiff-notify-12:00",
      Date.parse("2026-07-02T03:00:00.000Z"),
      24 * 60,
    );
  });
});

describe("NotificationService.init", () => {
  function fire(alarms: AlarmsPort, name: string): void {
    defined(vi.mocked(alarms.onAlarm).mock.calls[0]?.[0])(name);
  }

  test("起動時にアラームを張り直す", async () => {
    const { service, alarms } = setup(["12:00"]);

    service.init();
    await vi.waitFor(() => expect(alarms.create).toHaveBeenCalledTimes(1));
  });

  test("アラームが鳴ったら保存データから通知を出す", async () => {
    const { service, alarms, notifications } = setup(["12:00"]);
    service.init();

    fire(alarms, "kotdiff-notify-12:00");

    await vi.waitFor(() => expect(notifications.show).toHaveBeenCalledTimes(1));
    expect(notifications.show).toHaveBeenCalledWith(
      "kotdiff-notify",
      expect.objectContaining({ message: expect.stringContaining("時間貯金") }),
    );
  });

  test("保存データがなければ通知しない", async () => {
    const { service, alarms, notifications, storage } = setup(["12:00"], null);
    service.init();

    fire(alarms, "kotdiff-notify-12:00");

    await vi.waitFor(() => expect(storage.getDashboardData).toHaveBeenCalledTimes(1));
    expect(notifications.show).not.toHaveBeenCalled();
  });

  test("自分のアラーム以外には反応しない", async () => {
    const { service, alarms, storage } = setup(["12:00"]);
    service.init();

    fire(alarms, "other-alarm");
    await Promise.resolve();

    expect(storage.getDashboardData).not.toHaveBeenCalled();
  });

  test("通知をクリックしたら KOT 画面を開く", () => {
    const { service, notifications, openKot } = setup(["12:00"]);
    service.init();

    defined(vi.mocked(notifications.onClicked).mock.calls[0]?.[0])("kotdiff-notify");

    expect(openKot).toHaveBeenCalledTimes(1);
  });

  test("通知時刻が変わったらアラームを張り直す", async () => {
    const { service, settings, alarms } = setup(["12:00"]);
    service.init();
    await vi.waitFor(() => expect(alarms.clearAll).toHaveBeenCalledTimes(1));

    defined(vi.mocked(settings.onTimesChanged).mock.calls[0]?.[0])(["09:00"]);

    await vi.waitFor(() => expect(alarms.clearAll).toHaveBeenCalledTimes(2));
  });
});
