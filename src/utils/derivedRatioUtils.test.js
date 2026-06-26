import {
  findRatioAnchorTime,
  alignSeriesFromAnchor,
  computeRatioComparison,
  pickRatioDisplayValue,
  resolveRatioChartPoints,
} from './derivedRatioUtils';

describe('derivedRatioUtils', () => {
  const btc = [
    { time: '2020-01-01', value: 100 },
    { time: '2020-01-02', value: 110 },
    { time: '2020-01-03', value: 120 },
  ];

  const tsla = [
    { time: '2020-01-02', value: 50 },
    { time: '2020-01-03', value: 60 },
    { time: '2020-01-04', value: 55 },
  ];

  it('anchors at the younger (later-starting) series', () => {
    expect(findRatioAnchorTime(btc, tsla)).toBe('2020-01-02');
    expect(findRatioAnchorTime(tsla, btc)).toBe('2020-01-02');
  });

  it('aligns only from anchor forward with LOCF', () => {
    const result = alignSeriesFromAnchor(btc, tsla);
    expect(result).not.toBeNull();
    expect(result.anchorTime).toBe('2020-01-02');
    expect(result.a0).toBe(110);
    expect(result.b0).toBe(50);
    expect(result.aligned[0]).toEqual({ time: '2020-01-02', v1: 110, v2: 50 });
  });

  it('computes relative performance with 100 = equal at anchor', () => {
    const result = computeRatioComparison(btc, tsla, { ratioOutput: 'relative_performance' });
    expect(result).not.toBeNull();
    expect(result.points[0].relative).toBeCloseTo(100, 5);
    expect(result.points[1].relative).toBeCloseTo((120 / 110) / (60 / 50) * 100, 5);
  });

  it('computes spread as indexed percentage-point difference', () => {
    const result = computeRatioComparison(btc, tsla, { ratioOutput: 'spread' });
    expect(result.points[0].spread).toBeCloseTo(0, 5);
    expect(result.points[1].spread).toBeCloseTo((120 / 110) * 100 - (60 / 50) * 100, 3);
  });

  it('switches display to log spread when scale mode is log', () => {
    const result = computeRatioComparison(btc, tsla, { ratioOutput: 'relative_performance' });
    const pt = result.points[1];
    expect(pickRatioDisplayValue(pt, 'relative_performance', 0)).toBeCloseTo(pt.relative, 5);
    expect(pickRatioDisplayValue(pt, 'relative_performance', 1)).toBeCloseTo(pt.logSpread, 5);
  });

  it('computes rolling z-score after enough history', () => {
    const long1 = [];
    const long2 = [];
    for (let i = 0; i < 40; i++) {
      const t = `2020-02-${String((i % 28) + 1).padStart(2, '0')}`;
      long1.push({ time: t, value: 100 + i });
      long2.push({ time: t, value: 50 + (i % 5) });
    }
    const result = computeRatioComparison(long1, long2, {
      ratioOutput: 'rolling_zscore',
      zscoreWindow: 20,
    });
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.points[result.points.length - 1].zscore).not.toBeNull();
    const chartPts = resolveRatioChartPoints(
      { ratioOutput: 'rolling_zscore' },
      result.points,
      0
    );
    expect(chartPts.length).toBeGreaterThan(0);
  });
});