import type { StoragePort } from "../infrastructure/chrome/ports/StoragePort";
import type { MessagingPort } from "../infrastructure/chrome/ports/MessagingPort";
import { accumulateRows, buildDashboardSummary } from "../domain/aggregates/WorkMonth";
import type { AccumulateResult, DailyRowSummary, RowInput } from "../domain/aggregates/WorkMonth";
import { buildBannerLines } from "./BannerInfo";
import type { BannerData } from "./BannerInfo";
import {
  getCellValue,
  getCellText,
  isWorkingDay,
  isErrorWorkRow,
  detectSameDayInProgressRow,
  detectCrossMidnightInProgressRow,
  findLastClockInRow,
  getCell,
  addColumnTooltips,
} from "../infrastructure/kot/KotDomHelpers";
import { calcEstimatedWorkTime, calcClockOutTarget } from "../domain/value-objects/InProgressWork";
import type { EstimatedWorkTime, InProgressRowData } from "../domain/value-objects/InProgressWork";
import { nowAsDecimalHours } from "../domain/value-objects/TimeRecord";
import {
  formatClockOutTime,
  formatTimeOfDay,
  isDiffNegative,
} from "../domain/value-objects/WorkDuration";
import { DEFAULT_EXPECTED_HOURS } from "../domain/constants";
import { injectStyles, KOTDIFF_MARKER_CLASS } from "../infrastructure/ui/styles";
import {
  createDiffHeader,
  createDiffCell,
  createInProgressDiffCell,
  createEmptyDiffCell,
  highlightBreakCellIfInsufficient,
  updateEstimatedWorkCell,
  createSavingsHeader,
  createSavingsCell,
  createEmptySavingsCell,
  createMissingSavingsCell,
  updateSavingsCell,
  applyRowStripe,
  insertSavingsCell,
  insertSavingsHeader,
  dateColumnIndex,
  applyStickyColumnOffset,
} from "../infrastructure/ui/DiffColumnRenderer";
import { createBannerElement, renderBannerLine } from "../infrastructure/ui/BannerRenderer";
import { createSummaryCard } from "../infrastructure/ui/SummaryCardRenderer";
import type { SummaryCardHandle } from "../infrastructure/ui/SummaryCardRenderer";
import { createMonthCalendar } from "../infrastructure/ui/MonthCalendarRenderer";
import { createActionsRow, createTableToggleButton } from "../infrastructure/ui/ActionsRowRenderer";
import { buildSummaryModel } from "./SummaryModel";
import type { SummaryInput, SummaryModel, TodayInput } from "./SummaryModel";
import { DEFAULT_UI_PREFERENCES } from "../preferences";
import type { UiPreferences } from "../preferences";
import {
  createPeriodicUpdateController,
  V2_UPDATE_INTERVAL_MS,
} from "../infrastructure/ui/PeriodicUpdateController";
import type { TimerPort } from "../infrastructure/ui/ports/TimerPort";
import { browserTimerAdapter } from "../infrastructure/ui/BrowserTimerAdapter";
import type { DomReadyPort } from "../infrastructure/ui/ports/DomReadyPort";
import { browserDomAdapter } from "../infrastructure/ui/BrowserDomAdapter";
import { injectDashboardButton } from "../infrastructure/ui/DashboardButtonRenderer";
import { parseKotTable } from "../infrastructure/kot/KotTableParser";
import { rawRowsToWorkDays } from "../infrastructure/kot/WorkDayMapper";
import { scrapeLeaveBalances } from "../infrastructure/kot/LeaveBalanceScraper";
import { scrapeStatutoryOvertime } from "../infrastructure/kot/StatutoryOvertimeScraper";
import { setElementHidden, setKotSectionsHidden } from "../infrastructure/kot/KotSections";
import { toStorageData } from "./DashboardMapper";

export interface ContentScriptServiceInstance {
  run(): void;
}

const TABLE_SELECTOR = ".htBlock-adjastableTableF_inner > table";

interface InProgressCellResult {
  readonly td: HTMLTableCellElement;
  readonly inProgress: NonNullable<RowInput["inProgress"]>;
  readonly clockOutTarget: NonNullable<BannerData["clockOutTarget"]>;
  readonly today: TodayInput;
}

export interface ContentScriptOptions {
  // 注入前に読み込んだ UI 設定。既定は現行 UI (newUi: false)
  readonly preferences?: UiPreferences;
  readonly savePreferences?: (prefs: UiPreferences) => void;
}

// KOT の日付表記に合わせた「02/20（金）」。勤務中の行が無い日でもカードに日付を出すため
function formatJstDateLabel(now: Date): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const dayOfWeek = "日月火水木金土"[jst.getUTCDay()] ?? "";
  return `${month}/${day}（${dayOfWeek}）`;
}

// 進行中の推定値から注入カード用の「今日」を組み立てる。
// 退勤目安は現在時刻と同じ正規化フレーム（日跨ぎは +24）に揃える
function toTodayInput(
  estimated: EstimatedWorkTime,
  remainingHours: number,
  targetLabel: string,
): TodayInput {
  return {
    status: estimated.status,
    startTime: estimated.startTime,
    now: estimated.nowNormalized,
    netWorkTime: estimated.workTime,
    breaks: estimated.breaks,
    remainingHours,
    targetLabel,
    targetTime: estimated.nowNormalized + remainingHours,
  };
}

// 月次集計からバナー表示用の値を組み立てる
function buildBannerData(
  acc: AccumulateResult,
  statutoryOvertime: number | null,
  clockOutTarget: Exclude<BannerData["clockOutTarget"], undefined>,
): BannerData {
  const remainingRequired = acc.remainingDays * DEFAULT_EXPECTED_HOURS - acc.cumulativeDiff;
  const avgPerDay = acc.remainingDays > 0 ? remainingRequired / acc.remainingDays : 0;
  return {
    remainingDays: acc.remainingDays,
    remainingRequired,
    avgPerDay,
    cumulativeDiff: acc.cumulativeDiff,
    // フレックスでは日次の 実績−所定 は残業ではないため、月次集計の
    // 基準外労働時間があれば残業警告もそちらを使う (issue #44)
    currentOvertime: statutoryOvertime ?? acc.overtimeDiff,
    clockOutTarget,
  };
}

// 勤務中の行に対する推定値 (差分セル・退勤目安) を組み立てる
function buildInProgressCell(
  row: Element,
  inProgressData: InProgressRowData,
  cumulativeDiffBase: number,
  v2: boolean,
): InProgressCellResult {
  const now = nowAsDecimalHours();
  const estimated = calcEstimatedWorkTime(inProgressData, now);
  const target = calcClockOutTarget(
    cumulativeDiffBase,
    estimated.workTime,
    now,
    DEFAULT_EXPECTED_HOURS,
  );

  const workCell = getCell(row, "ALL_WORK_MINUTE");
  if (workCell) {
    updateEstimatedWorkCell(workCell, estimated.workTime);
  }

  const estimatedCumulativeDiff = cumulativeDiffBase + estimated.workTime - DEFAULT_EXPECTED_HOURS;
  // 日を跨ぐ目安は「7/3 4:40」のように翌日の日付付きで表示する
  const targetLabel = formatClockOutTime(target.targetTime, new Date());
  return {
    td: v2
      ? createSavingsCell(
          estimatedCumulativeDiff,
          estimated.workTime - DEFAULT_EXPECTED_HOURS,
          true,
        )
      : createInProgressDiffCell(estimatedCumulativeDiff),
    inProgress: { estimatedWorkTime: estimated.workTime, status: estimated.status },
    clockOutTarget: { remainingHours: target.remainingHours, targetLabel },
    today: toTodayInput(estimated, target.remainingHours, targetLabel),
  };
}

interface RenderedRows {
  readonly rowInputs: RowInput[];
  // 勤務済み日の実績（予測に使う）
  readonly actuals: number[];
  readonly alerts: string[];
  readonly ipRow: Element | null;
  readonly ipDiffCell: HTMLTableCellElement | null;
  readonly ipCumulativeDiffBase: number;
  readonly clockOutTarget: Exclude<BannerData["clockOutTarget"], undefined>;
  readonly todayInput: TodayInput | null;
  readonly todayDateLabel: string;
}

function emptyCell(v2: boolean): HTMLTableCellElement {
  return v2 ? createEmptySavingsCell() : createEmptyDiffCell();
}

// 表の各行に差分セルを差し込みながら、集計とカードに必要な値を拾い集める
function renderRows(
  tbody: HTMLTableSectionElement,
  v2: boolean,
  placeCell: (row: Element, cell: HTMLTableCellElement) => void,
): RenderedRows {
  const rowInputs: RowInput[] = [];
  const actuals: number[] = [];
  const alerts: string[] = [];
  let displayCumulativeDiff = 0;
  let ipRow: Element | null = null;
  let ipDiffCell: HTMLTableCellElement | null = null;
  let ipCumulativeDiffBase = 0;
  let clockOutTarget: Exclude<BannerData["clockOutTarget"], undefined> = null;
  let todayInput: TodayInput | null = null;
  let todayDateLabel = "";

  const rows = tbody.querySelectorAll("tr");
  // 日跨ぎ勤務中とみなすのは最後に出勤打刻がある行のみ。後続の行（当日行）に
  // 出勤打刻があれば前日行は退勤打刻忘れエラーであり、勤務継続中ではない。
  const lastClockInRow = findLastClockInRow(rows);

  for (const row of rows) {
    const fixedWork = getCellValue(row, "FIXED_WORK_MINUTE");
    const actual = getCellValue(row, "ALL_WORK_MINUTE");
    // 日跨ぎ勤務中の行はエラー勤務扱いで isWorkingDay が false になるため別途検出する
    const crossMidnight =
      row === lastClockInRow ? detectCrossMidnightInProgressRow(row, new Date()) : null;
    const working = isWorkingDay(row) || crossMidnight !== null;

    let inProgress: RowInput["inProgress"] = null;
    let td: HTMLTableCellElement;

    if (actual !== null && working) {
      const dayDiff = actual - DEFAULT_EXPECTED_HOURS;
      displayCumulativeDiff += dayDiff;
      actuals.push(actual);
      td = v2
        ? createSavingsCell(displayCumulativeDiff, dayDiff)
        : createDiffCell(displayCumulativeDiff);
      const breakTime = getCellValue(row, "REST_MINUTE");
      if (breakTime !== null) {
        highlightBreakCellIfInsufficient(row, actual, breakTime);
      }
      if (v2) {
        applyRowStripe(row, isDiffNegative(dayDiff) ? "under" : "over");
      }
    } else if (working) {
      const inProgressData = crossMidnight ?? detectSameDayInProgressRow(row, new Date());
      if (inProgressData) {
        const result = buildInProgressCell(row, inProgressData, displayCumulativeDiff, v2);
        ipRow = row;
        ipCumulativeDiffBase = displayCumulativeDiff;
        ipDiffCell = result.td;
        todayInput = result.today;
        todayDateLabel = getCellText(row, "WORK_DAY");
        ({ inProgress, clockOutTarget, td } = result);
      } else {
        td = emptyCell(v2);
      }
    } else if (v2 && isErrorWorkRow(row) && row !== ipRow) {
      // KOT がエラー勤務にした行 = 打刻漏れ。累積が確定しないので値を出さず注意喚起に回す
      td = createMissingSavingsCell();
      applyRowStripe(row, "missing");
      alerts.push(`${getCellText(row, "WORK_DAY")} の打刻が未入力`);
    } else {
      td = emptyCell(v2);
    }

    rowInputs.push({ actual, fixedWork, working, inProgress });
    placeCell(row, td);
  }

  return {
    rowInputs,
    actuals,
    alerts,
    ipRow,
    ipDiffCell,
    ipCumulativeDiffBase,
    clockOutTarget,
    todayInput,
    todayDateLabel,
  };
}

interface V2UiOptions {
  readonly table: HTMLTableElement;
  readonly model: SummaryModel;
  readonly rows: readonly DailyRowSummary[];
  readonly preferences: UiPreferences;
  readonly save: (next: UiPreferences) => void;
}

// v2 の表の上に積む要素をまとめて作る: カード → カレンダー → 操作行 → 表
function injectV2Ui(options: V2UiOptions): SummaryCardHandle {
  const { table, model, rows } = options;
  let prefs = options.preferences;
  const update = (patch: Partial<UiPreferences>): void => {
    prefs = { ...prefs, ...patch };
    options.save(prefs);
  };

  const card = createSummaryCard(model, prefs.bannerOpen, (open) => {
    update({ bannerOpen: open });
  });
  table.parentElement?.insertBefore(card.element, table);

  const calendar = createMonthCalendar({
    rows,
    now: new Date(),
    // 表をたたんでいる間はカレンダーが主役なので開いた状態で出す
    open: prefs.calendarOpen || prefs.tableCollapsed,
    savingsLabel: model.month.savingsLabel,
    savingsNegative: model.month.savingsNegative,
    paceLabel: model.outlook.paceLabel,
    onToggle: (open) => {
      update({ calendarOpen: open });
    },
  });
  table.parentElement?.insertBefore(calendar.element, table);

  // 28 列の表はモニターに収まらないので、たたんでカレンダーだけ見られるようにする
  const applyTableVisibility = (): void => {
    setElementHidden(table, prefs.tableCollapsed);
    // KOT の月別データ（時間集計・平日/休日の内訳）も同じ数字をカードが持つので一緒に隠す。
    // 申請は画面上部のボタンで足りるためそちらは触らない
    setKotSectionsHidden(table, prefs.tableCollapsed);
    if (prefs.tableCollapsed) {
      calendar.setOpen(true);
    }
  };

  const actions = createActionsRow();
  actions.append(
    createTableToggleButton(prefs.tableCollapsed, (collapsed) => {
      update({ tableCollapsed: collapsed });
      applyTableVisibility();
    }),
  );
  table.parentElement?.insertBefore(actions, table);
  applyTableVisibility();

  return card;
}

interface PeriodicUpdateTarget {
  readonly row: Element;
  readonly diffCell: HTMLTableCellElement;
  readonly cumulativeDiffBase: number;
  // v2 のときだけカードも一緒に更新する
  readonly card: SummaryCardHandle | null;
  readonly summaryInput: (today: TodayInput | null) => SummaryInput;
}

function startPeriodicUpdate(timer: TimerPort, target: PeriodicUpdateTarget): void {
  const controller = createPeriodicUpdateController(timer);
  const { card, cumulativeDiffBase: base } = target;

  if (!card) {
    controller.start(target.row, target.diffCell, base);
    return;
  }

  controller.start(target.row, target.diffCell, base, {
    intervalMs: V2_UPDATE_INTERVAL_MS,
    updateDiff: (cell, cumulativeDiff) => {
      updateSavingsCell(cell, cumulativeDiff, cumulativeDiff - base);
    },
    onTick: (estimated) => {
      const clockOut = calcClockOutTarget(
        base,
        estimated.workTime,
        nowAsDecimalHours(),
        DEFAULT_EXPECTED_HOURS,
      );
      const today = toTodayInput(
        estimated,
        clockOut.remainingHours,
        formatClockOutTime(clockOut.targetTime, new Date()),
      );
      card.update(buildSummaryModel(target.summaryInput(today)));
    },
  });
}

export function createContentScriptService(
  storage: StoragePort,
  messaging: MessagingPort,
  timer: TimerPort = browserTimerAdapter,
  dom: DomReadyPort = browserDomAdapter,
  options: ContentScriptOptions = {},
): ContentScriptServiceInstance {
  // Guards against concurrent calls to run() before the DOM marker is written
  let injecting = false;
  let preferences = options.preferences ?? DEFAULT_UI_PREFERENCES;

  function isAlreadyInjected(): boolean {
    // テーブル外の残骸(バナー等)で誤判定しないよう、対象テーブル内の
    // 差分ヘッダの有無だけを見る (issue #20)
    return dom.querySelector(`${TABLE_SELECTOR} th.${KOTDIFF_MARKER_CLASS}`) !== null;
  }

  function inject(): void {
    const table = dom.querySelector<HTMLTableElement>(TABLE_SELECTOR);
    if (!table) {
      console.debug("[kotdiff] table not found");
      return;
    }

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) {
      console.debug("[kotdiff] thead/tbody not found");
      return;
    }

    // 再注入時に KOT 再描画で取り残されたバナーが残っていれば除去する (冪等性)
    for (const stale of dom.querySelectorAll(`div.${KOTDIFF_MARKER_CLASS}`)) {
      stale.remove();
    }

    const v2 = preferences.newUi;
    injectStyles(v2 ? "v2" : "legacy");

    // Add diff header
    const headerRow = thead.querySelector("tr");
    const diffHeader = v2 ? createSavingsHeader() : createDiffHeader();
    if (headerRow) {
      if (v2) {
        insertSavingsHeader(headerRow, diffHeader, dateColumnIndex(tbody));
      } else {
        headerRow.append(diffHeader);
      }
    }

    // 列の位置は UI によって違う: 現行は末尾、v2 は日付セルの直後
    const placeCell = (row: Element, cell: HTMLTableCellElement): void => {
      if (v2) {
        insertSavingsCell(row, cell);
      } else {
        row.append(cell);
      }
    };

    const {
      rowInputs,
      actuals,
      alerts,
      ipRow,
      ipDiffCell,
      ipCumulativeDiffBase,
      clockOutTarget,
      todayInput,
      todayDateLabel,
    } = renderRows(tbody, v2, placeCell);

    const acc = accumulateRows(rowInputs);
    const statutoryOvertime = scrapeStatutoryOvertime(document);

    const summaryInput = (today: TodayInput | null): SummaryInput => ({
      totalWorkDays: acc.totalWorkDays,
      workedDays: acc.workedDays,
      remainingDays: acc.remainingDays,
      totalActual: acc.totalActual,
      cumulativeDiff: acc.cumulativeDiff,
      // フレックスでは日次の 実績−所定 は残業ではないため、月次集計の
      // 基準外労働時間があればそちらを使う (issue #44)
      overtime: statutoryOvertime ?? acc.overtimeDiff,
      actuals,
      today,
      dateLabel: todayDateLabel === "" ? formatJstDateLabel(new Date()) : todayDateLabel,
      nowLabel: formatTimeOfDay(nowAsDecimalHours()),
      alerts,
    });

    // ダッシュボードへの保存データは v2 のカレンダーでも使うため先に組み立てる
    const rawRows = parseKotTable(tbody);
    const workDays = rawRowsToWorkDays(rawRows, new Date());
    const leaveBalances = scrapeLeaveBalances(document);
    const dashboardData = toStorageData(
      workDays,
      leaveBalances,
      new Date().toISOString(),
      statutoryOvertime,
    );

    let card: SummaryCardHandle | null = null;
    if (v2) {
      card = injectV2Ui({
        table,
        model: buildSummaryModel(summaryInput(todayInput)),
        rows: buildDashboardSummary(dashboardData).dailyRows,
        preferences,
        save: (next) => {
          preferences = next;
          options.savePreferences?.(next);
        },
      });
    } else {
      const bannerData = buildBannerData(acc, statutoryOvertime, clockOutTarget);
      const banner = createBannerElement();
      for (const line of buildBannerLines(bannerData)) {
        renderBannerLine(line, banner);
      }
      table.parentElement?.insertBefore(banner, table);
    }

    if (v2) {
      applyStickyColumnOffset(table);
    }

    // Tooltips
    addColumnTooltips(table);

    // Periodic update for in-progress row
    if (ipRow && ipDiffCell) {
      startPeriodicUpdate(timer, {
        row: ipRow,
        diffCell: ipDiffCell,
        cumulativeDiffBase: ipCumulativeDiffBase,
        card,
        summaryInput,
      });
    }

    // Auto-save dashboard data on every successful injection
    storage.setDashboardData(dashboardData).catch(console.error);

    // Dashboard button
    injectDashboardButton(table, storage, messaging, v2 ? "v2" : "legacy");

    // KOT がテーブルを再描画すると差分列ごと消えるため、注入したヘッダの
    // 切断を監視して再注入する (issue #20)。observer は一度発火したら
    // 停止するので、run() 側のガードと合わせて無限ループにはならない
    if (diffHeader.isConnected) {
      timer.observeRemoval(diffHeader, () => {
        if (isAlreadyInjected()) {
          return;
        }
        run();
      });
    }
  }

  function run(): void {
    if (injecting || isAlreadyInjected()) {
      console.debug("[kotdiff] already injecting or injected");
      return;
    }
    injecting = true;

    if (dom.querySelector(TABLE_SELECTOR)) {
      inject();
      injecting = false;
      return;
    }

    console.debug("[kotdiff] waiting for table");
    dom.waitForElement(
      TABLE_SELECTOR,
      () => {
        inject();
        injecting = false;
      },
      {
        onTimeout: () => {
          console.debug("[kotdiff] table did not appear, giving up");
          injecting = false;
        },
      },
    );
  }

  return { run };
}
