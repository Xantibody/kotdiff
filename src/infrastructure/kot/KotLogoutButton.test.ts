import { describe, test, expect, vi, beforeEach } from "vitest";
import { watchLogoutClick } from "./KotLogoutButton";

// 実ページのヘッダーにあるログアウトボタン (onclick で /login/do_logout へ遷移する)
const LOGOUT_BUTTON_HTML = `
<div class="htBlock-header_logoutButton"><p><a><img alt="ログアウト"></a></p></div>`;

describe("watchLogoutClick", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("ログアウトボタンがない画面では何も起きない", () => {
    document.body.innerHTML = "<table></table>";
    const onLogout = vi.fn();

    expect(watchLogoutClick(document, onLogout)).toBe(false);
    expect(onLogout).not.toHaveBeenCalled();
  });

  test("ログアウトボタンの中の要素を押したら通知する", () => {
    document.body.innerHTML = LOGOUT_BUTTON_HTML;
    const onLogout = vi.fn();

    expect(watchLogoutClick(document, onLogout)).toBe(true);
    document.querySelector("img")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
