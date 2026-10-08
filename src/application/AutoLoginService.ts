import type {
  AutoLoginSettingsPort,
  CredentialsPort,
  NativeMessagingPermissionPort,
} from "../infrastructure/chrome/ports/AutoLoginPorts";
import type { LoginCredentials } from "../infrastructure/kot/KotLoginForm";
import { decideAutoLogin } from "../domain/services/AutoLoginPolicy";
import { errorMessage } from "./errorMessage";

export type AutoLoginResponse =
  | { readonly status: "skip" }
  | { readonly status: "blocked" }
  | { readonly status: "credentials"; readonly credentials: LoginCredentials }
  | { readonly status: "error"; readonly message: string };

export interface AutoLoginServiceInstance {
  requestCredentials(now: number): Promise<AutoLoginResponse>;
}

export function createAutoLoginService(
  settings: AutoLoginSettingsPort,
  permission: NativeMessagingPermissionPort,
  credentials: CredentialsPort,
): AutoLoginServiceInstance {
  // 処理中の問い合わせ。複数のタブが同時にログイン画面になったとき、試行時刻の
  // 読み書きが交錯して 1Password（Touch ID）を 2 回呼ばないよう、同じ結果を共有する
  let inFlight: Promise<AutoLoginResponse> | null = null;

  async function requestOnce(now: number): Promise<AutoLoginResponse> {
    const enabled = (await settings.isEnabled()) && (await permission.isGranted());
    const decision = decideAutoLogin({
      hasLoginForm: true,
      enabled,
      suppressedByLogout: await settings.isSuppressedByLogout(),
      lastAttemptAt: await settings.getLastAttemptAt(),
      now,
    });
    if (decision !== "attempt") {
      return { status: decision };
    }
    // 取得前に記録する: Touch ID を拒否されたときも続けて呼ばないため
    await settings.setLastAttemptAt(now);
    try {
      return { status: "credentials", credentials: await credentials.fetchCredentials() };
    } catch (error) {
      return { status: "error", message: errorMessage(error) };
    }
  }

  return {
    // content script がログインフォームを見つけたときだけ呼ぶ
    async requestCredentials(now) {
      inFlight ??= requestOnce(now).finally(() => {
        inFlight = null;
      });
      const response = await inFlight;
      return response;
    },
  };
}
