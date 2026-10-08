import type { DashboardData } from "../types";
import { buildStatusLines } from "../application/BannerInfo";
import { buildPopupBannerData } from "../application/PopupInfo";
import { renderBannerLine } from "../infrastructure/ui/BannerRenderer";

export interface PopupActions {
  readonly openDashboard: () => void;
  readonly openKot: () => void;
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createParagraph(text: string, className: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

export function renderPopup(
  root: HTMLElement,
  data: DashboardData | null,
  now: Date,
  actions: PopupActions,
): void {
  const buttons = document.createElement("div");
  buttons.className = "buttons";

  if (data === null) {
    root.append(createParagraph("KOT の勤怠画面を開くとここに時間貯金が表示されます", "message"));
  } else {
    const banner = document.createElement("div");
    banner.className = "banner";
    for (const line of buildStatusLines(buildPopupBannerData(data, now))) {
      renderBannerLine(line, banner);
    }
    // 値は KOT 画面を開いたときにしか更新されないため、いつのデータかを示す
    const generatedAt = new Date(data.generatedAt).toLocaleString("ja-JP");
    root.append(banner, createParagraph(`最終取得 ${generatedAt}`, "generated-at"));
    buttons.append(createButton("ダッシュボード", actions.openDashboard));
  }

  buttons.append(createButton("KOT を開く", actions.openKot));
  root.append(buttons);
}
