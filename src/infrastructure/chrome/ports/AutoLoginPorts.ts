import type { LoginCredentials } from "../../kot/KotLoginForm";

// おまけ機能の ON/OFF、手動ログアウトの印、ループ防止用の直近の試行時刻
export interface AutoLoginSettingsPort {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
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
