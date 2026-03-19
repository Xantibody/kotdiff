export type KotdiffMessage =
  | { readonly type: "kotdiff-toggle"; readonly enabled: boolean }
  | { readonly type: "kotdiff-dashboard-changed" }
  | { readonly type: "kotdiff-open-dashboard" };

export function isKotdiffMessage(msg: unknown): msg is KotdiffMessage {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) return false;
  const { type } = msg as { type: unknown };
  if (type === "kotdiff-toggle") {
    return "enabled" in msg && typeof (msg as { enabled: unknown }).enabled === "boolean";
  }
  return type === "kotdiff-dashboard-changed" || type === "kotdiff-open-dashboard";
}
