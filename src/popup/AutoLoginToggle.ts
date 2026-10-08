// おまけ機能（1Password 自動ログイン）の ON/OFF。onChange は実際に反映された状態を返す
// （nativeMessaging の許可を断られたら ON にならない）
export function renderAutoLoginToggle(
  root: HTMLElement,
  enabled: boolean,
  onChange: (enabled: boolean) => Promise<boolean>,
): void {
  const label = document.createElement("label");
  label.className = "auto-login";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = enabled;
  input.addEventListener("change", () => {
    void onChange(input.checked).then((applied) => {
      input.checked = applied;
      return applied;
    });
  });
  label.append(input, " 1Password で自動ログイン（おまけ）");
  root.append(label);
}
