/**
 * Running ROI utilities for the Running ROI Risk chart and signal zones.
 */

/** Historical Bitcoin 1Y running ROI cycle peaks (date + peak ROI multiplier). */
export const BITCOIN_1Y_ROI_CYCLE_PEAKS = [
  { time: '2013-11-30', peakRoi: 91.51 },
  { time: '2017-12-18', peakRoi: 24.04 },
  { time: '2021-03-12', peakRoi: 11.85 },
  { time: '2024-03-08', peakRoi: 3.35 },
];

/** Target peak level after diminishing-returns scaling (maps cycle tops toward 1). */
export const RISK_METRIC_TARGET_PEAK = 1;

export const BUY_SIGNAL_MIN = 0.1;
export const BUY_SIGNAL_MAX = 1.0;

export const DEFAULT_BUY_SIGNAL_THRESHOLD = 0.3;
export const DEFAULT_SELL_SIGNAL_THRESHOLD = 60;

/** Buy/sell sliders in ROI Risk view (0–1 scale). */
export const RISK_METRIC_BUY_MIN = 0;
export const RISK_METRIC_BUY_MAX = 0.5;
export const RISK_METRIC_SELL_MIN = 0.5;
export const RISK_METRIC_SELL_MAX = 1;
export const DEFAULT_RISK_METRIC_BUY_THRESHOLD = 0.085;
export const DEFAULT_RISK_METRIC_SELL_THRESHOLD = 0.9;

/**
 * Minimum risk score at the deepest adjusted-ROI lows (prevents long flatlines at 0).
 * @type {number}
 */
export const RISK_METRIC_LOW_FLOOR = 0.1;
/**
 * Concave exponent on adjusted/max ratio; values below 1 lift bear-market risk.
 * @type {number}
 */
export const RISK_METRIC_LOW_END_EXPONENT = 0.6;

/** Risk score at the earliest cycle bottoms (deep historical drawdowns). */
export const RISK_METRIC_FIRST_BOTTOM_TARGET = 0.1;
/** Risk score at later cycle bottoms — shallower raw drawdowns can reach lower risk. */
export const RISK_METRIC_LAST_BOTTOM_TARGET = 0.04;
/** Softer concave curve on the open cycle so modest drawdowns can dip lower. */
export const RISK_METRIC_OPEN_CYCLE_EXPONENT = 0.75;

/** Earliest date included in Running ROI Risk charts (early BTC data skews min–max scaling). */
export const RUNNING_ROI_RISK_DATA_START = '2011-11-01';

/**
 * Exclude price points before the chart epoch.
 */
export function filterPriceDataFromStart(
  data,
  startDate = RUNNING_ROI_RISK_DATA_START
) {
  if (!data || data.length === 0) return [];
  return data.filter((point) => point.time >= startDate);
}

/**
 * Map a single ROI value to [0, 1] using linear min–max scaling.
 */
export function normalizeRunningRoiLinear(roi, minRoi, maxRoi) {
  if (roi == null || !Number.isFinite(roi)) return 0;

  const span = maxRoi - minRoi;
  if (!Number.isFinite(span) || span <= 0) return 0;

  return Math.min(1, Math.max(0, (roi - minRoi) / span));
}

/**
 * Concave map from peak-normalized ROI to 0–1 risk.
 * Lower ROI values lose risk more slowly; cycle peaks (ratio → 1) still map to 1.
 */
export function mapAdjustedRoiToRiskScore(
  adjustedRoi,
  maxRoi,
  {
    lowFloor = RISK_METRIC_LOW_FLOOR,
    exponent = RISK_METRIC_LOW_END_EXPONENT,
  } = {}
) {
  if (adjustedRoi == null || !Number.isFinite(adjustedRoi)) return lowFloor;
  if (!Number.isFinite(maxRoi) || maxRoi <= 0) return lowFloor;

  const ratio = Math.min(1, Math.max(0, adjustedRoi / maxRoi));
  if (ratio <= 0) return lowFloor;
  if (ratio >= 1) return 1;

  return lowFloor + (1 - lowFloor) * Math.pow(ratio, exponent);
}

/**
 * Scaling factors at each cycle peak so normalized peaks align to targetPeak.
 */
export function computePeakScalingFactors(
  peaks = BITCOIN_1Y_ROI_CYCLE_PEAKS,
  targetPeak = RISK_METRIC_TARGET_PEAK
) {
  return peaks.map((peak) => ({
    time: peak.time,
    s: targetPeak / peak.peakRoi,
  }));
}

/**
 * Interpolate scaling factor s at a given date (PiCycleTop-style).
 */
export function interpolateScalingFactor(time, sValues) {
  if (!sValues || sValues.length === 0) return 1;

  const tCurrent = new Date(time).getTime();
  const firstTime = sValues[0].time;
  const lastTime = sValues[sValues.length - 1].time;

  if (time <= firstTime) {
    return sValues[0].s;
  }

  if (time >= lastTime) {
    let rate = 0;
    if (sValues.length >= 2) {
      const last = sValues[sValues.length - 1];
      const secondLast = sValues[sValues.length - 2];
      const tLast = new Date(last.time).getTime();
      const tSecondLast = new Date(secondLast.time).getTime();
      const deltaT = tLast - tSecondLast;
      if (deltaT > 0) {
        rate = (last.s - secondLast.s) / deltaT;
      }
    }
    const tLast = new Date(lastTime).getTime();
    return sValues[sValues.length - 1].s + rate * (tCurrent - tLast);
  }

  for (let j = 0; j < sValues.length - 1; j++) {
    const t0Str = sValues[j].time;
    const t1Str = sValues[j + 1].time;
    if (time >= t0Str && time < t1Str) {
      const t0 = new Date(t0Str).getTime();
      const t1 = new Date(t1Str).getTime();
      const fraction = (tCurrent - t0) / (t1 - t0);
      return sValues[j].s + fraction * (sValues[j + 1].s - sValues[j].s);
    }
  }

  return sValues[sValues.length - 1].s;
}

/**
 * Peak-only diminishing-returns normalization: interpolate scale factors from
 * known cycle peaks so each peak maps to targetPeak (default 1).
 */
export function applyPeakOnlyNormalization(
  roiData,
  peaks = BITCOIN_1Y_ROI_CYCLE_PEAKS,
  targetPeak = RISK_METRIC_TARGET_PEAK
) {
  if (!roiData || roiData.length === 0) return [];

  const sValues = computePeakScalingFactors(peaks, targetPeak);

  return roiData.map((point) => {
    const s = interpolateScalingFactor(point.time, sValues);
    return {
      ...point,
      rawRoi: point.roi,
      roi: point.roi * s,
      scaleFactor: s,
    };
  });
}

/**
 * Auto-detect local maxima in 1Y running ROI for assets without preset peaks.
 */
export function detectLocalCyclePeaks(
  roiData,
  {
    neighborhoodDays = 120,
    minPeakDistanceDays = 280,
    minPeakRoi = 1.2,
  } = {}
) {
  if (!roiData || roiData.length < 3) return [];

  const candidates = [];

  for (let index = 0; index < roiData.length; index++) {
    const point = roiData[index];
    const pointTime = new Date(point.time).getTime();
    if (point.roi < minPeakRoi) continue;

    let isLocalMax = true;
    for (let j = 0; j < roiData.length; j++) {
      if (index === j) continue;
      const other = roiData[j];
      const dayGap = Math.abs(new Date(other.time).getTime() - pointTime) / (1000 * 60 * 60 * 24);
      if (dayGap <= neighborhoodDays && other.roi > point.roi) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax) {
      candidates.push({ time: point.time, peakRoi: point.roi });
    }
  }

  candidates.sort((a, b) => a.time.localeCompare(b.time));
  const peaks = [];

  for (const candidate of candidates) {
    if (peaks.length === 0) {
      peaks.push(candidate);
      continue;
    }

    const last = peaks[peaks.length - 1];
    const dayGap = (new Date(candidate.time).getTime() - new Date(last.time).getTime()) / (1000 * 60 * 60 * 24);

    if (dayGap < minPeakDistanceDays) {
      if (candidate.peakRoi > last.peakRoi) {
        peaks[peaks.length - 1] = candidate;
      }
    } else {
      peaks.push(candidate);
    }
  }

  return peaks;
}

/**
 * Use preset peaks when available (Bitcoin), otherwise auto-detect from ROI data.
 */
export function resolveCyclePeaks(roiData, { presetPeaks = null, minPeaks = 2 } = {}) {
  const peaks = presetPeaks?.length ? presetPeaks : detectLocalCyclePeaks(roiData);
  return peaks.length >= minPeaks ? peaks : [];
}

/**
 * Confirmed troughs only: minimum raw ROI between consecutive peaks.
 * Omits any provisional bottom after the final peak.
 */
export function detectConfirmedCycleBottoms(roiData, peaks) {
  if (!roiData || roiData.length === 0 || !peaks || peaks.length === 0) return [];

  const sortedPeaks = [...peaks].sort((a, b) => a.time.localeCompare(b.time));
  const bottoms = [];

  const beforeFirst = roiData.filter((p) => p.time < sortedPeaks[0].time);
  if (beforeFirst.length > 0) {
    const min = beforeFirst.reduce((best, p) => (p.roi < best.roi ? p : best), beforeFirst[0]);
    bottoms.push({ time: min.time, bottomRoi: min.roi });
  }

  for (let i = 0; i < sortedPeaks.length - 1; i++) {
    const start = sortedPeaks[i].time;
    const end = sortedPeaks[i + 1].time;
    const segment = roiData.filter((p) => p.time > start && p.time < end);
    if (segment.length === 0) continue;

    const min = segment.reduce((best, p) => (p.roi < best.roi ? p : best), segment[0]);
    bottoms.push({ time: min.time, bottomRoi: min.roi });
  }

  return bottoms;
}

/**
 * Later cycle bottoms target lower risk scores (easier to dip on shallower drawdowns).
 */
export function computeBottomRiskTargets(
  bottoms,
  {
    firstTarget = RISK_METRIC_FIRST_BOTTOM_TARGET,
    lastTarget = RISK_METRIC_LAST_BOTTOM_TARGET,
  } = {}
) {
  if (!bottoms || bottoms.length === 0) return [];
  if (bottoms.length === 1) {
    return [{ time: bottoms[0].time, targetRisk: lastTarget }];
  }

  return bottoms.map((bottom, index) => ({
    time: bottom.time,
    targetRisk: firstTarget + (lastTarget - firstTarget) * (index / (bottoms.length - 1)),
  }));
}

function findDiminishedRoiAtTime(diminished, time) {
  const exact = diminished.find((point) => point.time === time);
  if (exact) return exact.roi;

  let closest = null;
  let closestGap = Infinity;
  const targetTime = new Date(time).getTime();

  for (const point of diminished) {
    const gap = Math.abs(new Date(point.time).getTime() - targetTime);
    if (gap < closestGap) {
      closestGap = gap;
      closest = point;
    }
  }

  return closest?.roi ?? null;
}

function riskTargetForTurningPoint(point, targetPeak, bottomTargetByTime) {
  if (point.type === 'peak') return targetPeak;
  return bottomTargetByTime.get(point.time) ?? RISK_METRIC_LOW_FLOOR;
}

function computeAffineCoefficients(raw0, norm0, raw1, norm1) {
  if (Math.abs(raw1 - raw0) < 1e-12) {
    return { a: 1, b: norm0 - raw0 };
  }
  const a = (norm1 - norm0) / (raw1 - raw0);
  const b = norm0 - a * raw0;
  return { a, b };
}

/**
 * Build chronological peak/bottom turning points on peak-normalized ROI.
 */
export function buildCycleTurningPoints(diminished, peaks, bottoms) {
  const points = [];

  peaks.forEach((peak) => {
    points.push({
      time: peak.time,
      roi: findDiminishedRoiAtTime(diminished, peak.time) ?? RISK_METRIC_TARGET_PEAK,
      type: 'peak',
    });
  });

  bottoms.forEach((bottom) => {
    points.push({
      time: bottom.time,
      roi: findDiminishedRoiAtTime(diminished, bottom.time) ?? bottom.bottomRoi,
      type: 'bottom',
    });
  });

  return points.sort((a, b) => a.time.localeCompare(b.time));
}

function findSegmentIndex(time, turningPoints) {
  if (turningPoints.length < 2) return 0;
  if (time <= turningPoints[0].time) return 0;

  for (let i = 0; i < turningPoints.length - 1; i++) {
    if (time >= turningPoints[i].time && time <= turningPoints[i + 1].time) {
      return i;
    }
  }

  return turningPoints.length - 2;
}

function clampRiskScore(value) {
  if (value == null || !Number.isFinite(value)) return RISK_METRIC_LOW_FLOOR;
  return Math.min(1, Math.max(0, value));
}

/**
 * Dual-anchor risk map: peaks → 1, bottoms → decreasing targets over cycles.
 */
export function applyDualAnchorRiskMapping(
  diminished,
  peaks,
  bottoms,
  bottomRiskTargets,
  targetPeak = RISK_METRIC_TARGET_PEAK
) {
  if (!diminished || diminished.length === 0) return [];

  const turningPoints = buildCycleTurningPoints(diminished, peaks, bottoms);
  if (turningPoints.length < 2) {
    const maxRoi = Math.max(...diminished.map((point) => point.roi));
    return diminished.map((point) => {
      const riskScore = mapAdjustedRoiToRiskScore(point.roi, maxRoi);
      return {
        ...point,
        adjustedRoi: point.roi,
        riskScore,
        roi: riskScore,
      };
    });
  }

  const bottomTargetByTime = new Map(
    bottomRiskTargets.map((target) => [target.time, target.targetRisk])
  );

  return diminished.map((point) => {
    const segmentIndex = findSegmentIndex(point.time, turningPoints);
    const p0 = turningPoints[segmentIndex];
    const p1 = turningPoints[segmentIndex + 1];
    const norm0 = riskTargetForTurningPoint(p0, targetPeak, bottomTargetByTime);
    const norm1 = riskTargetForTurningPoint(p1, targetPeak, bottomTargetByTime);
    const { a, b } = computeAffineCoefficients(p0.roi, norm0, p1.roi, norm1);
    const riskScore = clampRiskScore(point.roi * a + b);

    return {
      ...point,
      adjustedRoi: point.roi,
      riskScore,
      roi: riskScore,
      affineA: a,
      affineB: b,
    };
  });
}

/**
 * Completed cycles use dual-anchor peak/bottom mapping; the open cycle after the
 * last peak uses a softer concave map so shallow drawdowns can still dip lower.
 */
export function applyRobustDualAnchorRiskMapping(
  diminished,
  rawRoiData,
  peaks,
  {
    targetPeak = RISK_METRIC_TARGET_PEAK,
    firstBottomTarget = RISK_METRIC_FIRST_BOTTOM_TARGET,
    lastBottomTarget = RISK_METRIC_LAST_BOTTOM_TARGET,
    openCycleExponent = RISK_METRIC_OPEN_CYCLE_EXPONENT,
  } = {}
) {
  if (!diminished || diminished.length === 0 || !peaks || peaks.length === 0) {
    return [];
  }

  const sortedPeaks = [...peaks].sort((a, b) => a.time.localeCompare(b.time));
  const lastPeakTime = sortedPeaks[sortedPeaks.length - 1].time;
  const bottoms = detectConfirmedCycleBottoms(rawRoiData, sortedPeaks);
  const bottomRiskTargets = computeBottomRiskTargets(bottoms, {
    firstTarget: firstBottomTarget,
    lastTarget: lastBottomTarget,
  });

  const historicalPoints = diminished.filter((point) => point.time <= lastPeakTime);
  const openCyclePoints = diminished.filter((point) => point.time > lastPeakTime);

  const mappedHistorical = applyDualAnchorRiskMapping(
    historicalPoints,
    sortedPeaks,
    bottoms,
    bottomRiskTargets,
    targetPeak
  );

  if (openCyclePoints.length === 0) {
    return mappedHistorical;
  }

  const openCycleFloor = bottomRiskTargets.length > 0
    ? bottomRiskTargets[bottomRiskTargets.length - 1].targetRisk
    : RISK_METRIC_LAST_BOTTOM_TARGET;

  const mappedOpen = openCyclePoints.map((point) => {
    const riskScore = clampRiskScore(
      mapAdjustedRoiToRiskScore(point.roi, targetPeak, {
        lowFloor: openCycleFloor,
        exponent: openCycleExponent,
      })
    );
    return {
      ...point,
      adjustedRoi: point.roi,
      riskScore,
      roi: riskScore,
    };
  });

  return [...mappedHistorical, ...mappedOpen];
}

/**
 * ROI Risk series: peak diminishing-returns, dual-anchor drawdown mapping, concave fallback.
 * The roi field holds the final risk score for charting.
 */
export function mapRunningRoiToRiskSeries(
  roiData,
  {
    peaks = null,
    targetPeak = RISK_METRIC_TARGET_PEAK,
    lowFloor = RISK_METRIC_LOW_FLOOR,
    lowEndExponent = RISK_METRIC_LOW_END_EXPONENT,
    firstBottomTarget = RISK_METRIC_FIRST_BOTTOM_TARGET,
    lastBottomTarget = RISK_METRIC_LAST_BOTTOM_TARGET,
  } = {}
) {
  if (!roiData || roiData.length === 0) return [];

  const resolvedPeaks = peaks?.length ? peaks : resolveCyclePeaks(roiData);
  const diminished = resolvedPeaks.length > 0
    ? applyPeakOnlyNormalization(roiData, resolvedPeaks, targetPeak)
    : roiData.map((point) => ({ ...point, rawRoi: point.roi }));

  if (diminished.length === 0) return [];

  if (resolvedPeaks.length >= 2) {
    return applyRobustDualAnchorRiskMapping(diminished, roiData, resolvedPeaks, {
      targetPeak,
      firstBottomTarget,
      lastBottomTarget,
    }).map((point) => ({
      ...point,
      rawRoi: point.rawRoi ?? point.roi,
    }));
  }

  const adjustedRois = diminished
    .map((point) => point.roi)
    .filter((roi) => roi != null && Number.isFinite(roi));

  if (adjustedRois.length === 0) return [];

  const maxRoi = Math.max(...adjustedRois);

  return diminished.map((point) => {
    const riskScore = mapAdjustedRoiToRiskScore(point.roi, maxRoi, {
      lowFloor,
      exponent: lowEndExponent,
    });
    return {
      ...point,
      rawRoi: point.rawRoi ?? point.roi,
      adjustedRoi: point.roi,
      riskScore,
      roi: riskScore,
      maxRoi,
    };
  });
}

/**
 * Running ROI: multiplicative price change over a rolling lookback window.
 * @returns {{ time: string, value: number, roi: number }[]}
 */
export function calculateRunningROI(data, days) {
  if (!data || data.length === 0) return [];

  const result = [];
  const startDate = new Date(data[0].time).getTime();

  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    const currentDate = new Date(item.time).getTime();
    const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);

    if (daysPassed < days) continue;

    const estimatedStartIndex = Math.max(0, index - Math.floor(days));
    let startPrice = item.value;

    for (let j = estimatedStartIndex; j < index; j++) {
      const prevDate = new Date(data[j].time).getTime();
      const daysDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= days) {
        startPrice = data[j].value;
        break;
      }
    }

    const rawRoiMultiplier = startPrice !== 0 ? item.value / startPrice : 1;

    result.push({
      time: item.time,
      value: item.value,
      roi: rawRoiMultiplier,
    });
  }

  return result;
}

/** Supported SMA windows for Running ROI / ROI Risk chart smoothing. */
export const ROI_SMOOTHING_MODES = ['none', 'sma-3', 'sma-7', 'sma-28'];

/**
 * Parse an ROI smoothing mode string to a day count (null = no smoothing).
 */
export function parseRoiSmoothingPeriod(mode) {
  if (!mode || mode === 'none') return null;
  const match = /^sma-(\d+)$/.exec(mode);
  return match ? Number(match[1]) : null;
}

/**
 * Human-readable label for ROI smoothing modes.
 */
export function getRoiSmoothingLabel(mode) {
  const labels = {
    none: 'Daily',
    'sma-3': '3-day SMA',
    'sma-7': '7-day SMA',
    'sma-28': '28-day SMA',
  };
  return labels[mode] || mode;
}

/**
 * Simple moving average on the ROI multiplier; preserves other point fields.
 * Early points before the window is full keep their raw ROI (tx-mvrv pattern).
 */
export function smoothRunningRoiSeries(roiData, period) {
  if (!roiData || roiData.length === 0) return [];
  if (!period || period <= 1) return roiData.map((point) => ({ ...point }));

  return roiData.map((point, index) => {
    if (index < period - 1) {
      return { ...point };
    }
    const window = roiData.slice(index - period + 1, index + 1);
    const avg = window.reduce((sum, item) => sum + item.roi, 0) / period;
    return { ...point, roi: avg };
  });
}

/**
 * Binary zone: active when metric is below threshold (buy on raw ROI).
 */
export function buildBelowThresholdZones(roiData, threshold) {
  if (!roiData || roiData.length === 0 || threshold == null) return [];

  return roiData
    .filter((point) => point.roi < threshold)
    .map((point) => ({
      time: point.time,
      value: 1,
      roi: point.roi,
      price: point.value,
    }));
}

/**
 * Binary zone: active when metric is above threshold (sell on normalized ROI).
 */
export function buildAboveThresholdZones(roiData, threshold) {
  if (!roiData || roiData.length === 0 || threshold == null) return [];

  return roiData
    .filter((point) => point.roi > threshold)
    .map((point) => ({
      time: point.time,
      value: 1,
      roi: point.roi,
      price: point.value,
    }));
}

/**
 * Summarize contiguous buy/sell zones for the under-chart panel.
 */
export function summarizeContiguousZones(zonePoints) {
  if (!zonePoints || zonePoints.length === 0) return [];

  const sorted = [...zonePoints].sort((a, b) => a.time.localeCompare(b.time));
  const ranges = [];
  let current = null;

  for (const point of sorted) {
    if (!current) {
      current = { start: point.time, end: point.time, days: 1, minRoi: point.roi, minPrice: point.price };
      continue;
    }

    const prev = new Date(current.end).getTime();
    const curr = new Date(point.time).getTime();
    const dayGap = (curr - prev) / (1000 * 60 * 60 * 24);

    if (dayGap <= 2) {
      current.end = point.time;
      current.days += 1;
      if (point.roi < current.minRoi) {
        current.minRoi = point.roi;
        current.minPrice = point.price;
      }
    } else {
      ranges.push(current);
      current = { start: point.time, end: point.time, days: 1, minRoi: point.roi, minPrice: point.price };
    }
  }

  if (current) ranges.push(current);
  return ranges;
}

/**
 * Blend two ROI series for smooth chart transitions (progress 0–1).
 */
export function blendRoiSeries(fromSeries, toRoiData, progress) {
  if (!toRoiData || toRoiData.length === 0) return [];
  const toByTime = new Map(toRoiData.map((d) => [d.time, d.roi]));
  const clamped = Math.min(1, Math.max(0, progress));

  if (!fromSeries || fromSeries.length === 0) {
    return toRoiData.map((d) => ({ time: d.time, value: d.roi }));
  }

  return fromSeries.map((point) => {
    const target = toByTime.get(point.time);
    if (target == null) return point;
    return {
      time: point.time,
      value: point.value + (target - point.value) * clamped,
    };
  });
}

/** Smoothstep easing for transitions */
export function easeInOutSmoothstep(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Daily running ROI risk scores (0–1) for composite indicators such as Market Heat Index.
 * Derived client-side from cached BTC price — same inputs as the /running-roi-risk chart.
 *
 * @param {Array<{ time: string, value: number }>} priceData
 * @param {{ peaks?: Array, lookbackDays?: number }} [options]
 * @returns {{ time: string, riskScore: number }[]}
 */
export function calculateRunningRoiRiskSeries(
  priceData,
  { peaks = BITCOIN_1Y_ROI_CYCLE_PEAKS, lookbackDays = 365 } = {}
) {
  const filtered = filterPriceDataFromStart(priceData);
  const roiData = calculateRunningROI(filtered, lookbackDays);
  const riskSeries = mapRunningRoiToRiskSeries(roiData, { peaks });
  return riskSeries.map((point) => ({
    time: point.time,
    riskScore: point.riskScore ?? point.roi ?? 0,
  }));
}

/**
 * Snapshot for Market Heat / signal consumers.
 */
export function getRunningRoiSignalSnapshot(roiData, riskMetricData, buyThreshold, sellThreshold) {
  const latest = roiData[roiData.length - 1];
  const latestRisk = riskMetricData[riskMetricData.length - 1];

  return {
    timeframe: '1y',
    timestamp: latest?.time ?? null,
    rawRoi: latest?.roi ?? null,
    riskMetric: latestRisk?.roi ?? null,
    buySignalThreshold: buyThreshold,
    sellSignalThreshold: sellThreshold,
    inBuyZone: latest != null && latest.roi < buyThreshold,
    inSellZone: latestRisk != null && latestRisk.roi > sellThreshold,
    buyZonePoints: buildBelowThresholdZones(roiData, buyThreshold),
    sellZonePoints: buildAboveThresholdZones(riskMetricData, sellThreshold),
  };
}