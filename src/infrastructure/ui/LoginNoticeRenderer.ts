import { WARNING_COLOR } from "./styles";

// 自動ログインを止めた・失敗したことを、ログインフォームの上に出す
export function showLoginNotice(doc: Document, text: string): void {
  const notice = doc.createElement("div");
  notice.textContent = text;
  notice.style.cssText = `background: ${WARNING_COLOR}; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 13px;`;
  const form = doc.querySelector("#login_id")?.closest("form");
  if (form) {
    form.before(notice);
  } else {
    doc.body.prepend(notice);
  }
}
