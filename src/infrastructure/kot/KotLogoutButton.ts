// KOT のヘッダーのログアウトボタン。onclick で location.href を書き換えて遷移するため、
// 先に捕捉段階で click を受け取り、ページが離れる前に通知する
const LOGOUT_BUTTON_SELECTOR = ".htBlock-header_logoutButton";

export function watchLogoutClick(doc: Document, onLogout: () => void): boolean {
  const button = doc.querySelector(LOGOUT_BUTTON_SELECTOR);
  if (!button) {
    return false;
  }
  button.addEventListener("click", onLogout, { capture: true });
  return true;
}
