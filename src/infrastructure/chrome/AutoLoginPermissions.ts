// おまけ機能（1Password 自動ログイン）を ON にするときに求める権限。
// Firefox は manifest の data_collection_permissions.optional に書いた
// authenticationInfo も permissions.request / contains で扱う。Chrome は
// data_collection を知らず、渡すと request 自体が失敗するので付けない
export interface AutoLoginPermissions extends chrome.permissions.Permissions {
  // chrome.permissions の型にはない Firefox 固有のキー
  readonly data_collection?: string[];
}

export function autoLoginPermissions(isFirefox: boolean): AutoLoginPermissions {
  if (isFirefox) {
    return { permissions: ["nativeMessaging"], data_collection: ["authenticationInfo"] };
  }
  return { permissions: ["nativeMessaging"] };
}

// runtime.getBrowserInfo は Firefox にしかない
export function isFirefoxRuntime(runtime: object): boolean {
  return "getBrowserInfo" in runtime && typeof runtime.getBrowserInfo === "function";
}
