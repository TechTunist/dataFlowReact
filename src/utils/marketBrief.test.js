import {
  BRIEF_NEXT_CHARTS,
  buildBriefMetrics,
  buildBriefNarrative,
  formatBriefPct,
  formatBriefUsd,
} from './marketBrief';

describe('marketBrief', () => {
  test('formatBriefUsd and formatBriefPct', () => {
    expect(formatBriefUsd(1e12)).toBe('$1.00T');
    expect(formatBriefUsd(95000)).toBe('$95,000');
    expect(formatBriefPct(54.26)).toBe('54.3%');
    expect(formatBriefUsd(null)).toBeNull();
  });

  test('buildBriefNarrative covers fear and dominance', () => {
    const text = buildBriefNarrative(
      {
        fear_and_greed: { value: 20, classification: 'Extreme Fear' },
        btc_dominance_pct: { value: 58 },
      },
      { daysLeft: 120 },
    );
    expect(text).toMatch(/extreme fear/i);
    expect(text).toMatch(/dominance/i);
    expect(text).toMatch(/120 days/);
  });

  test('buildBriefNarrative greed path', () => {
    const text = buildBriefNarrative({
      fear_and_greed: { value: 80, classification: 'Extreme Greed' },
    });
    expect(text).toMatch(/extreme greed/i);
  });

  test('buildBriefMetrics extracts tiles', () => {
    const metrics = buildBriefMetrics({
      btc_price: { value: 100000, date: '2026-07-07' },
      fear_and_greed: { value: 42, classification: 'Fear' },
      btc_dominance_pct: { value: 50 },
      defi_tvl: { value: 1e11 },
    });
    expect(metrics.map((m) => m.key)).toEqual(expect.arrayContaining(['btc', 'fng', 'dom', 'defi']));
  });

  test('BRIEF_NEXT_CHARTS has core destinations', () => {
    expect(BRIEF_NEXT_CHARTS.some((c) => c.path === '/risk-color')).toBe(true);
    expect(BRIEF_NEXT_CHARTS.length).toBeGreaterThanOrEqual(3);
  });
});
