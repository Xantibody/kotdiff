const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// "9:5" のような入力も受け、"09:05" に揃える。時刻として読めなければ null
function parseTimeOfDay(text: string): string | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(text);
  if (!m) {
    return null;
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ユーザーが入れた「12:00, 17:30」のような文字列を通知時刻の一覧にする。
// 1 つでも読めない時刻があれば null（黙って捨てると設定したつもりの時刻が消える）
export function parseNotificationTimes(text: string): string[] | null {
  const parts = text.split(/[\s,、]+/).filter((p) => p !== "");
  const times = new Set<string>();
  for (const part of parts) {
    const time = parseTimeOfDay(part);
    if (time === null) {
      return null;
    }
    times.add(time);
  }
  return [...times].toSorted();
}

// now 以降で最初に HH:MM（JST）になる時刻。ちょうど now なら明日にする
export function nextOccurrence(time: string, now: Date): Date {
  const [hour, minute] = time.split(":").map(Number);
  // +9h して UTC として扱うと JST の暦日になる (WorkDuration と同じ手法)
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  jst.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
  let at = jst.getTime() - JST_OFFSET_MS;
  if (at <= now.getTime()) {
    at += DAY_MS;
  }
  return new Date(at);
}
