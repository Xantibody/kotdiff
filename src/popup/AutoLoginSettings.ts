import type { CredentialSource } from "../infrastructure/chrome/ports/AutoLoginPorts";

export interface AutoLoginSettingsView {
  readonly enabled: boolean;
  readonly source: CredentialSource;
}

export interface AutoLoginSettingsActions {
  onEnabledChange(enabled: boolean): Promise<void>;
  // 実際に反映された出どころを返す（1Password の許可を断られたら browser のまま）
  onSourceChange(source: CredentialSource): Promise<CredentialSource>;
}

const SOURCE_LABELS: Record<CredentialSource, string> = {
  browser: "ブラウザの保存パスワード",
  "1password": "1Password（おまけ）",
};

// 自動ログインの ON/OFF と、認証情報の出どころ
export function renderAutoLoginSettings(
  root: HTMLElement,
  view: AutoLoginSettingsView,
  actions: AutoLoginSettingsActions,
): void {
  const label = document.createElement("label");
  label.className = "auto-login";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = view.enabled;
  input.addEventListener("change", () => {
    void actions.onEnabledChange(input.checked);
  });
  label.append(input, " 自動ログイン");

  const select = document.createElement("select");
  for (const [value, text] of Object.entries(SOURCE_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  let current: CredentialSource = view.source;
  select.value = current;
  async function applySource(chosen: CredentialSource): Promise<void> {
    try {
      current = await actions.onSourceChange(chosen);
    } catch {
      // 権限要求がユーザー操作外で呼ばれたときなどは reject される。表示だけ変わったまま残さない
    }
    select.value = current;
  }
  select.addEventListener("change", () => {
    void applySource(select.value === "1password" ? "1password" : "browser");
  });
  label.append(" ", select);
  root.append(label);
}
