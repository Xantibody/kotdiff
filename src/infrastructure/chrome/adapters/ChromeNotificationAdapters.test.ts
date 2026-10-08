import { describe, test, expect, vi, beforeEach } from "vitest";
import { defined } from "../../../test-utils";
import {
  chromeAlarmsAdapter,
  chromeNotificationSettingsAdapter,
  chromeNotificationsAdapter,
} from "./ChromeNotificationAdapters";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockOnChanged = vi.fn();
const mockAlarmCreate = vi.fn();
const mockAlarmClearAll = vi.fn();
const mockOnAlarm = vi.fn();
const mockNotificationCreate = vi.fn();
const mockNotificationOnClicked = vi.fn();
vi.stubGlobal("chrome", {
  storage: { local: { get: mockGet, set: mockSet }, onChanged: { addListener: mockOnChanged } },
  alarms: {
    create: mockAlarmCreate,
    clearAll: mockAlarmClearAll,
    onAlarm: { addListener: mockOnAlarm },
  },
  notifications: {
    create: mockNotificationCreate,
    onClicked: { addListener: mockNotificationOnClicked },
  },
  runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
});

describe("chromeNotificationSettingsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("未設定なら時刻なし", async () => {
    mockGet.mockResolvedValue({});

    await expect(chromeNotificationSettingsAdapter.getTimes()).resolves.toEqual([]);
  });

  test("時刻の一覧を読み書きできる", async () => {
    mockGet.mockResolvedValue({ kotdiff_notification_times: ["12:00"] });

    await chromeNotificationSettingsAdapter.setTimes(["12:00"]);

    expect(mockSet).toHaveBeenCalledWith({ kotdiff_notification_times: ["12:00"] });
    await expect(chromeNotificationSettingsAdapter.getTimes()).resolves.toEqual(["12:00"]);
  });

  test("local の通知時刻が変わったときだけ新しい一覧を渡す", () => {
    const handler = vi.fn();
    chromeNotificationSettingsAdapter.onTimesChanged(handler);
    const listener = defined(mockOnChanged.mock.calls[0]?.[0]);

    listener({ kotdiff_notification_times: { newValue: ["09:00"] } }, "sync");
    listener({ kotdiff_dashboard_data: { newValue: {} } }, "local");
    listener({ kotdiff_notification_times: { newValue: ["09:00"] } }, "local");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(["09:00"]);
  });
});

describe("chromeAlarmsAdapter", () => {
  test("毎日のアラームを when と周期で作る", async () => {
    await chromeAlarmsAdapter.create("kotdiff-notify-12:00", 1000, 1440);

    expect(mockAlarmCreate).toHaveBeenCalledWith("kotdiff-notify-12:00", {
      when: 1000,
      periodInMinutes: 1440,
    });
  });

  test("鳴ったアラームの名前を渡す", () => {
    const handler = vi.fn();
    chromeAlarmsAdapter.onAlarm(handler);

    defined(mockOnAlarm.mock.calls[0]?.[0])({ name: "kotdiff-notify-12:00" });

    expect(handler).toHaveBeenCalledWith("kotdiff-notify-12:00");
  });
});

describe("chromeNotificationsAdapter", () => {
  test("拡張のアイコン付きの basic 通知を出す", async () => {
    await chromeNotificationsAdapter.show("kotdiff-notify", { title: "KotDiff", message: "本文" });

    expect(mockNotificationCreate).toHaveBeenCalledWith("kotdiff-notify", {
      type: "basic",
      iconUrl: "chrome-extension://id/icons/icon128.png",
      title: "KotDiff",
      message: "本文",
    });
  });
});
