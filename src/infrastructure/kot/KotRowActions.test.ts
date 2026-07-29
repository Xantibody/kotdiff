import { describe, test, expect, vi } from "vitest";
import { collectRowActions, toDateKey, triggerRowAction } from "./KotRowActions";

function buildTbody(): HTMLTableSectionElement {
  const tbody = document.createElement("tbody");
  tbody.innerHTML = `
    <tr>
      <td class="htBlock-adjastableTableF_actionRow">
        <p>
          <select class="htBlock-selectOther">
            <option value=""></option>
            <option value="#button_stamp_1">打刻編集</option>
            <option value="#button_schedule_1">スケジュール申請</option>
          </select>
        </p>
        <div style="display:none">
          <button id="button_stamp_1" type="button">打刻申請</button>
          <button id="button_schedule_1" type="button">スケジュール申請</button>
        </div>
      </td>
      <td data-ht-sort-index="WORK_DAY">02/02（月）</td>
    </tr>
    <tr>
      <td class="htBlock-adjastableTableF_actionRow"></td>
      <td data-ht-sort-index="WORK_DAY">02/03（火）</td>
    </tr>
  `;
  return tbody;
}

describe("toDateKey", () => {
  test("normalises the KOT date label", () => {
    expect(toDateKey("02/02（月）")).toBe("02/02");
    expect(toDateKey("2/3")).toBe("02/03");
    expect(toDateKey("合計")).toBeNull();
  });
});

describe("collectRowActions", () => {
  test("reads the per-row menu into date-keyed actions", () => {
    const actions = collectRowActions(buildTbody());
    expect(actions.get("02/02")).toEqual([
      { label: "打刻編集", targetId: "button_stamp_1" },
      { label: "スケジュール申請", targetId: "button_schedule_1" },
    ]);
  });

  test("skips the empty placeholder option and rows without a menu", () => {
    const actions = collectRowActions(buildTbody());
    expect(actions.get("02/02")?.length).toBe(2);
    expect(actions.has("02/03")).toBe(false);
  });
});

describe("triggerRowAction", () => {
  test("clicks the hidden KOT button so its own handler runs", () => {
    document.body.innerHTML = "";
    const button = document.createElement("button");
    button.id = "button_schedule_1";
    const onClick = vi.fn();
    button.addEventListener("click", onClick);
    document.body.append(button);

    expect(triggerRowAction("button_schedule_1")).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);

    document.body.innerHTML = "";
  });

  test("reports when the button is gone (KOT re-rendered the table)", () => {
    expect(triggerRowAction("missing-button")).toBe(false);
  });
});
