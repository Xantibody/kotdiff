import { parseTimeRecord } from "../../lib";

export interface TimelineSegment {
  type: "work" | "break";
  startPercent: number;
  widthPercent: number;
}

export function buildTimelineSegments(
  startTime: string | null,
  endTime: string | null,
  breakStarts: string[],
  breakEnds: string[],
): TimelineSegment[] {
  if (startTime === null || endTime === null) return [];

  const start = parseTimeRecord(startTime);
  const end = parseTimeRecord(endTime);
  if (start === null || end === null) return [];

  const breaks: { start: number; end: number }[] = [];
  const pairCount = Math.min(breakStarts.length, breakEnds.length);
  for (let i = 0; i < pairCount; i++) {
    const bs = parseTimeRecord(breakStarts[i]);
    const be = parseTimeRecord(breakEnds[i]);
    if (bs !== null && be !== null) {
      breaks.push({ start: bs, end: be });
    }
  }
  breaks.sort((a, b) => a.start - b.start);

  const segments: TimelineSegment[] = [];
  let cursor = start;

  for (const brk of breaks) {
    if (brk.start > cursor) {
      segments.push({
        type: "work",
        startPercent: (cursor / 24) * 100,
        widthPercent: ((brk.start - cursor) / 24) * 100,
      });
    }
    segments.push({
      type: "break",
      startPercent: (brk.start / 24) * 100,
      widthPercent: ((brk.end - brk.start) / 24) * 100,
    });
    cursor = brk.end;
  }

  if (cursor < end) {
    segments.push({
      type: "work",
      startPercent: (cursor / 24) * 100,
      widthPercent: ((end - cursor) / 24) * 100,
    });
  }

  return segments;
}
