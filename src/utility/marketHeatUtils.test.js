import {
  blendMarketHeatScores,
  applyMarketHeatSmoothing,
  stretchMarketHeatRange,
  computeMarketHeatPipeline,
  DEFAULT_MARKET_HEAT_WEIGHTS,
} from './marketHeatUtils';

describe('marketHeatUtils', () => {
  const factorScoresBase = [
    {
      time: '2020-01-01',
      btcPrice: 10000,
      scores: { fg: 20, mvrv: 40, mayer: 30, risk: 10, roirisk: 15, pi: 25, alt: 35, txmvrv: 45 },
      available: { fg: true, mvrv: true, mayer: true, risk: true, roirisk: true, pi: true, alt: true, txmvrv: true },
    },
    {
      time: '2020-01-02',
      btcPrice: 11000,
      scores: { fg: 80, mvrv: 60, mayer: 70, risk: 90, roirisk: 85, pi: 75, alt: 65, txmvrv: 55 },
      available: { fg: true, mvrv: true, mayer: true, risk: true, roirisk: true, pi: true, alt: true, txmvrv: true },
    },
  ];

  test('blendMarketHeatScores returns weighted average in 0-100', () => {
    const blended = blendMarketHeatScores(factorScoresBase, DEFAULT_MARKET_HEAT_WEIGHTS);
    expect(blended).toHaveLength(2);
    blended.forEach((point) => {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
      expect(point.btcPrice).toBeDefined();
    });
  });

  test('applyMarketHeatSmoothing smooths with SMA window', () => {
    const raw = Array.from({ length: 7 }, (_, i) => ({
      time: `2020-01-${String(i + 1).padStart(2, '0')}`,
      value: (i + 1) * 10,
      btcPrice: 1,
    }));
    const smoothed = applyMarketHeatSmoothing(raw, '7d');
    expect(smoothed[5].value).toBe(60);
    expect(smoothed[6].value).toBeCloseTo(40, 5);
  });

  test('stretchMarketHeatRange maps observed min/max to 0-100', () => {
    const data = [
      { time: '2020-01-01', value: 20, btcPrice: 1 },
      { time: '2020-01-02', value: 80, btcPrice: 1 },
    ];
    const stretched = stretchMarketHeatRange(data, true);
    expect(stretched[0].value).toBe(0);
    expect(stretched[1].value).toBe(100);
  });

  test('computeMarketHeatPipeline returns empty plotted data without btc', () => {
    const result = computeMarketHeatPipeline({ btcData: [] });
    expect(result.plottedData).toEqual([]);
  });
});