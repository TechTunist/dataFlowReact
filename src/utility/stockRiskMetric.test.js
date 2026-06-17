import { calculateStockRiskMetric, compressRiskTails } from './stockRiskMetric';

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

describe('stockRiskMetric', () => {
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
      const tailMean = (rows) => {
        const tail = rows.slice(-30).map((r) => r.Risk);
        return tail.reduce((a, b) => a + b, 0) / tail.length;
      };
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
});