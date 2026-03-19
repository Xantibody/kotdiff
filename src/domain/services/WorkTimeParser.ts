import { parseTimeRecord, asDecimalHours, type DecimalHours } from "../value-objects/TimeRecord";

export function extractTimeStrings(text: string): string[] {
  return text.match(/\d+:\d{2}/g) ?? [];
}

export function parseAllTimeRecords(text: string): DecimalHours[] {
  const matches = text.match(/\d+:\d{2}/g);
  if (!matches) return [];
  const results: DecimalHours[] = [];
  for (const m of matches) {
    const parsed = parseTimeRecord(m);
    if (parsed !== null) results.push(asDecimalHours(parsed));
  }
  return results;
}
