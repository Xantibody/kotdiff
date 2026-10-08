import { describe, test, expect, vi } from "vitest";
import { createAutoLoginService } from "./AutoLoginService";
import type {
  AutoLoginSettingsPort,
  CredentialSource,
  CredentialsPort,
  NativeMessagingPermissionPort,
} from "../infrastructure/chrome/ports/AutoLoginPorts";

const NOW = Date.parse("2026-07-02T06:00:00.000Z");

function setup(
  options: {
    enabled?: boolean;
    granted?: boolean;
    source?: CredentialSource;
    suppressedByLogout?: boolean;
    lastAttemptAt?: number | null;
  } = {},
) {
  const settings: AutoLoginSettingsPort = {
    isEnabled: vi.fn().mockResolvedValue(options.enabled ?? true),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    getSource: vi.fn().mockResolvedValue(options.source ?? "1password"),
    setSource: vi.fn().mockResolvedValue(undefined),
    isSuppressedByLogout: vi.fn().mockResolvedValue(options.suppressedByLogout ?? false),
    setSuppressedByLogout: vi.fn().mockResolvedValue(undefined),
    getLastAttemptAt: vi.fn().mockResolvedValue(options.lastAttemptAt ?? null),
    setLastAttemptAt: vi.fn().mockResolvedValue(undefined),
  };
  const permission: NativeMessagingPermissionPort = {
    isGranted: vi.fn().mockResolvedValue(options.granted ?? true),
  };
  const credentials: CredentialsPort = {
    fetchCredentials: vi.fn().mockResolvedValue({ username: "user01", password: "secret" }),
  };
  const service = createAutoLoginService(settings, permission, credentials);
  return { service, settings, permission, credentials };
}

describe("AutoLoginService.requestCredentials", () => {
  test("おまけ機能が無効なら 1Password を呼ばずに skip", async () => {
    const { service, credentials } = setup({ enabled: false });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "skip" });
    expect(credentials.fetchCredentials).not.toHaveBeenCalled();
  });

  test("有効なら 1Password から取り出した認証情報を返し、試行時刻を記録する", async () => {
    const { service, settings } = setup();

    await expect(service.requestCredentials(NOW)).resolves.toEqual({
      status: "credentials",
      credentials: { username: "user01", password: "secret" },
    });
    expect(settings.setLastAttemptAt).toHaveBeenCalledWith(NOW);
  });

  test("nativeMessaging が許可されていなければ skip", async () => {
    const { service, credentials } = setup({ granted: false });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "skip" });
    expect(credentials.fetchCredentials).not.toHaveBeenCalled();
  });

  test("自分でログアウトした直後なら skip で 1Password を呼ばない", async () => {
    const { service, credentials } = setup({ suppressedByLogout: true });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "skip" });
    expect(credentials.fetchCredentials).not.toHaveBeenCalled();
  });

  test("出どころがブラウザなら autofill を返し、1Password は呼ばず、試行時刻は記録する", async () => {
    const { service, credentials, settings } = setup({ source: "browser", granted: false });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "autofill" });
    expect(credentials.fetchCredentials).not.toHaveBeenCalled();
    expect(settings.setLastAttemptAt).toHaveBeenCalledWith(NOW);
  });

  test("出どころがブラウザでも無効なら skip", async () => {
    const { service, settings } = setup({ source: "browser", enabled: false });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "skip" });
    expect(settings.setLastAttemptAt).not.toHaveBeenCalled();
  });

  test("直前に試行していれば blocked で 1Password を呼ばない", async () => {
    const { service, credentials } = setup({ lastAttemptAt: NOW - 30 * 1000 });

    await expect(service.requestCredentials(NOW)).resolves.toEqual({ status: "blocked" });
    expect(credentials.fetchCredentials).not.toHaveBeenCalled();
  });

  test("取り出し中に重ねて問い合わせが来ても 1Password は 1 回しか呼ばず、同じ結果を返す", async () => {
    const { service, credentials, settings } = setup();

    const [first, second] = await Promise.all([
      service.requestCredentials(NOW),
      service.requestCredentials(NOW + 1),
    ]);

    expect(credentials.fetchCredentials).toHaveBeenCalledTimes(1);
    expect(settings.setLastAttemptAt).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first.status).toBe("credentials");
  });

  test("取り出しが終われば次の問い合わせは改めて判定する", async () => {
    const { service, credentials, settings } = setup();
    await service.requestCredentials(NOW);
    vi.mocked(settings.getLastAttemptAt).mockResolvedValue(NOW);

    await expect(service.requestCredentials(NOW + 1000)).resolves.toEqual({ status: "blocked" });
    expect(credentials.fetchCredentials).toHaveBeenCalledTimes(1);
  });

  test("取り出しに失敗したらエラー内容を返す", async () => {
    const { service, credentials } = setup();
    vi.mocked(credentials.fetchCredentials).mockRejectedValue(new Error("op: item not found"));

    await expect(service.requestCredentials(NOW)).resolves.toEqual({
      status: "error",
      message: "op: item not found",
    });
  });
});
