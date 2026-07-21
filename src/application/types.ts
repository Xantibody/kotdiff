export interface KotdiffMessage {
  readonly type: "kotdiff-open-dashboard";
}

export function isKotdiffMessage(msg: unknown): msg is KotdiffMessage {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) {
    return false;
  }
  // "type" in msg の絞り込みにより msg.type へ直接アクセスできる
  return msg.type === "kotdiff-open-dashboard";
}
