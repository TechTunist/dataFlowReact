import {
  QUANTILE_PARAMS,
  computeRawProjectedPrice,
  computeRearrangedQuantilePrices,
  rearrangeQuantilePrices,
  buildRearrangedModelSeries,
  isMonotoneNonDecreasing,
} from './tailCurvatureModel';

describe('tailCurvatureModel', () => {
  const labelsInTauOrder = QUANTILE_PARAMS.map((p) => p.label);

  it('keeps QUANTILE_PARAMS sorted by ascending tau', () => {
    for (let i = 1; i < QUANTILE_PARAMS.length; i += 1) {
      expect(QUANTILE_PARAMS[i].tau).toBeGreaterThan(QUANTILE_PARAMS[i - 1].tau);
    }
  });

  it('rearrangement sorts raw predictions into tau order', () => {
    // Deliberately crossed raw vector
    const raw = {
      '0.05%': 100,
      '0.1%': 90,
      '0.2%': 80,
      '0.5%': 70,
      '1%': 60,
      '10%': 50,
      '25%': 40,
      '50% (Median)': 200,
      '75%': 30,
      '95%': 20,
      '99%': 10,
    };
    const rearranged = rearrangeQuantilePrices(raw);
    const values = labelsInTauOrder.map((l) => rearranged[l]);
    expect(isMonotoneNonDecreasing(values)).toBe(true);
    expect(rearranged['0.05%']).toBe(10);
    expect(rearranged['99%']).toBe(200);
  });

  it('raw model crosses by late 2020s; rearranged stays monotone', () => {
    // Known crossing regime from unconstrained Table 3 coefficients
    const year = '2035-01-01';
    const rawValues = QUANTILE_PARAMS.map((p) => computeRawProjectedPrice(year, p));
    const rearranged = computeRearrangedQuantilePrices(year);
    const rearrValues = labelsInTauOrder.map((l) => rearranged[l]);

    expect(isMonotoneNonDecreasing(rawValues)).toBe(false);
    expect(isMonotoneNonDecreasing(rearrValues)).toBe(true);

    // Higher tau must map to weakly higher price after rearrangement
    expect(rearranged['50% (Median)']).toBeLessThanOrEqual(rearranged['75%']);
    expect(rearranged['75%']).toBeLessThanOrEqual(rearranged['95%']);
    expect(rearranged['95%']).toBeLessThanOrEqual(rearranged['99%']);
  });

  it('rearranged projections stay monotone through 2055', () => {
    for (const year of [2026, 2030, 2035, 2040, 2050, 2055]) {
      const rearranged = computeRearrangedQuantilePrices(`${year}-01-01`);
      const values = labelsInTauOrder.map((l) => rearranged[l]);
      expect(isMonotoneNonDecreasing(values)).toBe(true);
    }
  });

  it('buildRearrangedModelSeries is joint across quantiles and monotone per date', () => {
    const points = [
      { time: '2020-01-01' },
      { time: '2030-01-01' },
      { time: '2040-01-01' },
      { time: '2050-01-01' },
    ];
    const series = buildRearrangedModelSeries(points);

    points.forEach((point, idx) => {
      const values = labelsInTauOrder.map((label) => series[label][idx].value);
      expect(isMonotoneNonDecreasing(values)).toBe(true);
      expect(series['50% (Median)'][idx].time).toBe(point.time);
    });
  });

  it('does not change ordering when raw predictions are already monotone', () => {
    const year = '2024-01-01';
    const rawValues = QUANTILE_PARAMS.map((p) => computeRawProjectedPrice(year, p));
    expect(isMonotoneNonDecreasing(rawValues)).toBe(true);

    const rearranged = computeRearrangedQuantilePrices(year);
    QUANTILE_PARAMS.forEach((p, i) => {
      expect(rearranged[p.label]).toBeCloseTo(rawValues[i], 6);
    });
  });
});
