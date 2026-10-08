import { describe, test, expect, vi } from "vitest";
import { tryAutoLogin, trackLogout } from "./AutoLoginClient";
import type { KotLoginForm } from "../infrastructure/kot/KotLoginForm";

function makeForm(): KotLoginForm {
  return { isFilled: vi.fn().mockReturnValue(false), pressLogin: vi.fn(), submit: vi.fn() };
}

const NO_TIMER = { setInterval: vi.fn() };

function setup(response: unknown) {
  const form = makeForm();
  const request = vi.fn().mockResolvedValue(response);
  return { form, request, messaging: { request } };
}

describe("tryAutoLogin", () => {
  test("ログインフォームがなければ問い合わせない", async () => {
    const { request, messaging } = setup({ status: "skip" });

    await expect(tryAutoLogin(null, messaging, NO_TIMER)).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  test("認証情報が返ればフォームに入れて送信する", async () => {
    const credentials = { username: "user01", password: "secret" };
    const { form, request, messaging } = setup({ status: "credentials", credentials });

    await expect(tryAutoLogin(form, messaging, NO_TIMER)).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith({ type: "kotdiff-auto-login" });
    expect(form.submit).toHaveBeenCalledWith(credentials);
  });

  test("止めたときは送信せず、確認を促すメッセージを返す", async () => {
    const { form, messaging } = setup({ status: "blocked" });

    await expect(tryAutoLogin(form, messaging, NO_TIMER)).resolves.toContain(
      "自動ログインを止めました",
    );
    expect(form.submit).not.toHaveBeenCalled();
  });

  test("取り出しに失敗したらエラー内容をメッセージにする", async () => {
    const { form, messaging } = setup({ status: "error", message: "op: not signed in" });

    await expect(tryAutoLogin(form, messaging, NO_TIMER)).resolves.toContain("op: not signed in");
  });

  test("background との通信に失敗したらエラー内容をメッセージにする", async () => {
    const form = makeForm();
    const request = vi.fn().mockRejectedValue(new Error("message port closed"));

    await expect(tryAutoLogin(form, { request }, NO_TIMER)).resolves.toContain(
      "message port closed",
    );
    expect(form.submit).not.toHaveBeenCalled();
  });

  test.each([
    ["無効", { status: "skip" }],
    ["応答なし", undefined],
    ["認証情報の欠けた応答", { status: "credentials" }],
  ])("%s なら何もしない", async (_label, response) => {
    const { form, messaging } = setup(response);

    await expect(tryAutoLogin(form, messaging, NO_TIMER)).resolves.toBeNull();
    expect(form.submit).not.toHaveBeenCalled();
  });
});

describe("trackLogout", () => {
  function setupSettings() {
    return { setSuppressedByLogout: vi.fn().mockResolvedValue(undefined) };
  }

  test("ログイン済みの画面を見たら手動ログアウトの印を消す", () => {
    const settings = setupSettings();

    trackLogout(settings, () => false);

    expect(settings.setSuppressedByLogout).toHaveBeenCalledWith(false);
  });

  test("ログアウトボタンが押されたら印を付ける", () => {
    const settings = setupSettings();
    const watch = vi.fn<(onLogout: () => void) => boolean>().mockReturnValue(true);

    trackLogout(settings, watch);
    watch.mock.calls[0]?.[0]();

    expect(settings.setSuppressedByLogout).toHaveBeenLastCalledWith(true);
  });
});

describe("tryAutoLogin: ブラウザの自動入力", () => {
  function setupAutofill(filledAfterTicks: number) {
    let ticks = 0;
    let tick: (() => void) | null = null;
    const form = makeForm();
    vi.mocked(form.isFilled).mockImplementation(() => ticks >= filledAfterTicks);
    const messaging = { request: vi.fn().mockResolvedValue({ status: "autofill" }) };
    const clear = vi.fn();
    const timer = {
      setInterval: vi.fn((fn: () => void) => {
        tick = fn;
        return clear;
      }),
    };
    // setInterval が登録されるのを待ってから n 回鳴らす
    async function ring(n: number): Promise<void> {
      await vi.waitFor(() => expect(timer.setInterval).toHaveBeenCalledTimes(1));
      for (let i = 0; i < n; i += 1) {
        ticks += 1;
        tick?.();
      }
    }
    return { form, messaging, timer, clear, ring };
  }

  test("もう埋まっていればすぐログインボタンを押す", async () => {
    const { form, messaging, timer } = setupAutofill(0);

    await expect(tryAutoLogin(form, messaging, timer)).resolves.toBeNull();

    expect(form.pressLogin).toHaveBeenCalledTimes(1);
    expect(timer.setInterval).not.toHaveBeenCalled();
  });

  test("少し待って埋まればログインボタンを押し、待つのをやめる", async () => {
    const { form, messaging, timer, clear, ring } = setupAutofill(3);

    const result = tryAutoLogin(form, messaging, timer);
    await ring(3);

    await expect(result).resolves.toBeNull();
    expect(form.pressLogin).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test("待っても埋まらなければ押さず、理由を返す", async () => {
    const { form, messaging, timer, ring } = setupAutofill(1000);

    const result = tryAutoLogin(form, messaging, timer);
    await ring(15);

    await expect(result).resolves.toContain("自動入力");
    expect(form.pressLogin).not.toHaveBeenCalled();
  });
});
