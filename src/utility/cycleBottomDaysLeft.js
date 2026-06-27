/** Bull market top (Cycle 4) — reference for post-peak bear countdown. */
export const CYCLE_TOP_DATE = '2025-10-06';

/**
 * Working average: last two top-to-bottom durations only (2017→2018, 2021→2022).
 * Projects ~11 Oct 2026. See THREE_CYCLE_AVG_TOP_TO_BOTTOM for the fuller history.
 */
export const AVG_DAYS_TOP_TO_BOTTOM = 370;

/** All three completed top-to-bottom phases: 407 + 363 + 376 → 382 days. */
export const THREE_CYCLE_AVG_TOP_TO_BOTTOM = 382;

/** Average days between successive cycle bottoms (Jan 2015 → Dec 2018 → Nov 2022). */
export const BOTTOM_TO_BOTTOM_AVG_DAYS = 1435;

/** Projected bottom from 370-day average measured from the Oct 2025 top. */
export const PROJECTED_BOTTOM_DATE = '2026-10-11';

/** Alternative projections for comparison (not used in the live counter). */
export const ALTERNATIVE_PROJECTIONS = {
  threeCycleTopToBottom: '2026-10-23',
  bottomToBottom: '2026-10-26',
};

/** Historical top → bottom phases (days as measured from each cycle top). */
export const HISTORICAL_TOP_TO_BOTTOM = [
  { top: '2013 cycle top', bottom: '15 Jan 2015', days: 407 },
  { top: '17 Dec 2017', bottom: '15 Dec 2018', days: 363 },
  { top: '8 Nov 2021', bottom: '21 Nov 2022', days: 376 },
];

export const HISTORICAL_BOTTOM_TO_BOTTOM = [
  { from: '15 Jan 2015', to: '15 Dec 2018' },
  { from: '15 Dec 2018', to: '21 Nov 2022' },
];

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

/**
 * Days remaining until the working cycle-bottom estimate (370-day avg from Oct 2025 top).
 * Matches Market Cycles countdown; Market Overview uses the same 370-day average.
 */
export function getCycleBottomDaysLeft(referenceDate) {
  const ref = referenceDate || new Date().toISOString().split('T')[0];
  const elapsed = daysBetween(CYCLE_TOP_DATE, ref);
  return {
    daysLeft: Math.max(0, AVG_DAYS_TOP_TO_BOTTOM - elapsed),
    daysElapsed: elapsed,
    average: AVG_DAYS_TOP_TO_BOTTOM,
    projectedBottom: PROJECTED_BOTTOM_DATE,
  };
}

export function formatCycleDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}