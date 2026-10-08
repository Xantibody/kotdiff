import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderPopup } from "./PopupRenderer";
import type { DashboardData } from "../types";

// 2026-07-02 15:00 JST
const NOW = new Date("2026-07-02T06:00:00.000Z");

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll("button")].find((b) => b.textContent === label);
}

describe("renderPopup", () => {
  let root: HTMLElement;
  const actions = { openDashboard: vi.fn(), openKot: vi.fn() };

  beforeEach(() => {
    root = document.createElement("div");
    vi.clearAllMocks();
  });

  test("保存データがなければ案内と KOT を開くボタンだけを出す", () => {
    renderPopup(root, null, NOW, actions);

    expect(root.textContent).toContain("KOT の勤怠画面を開くと");
    expect(findButton(root, "ダッシュボード")).toBeUndefined();
    findButton(root, "KOT を開く")?.click();
    expect(actions.openKot).toHaveBeenCalledTimes(1);
  });

  test("保存データがあれば時間貯金と最終取得時刻を出す", () => {
    const data: DashboardData = {
      rows: [
        {
          date: "07/01（水）",
          dayType: "平日",
          isWeekend: false,
          actual: 9,
          fixedWork: 8,
          overtime: null,
          breakTime: 1,
          startTime: "9:00",
          endTime: "19:00",
          breakStarts: [],
          breakEnds: [],
          schedule: null,
          working: true,
          nightOvertime: null,
        },
      ],
      leaveBalances: [],
      generatedAt: "2026-07-02T01:05:00.000Z",
    };

    renderPopup(root, data, NOW, actions);

    expect(root.textContent).toContain("現在の時間貯金: +1:00");
    // 一目で確認する用途のため、月末までの必要時間はダッシュボードに任せる
    expect(root.textContent).not.toContain("残り");
    expect(root.textContent).toContain("最終取得");
    findButton(root, "ダッシュボード")?.click();
    expect(actions.openDashboard).toHaveBeenCalledTimes(1);
  });
});
