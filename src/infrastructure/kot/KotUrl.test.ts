import { describe, test, expect } from "vitest";
import { isKotPageUrl } from "./KotUrl";

describe("isKotPageUrl", () => {
  test.each([
    ["勤怠画面", "https://s2.ta.kingoftime.jp/admin", true],
    ["ログイン画面（クエリ付き）", "https://s2.ta.kingoftime.jp/admin?page_id=/login", true],
    ["サブドメインなし", "https://kingoftime.jp/", true],
    ["別ドメインのクエリに含まれるだけ", "https://evil.example/?u=kingoftime.jp", false],
    ["末尾が一致するだけの別ドメイン", "https://kingoftime.jp.evil.example/", false],
    ["サブドメインの前方一致だけ", "https://s2.ta.kingoftime.jpn.example/", false],
    ["http", "http://s2.ta.kingoftime.jp/admin", false],
    ["拡張のページ", "chrome-extension://abc/popup.html", false],
    ["URL 不明", null, false],
    ["URL として壊れている", "not a url", false],
  ])("%s → %s", (_label, url, expected) => {
    expect(isKotPageUrl(url)).toBe(expected);
  });
});
