import { parseWorkTime } from "../../domain/value-objects/TimeRecord";

const STATUTORY_OVERTIME_HEADER = "基準外労働時間";

// フレックスタイム集計 [残業時間詳細] の「基準外労働時間」（当月精算する残業時間）を読む。
// フレックスでは日別の残業列が常に空で、日次の 実績−所定 の合計は深夜所定分と一致して
// しまうため、法的に意味のある残業はこの月次集計からしか得られない (issue #44)。
// フレックス以外のアカウントにはこのテーブルがないので null を返す
export function scrapeStatutoryOvertime(container: Document | Element): number | null {
  for (const table of container.querySelectorAll("table")) {
    const ths = [...table.querySelectorAll("thead th")];
    const idx = ths.findIndex((th) => th.textContent?.includes(STATUTORY_OVERTIME_HEADER));
    if (idx < 0) continue;
    const cell = table.querySelector("tbody tr")?.querySelectorAll(":scope > td")[idx];
    if (!cell) return null;
    return parseWorkTime(cell.textContent?.trim() ?? "");
  }
  return null;
}
