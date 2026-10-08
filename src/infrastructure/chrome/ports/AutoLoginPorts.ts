import type { LoginCredentials } from "../../kot/KotLoginForm";

// 自動ログインに使う認証情報の出どころ。
// browser: ブラウザのパスワードマネージャが埋めた値でログインボタンを押す（拡張は秘密を持たない）
// 1password: ネイティブホスト経由で 1Password から取り出す（おまけ機能）
export type CredentialSource = "browser" | "1password";

export function isCredentialSource(v: unknown): v is CredentialSource {
  return v === "browser" || v === "1password";
}

// 自動ログインの ON/OFF と出どころ、手動ログアウトの印、ループ防止用の直近の試行時刻
export interface AutoLoginSettingsPort {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  getSource(): Promise<CredentialSource>;
  setSource(source: CredentialSource): Promise<void>;
  // 自分でログアウトしてから手動でログインし直すまで true
  isSuppressedByLogout(): Promise<boolean>;
  setSuppressedByLogout(suppressed: boolean): Promise<void>;
  getLastAttemptAt(): Promise<number | null>;
  setLastAttemptAt(at: number): Promise<void>;
}

// optional_permissions の nativeMessaging が許可されているか
export interface NativeMessagingPermissionPort {
  isGranted(): Promise<boolean>;
}

// ネイティブホスト経由で 1Password から認証情報を取り出す
export interface CredentialsPort {
  fetchCredentials(): Promise<LoginCredentials>;
}
