import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

beforeEach(() => {
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: { addListener: vi.fn() },
    },
  });
});

describe("App", () => {
  test("renders loading/no-data state when chrome storage returns nothing", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});

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
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });
  });

  test("renders generatedAt timestamp when data is available", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      // The date should be displayed somewhere in the DOM
      const dateString = new Date(mockDashboardData.generatedAt).toLocaleString("ja-JP");
      expect(screen.getByText(dateString)).toBeInTheDocument();
    });
  });

  test("設定 button toggles the settings panel and keyword changes are persisted", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });

    expect(screen.queryByText("カスタム休暇キーワード")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.getByText("カスタム休暇キーワード")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox"), "サバティカル");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      kotdiff_settings: { customLeaveKeywords: ["サバティカル"] },
    });
  });

  test("stored custom keywords are shown in the settings panel", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
      kotdiff_settings: { customLeaveKeywords: ["サバティカル"] },
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.getByText("サバティカル")).toBeInTheDocument();
  });

  test("renders summary cards section when data is available", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("時間貯金")).toBeInTheDocument();
      expect(screen.getByText("残り日数")).toBeInTheDocument();
    });
  });

  test("storage の変更を購読してダッシュボードを最新化する (issue #29)", async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      kotdiff_dashboard_data: mockDashboardData,
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });

    const listener = vi.mocked(chrome.storage.onChanged.addListener).mock.calls[0]?.[0] as (
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
});
