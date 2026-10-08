import {
  AUTO_LOGIN_ENABLED_KEY,
  AUTO_LOGIN_LAST_ATTEMPT_AT_KEY,
  AUTO_LOGIN_SUPPRESSED_BY_LOGOUT_KEY,
  NATIVE_HOST_NAME,
} from "../constants";
import type {
  AutoLoginSettingsPort,
  CredentialsPort,
  NativeMessagingPermissionPort,
} from "../ports/AutoLoginPorts";
import type { LoginCredentials } from "../../kot/KotLoginForm";
import { autoLoginPermissions, isFirefoxRuntime } from "../AutoLoginPermissions";

export const chromeAutoLoginSettingsAdapter = {
  async isEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get(AUTO_LOGIN_ENABLED_KEY);
    return result[AUTO_LOGIN_ENABLED_KEY] === true;
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [AUTO_LOGIN_ENABLED_KEY]: enabled });
  },

  async isSuppressedByLogout(): Promise<boolean> {
    const result = await chrome.storage.local.get(AUTO_LOGIN_SUPPRESSED_BY_LOGOUT_KEY);
    return result[AUTO_LOGIN_SUPPRESSED_BY_LOGOUT_KEY] === true;
  },

  async setSuppressedByLogout(suppressed: boolean): Promise<void> {
    await chrome.storage.local.set({ [AUTO_LOGIN_SUPPRESSED_BY_LOGOUT_KEY]: suppressed });
  },

  async getLastAttemptAt(): Promise<number | null> {
    const result = await chrome.storage.local.get(AUTO_LOGIN_LAST_ATTEMPT_AT_KEY);
    const value = result[AUTO_LOGIN_LAST_ATTEMPT_AT_KEY];
    return typeof value === "number" ? value : null;
  },

  async setLastAttemptAt(at: number): Promise<void> {
    await chrome.storage.local.set({ [AUTO_LOGIN_LAST_ATTEMPT_AT_KEY]: at });
  },
} satisfies AutoLoginSettingsPort;

export const chromeNativeMessagingPermissionAdapter = {
  async isGranted(): Promise<boolean> {
    const granted = await chrome.permissions.contains(
      autoLoginPermissions(isFirefoxRuntime(chrome.runtime)),
    );
    return granted;
  },
} satisfies NativeMessagingPermissionPort;

function isLoginCredentials(v: unknown): v is LoginCredentials {
  return (
    typeof v === "object" &&
    v !== null &&
    "username" in v &&
    typeof v.username === "string" &&
    "password" in v &&
    typeof v.password === "string"
  );
}

export const nativeCredentialsAdapter = {
  async fetchCredentials(): Promise<LoginCredentials> {
    const response: unknown = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
      type: "get-credentials",
    });
    if (isLoginCredentials(response)) {
      return { username: response.username, password: response.password };
    }
    if (typeof response === "object" && response !== null && "error" in response) {
      throw new Error(String(response.error));
    }
    throw new Error("ネイティブホストの応答が不正です");
  },
} satisfies CredentialsPort;
