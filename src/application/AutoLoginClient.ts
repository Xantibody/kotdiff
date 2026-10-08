import type { KotLoginForm, LoginCredentials } from "../infrastructure/kot/KotLoginForm";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import type { AutoLoginSettingsPort } from "../infrastructure/chrome/ports/AutoLoginPorts";
import type { TimerPort } from "../infrastructure/ui/ports/TimerPort";
import { errorMessage } from "./errorMessage";

type AutoLoginReply =
  | { readonly status: "credentials"; readonly credentials: LoginCredentials }
  | { readonly status: "autofill" }
  | { readonly status: "blocked" }
  | { readonly status: "error"; readonly message: string };

type Timer = Pick<TimerPort, "setInterval">;

// ブラウザのパスワードマネージャは document_idle の後に埋めることがあるため少し待つ
const AUTOFILL_POLL_MS = 200;
const AUTOFILL_MAX_TICKS = 15;

// background からの応答は型が保証されないため、使う形だけを取り出す
function parseReply(v: unknown): AutoLoginReply | null {
  if (typeof v !== "object" || v === null || !("status" in v)) {
    return null;
  }
  if (v.status === "autofill") {
    return { status: "autofill" };
  }
  if (v.status === "blocked") {
    return { status: "blocked" };
  }
  if (v.status === "error" && "message" in v && typeof v.message === "string") {
    return { status: "error", message: v.message };
  }
  if (
    v.status === "credentials" &&
    "credentials" in v &&
    typeof v.credentials === "object" &&
    v.credentials !== null &&
    "username" in v.credentials &&
    typeof v.credentials.username === "string" &&
    "password" in v.credentials &&
    typeof v.credentials.password === "string"
  ) {
    return {
      status: "credentials",
      credentials: { username: v.credentials.username, password: v.credentials.password },
    };
  }
  return null;
}

// background が応答しない（service worker 側の例外など）ときもエラーとして扱い、画面に出せるようにする
async function requestAutoLogin(
  messaging: Pick<MessagingPort, "request">,
): Promise<AutoLoginReply | null> {
  try {
    return parseReply(await messaging.request({ type: "kotdiff-auto-login" }));
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

// ブラウザが ID とパスワードを埋めるのを待つ。埋まれば true、待ち切れなければ false
async function waitForAutofill(form: KotLoginForm, timer: Timer): Promise<boolean> {
  if (form.isFilled()) {
    return true;
  }
  const filled = await new Promise<boolean>((resolve) => {
    let ticks = 0;
    const clear = timer.setInterval(() => {
      ticks += 1;
      if (form.isFilled()) {
        clear();
        resolve(true);
      } else if (ticks >= AUTOFILL_MAX_TICKS) {
        clear();
        resolve(false);
      }
    }, AUTOFILL_POLL_MS);
  });
  return filled;
}

// ログイン画面なら自動ログインする。画面に出すべきメッセージがあれば返す（なければ null）
export async function tryAutoLogin(
  form: KotLoginForm | null,
  messaging: Pick<MessagingPort, "request">,
  timer: Timer,
): Promise<string | null> {
  if (form === null) {
    return null;
  }
  const reply = await requestAutoLogin(messaging);
  if (reply?.status === "autofill") {
    if (await waitForAutofill(form, timer)) {
      form.pressLogin();
      return null;
    }
    return "KotDiff: ブラウザが ID とパスワードを自動入力しなかったため、自動ログインしませんでした（保存したログイン情報が 1 件のときだけ自動入力されます）";
  }
  if (reply?.status === "credentials") {
    form.submit(reply.credentials);
    return null;
  }
  if (reply?.status === "blocked") {
    return "KotDiff: 直前の自動ログインが通らなかったため、自動ログインを止めました。ID とパスワードを確認してください";
  }
  if (reply?.status === "error") {
    return `KotDiff: 認証情報を取り出せませんでした（${reply.message}）`;
  }
  return null;
}

// tryAutoLogin の結果を画面に出すところまで。content script の起動から呼ぶ
export async function runAutoLogin(
  form: KotLoginForm,
  messaging: Pick<MessagingPort, "request">,
  timer: Timer,
  showNotice: (text: string) => void,
): Promise<void> {
  const notice = await tryAutoLogin(form, messaging, timer);
  if (notice !== null) {
    showNotice(notice);
  }
}

// ログイン済みの画面から呼ぶ。自分でログアウトしたら印を付け、次にログイン画面を
// 見ても自動ログインしない。印はログイン済みの画面を見たとき（＝手動でログインし直した
// とき）に消える
export function trackLogout(
  settings: Pick<AutoLoginSettingsPort, "setSuppressedByLogout">,
  watchLogoutClick: (onLogout: () => void) => boolean,
): void {
  void settings.setSuppressedByLogout(false);
  watchLogoutClick(() => {
    void settings.setSuppressedByLogout(true);
  });
}
