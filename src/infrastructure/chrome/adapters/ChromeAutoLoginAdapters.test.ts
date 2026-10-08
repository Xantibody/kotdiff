import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  chromeAutoLoginSettingsAdapter,
  chromeNativeMessagingPermissionAdapter,
  nativeCredentialsAdapter,
} from "./ChromeAutoLoginAdapters";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockContains = vi.fn();
const mockSendNativeMessage = vi.fn();
const mockChrome = {
  storage: { local: { get: mockGet, set: mockSet } },
  permissions: { contains: mockContains },
  runtime: { sendNativeMessage: mockSendNativeMessage },
};
vi.stubGlobal("chrome", mockChrome);

describe("chromeAutoLoginSettingsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("一度も設定していなければ無効", async () => {
    mockGet.mockResolvedValue({});

    await expect(chromeAutoLoginSettingsAdapter.isEnabled()).resolves.toBe(false);
  });

  test("有効にした設定を読み書きできる", async () => {
    mockGet.mockResolvedValue({ kotdiff_auto_login_enabled: true });

    await chromeAutoLoginSettingsAdapter.setEnabled(true);

    expect(mockSet).toHaveBeenCalledWith({ kotdiff_auto_login_enabled: true });
    await expect(chromeAutoLoginSettingsAdapter.isEnabled()).resolves.toBe(true);
  });

  test("試行時刻がなければ null、あれば数値を返す", async () => {
    mockGet.mockResolvedValueOnce({});
    await expect(chromeAutoLoginSettingsAdapter.getLastAttemptAt()).resolves.toBeNull();

    mockGet.mockResolvedValueOnce({ kotdiff_auto_login_last_attempt_at: 123 });
    await expect(chromeAutoLoginSettingsAdapter.getLastAttemptAt()).resolves.toBe(123);
  });
});

describe("chromeNativeMessagingPermissionAdapter", () => {
  test("Chrome では nativeMessaging の許可を問い合わせる", async () => {
    mockContains.mockResolvedValue(true);

    await expect(chromeNativeMessagingPermissionAdapter.isGranted()).resolves.toBe(true);
    expect(mockContains).toHaveBeenCalledWith({ permissions: ["nativeMessaging"] });
  });

  test("Firefox では authenticationInfo の同意も含めて問い合わせる", async () => {
    mockContains.mockResolvedValue(true);
    vi.stubGlobal("chrome", {
      ...mockChrome,
      runtime: { ...mockChrome.runtime, getBrowserInfo: vi.fn() },
    });

    await expect(chromeNativeMessagingPermissionAdapter.isGranted()).resolves.toBe(true);
    expect(mockContains).toHaveBeenCalledWith({
      permissions: ["nativeMessaging"],
      data_collection: ["authenticationInfo"],
    });
    vi.stubGlobal("chrome", mockChrome);
  });
});

describe("nativeCredentialsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ネイティブホストが返した ID とパスワードを返す", async () => {
    mockSendNativeMessage.mockResolvedValue({ username: "user01", password: "secret" });

    await expect(nativeCredentialsAdapter.fetchCredentials()).resolves.toEqual({
      username: "user01",
      password: "secret",
    });
    expect(mockSendNativeMessage).toHaveBeenCalledWith("io.github.xantibody.kotdiff", {
      type: "get-credentials",
    });
  });

  test("ネイティブホストがエラーを返したら例外にする", async () => {
    mockSendNativeMessage.mockResolvedValue({ error: "op: not signed in" });

    await expect(nativeCredentialsAdapter.fetchCredentials()).rejects.toThrow("op: not signed in");
  });
});

describe("chromeAutoLoginSettingsAdapter: 手動ログアウトの印", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("印がなければ抑止しない", async () => {
    mockGet.mockResolvedValue({});

    await expect(chromeAutoLoginSettingsAdapter.isSuppressedByLogout()).resolves.toBe(false);
  });

  test("ログアウトの印を読み書きできる", async () => {
    mockGet.mockResolvedValue({ kotdiff_auto_login_suppressed_by_logout: true });

    await chromeAutoLoginSettingsAdapter.setSuppressedByLogout(true);

    expect(mockSet).toHaveBeenCalledWith({ kotdiff_auto_login_suppressed_by_logout: true });
    await expect(chromeAutoLoginSettingsAdapter.isSuppressedByLogout()).resolves.toBe(true);
  });
});

describe("chromeAutoLoginSettingsAdapter: 認証情報の出どころ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("未設定ならブラウザの保存パスワード", async () => {
    mockGet.mockResolvedValue({});

    await expect(chromeAutoLoginSettingsAdapter.getSource()).resolves.toBe("browser");
  });

  test("1Password を選んだ設定を読み書きできる", async () => {
    mockGet.mockResolvedValue({ kotdiff_auto_login_source: "1password" });

    await chromeAutoLoginSettingsAdapter.setSource("1password");

    expect(mockSet).toHaveBeenCalledWith({ kotdiff_auto_login_source: "1password" });
    await expect(chromeAutoLoginSettingsAdapter.getSource()).resolves.toBe("1password");
  });

  test("知らない値が入っていればブラウザ扱い", async () => {
    mockGet.mockResolvedValue({ kotdiff_auto_login_source: "keychain" });

    await expect(chromeAutoLoginSettingsAdapter.getSource()).resolves.toBe("browser");
  });
});
