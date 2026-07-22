import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import type { DashboardData } from "../types";

const mockDashboardData: DashboardData = {
  generatedAt: "2026-03-18T09:00:00.000Z",
  leaveBalances: [],
  rows: [
    {
      date: "03/01（月）",
      dayType: "平日",
      isWeekend: false,
      actual: 8,
      fixedWork: 8,
      overtime: 0,
      breakTime: 1,
      startTime: "09:00",
      endTime: "18:00",
      breakStarts: ["12:00"],
      breakEnds: ["13:00"],
      schedule: null,
      working: true,
      nightOvertime: 0,
    },
  ],
};

const storageGet = vi.fn();
const storageSet = vi.fn();
const onChangedAddListener = vi.fn();
const onChangedRemoveListener = vi.fn();

beforeEach(() => {
  storageGet.mockReset().mockResolvedValue({});
  storageSet.mockReset().mockResolvedValue(undefined);
  onChangedAddListener.mockReset();
  onChangedRemoveListener.mockReset();
  vi.stubGlobal("chrome", {
    storage: {
      local: { get: storageGet, set: storageSet },
      onChanged: { addListener: onChangedAddListener, removeListener: onChangedRemoveListener },
    },
  });
});

describe("App", () => {
  test("renders loading/no-data state when chrome storage returns nothing", async () => {
    storageGet.mockResolvedValue({});

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "データがありません。KING OF TIME のページからダッシュボードを開いてください。",
        ),
      ).toBeInTheDocument();
    });
  });

  test("renders dashboard heading when data is available", async () => {
    storageGet.mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });
  });

  test("renders generatedAt timestamp when data is available", async () => {
    storageGet.mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      // The date should be displayed somewhere in the DOM
      const dateString = new Date(mockDashboardData.generatedAt).toLocaleString("ja-JP");
      expect(screen.getByText(dateString)).toBeInTheDocument();
    });
  });

  test("renders summary cards section when data is available", async () => {
    storageGet.mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("時間貯金")).toBeInTheDocument();
      expect(screen.getByText("残り日数")).toBeInTheDocument();
    });
  });

  test("storage の変更を購読してダッシュボードを最新化する (issue #29)", async () => {
    storageGet.mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });

    const listener = onChangedAddListener.mock.calls[0]?.[0] as (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => void;
    expect(listener).toBeDefined();

    const updated = { ...mockDashboardData, generatedAt: "2026-03-19T10:00:00.000Z" };
    listener({ kotdiff_dashboard_data: { newValue: updated } }, "local");

    await waitFor(() => {
      const dateString = new Date(updated.generatedAt).toLocaleString("ja-JP");
      expect(screen.getByText(dateString)).toBeInTheDocument();
    });
  });

  test("アンマウント時に storage リスナーを解除する", async () => {
    storageGet.mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    const { unmount } = render(<App />);
    await waitFor(() => {
      expect(onChangedAddListener).toHaveBeenCalledTimes(1);
    });

    const registered = onChangedAddListener.mock.calls[0]?.[0] as unknown;
    unmount();
    expect(onChangedRemoveListener).toHaveBeenCalledWith(registered);
  });
});
