import { el } from "./dom";
import { COLOR, KOT_FONT } from "./theme";
import { KOTDIFF_ACTIONS_CLASS, KOTDIFF_MARKER_CLASS } from "./styles";

// 表とカレンダーの上に置く操作行。表の折りたたみとダッシュボードボタンが並ぶ。

const BUTTON_STYLE = `padding: 4px 12px; border: 1px solid ${COLOR.cardBorder}; border-radius: 3px; background: #fff; color: ${COLOR.accent}; cursor: pointer; font-size: 12px; font-family: ${KOT_FONT};`;

export function createActionsRow(): HTMLDivElement {
  const row = el(
    "div",
    "margin-bottom: 8px; display: flex; align-items: center; justify-content: flex-end; gap: 8px;",
  );
  row.classList.add(KOTDIFF_MARKER_CLASS, KOTDIFF_ACTIONS_CLASS);
  return row;
}

export function createActionButton(text: string): HTMLButtonElement {
  const button = el("button", BUTTON_STYLE, text);
  button.type = "button";
  return button;
}

// KOT の表は 28 列あってモニターに収まらない。たたんでカレンダーだけを見る
// 使い方ができるようにする
export function createTableToggleButton(
  collapsed: boolean,
  onToggle: (collapsed: boolean) => void,
): HTMLButtonElement {
  const button = createActionButton("");
  let current = collapsed;

  const label = (): void => {
    button.textContent = current ? "表を表示する" : "表をたたむ";
  };

  button.addEventListener("click", () => {
    current = !current;
    label();
    onToggle(current);
  });

  label();
  return button;
}
