import {
  getCycleBottomDaysLeft,
  daysBetween,
  CYCLE_TOP_DATE,
  AVG_DAYS_TOP_TO_BOTTOM,
  PROJECTED_BOTTOM_DATE,
  THREE_CYCLE_AVG_TOP_TO_BOTTOM,
} from './cycleBottomDaysLeft';

describe('cycleBottomDaysLeft', () => {
  test('daysBetween counts calendar days between ISO dates', () => {
    expect(daysBetween('2025-10-06', '2026-07-03')).toBe(270);
  });

  test('getCycleBottomDaysLeft matches launch-day 100-day window', () => {
    const result = getCycleBottomDaysLeft('2026-07-03');
    expect(result.daysElapsed).toBe(270);
    expect(result.daysLeft).toBe(100);
    expect(result.average).toBe(AVG_DAYS_TOP_TO_BOTTOM);
  });

  test('getCycleBottomDaysLeft uses today when reference omitted', () => {
    const today = new Date().toISOString().split('T')[0];
    const expected = Math.max(0, AVG_DAYS_TOP_TO_BOTTOM - daysBetween(CYCLE_TOP_DATE, today));
    expect(getCycleBottomDaysLeft().daysLeft).toBe(expected);
  });

  test('daysLeft never goes negative', () => {
    expect(getCycleBottomDaysLeft('2030-01-01').daysLeft).toBe(0);
  });

  test('370-day projection lands on 11 Oct 2026', () => {
    expect(PROJECTED_BOTTOM_DATE).toBe('2026-10-11');
    expect(daysBetween(CYCLE_TOP_DATE, PROJECTED_BOTTOM_DATE)).toBe(AVG_DAYS_TOP_TO_BOTTOM);
  });

  test('three-cycle average is 382', () => {
    expect(THREE_CYCLE_AVG_TOP_TO_BOTTOM).toBe(382);
  });
});