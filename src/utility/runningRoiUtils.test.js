import {
  calculateRunningROI,
  calculateRunningRoiRiskSeries,
  filterPriceDataFromStart,
  RUNNING_ROI_RISK_DATA_START,
  normalizeRunningRoiLinear,
  mapAdjustedRoiToRiskScore,
  mapRunningRoiToRiskSeries,
  RISK_METRIC_LOW_FLOOR,
  RISK_METRIC_LOW_END_EXPONENT,
  RISK_METRIC_FIRST_BOTTOM_TARGET,
  RISK_METRIC_LAST_BOTTOM_TARGET,
  detectConfirmedCycleBottoms,
  computeBottomRiskTargets,
  applyDualAnchorRiskMapping,
  applyRobustDualAnchorRiskMapping,
  applyPeakOnlyNormalization,
  computePeakScalingFactors,
  interpolateScalingFactor,
  resolveCyclePeaks,
  BITCOIN_1Y_ROI_CYCLE_PEAKS,
  RISK_METRIC_TARGET_PEAK,
  buildBelowThresholdZones,
  buildAboveThresholdZones,
  summarizeContiguousZones,
  blendRoiSeries,
  easeInOutSmoothstep,
  smoothRunningRoiSeries,
  parseRoiSmoothingPeriod,
  getRoiSmoothingLabel,
} from './runningRoiUtils';

describe('runningRoiUtils', () => {
  const sampleData = [
    { time: '2020-01-01', value: 10000 },
    { time: '2020-06-01', value: 15000 },
    { time: '2021-01-01', value: 20000 },
    { time: '2021-06-01', value: 12000 },
    { time: '2022-01-01', value: 18000 },
  ];

  test('calculateRunningROI returns empty for empty input', () => {
    expect(calculateRunningROI([], 365)).toEqual([]);
  });

  test('calculateRunningROI skips early points before lookback elapses', () => {
    const result = calculateRunningROI(sampleData, 365);
    expect(result.length).toBeLessThan(sampleData.length);
    result.forEach((point) => {
      expect(point).toHaveProperty('roi');
      expect(point).toHaveProperty('value');
      expect(point).toHaveProperty('time');
    });
  });

  test('filterPriceDataFromStart excludes pre-epoch points', () => {
    const data = [
      { time: '2011-10-31', value: 5 },
      { time: RUNNING_ROI_RISK_DATA_START, value: 11 },
      { time: '2012-01-01', value: 20 },
    ];
    const filtered = filterPriceDataFromStart(data);
    expect(filtered.map((p) => p.time)).toEqual([RUNNING_ROI_RISK_DATA_START, '2012-01-01']);
    expect(filterPriceDataFromStart(data, '2012-01-01')).toHaveLength(1);
  });

  test('normalizeRunningRoiLinear maps min to 0 and max to 1', () => {
    expect(normalizeRunningRoiLinear(2, 2, 10)).toBe(0);
    expect(normalizeRunningRoiLinear(10, 2, 10)).toBe(1);
    expect(normalizeRunningRoiLinear(6, 2, 10)).toBeCloseTo(0.5, 5);
  });

  test('normalizeRunningRoiLinear clamps out-of-range values', () => {
    expect(normalizeRunningRoiLinear(0, 2, 10)).toBe(0);
    expect(normalizeRunningRoiLinear(20, 2, 10)).toBe(1);
  });

  test('peak scaling factors align peaks to target', () => {
    const factors = computePeakScalingFactors();
    BITCOIN_1Y_ROI_CYCLE_PEAKS.forEach((peak, i) => {
      const normalized = peak.peakRoi * factors[i].s;
      expect(normalized).toBeCloseTo(RISK_METRIC_TARGET_PEAK, 5);
    });
  });

  test('interpolateScalingFactor returns first factor before first peak', () => {
    const factors = computePeakScalingFactors();
    expect(interpolateScalingFactor('2010-01-01', factors)).toBe(factors[0].s);
  });

  test('applyPeakOnlyNormalization aligns peaks to 1 on peak dates', () => {
    BITCOIN_1Y_ROI_CYCLE_PEAKS.forEach((peak) => {
      const roiData = [{ time: peak.time, value: 10000, roi: peak.peakRoi }];
      const normalized = applyPeakOnlyNormalization(roiData);
      expect(normalized[0].roi).toBeCloseTo(RISK_METRIC_TARGET_PEAK, 5);
      expect(normalized[0].rawRoi).toBe(peak.peakRoi);
    });
  });

  test('resolveCyclePeaks prefers preset peaks when provided', () => {
    const roiData = [{ time: '2020-01-01', value: 100, roi: 1.5 }];
    const peaks = resolveCyclePeaks(roiData, { presetPeaks: BITCOIN_1Y_ROI_CYCLE_PEAKS, minPeaks: 1 });
    expect(peaks).toEqual(BITCOIN_1Y_ROI_CYCLE_PEAKS);
  });

  test('mapAdjustedRoiToRiskScore keeps peaks at 1 and lifts lows', () => {
    expect(mapAdjustedRoiToRiskScore(1, 1)).toBe(1);
    expect(mapAdjustedRoiToRiskScore(0, 1)).toBe(RISK_METRIC_LOW_FLOOR);

    const lowRisk = mapAdjustedRoiToRiskScore(0.1, 1);
    const linearLow = normalizeRunningRoiLinear(0.1, 0, 1);
    expect(lowRisk).toBeGreaterThan(linearLow);
    expect(lowRisk).toBeGreaterThan(RISK_METRIC_LOW_FLOOR);
  });

  test('mapAdjustedRoiToRiskScore drops more slowly as ROI falls', () => {
    const high = mapAdjustedRoiToRiskScore(0.5, 1);
    const mid = mapAdjustedRoiToRiskScore(0.25, 1);
    const low = mapAdjustedRoiToRiskScore(0.1, 1);

    const dropHighToMid = high - mid;
    const dropMidToLow = mid - low;
    expect(dropMidToLow).toBeLessThan(dropHighToMid);
  });

  test('computeBottomRiskTargets eases later bottoms toward lower risk', () => {
    const bottoms = [
      { time: '2015-01-14', bottomRoi: 0.24 },
      { time: '2018-12-15', bottomRoi: 0.22 },
      { time: '2022-11-21', bottomRoi: 0.35 },
    ];
    const targets = computeBottomRiskTargets(bottoms);

    expect(targets[0].targetRisk).toBeCloseTo(RISK_METRIC_FIRST_BOTTOM_TARGET, 5);
    expect(targets[targets.length - 1].targetRisk).toBeCloseTo(RISK_METRIC_LAST_BOTTOM_TARGET, 5);
    expect(targets[2].targetRisk).toBeLessThan(targets[0].targetRisk);
  });

  test('later shallow bottom can reach lower risk than earlier deep bottom', () => {
    const peaks = [
      { time: '2017-12-18', peakRoi: 24.04 },
      { time: '2021-03-12', peakRoi: 11.85 },
      { time: '2024-03-08', peakRoi: 3.35 },
    ];
    const roiData = [
      { time: '2017-12-18', value: 19000, roi: 24.04 },
      { time: '2018-12-15', value: 3200, roi: 0.22 },
      { time: '2021-03-12', value: 58000, roi: 11.85 },
      { time: '2022-11-21', value: 16000, roi: 0.35 },
    ];
    const diminished = applyPeakOnlyNormalization(roiData, peaks);
    const bottoms = detectConfirmedCycleBottoms(roiData, peaks);
    const bottomTargets = computeBottomRiskTargets(bottoms);
    const mapped = applyDualAnchorRiskMapping(diminished, peaks, bottoms, bottomTargets);

    const earlyBottom = mapped.find((p) => p.time === '2018-12-15');
    const laterBottom = mapped.find((p) => p.time === '2022-11-21');

    expect(earlyBottom.roi).toBeCloseTo(RISK_METRIC_FIRST_BOTTOM_TARGET, 1);
    expect(laterBottom.roi).toBeLessThan(earlyBottom.roi);
    expect(laterBottom.roi).toBeCloseTo(
      bottomTargets.find((t) => t.time === '2022-11-21').targetRisk,
      1
    );
  });

  test('robust dual-anchor mapping does not snap open-cycle drawdown to a bottom anchor', () => {
    const peaks = [
      { time: '2021-03-12', peakRoi: 11.85 },
      { time: '2024-03-08', peakRoi: 3.35 },
    ];
    const roiData = [
      { time: '2021-03-12', value: 58000, roi: 11.85 },
      { time: '2022-06-01', value: 20000, roi: 0.4 },
      { time: '2024-03-08', value: 70000, roi: 3.35 },
      { time: '2025-06-01', value: 50000, roi: 1.2 },
    ];
    const diminished = applyPeakOnlyNormalization(roiData, peaks);
    const mapped = applyRobustDualAnchorRiskMapping(diminished, roiData, peaks);
    const openPoint = mapped.find((p) => p.time === '2025-06-01');

    expect(openPoint.roi).toBeGreaterThan(RISK_METRIC_LAST_BOTTOM_TARGET);
  });

  test('mapRunningRoiToRiskSeries applies peak scaling and dual-anchor bottoms', () => {
    const roiData = [
      { time: '2017-12-18', value: 19000, roi: 24.04 },
      { time: '2018-12-15', value: 3200, roi: 0.22 },
    ];
    const riskSeries = mapRunningRoiToRiskSeries(roiData, { peaks: BITCOIN_1Y_ROI_CYCLE_PEAKS });

    expect(riskSeries[0].rawRoi).toBe(24.04);
    expect(riskSeries[0].adjustedRoi).toBeCloseTo(RISK_METRIC_TARGET_PEAK, 5);
    expect(riskSeries[0].roi).toBe(1);
    expect(riskSeries[1].roi).toBeLessThan(riskSeries[0].roi);
    expect(riskSeries[1].roi).toBeCloseTo(RISK_METRIC_LAST_BOTTOM_TARGET, 5);
  });

  test('mapRunningRoiToRiskSeries falls back to concave scaling without peaks', () => {
    const roiData = [
      { time: '2020-01-01', value: 100, roi: 0.2 },
      { time: '2021-01-01', value: 200, roi: 5 },
    ];
    const riskSeries = mapRunningRoiToRiskSeries(roiData, { peaks: [] });

    expect(riskSeries[0].roi).toBeGreaterThan(RISK_METRIC_LOW_FLOOR);
    expect(riskSeries[1].roi).toBe(1);
  });

  test('buildBelowThresholdZones is binary below threshold only', () => {
    const roiData = [
      { time: '2020-01-01', value: 100, roi: 3 },
      { time: '2020-01-02', value: 90, roi: 1.5 },
      { time: '2020-01-03', value: 110, roi: 2.5 },
    ];
    const zones = buildBelowThresholdZones(roiData, 2);
    expect(zones).toHaveLength(1);
    expect(zones[0].time).toBe('2020-01-02');
    expect(zones[0].value).toBe(1);
  });

  test('buildAboveThresholdZones is binary above threshold only', () => {
    const roiData = [
      { time: '2020-01-01', value: 100, roi: 0.5 },
      { time: '2020-01-02', value: 90, roi: 0.8 },
      { time: '2020-01-03', value: 110, roi: 0.4 },
    ];
    const zones = buildAboveThresholdZones(roiData, 0.6);
    expect(zones).toHaveLength(1);
    expect(zones[0].time).toBe('2020-01-02');
  });

  test('summarizeContiguousZones merges adjacent days', () => {
    const zones = [
      { time: '2020-01-01', value: 1, roi: 1.2, price: 100 },
      { time: '2020-01-02', value: 1, roi: 1.1, price: 95 },
      { time: '2020-01-05', value: 1, roi: 1.3, price: 90 },
    ];
    const ranges = summarizeContiguousZones(zones);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].days).toBe(2);
    expect(ranges[0].start).toBe('2020-01-01');
    expect(ranges[0].end).toBe('2020-01-02');
  });

  test('blendRoiSeries interpolates between source and target', () => {
    const from = [{ time: '2020-01-01', value: 1 }, { time: '2020-01-02', value: 3 }];
    const to = [
      { time: '2020-01-01', value: 100, roi: 5 },
      { time: '2020-01-02', value: 200, roi: 9 },
    ];
    const half = blendRoiSeries(from, to, 0.5);
    expect(half[0].value).toBeCloseTo(3, 5);
    expect(half[1].value).toBeCloseTo(6, 5);
    expect(blendRoiSeries(from, to, 1)[1].value).toBe(9);
  });

  test('easeInOutSmoothstep returns 0 and 1 at endpoints', () => {
    expect(easeInOutSmoothstep(0)).toBe(0);
    expect(easeInOutSmoothstep(1)).toBe(1);
  });

  test('smoothRunningRoiSeries applies SMA while preserving early raw values', () => {
    const roiData = [
      { time: '2020-01-01', value: 100, roi: 1 },
      { time: '2020-01-02', value: 110, roi: 2 },
      { time: '2020-01-03', value: 120, roi: 3 },
      { time: '2020-01-04', value: 130, roi: 4 },
    ];
    const smoothed = smoothRunningRoiSeries(roiData, 3);
    expect(smoothed[0].roi).toBe(1);
    expect(smoothed[1].roi).toBe(2);
    expect(smoothed[2].roi).toBeCloseTo(2, 5);
    expect(smoothed[3].roi).toBeCloseTo(3, 5);
  });

  test('parseRoiSmoothingPeriod and getRoiSmoothingLabel', () => {
    expect(parseRoiSmoothingPeriod('none')).toBeNull();
    expect(parseRoiSmoothingPeriod('sma-7')).toBe(7);
    expect(getRoiSmoothingLabel('sma-28')).toBe('28-day SMA');
  });

  test('calculateRunningRoiRiskSeries returns 0-1 risk scores from price data', () => {
    const prices = [];
    for (let i = 0; i < 400; i++) {
      const date = new Date('2011-11-01');
      date.setDate(date.getDate() + i);
      prices.push({
        time: date.toISOString().split('T')[0],
        value: 100 + i * 2,
      });
    }
    const series = calculateRunningRoiRiskSeries(prices);
    expect(series.length).toBeGreaterThan(0);
    series.forEach((point) => {
      expect(point.riskScore).toBeGreaterThanOrEqual(0);
      expect(point.riskScore).toBeLessThanOrEqual(1);
    });
  });
});