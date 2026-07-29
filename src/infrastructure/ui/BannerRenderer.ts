import type { BannerLine } from "../../application/BannerInfo";
import { KOTDIFF_MARKER_CLASS } from "./styles";

export function createBannerElement(): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add(KOTDIFF_MARKER_CLASS);
  return div;
}

export function renderBannerLine(line: BannerLine, container: HTMLElement): void {
  const div = document.createElement("div");
  for (const seg of line) {
    if (seg.bold === true || seg.color !== undefined) {
      const span = document.createElement("span");
      span.textContent = seg.text;
      if (seg.bold === true) {
        span.style.fontWeight = "bold";
      }
      if (seg.color !== undefined) {
        span.style.color = seg.color;
      }
      div.append(span);
    } else {
      div.append(document.createTextNode(seg.text));
    }
  }
  container.append(div);
}
