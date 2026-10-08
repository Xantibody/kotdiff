export interface LoginCredentials {
  readonly username: string;
  readonly password: string;
}

export interface KotLoginForm {
  // ブラウザのパスワードマネージャが ID とパスワードを埋めたか
  isFilled(): boolean;
  // 入力はそのままにログインボタンだけ押す
  pressLogin(): void;
  submit(credentials: LoginCredentials): void;
}

// KOT はセッションが切れると /admin のままログイン画面を返すため、
// URL ではなくフォームの有無でログイン画面かを判定する
export function findLoginForm(doc: Document): KotLoginForm | null {
  const idInput = doc.querySelector<HTMLInputElement>("#login_id");
  const passwordInput = doc.querySelector<HTMLInputElement>("#login_password");
  const button = doc.querySelector<HTMLInputElement>("#login_button");
  if (!idInput || !passwordInput || !button) {
    return null;
  }
  // ボタンの click ハンドラ (jQuery) が hidden の submit (#action_01) を押して送信する
  function pressLogin(): void {
    button?.click();
  }
  return {
    isFilled() {
      return idInput.value !== "" && passwordInput.value !== "";
    },
    pressLogin,
    submit({ username, password }) {
      idInput.value = username;
      passwordInput.value = password;
      pressLogin();
    },
  };
}
