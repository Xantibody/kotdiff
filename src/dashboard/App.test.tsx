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

beforeEach(() => {
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(),
      },
    },
  });
});

describe("App", () => {
  test("renders loading/no-data state when chrome storage returns nothing", async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({});
      },
    );

    render(<App />);

    expect(
      screen.getByText(
        "データがありません。KING OF TIME のページからダッシュボードを開いてください。",
      ),
    ).toBeInTheDocument();
  });

  test("renders dashboard heading when data is available", async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({ kotdiff_dashboard_data: mockDashboardData });
      },
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("KotDiff Dashboard")).toBeInTheDocument();
    });
  });

  test("renders generatedAt timestamp when data is available", async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({ kotdiff_dashboard_data: mockDashboardData });
      },
    );

    render(<App />);

    await waitFor(() => {
      // The date should be displayed somewhere in the DOM
      const dateString = new Date(mockDashboardData.generatedAt).toLocaleString("ja-JP");
      expect(screen.getByText(dateString)).toBeInTheDocument();
    });
  });

  test("renders summary cards section when data is available", async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_key: string, callback: (result: Record<string, unknown>) => void) => {
        callback({ kotdiff_dashboard_data: mockDashboardData });
      },
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("時間貯金")).toBeInTheDocument();
      expect(screen.getByText("残り日数")).toBeInTheDocument();
    });
  });
});
