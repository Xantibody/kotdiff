import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeaveBalanceChart } from "./LeaveBalanceChart";
import type { LeaveBalance } from "../../../types";

describe("LeaveBalanceChart", () => {
  test("shows no-data message when leaveBalances is empty", () => {
    render(<LeaveBalanceChart leaveBalances={[]} />);
    expect(screen.getByText("休暇データがありません")).toBeInTheDocument();
  });

  test("shows no-data message when all balances have null remaining", () => {
    const balances: LeaveBalance[] = [{ label: "有給", used: 3, remaining: null }];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("休暇データがありません")).toBeInTheDocument();
  });

  test("renders SVG with aria-label when tracked data is present", () => {
    const balances: LeaveBalance[] = [{ label: "有給", used: 3, remaining: 7 }];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByRole("img", { name: "休暇残日数チャート" })).toBeInTheDocument();
  });

  test("renders leave type label", () => {
    const balances: LeaveBalance[] = [{ label: "有給", used: 3, remaining: 7 }];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("有給")).toBeInTheDocument();
  });

  test("renders used/remaining value text", () => {
    const balances: LeaveBalance[] = [{ label: "有給", used: 3, remaining: 7 }];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("使用 3 ／ 残 7")).toBeInTheDocument();
  });

  test("renders multiple leave types", () => {
    const balances: LeaveBalance[] = [
      { label: "有給", used: 3, remaining: 7 },
      { label: "特別休暇", used: 1, remaining: 2 },
    ];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("有給")).toBeInTheDocument();
    expect(screen.getByText("特別休暇")).toBeInTheDocument();
    expect(screen.getByText("使用 3 ／ 残 7")).toBeInTheDocument();
    expect(screen.getByText("使用 1 ／ 残 2")).toBeInTheDocument();
  });

  test("skips entries with zero total (never granted)", () => {
    const balances: LeaveBalance[] = [
      { label: "有給", used: 3, remaining: 7 },
      { label: "冬期休暇", used: 0, remaining: 0 },
    ];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("有給")).toBeInTheDocument();
    expect(screen.queryByText("冬期休暇")).not.toBeInTheDocument();
  });

  test("shows no-data message when all balances have zero total", () => {
    const balances: LeaveBalance[] = [{ label: "冬期休暇", used: 0, remaining: 0 }];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("休暇データがありません")).toBeInTheDocument();
  });

  test("long labels stay inside the viewBox", () => {
    const longLabel = "振替休暇（フレックス用）";
    const balances: LeaveBalance[] = [{ label: longLabel, used: 4, remaining: 0 }];
    const { container } = render(<LeaveBalanceChart leaveBalances={balances} />);
    const text = screen.getByText(longLabel);
    // textAnchor="end" なのでラベルは x から左へ fontSize×文字数 分だけ伸びる。
    // viewBox の左端 0 を割らない位置に描画されていること
    const x = Number(text.getAttribute("x"));
    const fontSize = Number(text.getAttribute("font-size"));
    expect(x - longLabel.length * fontSize).toBeGreaterThanOrEqual(0);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("skips entries with null remaining", () => {
    const balances: LeaveBalance[] = [
      { label: "有給", used: 3, remaining: 7 },
      { label: "未追跡", used: 0, remaining: null },
    ];
    render(<LeaveBalanceChart leaveBalances={balances} />);
    expect(screen.getByText("有給")).toBeInTheDocument();
    expect(screen.queryByText("未追跡")).not.toBeInTheDocument();
  });

  test("renders used bar rect when used > 0", () => {
    const balances: LeaveBalance[] = [{ label: "有給", used: 3, remaining: 7 }];
    const { container } = render(<LeaveBalanceChart leaveBalances={balances} />);
    // Used bar has fill="#3b82f6"
    const usedRect = container.querySelector("rect[fill='#3b82f6']");
    expect(usedRect).toBeInTheDocument();
  });
});
