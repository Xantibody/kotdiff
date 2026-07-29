import { el } from "./dom";
import { COLOR } from "./theme";

// 小さなドロップダウン。開くのはいつもひとつだけで、外側クリックと Escape で閉じる。
// 申請メニューと表示設定で同じ振る舞いが要るためここに集約する。

let closeOpenDropdown: (() => void) | null = null;

export interface Dropdown {
  readonly element: HTMLElement;
  readonly panel: HTMLElement;
  close(): void;
}

export function createDropdown(trigger: HTMLElement, panelStyle = ""): Dropdown {
  const wrapper = el("div", "position:relative; display:flex; align-items:center");
  const panel = el(
    "div",
    `position:absolute; right:0; top:calc(100% + 4px); z-index:20; display:none; flex-direction:column; min-width:132px; padding:4px 0; background-color:#fff; border:1px solid ${COLOR.cardBorder}; border-radius:4px; ${panelStyle}`,
  );

  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");

  const close = (): void => {
    panel.style.display = "none";
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onKeyDown);
    closeOpenDropdown = null;
  };

  function onDocumentClick(event: MouseEvent): void {
    if (!wrapper.contains(event.target as Node)) {
      close();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      close();
    }
  }

  const open = (): void => {
    closeOpenDropdown?.();
    panel.style.display = "flex";
    trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    closeOpenDropdown = close;
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.style.display === "none") {
      open();
    } else {
      close();
    }
  });

  wrapper.append(trigger, panel);
  return { element: wrapper, panel, close };
}

export function createDropdownItem(label: string, onSelect: () => void): HTMLButtonElement {
  const item = el(
    "button",
    `border:none; background:none; text-align:left; padding:5px 12px; cursor:pointer; font-size:11px; color:${COLOR.textPrimary}; white-space:nowrap`,
    label,
  );
  item.type = "button";
  item.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect();
  });
  return item;
}
