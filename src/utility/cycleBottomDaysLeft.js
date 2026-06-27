/** Bull market top (Cycle 4) and historical average bear duration — shared across charts. */
export const CYCLE_TOP_DATE = '2025-10-06';
export const AVG_DAYS_TOP_TO_BOTTOM = 370;

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

/**
 * Days remaining until the average historical cycle bottom (from Oct 2025 top).
 * Matches Market Cycles and Market Overview "days left til bottom" logic.
 */
export function getCycleBottomDaysLeft(referenceDate) {
  const ref = referenceDate || new Date().toISOString().split('T')[0];
  const elapsed = daysBetween(CYCLE_TOP_DATE, ref);
  return {
    daysLeft: Math.max(0, AVG_DAYS_TOP_TO_BOTTOM - elapsed),
    daysElapsed: elapsed,
    average: AVG_DAYS_TOP_TO_BOTTOM,
  };
}