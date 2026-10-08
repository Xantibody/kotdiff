import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderAutoLoginSettings } from "./AutoLoginSettings";
import type { CredentialSource } from "../infrastructure/chrome/ports/AutoLoginPorts";

function checkbox(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>("input[type=checkbox]");
  if (!input) {
    throw new Error("checkbox not found");
  }
  return input;
}

function select(root: HTMLElement): HTMLSelectElement {
  const el = root.querySelector("select");
  if (!el) {
    throw new Error("select not found");
  }
  return el;
}

function choose(el: HTMLSelectElement, value: CredentialSource): void {
  el.value = value;
  el.dispatchEvent(new Event("change"));
}

describe("renderAutoLoginSettings", () => {
  let root: HTMLElement;
  let onEnabledChange: ReturnType<typeof vi.fn<(enabled: boolean) => Promise<void>>>;
  let onSourceChange: ReturnType<
    typeof vi.fn<(source: CredentialSource) => Promise<CredentialSource>>
  >;

  beforeEach(() => {
    root = document.createElement("div");
    // 文書に繋がっていない checkbox は click しても change が発火しない
    document.body.replaceChildren(root);
    onEnabledChange = vi.fn<(enabled: boolean) => Promise<void>>().mockResolvedValue(undefined);
    onSourceChange = vi
      .fn<(source: CredentialSource) => Promise<CredentialSource>>()
      .mockResolvedValue("browser");
  });

  test("今の設定を ON/OFF と出どころに反映する", () => {
    renderAutoLoginSettings(
      root,
      { enabled: true, source: "1password" },
      { onEnabledChange, onSourceChange },
    );

    expect(root.textContent).toContain("自動ログイン");
    expect(checkbox(root).checked).toBe(true);
    expect(select(root).value).toBe("1password");
  });

  test("ON/OFF を切り替えると保存を依頼する", async () => {
    renderAutoLoginSettings(
      root,
      { enabled: false, source: "browser" },
      { onEnabledChange, onSourceChange },
    );

    checkbox(root).click();

    await vi.waitFor(() => expect(onEnabledChange).toHaveBeenCalledWith(true));
  });

  test("出どころを変えると依頼し、実際に反映された値に合わせる（1Password の許可を断られたらブラウザに戻る）", async () => {
    renderAutoLoginSettings(
      root,
      { enabled: true, source: "browser" },
      { onEnabledChange, onSourceChange },
    );

    choose(select(root), "1password");

    await vi.waitFor(() => expect(onSourceChange).toHaveBeenCalledWith("1password"));
    await vi.waitFor(() => expect(select(root).value).toBe("browser"));
  });
});
