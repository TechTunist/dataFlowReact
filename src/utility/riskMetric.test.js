/**
 * Real tests for riskMetric calculateRiskMetric.
 * MODERN AGENT: part of t3 tests in professionalization sprint.
 * Tests the core compute used in MarketOverview, BitcoinRisk etc.
 * Note: func builds MA over 374 days window + streaks; we supply enough data points.
 */

import { calculateRiskMetric } from './riskMetric';

describe('riskMetric - calculateRiskMetric', () => {
  function makeSeries(n, base = 100) {
    return Array.from({ length: n }, (_, i) => ({
      time: `2020-01-${String(i + 1).padStart(2, '0')}`,
      value: base + i * 0.1,
    }));
  }

  test('returns array same length as input with Risk, MA, NewFactor etc fields', () => {
    const data = makeSeries(400, 50000);
    const result = calculateRiskMetric(data);
    expect(result).toHaveLength(400);
    expect(result[399]).toHaveProperty('Risk');
    expect(result[399]).toHaveProperty('MA');
    expect(result[399]).toHaveProperty('NewFactor');
    expect(result[399]).toHaveProperty('Preavg');
    expect(typeof result[399].Risk).toBe('number');
  });

  test('Risk values are normalized between 0 and 1 (or close for edge)', () => {
    const data = makeSeries(400, 100);
    const result = calculateRiskMetric(data);
    const risks = result.map(r => r.Risk);
    const minR = Math.min(...risks);
    const maxR = Math.max(...risks);
    expect(minR).toBeGreaterThanOrEqual(0);
    expect(maxR).toBeLessThanOrEqual(1.0001); // allow float
  });

  test('handles small input without crash (guards in code)', () => {
    const tiny = [{ time: '2020-01-01', value: 100 }, { time: '2020-01-02', value: 101 }];
    const result = calculateRiskMetric(tiny);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('Risk');
  });
});
