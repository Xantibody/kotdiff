import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderNotificationSettings } from "./NotificationSettings";

function input(root: HTMLElement): HTMLInputElement {
  const el = root.querySelector<HTMLInputElement>("input.notification-times");
  if (!el) {
    throw new Error("input not found");
  }
  return el;
}

function enter(el: HTMLInputElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("change"));
}

describe("renderNotificationSettings", () => {
  let root: HTMLElement;
  let onSave: ReturnType<typeof vi.fn<(times: string[]) => Promise<void>>>;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.replaceChildren(root);
    onSave = vi.fn<(times: string[]) => Promise<void>>().mockResolvedValue(undefined);
  });

  test("設定済みの時刻を入力欄に出す", () => {
    renderNotificationSettings(root, ["09:00", "17:30"], onSave);

    expect(input(root).value).toBe("09:00, 17:30");
  });

  test("時刻を入れると正規化して保存する", async () => {
    renderNotificationSettings(root, [], onSave);

    enter(input(root), "17:30 9:0");

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith(["09:00", "17:30"]));
    expect(input(root).value).toBe("09:00, 17:30");
    expect(input(root).classList.contains("invalid")).toBe(false);
  });

  test("空にすると通知をやめる", async () => {
    renderNotificationSettings(root, ["09:00"], onSave);

    enter(input(root), "");

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith([]));
  });

  test("読めない時刻があれば保存せず、欄に印を付ける", () => {
    renderNotificationSettings(root, [], onSave);

    enter(input(root), "25:00");

    expect(onSave).not.toHaveBeenCalled();
    expect(input(root).classList.contains("invalid")).toBe(true);
  });
});
