export type KotdiffMessage = { readonly type: "kotdiff-open-dashboard" };

export function isKotdiffMessage(msg: unknown): msg is KotdiffMessage {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) return false;
  const { type } = msg as { type: unknown };
  return type === "kotdiff-open-dashboard";
}
