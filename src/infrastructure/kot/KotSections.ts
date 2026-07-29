// KOT ページの節（月別データ・日別データ）の表示切り替え。
// 表をたたんだときは拡張の UI が同じ情報を持つので、KOT 側の集計表と見出しも一緒に隠す。

const SUBTITLE_SELECTOR = "h4.htBlock-box_subTitle";
const MONTHLY_TITLE = "月別データ";
const DAILY_TITLE = "日別データ";
const TOOLBAR_SELECTOR = ".htBlock-toolbar";
const HIGHLIGHT_COLOR = "#00695c";

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

function findSubtitle(title: string, root: ParentNode): HTMLElement | null {
  return subtitles(root).find((el) => el.textContent?.trim() === title) ?? null;
}

// 「月別データ」節（時間集計・平日/休日の内訳・残業時間詳細・所定時間詳細）。
// 見出しから次の見出しの手前までをまとめて扱う。表を含む要素だけは触らない
// （節ごと隠すと同じ中にいる注入 UI まで消えてしまうため）
export function setMonthlySummaryHidden(
  table: HTMLTableElement,
  hidden: boolean,
  root: ParentNode = document,
): void {
  const subtitle = findSubtitle(MONTHLY_TITLE, root);
  if (!subtitle) {
    return;
  }
  setElementHidden(subtitle, hidden);
  let sibling = subtitle.nextElementSibling;
  while (sibling && !sibling.matches(SUBTITLE_SELECTOR)) {
    if (sibling instanceof HTMLElement && !sibling.contains(table)) {
      setElementHidden(sibling, hidden);
    }
    sibling = sibling.nextElementSibling;
  }
}

// 「日別データ」の見出し。表そのものは呼び出し側が持つ table を隠す
export function setDailyHeadingHidden(hidden: boolean, root: ParentNode = document): void {
  const subtitle = findSubtitle(DAILY_TITLE, root);
  if (subtitle) {
    setElementHidden(subtitle, hidden);
  }
}

// 期間の見出し（2026/02/01(日) 〜 2026/02/28(土) と月の切り替え）。
// 表示メニューを画面上部にも置くための足場
export function findDateHeading(root: ParentNode = document): HTMLElement | null {
  for (const heading of root.querySelectorAll<HTMLElement>("h2")) {
    if (/\d{4}\/\d{1,2}\/\d{1,2}/.test(heading.textContent ?? "")) {
      return heading;
    }
  }
  return null;
}

// 日付でその行を探す。カレンダーから表の該当行へ飛ぶために使う
export function findRowByDate(
  table: HTMLTableElement,
  dateKey: string,
): HTMLTableRowElement | null {
  for (const row of table.querySelectorAll<HTMLTableRowElement>("tbody > tr")) {
    const text = row.querySelector('td[data-ht-sort-index="WORK_DAY"]')?.textContent ?? "";
    const match = /(\d{1,2})\/(\d{1,2})/.exec(text);
    if (match && `${match[1]?.padStart(2, "0")}/${match[2]?.padStart(2, "0")}` === dateKey) {
      return row;
    }
  }
  return null;
}

// 該当行までスクロールして 1 秒だけ縁取る。KOT の背景色は変えない約束なので outline を使う
export function revealRow(row: HTMLTableRowElement, highlightMs = 1000): void {
  // scrollIntoView は親要素まで巻き込むため window 側で位置を決める
  window.scrollTo({
    top: row.getBoundingClientRect().top + window.scrollY - 120,
    behavior: "smooth",
  });
  row.style.outline = `2px solid ${HIGHLIGHT_COLOR}`;
  row.style.outlineOffset = "-2px";
  setTimeout(() => {
    row.style.outline = "";
    row.style.outlineOffset = "";
  }, highlightMs);
}

// スケジュール申請・勤怠確認状況・タイムカード・EXCEL 出力が並ぶツールバー
export function setToolbarHidden(hidden: boolean, root: ParentNode = document): void {
  for (const toolbar of root.querySelectorAll<HTMLElement>(TOOLBAR_SELECTOR)) {
    setElementHidden(toolbar, hidden);
  }
}
