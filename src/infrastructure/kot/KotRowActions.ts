// KOT の各行にある申請メニュー（打刻編集 / スケジュール申請 / 時間外勤務申請）を
// 表の外から呼べるようにする。
//
// KOT の作りは「行の <select> で選ぶと、同じセルの隠しフォームにあるボタンを押す」。
// option の value が "#<button id>" なので、その id のボタンを click すれば KOT 側の
// ハンドラ (onclick 属性) がそのまま走る。表を display:none にしていても動く。

export interface RowAction {
  readonly label: string;
  readonly targetId: string;
}

const ACTION_CELL_SELECTOR = "td.htBlock-adjastableTableF_actionRow";

// 「02/02（月）」→「02/02」。カレンダー側のキーと合わせる
export function toDateKey(dateText: string): string | null {
  const match = /(\d{1,2})\/(\d{1,2})/.exec(dateText);
  if (!match) {
    return null;
  }
  return `${match[1]?.padStart(2, "0")}/${match[2]?.padStart(2, "0")}`;
}

function actionsOf(row: Element): RowAction[] {
  const cell = row.querySelector(ACTION_CELL_SELECTOR) ?? row.querySelector("td");
  const actions: RowAction[] = [];
  for (const option of cell?.querySelectorAll("select > option") ?? []) {
    const value = option.getAttribute("value") ?? "";
    const label = option.textContent?.trim() ?? "";
    if (!value.startsWith("#") || label === "") {
      continue;
    }
    actions.push({ label, targetId: value.slice(1) });
  }
  return actions;
}

export function collectRowActions(
  tbody: HTMLTableSectionElement,
): ReadonlyMap<string, readonly RowAction[]> {
  const map = new Map<string, readonly RowAction[]>();
  for (const row of tbody.querySelectorAll("tr")) {
    const dateCell = row.querySelector('td[data-ht-sort-index="WORK_DAY"]');
    const key = toDateKey(dateCell?.textContent ?? "");
    if (key === null) {
      continue;
    }
    const actions = actionsOf(row);
    if (actions.length > 0) {
      map.set(key, actions);
    }
  }
  return map;
}

// 隠しフォームのボタンを押す。KOT の onclick 属性がそのまま走る
export function triggerRowAction(targetId: string, root: ParentNode = document): boolean {
  // id は KOT が生成した文字列なので、セレクタに埋める前にエスケープする
  const button = root.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`);
  if (!button) {
    return false;
  }
  button.click();
  return true;
}
