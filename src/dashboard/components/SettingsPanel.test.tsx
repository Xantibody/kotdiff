import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  test("renders existing custom leave keywords", () => {
    render(<SettingsPanel keywords={["サバティカル", "アニバーサリー"]} onChange={() => {}} />);
    expect(screen.getByText("サバティカル")).toBeInTheDocument();
    expect(screen.getByText("アニバーサリー")).toBeInTheDocument();
  });

  test("adds a keyword via input and 追加 button", async () => {
    const onChange = vi.fn();
    render(<SettingsPanel keywords={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "サバティカル");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(onChange).toHaveBeenCalledWith(["サバティカル"]);
  });

  test("trims input and ignores empty or duplicate keywords", async () => {
    const onChange = vi.fn();
    render(<SettingsPanel keywords={["サバティカル"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    const addButton = screen.getByRole("button", { name: "追加" });

    await userEvent.type(input, "  ");
    await userEvent.click(addButton);
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, "サバティカル");
    await userEvent.click(addButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("removes a keyword via 削除 button", async () => {
    const onChange = vi.fn();
    render(<SettingsPanel keywords={["サバティカル", "アニバーサリー"]} onChange={onChange} />);
    const [firstRemoveButton] = screen.getAllByRole("button", { name: "削除" });
    // getAllByRole は該当なしなら例外を投げるが、型上は undefined になりうるため検証する
    expect(firstRemoveButton).toBeDefined();
    if (firstRemoveButton) {
      await userEvent.click(firstRemoveButton);
    }
    expect(onChange).toHaveBeenCalledWith(["アニバーサリー"]);
  });

  test("clears the input after adding", async () => {
    const onChange = vi.fn();
    render(<SettingsPanel keywords={[]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "サバティカル");
    await userEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(input).toHaveValue("");
  });
});
