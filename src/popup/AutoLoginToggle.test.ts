import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderAutoLoginToggle } from "./AutoLoginToggle";

function checkbox(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>("input[type=checkbox]");
  if (!input) {
    throw new Error("checkbox not found");
  }
  return input;
}

describe("renderAutoLoginToggle", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    // 文書に繋がっていない checkbox は click しても change が発火しない
    document.body.replaceChildren(root);
  });

  test("今の設定をチェック状態に反映する", () => {
    renderAutoLoginToggle(root, true, vi.fn());

    expect(root.textContent).toContain("1Password で自動ログイン");
    expect(checkbox(root).checked).toBe(true);
  });

  test("切り替えると変更を依頼し、結果の状態に合わせる", async () => {
    // 権限の許可を断られたときは OFF のまま
    const onChange = vi.fn().mockResolvedValue(false);
    renderAutoLoginToggle(root, false, onChange);

    checkbox(root).click();
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(true);
    });

    await vi.waitFor(() => {
      expect(checkbox(root).checked).toBe(false);
    });
  });
});
