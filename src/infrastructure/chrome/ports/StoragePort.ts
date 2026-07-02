import type { DashboardData, KotdiffSettings } from "../../../types";

export interface StoragePort {
  getDashboardData(): Promise<DashboardData | null>;
  setDashboardData(data: DashboardData): Promise<void>;
  getSettings(): Promise<KotdiffSettings>;
  setSettings(settings: KotdiffSettings): Promise<void>;
}
