import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { buildDashboardSummary } from "../domain/aggregates/WorkMonth";
import type { DashboardSummary } from "../domain/aggregates/WorkMonth";
import {
  chromeStorageAdapter,
  onDashboardDataChanged,
} from "../infrastructure/chrome/adapters/ChromeStorageAdapter";
import {
  chromePreferencesAdapter,
  onUiPreferencesChanged,
} from "../infrastructure/chrome/adapters/ChromePreferencesAdapter";
import { DEFAULT_UI_PREFERENCES } from "../preferences";
import type { UiPreferences } from "../preferences";
import { SummaryCards } from "./components/SummaryCards";
import { ChartPanel } from "./components/ChartPanel";
import { DailyTable } from "./components/DailyTable";
import { DashboardV2 } from "./components/v2/DashboardV2";

export function App(): ReactElement {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [preferences, setPreferences] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const data = await chromeStorageAdapter.getDashboardData();
      if (data) {
        setSummary(buildDashboardSummary(data));
        setGeneratedAt(data.generatedAt);
      }
      setPreferences(await chromePreferencesAdapter.getUiPreferences());
    };
    void load();
    // KOT ページ側の再注入で保存し直されたデータを開きっぱなしでも反映する (issue #29)
    const unsubscribeData = onDashboardDataChanged((data) => {
      setSummary(buildDashboardSummary(data));
      setGeneratedAt(data.generatedAt);
    });
    const unsubscribePrefs = onUiPreferencesChanged(setPreferences);
    return () => {
      unsubscribeData();
      unsubscribePrefs();
    };
  }, []);

  const update = (next: UiPreferences): void => {
    setPreferences(next);
    chromePreferencesAdapter.setUiPreferences(next).catch(console.error);
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

  if (preferences.newUi) {
    return (
      <>
        <NewUiToggle preferences={preferences} onChange={update} />
        <DashboardV2
          summary={summary}
          generatedAt={generatedAt}
          calendarOpen={preferences.calendarOpen}
          onCalendarToggle={(open) => {
            update({ ...preferences, calendarOpen: open });
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <NewUiToggle preferences={preferences} onChange={update} />
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

// 新 UI はオプトイン。KOT ページ側の注入 UI も同じフラグで切り替わる
function NewUiToggle({
  preferences,
  onChange,
}: {
  preferences: UiPreferences;
  onChange: (next: UiPreferences) => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={() => {
        onChange({ ...preferences, newUi: !preferences.newUi });
      }}
      className="fixed right-4 bottom-4 z-50 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs text-gray-600 shadow-sm"
    >
      {preferences.newUi ? "新 UI（β）をオフにする" : "新 UI（β）を試す"}
    </button>
  );
}
