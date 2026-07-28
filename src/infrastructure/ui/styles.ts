import { COLOR } from "./theme";

export const EXT_COLOR = "#e8eaf6";
export const WARNING_COLOR = "#ffcccc";
export const KOTDIFF_MARKER_CLASS = "kotdiff-injected";
export const KOTDIFF_STYLE_ID = "kotdiff-styles";
export const DIFF_COLUMN_WIDTH = 70;

// v2 UI で追加した要素の識別クラス
export const KOTDIFF_CARD_CLASS = "kotdiff-card";
export const KOTDIFF_SAVINGS_CLASS = "kotdiff-savings";
export const KOTDIFF_CALENDAR_CLASS = "kotdiff-calendar";
export const KOTDIFF_STRIPE_CLASS = "kotdiff-stripe";

export type StyleMode = "legacy" | "v2";

// KOT 側の既存 sticky ヘッダ (top:84px) の上にたたんだカードを重ねる
const COLLAPSED_CARD_TOP = 54;

const SHARED_CSS = `
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

const LEGACY_CSS = `
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
`;

const V2_CSS = `
    div.${KOTDIFF_CARD_CLASS} {
      position: sticky;
      top: ${COLLAPSED_CARD_TOP}px;
      z-index: 11;
      transition: height 120ms ease-out;
    }
    div.${KOTDIFF_CARD_CLASS}.${KOTDIFF_CARD_CLASS}--open {
      position: static;
    }
    th.${KOTDIFF_SAVINGS_CLASS} {
      background: ${COLOR.accentPale};
      color: ${COLOR.accentDark};
      font-weight: 700;
      padding: 7px 9px;
      border-bottom: 2px solid ${COLOR.accent};
      text-align: right;
      min-width: 104px;
    }
    td.${KOTDIFF_SAVINGS_CLASS} {
      background: ${COLOR.savingsCell};
      padding: 3px 9px;
      text-align: right;
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      div.${KOTDIFF_CARD_CLASS} {
        transition: none;
      }
    }
`;

export function injectStyles(mode: StyleMode = "legacy"): void {
  // マーカークラスを付けると注入済み判定がテーブル再描画後も true のままになる
  // (issue #20) ため、style 要素の重複ガードは id で行う
  const existing = document.querySelector(`#${KOTDIFF_STYLE_ID}`);
  if (existing) {
    // 設定切り替え直後の再注入でモードが変わることがあるので中身は貼り直す
    existing.textContent = SHARED_CSS + (mode === "v2" ? V2_CSS : LEGACY_CSS);
    return;
  }
  const style = document.createElement("style");
  style.id = KOTDIFF_STYLE_ID;
  style.textContent = SHARED_CSS + (mode === "v2" ? V2_CSS : LEGACY_CSS);
  document.head.append(style);
}
