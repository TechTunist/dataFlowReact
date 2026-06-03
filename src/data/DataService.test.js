/**
 * Real unit tests for DataService transforms.
 * MODERN AGENT: added as part of professionalization-sprint / sub/modern-polish.
 * These test core data layer utils (normalize + dedup) that are used by DataContext, Workbench, charts.
 * Uses existing @testing-library/jest-dom via setup, but pure logic so no DOM needed.
 * Run via CRA: npm test -- --watchAll=false --testPathPattern=DataService
 */

import { normalizePriceData, deduplicateByTime } from './DataService';

describe('DataService - normalizePriceData', () => {
  test('returns empty array for null/undefined/non-array', () => {
    expect(normalizePriceData(null)).toEqual([]);
    expect(normalizePriceData(undefined)).toEqual([]);
    expect(normalizePriceData('not array')).toEqual([]);
    expect(normalizePriceData({})).toEqual([]);
  });

  test('normalizes array with valueKey default, filters invalids, sorts by time', () => {
    const raw = [
      { value: '101.5', date: '2020-01-02' },
      { value: null, time: '2020-01-01' },
      { value: '100', timestamp: 1577836800 }, // 2020-01-01
      { value: '99.9', end_date: '2020-01-03' },
    ];
    const result = normalizePriceData(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time: '2020-01-01', value: 100 });
    expect(result[1]).toEqual({ time: '2020-01-02', value: 101.5 });
    expect(result[2]).toEqual({ time: '2020-01-03', value: 99.9 });
  });

  test('supports custom valueKey', () => {
    const raw = [{ close: 50000, time: '2021-01-01' }];
    const result = normalizePriceData(raw, 'close');
    expect(result[0]).toEqual({ time: '2021-01-01', value: 50000 });
  });
});

describe('DataService - deduplicateByTime', () => {
  test('returns empty for non-array', () => {
    expect(deduplicateByTime(null)).toEqual([]);
    expect(deduplicateByTime(undefined)).toEqual([]);
  });

  test('removes duplicate times keeping first occurrence, preserves order', () => {
    const data = [
      { time: '2020-01-01', value: 100 },
      { time: '2020-01-01', value: 101 }, // dup
      { time: '2020-01-02', value: 102 },
      { time: '2020-01-01', value: 99 }, // later dup
    ];
    const result = deduplicateByTime(data);
    expect(result).toEqual([
      { time: '2020-01-01', value: 100 },
      { time: '2020-01-02', value: 102 },
    ]);
  });
});
