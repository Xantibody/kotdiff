import type { UiPreferences } from "../../../preferences";

export interface PreferencesPort {
  getUiPreferences(): Promise<UiPreferences>;
  setUiPreferences(prefs: UiPreferences): Promise<void>;
}
