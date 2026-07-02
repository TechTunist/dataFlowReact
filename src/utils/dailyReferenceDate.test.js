import { effectiveDailyReferenceDate, getBtcReferenceDate } from './dailyReferenceDate';

describe('dailyReferenceDate', () => {
  const wednesday = new Date(2026, 6, 1, 12, 0, 0); // 1 Jul 2026 local noon

  test('effectiveDailyReferenceDate bumps lagging last bar to calendar today', () => {
    expect(effectiveDailyReferenceDate('2026-06-30', wednesday)).toBe('2026-07-01');
  });

  test('effectiveDailyReferenceDate keeps same-day last bar', () => {
    expect(effectiveDailyReferenceDate('2026-07-01', wednesday)).toBe('2026-07-01');
  });

  test('getBtcReferenceDate bumps lagging last bar to calendar today', () => {
    const btcData = [{ time: '2026-06-29', value: 1 }, { time: '2026-06-30', value: 2 }];
    expect(getBtcReferenceDate(btcData, wednesday)).toBe('2026-07-01');
  });

  test('getBtcReferenceDate falls back to today when series empty', () => {
    expect(getBtcReferenceDate([], wednesday)).toBe('2026-07-01');
  });
});