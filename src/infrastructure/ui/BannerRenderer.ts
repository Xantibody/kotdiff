import type { BannerLine } from "../../application/BannerInfo";
import { KOTDIFF_MARKER_CLASS, KOTDIFF_STYLE_ID, EXT_COLOR, DIFF_COLUMN_WIDTH } from "./styles";

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

export function injectStyles(): void {
  // マーカークラスを付けると注入済み判定がテーブル再描画後も true のままになる
  // (issue #20) ため、style 要素の重複ガードは id で行う
  if (document.querySelector(`#${KOTDIFF_STYLE_ID}`)) {
    return;
  }
  const style = document.createElement("style");
  style.id = KOTDIFF_STYLE_ID;
  style.textContent = `
    th.${KOTDIFF_MARKER_CLASS},
    td.${KOTDIFF_MARKER_CLASS} {
      background: ${EXT_COLOR};
      text-align: right;
      white-space: nowrap;
      min-width: ${DIFF_COLUMN_WIDTH}px;
      width: ${DIFF_COLUMN_WIDTH}px;
    }
    th.kotdiff-center,
    td.kotdiff-center {
      text-align: center;
    }
    div.${KOTDIFF_MARKER_CLASS} {
      padding: 10px 14px;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.8;
      background: ${EXT_COLOR};
      color: #333;
      border-left: 4px solid #7986cb;
    }
    .htBlock-adjastableTableF_fixedHeader {
      display: none !important;
    }
    .htBlock-adjastableTableF_inner > table > thead > tr > th {
      position: sticky;
      top: 84px;
      z-index: 10;
      background-color: #fff;
    }
    td[data-kotdiff-tooltip] {
      position: relative;
    }
    td[data-kotdiff-tooltip]:hover::after {
      content: attr(data-kotdiff-tooltip);
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 100;
      pointer-events: none;
    }
  `;
  document.head.append(style);
}
