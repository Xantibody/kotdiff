export interface KotdiffMessage {
  readonly type: "kotdiff-open-dashboard" | "kotdiff-open-kot";
}

export function isKotdiffMessage(msg: unknown): msg is KotdiffMessage {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) {
    return false;
  }
  // "type" in msg の絞り込みにより msg.type へ直接アクセスできる
  return msg.type === "kotdiff-open-dashboard" || msg.type === "kotdiff-open-kot";
}

// 応答付き (onRequest) で扱うメッセージ。送りっぱなしの KotdiffMessage とは分ける
export interface AutoLoginRequest {
  readonly type: "kotdiff-auto-login";
}

export function isAutoLoginRequest(msg: unknown): msg is AutoLoginRequest {
  return (
    typeof msg === "object" && msg !== null && "type" in msg && msg.type === "kotdiff-auto-login"
  );
}
