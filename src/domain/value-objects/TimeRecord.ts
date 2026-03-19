export type DecimalHours = number & { readonly __brand: "DecimalHours" };

export function asDecimalHours(n: number): DecimalHours {
  return n as DecimalHours;
}

export function parseWorkTime(text: string): number | null {
  const match = text.trim().match(/^(\d+)\.(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "", 10);
  const minutes = parseInt(match[2] ?? "", 10);
  return hours + minutes / 60;
}

export function parseTimeRecord(text: string): number | null {
  const match = text.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "", 10);
  const minutes = parseInt(match[2] ?? "", 10);
  if (minutes >= 60) return null;
  return hours + minutes / 60;
}

export function nowAsDecimalHours(date: Date = new Date()): DecimalHours {
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  return asDecimalHours(
    jstDate.getUTCHours() + jstDate.getUTCMinutes() / 60 + jstDate.getUTCSeconds() / 3600,
  );
}
