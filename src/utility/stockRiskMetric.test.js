import {
  calculateStockRiskMetric,
  calculateStockRiskMetricV2,
  calculateStockRiskMetricByVersion,
  applyUpwardResistance,
  applyExtremityAwareUpwardResistance,
  compressRiskTails,
} from './stockRiskMetric';

const makeSeries = (n, start = 100, drift = 0.001) => {
  const data = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    price *= 1 + drift + Math.sin(i / 30) * 0.002;
    data.push({ time: `2020-01-${String((i % 28) + 1).padStart(2, '0')}`, value: price });
  }
  return data;
};

const maxDailyJump = (risks) => {
  let max = 0;
  for (let i = 1; i < risks.length; i++) {
    max = Math.max(max, Math.abs(risks[i] - risks[i - 1]));
  }
  return max;
};

const fractionInExtremes = (risks, low = 0.15, high = 0.85) =>
  risks.filter((r) => r < low || r > high).length / risks.length;

const tailMean = (rows) => {
  const tail = rows.slice(-30).map((r) => r.Risk);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
};

describe('stockRiskMetric', () => {
  describe('applyUpwardResistance', () => {
    it('leaves risk at or below onset unchanged', () => {
      expect(applyUpwardResistance(0.5)).toBe(0.5);
      expect(applyUpwardResistance(0.4)).toBe(0.4);
    });

    it('pulls high risk readings lower while staying monotonic', () => {
      const at80 = applyUpwardResistance(0.8);
      const at90 = applyUpwardResistance(0.9);
      expect(at80).toBeLessThan(0.8);
      expect(at90).toBeLessThan(0.9);
      expect(at90).toBeGreaterThan(at80);
    });

    it('fully bypasses resistance when extension is genuinely extreme', () => {
      const resisted = applyExtremityAwareUpwardResistance(0.95, 1.35, 0.9, 1.0, 1.1);
      expect(resisted).toBeCloseTo(0.95, 2);
    });

    it('still resists when extension is only mildly elevated', () => {
      const mild = applyExtremityAwareUpwardResistance(0.9, 1.12, 0.9, 1.0, 1.1);
      expect(mild).toBeLessThan(0.9);
    });

    it('increases resistance with each 0.01 band', () => {
      const at60 = applyUpwardResistance(0.6);
      const at70 = applyUpwardResistance(0.7);
      const at80 = applyUpwardResistance(0.8);
      const gain60to70 = at70 - at60;
      const gain70to80 = at80 - at70;
      expect(gain60to70).toBeLessThan(0.1);
      expect(gain70to80).toBeLessThan(gain60to70);
    });
  });

  describe('compressRiskTails', () => {
    it('maps 0.5 to 0.5', () => {
      expect(compressRiskTails(0.5, 1.0, 0.9, 1.0, 1.1)).toBeCloseTo(0.5, 2);
    });

    it('compresses high raw risk when extension is only mildly elevated', () => {
      const compressed = compressRiskTails(0.92, 1.12, 0.9, 1.0, 1.1);
      expect(compressed).toBeLessThan(0.75);
      expect(compressed).toBeGreaterThan(0.5);
    });

    it('allows higher risk when extension is far beyond the upper band', () => {
      const mild = compressRiskTails(0.92, 1.12, 0.9, 1.0, 1.1);
      const extreme = compressRiskTails(0.92, 1.35, 0.9, 1.0, 1.1);
      expect(extreme).toBeGreaterThan(mild);
      expect(extreme).toBeGreaterThan(0.78);
    });
  });

  describe('calculateStockRiskMetric', () => {
    it('returns empty array when data is too short', () => {
      expect(calculateStockRiskMetric(makeSeries(100))).toEqual([]);
      expect(calculateStockRiskMetric([])).toEqual([]);
      expect(calculateStockRiskMetric(null)).toEqual([]);
    });

    it('returns risk values between 0 and 1', () => {
      const result = calculateStockRiskMetric(makeSeries(600, 50, 0.0005));
      expect(result.length).toBeGreaterThan(0);
      result.forEach((row) => {
        expect(row.Risk).toBeGreaterThanOrEqual(0);
        expect(row.Risk).toBeLessThanOrEqual(1);
      });
    });

    it('produces higher risk after a sustained rally vs a flat period', () => {
      const flat = makeSeries(600, 100, 0);
      const rally = makeSeries(600, 100, 0.006);
      expect(tailMean(calculateStockRiskMetric(rally))).toBeGreaterThan(
        tailMean(calculateStockRiskMetric(flat))
      );
    });

    it('spends less time pinned at extreme bands on a gentle trend', () => {
      const gentle = makeSeries(600, 100, 0.0008);
      const risks = calculateStockRiskMetric(gentle).map((r) => r.Risk);
      expect(fractionInExtremes(risks)).toBeLessThan(0.2);
    });

    it('is not excessively whipsaw-prone on a gentle trend', () => {
      const gentle = makeSeries(600, 100, 0.0008);
      const risks = calculateStockRiskMetric(gentle).map((r) => r.Risk);
      expect(maxDailyJump(risks)).toBeLessThan(0.1);
    });
  });

  describe('calculateStockRiskMetricV2', () => {
    it('returns empty array when data is too short', () => {
      expect(calculateStockRiskMetricV2(makeSeries(100))).toEqual([]);
      expect(calculateStockRiskMetricV2([])).toEqual([]);
      expect(calculateStockRiskMetricV2(null)).toEqual([]);
    });

    it('returns risk values between 0 and 1', () => {
      const result = calculateStockRiskMetricV2(makeSeries(600, 50, 0.0005));
      expect(result.length).toBeGreaterThan(0);
      result.forEach((row) => {
        expect(row.Risk).toBeGreaterThanOrEqual(0);
        expect(row.Risk).toBeLessThanOrEqual(1);
        expect(row.MetricVersion).toBe('v2');
      });
    });

    it('delays average high readings vs v1 during a sustained rally', () => {
      const rally = makeSeries(700, 100, 0.006);
      const v1 = calculateStockRiskMetric(rally);
      const v2 = calculateStockRiskMetricV2(rally);
      expect(tailMean(v2)).toBeLessThan(tailMean(v1));
    });

    it('spends less time pinned at 0.95+ than v1 during a grind', () => {
      const rally = makeSeries(700, 100, 0.006);
      const v1 = calculateStockRiskMetric(rally);
      const v2 = calculateStockRiskMetricV2(rally);
      const v1HighDays = v1.filter((r) => r.Risk >= 0.95).length;
      const v2HighDays = v2.filter((r) => r.Risk >= 0.95).length;
      expect(v2HighDays).toBeLessThanOrEqual(v1HighDays);
    });

    it('can still approach 1.0 when extension is a genuine blow-off', () => {
      const adjusted = applyExtremityAwareUpwardResistance(1.0, 1.35, 0.9, 1.0, 1.1);
      const risk = compressRiskTails(adjusted, 1.35, 0.9, 1.0, 1.1);
      expect(adjusted).toBeGreaterThan(0.95);
      expect(risk).toBeGreaterThan(0.9);
    });

    it('still produces higher risk after a rally vs a flat period', () => {
      const flat = makeSeries(600, 100, 0);
      const rally = makeSeries(600, 100, 0.006);
      expect(tailMean(calculateStockRiskMetricV2(rally))).toBeGreaterThan(
        tailMean(calculateStockRiskMetricV2(flat))
      );
    });
  });

  describe('calculateStockRiskMetricByVersion', () => {
    it('routes v1 to the stable metric', () => {
      const data = makeSeries(600, 100, 0.0008);
      const v1 = calculateStockRiskMetricByVersion(data, 'v1');
      expect(v1[0]?.MetricVersion).toBe('v1');
      expect(v1.map((r) => r.Risk)).toEqual(calculateStockRiskMetric(data).map((r) => r.Risk));
    });

    it('routes v2 to the resistance-adjusted metric', () => {
      const data = makeSeries(600, 100, 0.008);
      const v1 = calculateStockRiskMetric(data);
      const v2 = calculateStockRiskMetricByVersion(data, 'v2');
      expect(v2[0]?.MetricVersion).toBe('v2');
      expect(tailMean(v2)).toBeLessThanOrEqual(tailMean(v1));
    });
  });
});