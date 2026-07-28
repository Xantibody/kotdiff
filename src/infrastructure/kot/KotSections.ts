// KOT ページの節（月別データ・日別データ）の表示切り替え。
// 表をたたんだときは拡張の UI が同じ情報を持つので、KOT 側の集計表と見出しも一緒に隠す。

const SUBTITLE_SELECTOR = "h4.htBlock-box_subTitle";
const MONTHLY_TITLE = "月別データ";
const DAILY_TITLE = "日別データ";

// KOT 自身がインライン display を設定している要素があるため、元の値を覚えてから隠す
export function setElementHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.dataset["kotdiffPrevDisplay"] ??= element.style.display;
    element.style.display = "none";
    return;
  }
  const previous = element.dataset["kotdiffPrevDisplay"];
  if (previous !== undefined) {
    element.style.display = previous;
    delete element.dataset["kotdiffPrevDisplay"];
  }
}

function subtitles(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(SUBTITLE_SELECTOR)];
}

// 「月別データ」節（時間集計・平日/休日の内訳・残業時間詳細）と「日別データ」の見出しを
// まとめて隠す。表そのものは呼び出し側が持つ table を隠す（節の中には注入した UI も
// 入っているため、節ごと隠すと拡張の表示まで消えてしまう）
export function setKotSectionsHidden(
  table: HTMLTableElement,
  hidden: boolean,
  root: ParentNode = document,
): void {
  for (const subtitle of subtitles(root)) {
    const title = subtitle.textContent?.trim() ?? "";
    if (title !== MONTHLY_TITLE && title !== DAILY_TITLE) {
      continue;
    }
    setElementHidden(subtitle, hidden);
    if (title !== MONTHLY_TITLE) {
      continue;
    }
    let sibling = subtitle.nextElementSibling;
    while (sibling && !sibling.matches(SUBTITLE_SELECTOR)) {
      if (sibling instanceof HTMLElement && !sibling.contains(table)) {
        setElementHidden(sibling, hidden);
      }
      sibling = sibling.nextElementSibling;
    }
  }
}
