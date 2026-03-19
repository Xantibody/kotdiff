import { parseTimeRecord } from "../../domain/value-objects/TimeRecord";

export interface TimelineSegment {
  type: "work" | "break";
  startHour: number;
  endHour: number;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
}

function hoursToLabel(h: number): string {
  const totalMinutes = Math.round(h * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function formatSegmentDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}時間${minutes}分`;
}

export function buildTimelineSegments(
  startTime: string | null,
  endTime: string | null,
  breakStarts: readonly string[],
  breakEnds: readonly string[],
): TimelineSegment[] {
  if (startTime === null || endTime === null) return [];

  const start = parseTimeRecord(startTime);
  const end = parseTimeRecord(endTime);
  if (start === null || end === null) return [];

  const adjustedEnd = end <= start ? end + 24 : end;

  const breaks: { start: number; end: number }[] = [];
  const pairCount = Math.min(breakStarts.length, breakEnds.length);
  for (let i = 0; i < pairCount; i++) {
    const bs = parseTimeRecord(breakStarts[i] ?? "");
    const be = parseTimeRecord(breakEnds[i] ?? "");
    if (bs !== null && be !== null) {
      const adjBs = bs < start ? bs + 24 : bs;
      const adjBe = be < start ? be + 24 : be;
      breaks.push({ start: adjBs, end: adjBe });
    }
  }
  breaks.sort((a, b) => a.start - b.start);

  const segments: TimelineSegment[] = [];
  let cursor = start;

  for (const brk of breaks) {
    if (brk.start > cursor) {
      segments.push({
        type: "work",
        startHour: cursor,
        endHour: brk.start,
        startLabel: hoursToLabel(cursor),
        endLabel: hoursToLabel(brk.start),
        durationLabel: formatSegmentDuration(Math.round((brk.start - cursor) * 60)),
      });
    }
    segments.push({
      type: "break",
      startHour: brk.start,
      endHour: brk.end,
      startLabel: hoursToLabel(brk.start),
      endLabel: hoursToLabel(brk.end),
      durationLabel: formatSegmentDuration(Math.round((brk.end - brk.start) * 60)),
    });
    cursor = brk.end;
  }

  if (cursor < adjustedEnd) {
    segments.push({
      type: "work",
      startHour: cursor,
      endHour: adjustedEnd,
      startLabel: hoursToLabel(cursor),
      endLabel: hoursToLabel(adjustedEnd),
      durationLabel: formatSegmentDuration(Math.round((adjustedEnd - cursor) * 60)),
    });
  }

  return segments;
}
