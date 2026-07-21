import { useState } from "react";
import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SettingsPanelProps {
  keywords: readonly string[];
  onChange: (keywords: string[]) => void;
}

export function SettingsPanel({ keywords, onChange }: SettingsPanelProps): ReactElement {
  const [input, setInput] = useState("");

  const add = () => {
    const keyword = input.trim();
    if (keyword === "" || keywords.includes(keyword)) {
      return;
    }
    onChange([...keywords, keyword]);
    setInput("");
  };

  const remove = (keyword: string) => {
    onChange(keywords.filter((k) => k !== keyword));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700">カスタム休暇キーワード</p>
          <p className="text-xs text-gray-400 mt-1">
            スケジュール列にこの文字列を含む日（勤務実績なし）を休暇として扱います。標準の休暇名（有休・代休・休暇
            など）は設定不要です。変更は次回 KING OF TIME ページ読み込み時に反映されます。
          </p>
        </div>
        {keywords.length > 0 && (
          <ul className="space-y-2">
            {keywords.map((keyword) => (
              <li
                key={keyword}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm text-gray-700">{keyword}</span>
                <button
                  type="button"
                  onClick={() => remove(keyword)}
                  className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                add();
              }
            }}
            placeholder="例: リフレッシュ"
            className="flex-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            type="button"
            onClick={add}
            className="px-3 py-1 text-xs rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            追加
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
