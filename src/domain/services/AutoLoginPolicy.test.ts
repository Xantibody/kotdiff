import { describe, test, expect } from "vitest";
import { decideAutoLogin } from "./AutoLoginPolicy";
import type { AutoLoginInput } from "./AutoLoginPolicy";

const NOW = Date.parse("2026-07-02T06:00:00.000Z");

// ログイン画面・有効・ログアウト直後ではない・試行履歴なし
const ON_LOGIN_PAGE: AutoLoginInput = {
  hasLoginForm: true,
  enabled: true,
  suppressedByLogout: false,
  lastAttemptAt: null,
  now: NOW,
};

describe("decideAutoLogin", () => {
  test("ログインフォームがなければセッションありとみなして何もしない", () => {
    expect(decideAutoLogin({ ...ON_LOGIN_PAGE, hasLoginForm: false })).toBe("skip");
  });

  test("おまけ機能が無効ならログイン画面でも何もしない", () => {
    expect(decideAutoLogin({ ...ON_LOGIN_PAGE, enabled: false })).toBe("skip");
  });

  test("ログイン画面で有効かつ試行履歴がなければ自動ログインする", () => {
    expect(decideAutoLogin(ON_LOGIN_PAGE)).toBe("attempt");
  });

  test("直前の自動ログイン後にまたログイン画面なら認証失敗とみなして止める", () => {
    expect(decideAutoLogin({ ...ON_LOGIN_PAGE, lastAttemptAt: NOW - 60 * 1000 })).toBe("blocked");
  });

  test("前回の試行から猶予を過ぎていればセッション切れとみなして再びログインする", () => {
    expect(decideAutoLogin({ ...ON_LOGIN_PAGE, lastAttemptAt: NOW - 2 * 60 * 1000 })).toBe(
      "attempt",
    );
  });

  test("自分でログアウトした後は、有効でもログイン画面で自動ログインしない", () => {
    expect(decideAutoLogin({ ...ON_LOGIN_PAGE, suppressedByLogout: true })).toBe("skip");
  });
});
