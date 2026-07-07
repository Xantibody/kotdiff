import { useEffect, useState } from "react";
import { buildDashboardSummary, type DashboardSummary } from "../domain/aggregates/WorkMonth";
import { DEFAULT_SETTINGS } from "../types";
import type { KotdiffSettings } from "../types";
import {
  chromeStorageAdapter,
  onDashboardDataChanged,
} from "../infrastructure/chrome/adapters/ChromeStorageAdapter";
import { SummaryCards } from "./components/SummaryCards";
import { ChartPanel } from "./components/ChartPanel";
import { DailyTable } from "./components/DailyTable";
import { SettingsPanel } from "./components/SettingsPanel";

export function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [settings, setSettings] = useState<KotdiffSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    void chromeStorageAdapter.getDashboardData().then((data) => {
      if (data) {
        setSummary(buildDashboardSummary(data));
        setGeneratedAt(data.generatedAt);
      }
    });
    void chromeStorageAdapter.getSettings().then(setSettings);
    // KOT ページ側の再注入で保存し直されたデータを開きっぱなしでも反映する (issue #29)
    onDashboardDataChanged((data) => {
      setSummary(buildDashboardSummary(data));
      setGeneratedAt(data.generatedAt);
    });
  }, []);

  const handleKeywordsChange = (customLeaveKeywords: string[]) => {
    const next: KotdiffSettings = { customLeaveKeywords };
    setSettings(next);
    void chromeStorageAdapter.setSettings(next);
  };

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
          <div className="flex items-center gap-3">
            {generatedAt && (
              <span className="text-sm text-gray-400">
                {new Date(generatedAt).toLocaleString("ja-JP")}
              </span>
            )}
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                showSettings
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              設定
            </button>
          </div>
        </div>
        {showSettings && (
          <SettingsPanel keywords={settings.customLeaveKeywords} onChange={handleKeywordsChange} />
        )}
        <SummaryCards summary={summary} />
        <ChartPanel summary={summary} />
        <DailyTable rows={summary.dailyRows} />
      </div>
    </div>
  );
}
