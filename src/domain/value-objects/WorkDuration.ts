import { asDecimalHours, type DecimalHours } from "./TimeRecord";

export interface WorkDuration {
  readonly hours: DecimalHours;
}

export function createWorkDuration(hours: number): WorkDuration {
  if (hours < 0) throw new Error(`WorkDuration: hours (${hours}) must be >= 0`);
  return { hours: asDecimalHours(hours) };
}

export function formatHM(hours: number): string {
  const abs = Math.abs(hours);
  let h = Math.floor(abs);
  let m = Math.round((abs - h) * 60);
  if (m === 60) {
    h++;
    m = 0;
  }
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 差分合算の浮動小数点残差（例 -4e-16）が "-0:00" にならないよう、
// 符号は表示単位（分）に丸めてから判定する (issue #25)
export function isDiffNegative(hours: number): boolean {
  return Math.round(hours * 60) < 0;
}

export function formatDiff(hours: number): string {
  const sign = isDiffNegative(hours) ? "-" : "+";
  return `${sign}${formatHM(hours)}`;
}

// 時刻表示（日数分解は formatClockOutTime 側で行う）
export function formatTimeOfDay(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// 退勤目安の表示。日を跨ぐ場合は「7/3 4:40」のように翌日の日付を付ける
// （「3:00」への折り返しは過去時刻と、「28:40」表記は分かりにくいと紛らわしいため）
export function formatClockOutTime(targetTime: number, baseDate: Date): string {
  const dayOffset = Math.floor(targetTime / 24);
  const timeOfDay = targetTime - dayOffset * 24;
  if (dayOffset === 0) return formatTimeOfDay(timeOfDay);
  // KOT の日付は JST 基準のため +9h 手法で日付を進める（isDatedOnJstDay と同じ）
  const jst = new Date(baseDate.getTime() + 9 * 60 * 60 * 1000);
  jst.setUTCDate(jst.getUTCDate() + dayOffset);
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${formatTimeOfDay(timeOfDay)}`;
}
