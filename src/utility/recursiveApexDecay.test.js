import {
  RAD_SEED_APEXES,
  daysBetween,
  addDays,
  successiveRatios,
  projectNextFromMultipliers,
  computeRadAnalysis,
  refineApexesFromSeries,
  buildRadModel,
  formatRadPrice,
  sampleStd,
  logPriceBands,
  dateBands,
} from './recursiveApexDecay';

describe('recursiveApexDecay', () => {
  test('seed apexes are ordered and complete', () => {
    expect(RAD_SEED_APEXES).toHaveLength(7);
    expect(RAD_SEED_APEXES.filter((a) => a.type === 'top')).toHaveLength(4);
    expect(RAD_SEED_APEXES.filter((a) => a.type === 'bottom')).toHaveLength(3);
    for (let i = 1; i < RAD_SEED_APEXES.length; i += 1) {
      expect(daysBetween(RAD_SEED_APEXES[i - 1].date, RAD_SEED_APEXES[i].date)).toBeGreaterThan(0);
    }
  });

  test('daysBetween and addDays are consistent', () => {
    expect(daysBetween('2025-10-06', '2026-10-11')).toBe(370);
    expect(addDays('2025-10-06', 370)).toBe('2026-10-11');
  });

  test('successiveRatios computes interval ratios', () => {
    expect(successiveRatios([10, 20, 40])).toEqual([2, 2]);
  });

  test('projectNextFromMultipliers second-order matches conversation-style math', () => {
    // retention-like: 0.139, 0.160, 0.225 → rates 1.151, 1.406 → Δ 0.255 → rate3 1.661 → next 0.374
    const r = projectNextFromMultipliers([0.139, 0.160, 0.225]);
    expect(r.method).toBe('second_order');
    expect(r.rateOfRate).toBeCloseTo(1.40625 - 1.151079, 3);
    expect(r.projected).toBeCloseTo(0.225 * (1.40625 + (1.40625 - 0.160 / 0.139)), 2);
  });

  test('computeRadAnalysis projects B4 below T4 and T5 above B4', () => {
    const analysis = computeRadAnalysis(RAD_SEED_APEXES);
    const { b4, t5 } = analysis.projection;
    const t4 = analysis.t4;

    expect(t4.price).toBe(126198);
    expect(b4.price).toBeGreaterThan(10_000);
    expect(b4.price).toBeLessThan(t4.price);
    expect(b4.retention).toBeGreaterThan(0.15);
    expect(b4.retention).toBeLessThan(0.6);
    expect(b4.dropPct).toBeGreaterThan(40);
    expect(b4.dropPct).toBeLessThan(85);
    expect(b4.date).toMatch(/^2026-/);

    expect(t5.price).toBeGreaterThan(b4.price);
    expect(t5.price).toBeGreaterThan(t4.price * 0.9);
    expect(t5.bullMult).toBeGreaterThan(2);
    expect(t5.bullMult).toBeLessThan(15);
    expect(t5.date).toMatch(/^202[89]-/);
  });

  test('top-to-top cross-check is same order of magnitude as primary T5', () => {
    const analysis = computeRadAnalysis(RAD_SEED_APEXES);
    const primary = analysis.projection.t5.price;
    const topsPath = analysis.projection.t5.fromTopPath;
    expect(topsPath).toBeGreaterThan(0);
    // Within ~2.5× of each other (independent paths)
    expect(Math.max(primary, topsPath) / Math.min(primary, topsPath)).toBeLessThan(2.5);
  });

  test('historical drawdowns are shallowing', () => {
    const analysis = computeRadAnalysis(RAD_SEED_APEXES);
    const drops = analysis.cycles.map((c) => c.dropPct);
    expect(drops[0]).toBeGreaterThan(drops[2]);
    expect(drops[2]).toBeGreaterThan(50);
  });

  test('bull multipliers are decaying', () => {
    const analysis = computeRadAnalysis(RAD_SEED_APEXES);
    const bulls = analysis.transitions.bottomToTop.multipliers;
    expect(bulls[0]).toBeGreaterThan(bulls[1]);
    expect(bulls[1]).toBeGreaterThan(bulls[2]);
  });

  test('refineApexesFromSeries finds local extremes', () => {
    const series = [
      { time: '2025-10-04', value: 122000 },
      { time: '2025-10-05', value: 123000 },
      { time: '2025-10-06', value: 124752 },
      { time: '2025-10-07', value: 121000 },
    ];
    const refined = refineApexesFromSeries(series, [
      { id: 'T4', type: 'top', date: '2025-10-06', price: 126198 },
    ]);
    expect(refined[0].refined).toBe(true);
    expect(refined[0].date).toBe('2025-10-06');
    // Keeps seed high when series is close-only below true high
    expect(refined[0].price).toBe(126198);
  });

  test('buildRadModel works without series', () => {
    const model = buildRadModel(null);
    expect(model.projection.b4.price).toBeTruthy();
    expect(model.projection.t5.price).toBeTruthy();
  });

  test('formatRadPrice', () => {
    expect(formatRadPrice(126198)).toBe('$126,198');
    expect(formatRadPrice(172)).toBe('$172.00');
  });

  test('sampleStd matches known sample SD', () => {
    // Population SD of [2,4,4,4,5,5,7,9] is 2; sample SD uses n−1 → √(8/7)·2
    expect(sampleStd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2 * Math.sqrt(8 / 7), 5);
    expect(sampleStd([1])).toBe(0);
  });

  test('logPriceBands are multiplicative around center', () => {
    const bands = logPriceBands(100, [80, 125], 0.05);
    expect(bands.center).toBe(100);
    expect(bands.sigma1.low).toBeLessThan(100);
    expect(bands.sigma1.high).toBeGreaterThan(100);
    expect(bands.sigma2.low).toBeLessThan(bands.sigma1.low);
    expect(bands.sigma2.high).toBeGreaterThan(bands.sigma1.high);
    // 2σ ≈ twice the log width of 1σ
    expect(Math.log(bands.sigma2.high / 100)).toBeCloseTo(2 * Math.log(bands.sigma1.high / 100), 5);
  });

  test('dateBands expand symmetrically in days', () => {
    const bands = dateBands('2026-10-11', 20, 14);
    expect(bands.center).toBe('2026-10-11');
    expect(daysBetween(bands.sigma1.start, bands.sigma1.end)).toBe(40);
    expect(daysBetween(bands.sigma2.start, bands.sigma2.end)).toBe(80);
  });

  test('computeRadAnalysis includes ±1σ uncertainty for B4 and T5', () => {
    const analysis = computeRadAnalysis(RAD_SEED_APEXES);
    const { uncertainty } = analysis;
    expect(uncertainty.b4.price.sigma1.low).toBeLessThan(uncertainty.b4.price.center);
    expect(uncertainty.b4.price.sigma1.high).toBeGreaterThan(uncertainty.b4.price.center);
    expect(uncertainty.b4.date.sigma1.start < uncertainty.b4.date.center).toBe(true);
    expect(uncertainty.t5.price.sigma1.high).toBeGreaterThan(uncertainty.t5.price.center);
    expect(uncertainty.t5.date.sigma1.end > uncertainty.t5.date.center).toBe(true);
  });
});
