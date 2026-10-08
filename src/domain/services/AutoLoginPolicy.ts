export interface AutoLoginInput {
  readonly hasLoginForm: boolean;
  readonly enabled: boolean;
  // 自分でログアウトした後、まだ手動でログインし直していない
  readonly suppressedByLogout: boolean;
  readonly lastAttemptAt: number | null;
  readonly now: number;
}

export type AutoLoginDecision = "skip" | "attempt" | "blocked";

// 自動ログイン後に KOT がログイン画面へ戻すまでの猶予。これより早く
// ログイン画面が再び出たら認証失敗とみなし、op の呼び出しを繰り返さない
export const AUTO_LOGIN_RETRY_INTERVAL_MS = 2 * 60 * 1000;

export function decideAutoLogin(input: AutoLoginInput): AutoLoginDecision {
  // ログインフォームがない＝セッションがあるので、op を呼ばない（Touch ID も出さない）
  if (!input.hasLoginForm || !input.enabled) {
    return "skip";
  }
  // ログイン画面はセッション切れと手動ログアウトの区別がつかないため、
  // ログアウトの意思は別に記録してもらい、ここでは従うだけにする
  if (input.suppressedByLogout) {
    return "skip";
  }
  if (
    input.lastAttemptAt !== null &&
    input.now - input.lastAttemptAt < AUTO_LOGIN_RETRY_INTERVAL_MS
  ) {
    return "blocked";
  }
  return "attempt";
}
