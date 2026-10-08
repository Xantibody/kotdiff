import { describe, test, expect, vi, beforeEach } from "vitest";
import { findLoginForm } from "./KotLoginForm";

// sample/login.html のフォームを必要な要素だけに絞ったもの
const LOGIN_FORM_HTML = `
<form action="https://s2.ta.kingoftime.jp/admin" method="post" name="FormName">
  <input type="text" id="login_id" name="login_id">
  <input type="password" id="login_password" name="login_password">
  <input name="action_id" type="submit" value="1" id="action_01" style="display: none;">
  <input id="login_button" type="button" value="ログイン">
</form>`;

describe("findLoginForm", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("ログインフォームがなければ null（勤怠画面などセッションあり）", () => {
    document.body.innerHTML = "<table></table>";

    expect(findLoginForm(document)).toBeNull();
  });

  test("ログイン画面なら ID とパスワードを入れてログインボタンを押せる", () => {
    document.body.innerHTML = LOGIN_FORM_HTML;
    const onClick = vi.fn();
    document.querySelector("#login_button")?.addEventListener("click", onClick);

    findLoginForm(document)?.submit({ username: "user01", password: "secret" });

    expect(document.querySelector<HTMLInputElement>("#login_id")?.value).toBe("user01");
    expect(document.querySelector<HTMLInputElement>("#login_password")?.value).toBe("secret");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
