import { describe, test, expect, beforeEach } from "vitest";
import { showLoginNotice } from "./LoginNoticeRenderer";

describe("showLoginNotice", () => {
  beforeEach(() => {
    document.body.innerHTML = `<form name="FormName"><input id="login_id"></form>`;
  });

  test("ログインフォームの直前にメッセージを出す", () => {
    showLoginNotice(document, "KotDiff: 止めました");

    const form = document.querySelector("form");
    expect(form?.previousElementSibling?.textContent).toBe("KotDiff: 止めました");
  });
});
