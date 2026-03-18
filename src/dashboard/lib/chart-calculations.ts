/**
 * Pure computation helpers extracted from chart components.
 *
 * WeekdayAvgChart uses extractWeekday to parse the weekday kanji from a date string.
 * OvertimeGauge uses polarToCartesian and describeArc for SVG arc geometry.
 * Other chart components (CumulativeDiffChart, DailyHoursChart, WorkRangeChart,
 * LeaveBalanceChart) perform data transformations that are tightly coupled to their
 * rendering variables and receive pre-computed data from DashboardSummary.
 */

/**
 * Extracts the Japanese weekday kanji from a KOT date string.
 * e.g. "03/18（水）" -> "水", returns null if not found.
 */
export function extractWeekday(date: string): string | null {
  const m = date.match(/[（(]([月火水木金土日])[）)]/);
  return m ? m[1] : null;
}

/**
 * Converts polar coordinates (angle in degrees) to Cartesian x/y.
 * Used by OvertimeGauge to compute SVG arc endpoints.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Builds an SVG arc path string.
 * Used by OvertimeGauge to draw gauge background and progress arcs.
 */
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}
