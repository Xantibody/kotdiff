import { el } from "./dom";
import { createDropdown } from "./dropdown";
import { COLOR, KOT_FONT } from "./theme";
import type { UiPreferences } from "../../preferences";

// KOT ページのどこを出すかを拡張側から切り替えるメニュー。
// 既定では表もツールバーも隠すので、戻す手段が拡張の中に無いと詰んでしまう。

export type DisplayOptionKey = "showTable" | "showMonthlySummary" | "showToolbar";

interface DisplayOption {
  readonly key: DisplayOptionKey;
  readonly label: string;
}

const OPTIONS: readonly DisplayOption[] = [
  { key: "showTable", label: "KOT の表" },
  { key: "showMonthlySummary", label: "月別データ（時間集計）" },
  { key: "showToolbar", label: "ツールバー（申請・出力）" },
];

export function createDisplayMenu(
  preferences: UiPreferences,
  onChange: (key: DisplayOptionKey, show: boolean) => void,
): HTMLElement {
  const trigger = el(
    "button",
    `padding: 4px 12px; border: 1px solid ${COLOR.cardBorder}; border-radius: 3px; background: #fff; color: ${COLOR.accent}; cursor: pointer; font-size: 12px; font-family: ${KOT_FONT};`,
    "表示",
  );
  trigger.type = "button";

  const dropdown = createDropdown(trigger, "min-width:200px; text-align:left");
  dropdown.panel.append(
    el(
      "span",
      `padding:4px 12px 6px; font-size:10px; color:${COLOR.textMuted}`,
      "KOT ページで表示するもの",
    ),
  );

  for (const option of OPTIONS) {
    const row = el(
      "label",
      `display:flex; align-items:center; gap:8px; padding:5px 12px; cursor:pointer; font-size:11px; color:${COLOR.textPrimary}; white-space:nowrap`,
    );
    const checkbox = el("input", "margin:0; cursor:pointer");
    checkbox.type = "checkbox";
    checkbox.checked = preferences[option.key];
    checkbox.addEventListener("change", () => {
      onChange(option.key, checkbox.checked);
    });
    // ラベルのクリックでメニューが閉じないようにする（続けて切り替えられるほうが早い）
    row.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    row.append(checkbox, el("span", "", option.label));
    dropdown.panel.append(row);
  }

  return dropdown.element;
}
