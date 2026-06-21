import { detectTimeSeriesIntegrityIssues, shouldInvalidateDailyCache } from './cacheIntegrity';

describe('cacheIntegrity', () => {
  const daily = (start, count, valueFn) =>
    Array.from({ length: count }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return { time: d.toISOString().slice(0, 10), value: valueFn(i) };
    });

  it('flags calendar gaps in daily series', () => {
    const data = [
      { time: '2026-06-01', value: 1 },
      { time: '2026-06-03', value: 2 },
    ];
    const r = detectTimeSeriesIntegrityIssues(data, { daily: true });
    expect(r.hasIssues).toBe(true);
    expect(r.gapCount).toBe(1);
  });

  it('flags long flat runs', () => {
    const data = daily('2026-01-01', 10, () => 5);
    const r = detectTimeSeriesIntegrityIssues(data, { daily: true, minFlatRunDays: 7 });
    expect(r.hasIssues).toBe(true);
    expect(r.flatRunDays).toBeGreaterThanOrEqual(7);
  });

  it('accepts healthy daily series', () => {
    const data = daily('2026-01-01', 10, (i) => 1 + i * 0.01);
    expect(shouldInvalidateDailyCache(data, true)).toBe(false);
  });

  it('invalidates when useDateCheck is off', () => {
    const data = daily('2026-01-01', 10, () => 1);
    expect(shouldInvalidateDailyCache(data, false)).toBe(false);
  });
});