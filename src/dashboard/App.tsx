import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { buildDashboardSummary } from "../domain/aggregates/WorkMonth";
import type { DashboardSummary } from "../domain/aggregates/WorkMonth";
import {
  chromeStorageAdapter,
  onDashboardDataChanged,
} from "../infrastructure/chrome/adapters/ChromeStorageAdapter";
import { SummaryCards } from "./components/SummaryCards";
import { ChartPanel } from "./components/ChartPanel";
import { DailyTable } from "./components/DailyTable";

export function App(): ReactElement {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    const load = async (): Promise<void> => {
      const data = await chromeStorageAdapter.getDashboardData();
      if (data) {
        setSummary(buildDashboardSummary(data));
        setGeneratedAt(data.generatedAt);
      }
    };
    void load();
    // KOT ページ側の再注入で保存し直されたデータを開きっぱなしでも反映する (issue #29)
    return onDashboardDataChanged((data) => {
      setSummary(buildDashboardSummary(data));
      setGeneratedAt(data.generatedAt);
    });
  }, []);

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
