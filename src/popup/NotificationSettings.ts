import { parseNotificationTimes } from "../domain/services/NotificationSchedule";

// 指定時刻の通知の設定欄。change のたびに解析し、読めれば正規化して保存する。
// 読めない時刻があれば保存せず欄に印を付け、設定したつもりの時刻が消えないようにする
export function renderNotificationSettings(
  root: HTMLElement,
  times: readonly string[],
  onSave: (times: string[]) => Promise<void>,
): void {
  const label = document.createElement("label");
  label.className = "notification";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "notification-times";
  input.placeholder = "例: 12:00, 17:30";
  input.value = times.join(", ");
  input.addEventListener("change", () => {
    const parsed = parseNotificationTimes(input.value);
    input.classList.toggle("invalid", parsed === null);
    if (parsed === null) {
      return;
    }
    input.value = parsed.join(", ");
    void onSave(parsed);
  });
  label.append("通知時刻 ", input);
  root.append(label);
}
