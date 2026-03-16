export interface DashboardRow {
  date: string;
  dayType: string;
  isWeekend: boolean;
  actual: number | null;
  fixedWork: number | null;
  overtime: number | null;
  breakTime: number | null;
  startTime: string | null;
  endTime: string | null;
  breakStarts: string[];
  breakEnds: string[];
  schedule: string | null;
  working: boolean;
  nightOvertime: number | null;
}

export interface LeaveBalance {
  label: string;
  used: number;
  remaining: number | null;
}

export interface DashboardData {
  rows: DashboardRow[];
  leaveBalances: LeaveBalance[];
  generatedAt: string;
}
