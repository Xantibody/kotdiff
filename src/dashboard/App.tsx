import { useCallback, useEffect, useState } from "react";
import { buildDashboardSummary, type DashboardSummary } from "../worktime";
import type { DashboardData } from "../types";
import { SummaryCards } from "./components/SummaryCards";
import { ChartPanel } from "./components/ChartPanel";
import { DailyTable } from "./components/DailyTable";

export function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  const loadDashboardData = useCallback(() => {
    chrome.storage.local.get("kotdiff_dashboard_data", (result) => {
      const data: DashboardData | undefined = result.kotdiff_dashboard_data;
      if (data) {
        setSummary(buildDashboardSummary(data));
        setGeneratedAt(data.generatedAt);
      }
    });
  }, []);

  useEffect(() => {
    loadDashboardData();
    const handleChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === "local" && changes.kotdiff_dashboard_data) {
        loadDashboardData();
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, [loadDashboardData]);

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">
          データがありません。KING OF TIME のページからダッシュボードを開いてください。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">KotDiff Dashboard</h1>
          {generatedAt && (
            <span className="text-sm text-gray-400">
              {new Date(generatedAt).toLocaleString("ja-JP")}
            </span>
          )}
        </div>
        <SummaryCards summary={summary} />
        <ChartPanel summary={summary} />
        <DailyTable rows={summary.dailyRows} />
      </div>
    </div>
  );
}
