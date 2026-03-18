import type { DashboardData } from "../../../types";

export interface StoragePort {
  getEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  getDashboardEnabled(): Promise<boolean>;
  setDashboardEnabled(enabled: boolean): Promise<void>;
  getDashboardData(): Promise<DashboardData | null>;
  setDashboardData(data: DashboardData): Promise<void>;
}
