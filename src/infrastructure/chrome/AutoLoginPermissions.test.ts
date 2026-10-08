import { describe, test, expect, vi } from "vitest";
import { autoLoginPermissions, isFirefoxRuntime } from "./AutoLoginPermissions";

describe("autoLoginPermissions", () => {
  test("Chrome では nativeMessaging だけを求める（data_collection を渡すと request が落ちる）", () => {
    expect(autoLoginPermissions(false)).toEqual({ permissions: ["nativeMessaging"] });
  });

  test("Firefox では認証情報を扱うことの同意（authenticationInfo）も一緒に求める", () => {
    expect(autoLoginPermissions(true)).toEqual({
      permissions: ["nativeMessaging"],
      data_collection: ["authenticationInfo"],
    });
  });
});

describe("isFirefoxRuntime", () => {
  test("runtime.getBrowserInfo があれば Firefox", () => {
    expect(isFirefoxRuntime({ getBrowserInfo: vi.fn() })).toBe(true);
  });

  test("なければ Chrome 系", () => {
    expect(isFirefoxRuntime({})).toBe(false);
  });
});
