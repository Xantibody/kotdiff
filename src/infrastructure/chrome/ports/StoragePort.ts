import type { DashboardData } from "../../../types";

export interface StoragePort {
  getDashboardData(): Promise<DashboardData | null>;
  setDashboardData(data: DashboardData): Promise<void>;
}
