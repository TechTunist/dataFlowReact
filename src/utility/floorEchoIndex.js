/**
 * Floor Echo Index (FEI)
 *
 * Novel cross-workbench capitulation confluence indicator for Bitcoin cycle bottoms.
 * Combines crypto on-chain, sentiment, macro stress, dominance/alt-season, network
 * activity, and crypto-equity (MSTR vs BTC) into a single oscillator that tends to
 * bottom at prior cycle lows — when multiple independent datasets capitulate together.
 *
 * Low FEI ≈ floor echo zone (potential cycle bottom forming).
 * High FEI ≈ recovery / mid-cycle.
 */

import { normalizeDateKey } from './marketHeatUtils';

/** Crypto-native inputs only — macro/MSTR fire early in bears (e.g. 2022) before price floors. */
export const FLOOR_ECHO_WEIGHTS = {
  fearGreed: 0.18,
  onChainRisk: 0.30,
  txActivity: 0.16,
  altRegime: 0.18,
  minerStress: 0.18,
};

/** Optional macro/equity layer (excluded from floor echo by default). */
export const FLOOR_ECHO_MACRO_WEIGHTS = {
  macroStress: 0.18,
  cryptoEquity: 0.10,
  liquidityStress: 0.06,
};

export const FLOOR_ECHO_ROLLING_DAYS = 1460;
export const FLOOR_ECHO_SMOOTH_DAYS = 14;
export const FLOOR_ECHO_DRAWDOWN_LOOKBACK = 730;
/** Below ~30% off rolling peak, capitulation is heavily dampened. */
export const FLOOR_ECHO_DRAWDOWN_SOFT = 0.30;
/** Above ~55% off rolling peak, full capitulation score applies. */
export const FLOOR_ECHO_DRAWDOWN_FULL = 0.55;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Rolling percentile rank of value at index (0 = lowest in window, 1 = highest). */
export function rollingPercentileRank(values, index, window = FLOOR_ECHO_ROLLING_DAYS) {
  const start = Math.max(0, index - window + 1);
  const slice = values.slice(start, index + 1).filter((v) => v != null && isFinite(v));
  const current = values[index];
  if (!slice.length || current == null || !isFinite(current)) return null;
  if (slice.length === 1) return 0.5;
  const below = slice.filter((v) => v < current).length;
  return below / (slice.length - 1);
}

/** Expanding (historical) percentile rank — compares value to all prior observations. */
export function expandingPercentileRank(values, index) {
  const slice = values.slice(0, index + 1).filter((v) => v != null && isFinite(v));
  const current = values[index];
  if (!slice.length || current == null || !isFinite(current)) return null;
  if (slice.length === 1) return 0.5;
  const below = slice.filter((v) => v < current).length;
  return below / (slice.length - 1);
}

/** Full-sample percentile rank — aligns extremes across cycles on the complete series. */
export function globalPercentileRank(values, index) {
  const current = values[index];
  if (current == null || !isFinite(current)) return null;
  const valid = values.filter((v) => v != null && isFinite(v));
  if (valid.length <= 1) return 0.5;
  const below = valid.filter((v) => v < current).length;
  return below / (valid.length - 1);
}

/** Fixed reference bands — cycle bottoms cluster near these after historical calibration. */
export const FLOOR_ECHO_FIXED_FLOOR_BAND = 12;
export const FLOOR_ECHO_FIXED_ECHO_BAND = 20;

export const FLOOR_ECHO_SMOOTHING_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 28, label: '28 Days' },
  { value: 90, label: '3 Months' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '12 Months' },
];

/** Simple moving average for display smoothing of precomputed FEI. */
export function applyFeiSmoothing(series, period = 7) {
  if (!series?.length || !period || period <= 1) return series || [];
  return series.map((row, i) => {
    const start = Math.max(0, i - period + 1);
    const slice = series.slice(start, i + 1).map((d) => d.fei).filter((v) => v != null && isFinite(v));
    if (!slice.length) return { ...row, fei: null };
    const fei = slice.reduce((s, v) => s + v, 0) / slice.length;
    return { ...row, fei };
  }).filter((row) => row.fei != null && isFinite(row.fei));
}

export function buildLocfMap(series, valueKey = 'value') {
  const map = new Map();
  (series || []).forEach((item) => {
    const time = normalizeDateKey(item.time || item.date || item.end_date);
    const val = parseFloat(item[valueKey]);
    if (time && isFinite(val)) map.set(time, val);
  });
  return map;
}

export function locfLookup(map, times, index) {
  let last = null;
  for (let i = 0; i <= index; i++) {
    const t = times[i];
    if (map.has(t)) last = map.get(t);
  }
  return last;
}

/**
 * Relative performance index: (asset/asset0) / (btc/btc0) * 100 at first overlap.
 */
export function buildRelativePerformanceMap(assetSeries, btcSeries) {
  if (!assetSeries?.length || !btcSeries?.length) return new Map();

  const assetMap = buildLocfMap(assetSeries);
  const btcMap = buildLocfMap(btcSeries);
  const times = [...new Set([...assetMap.keys(), ...btcMap.keys()])].sort();
  const startA = [...assetMap.keys()].sort()[0];
  const startB = [...btcMap.keys()].sort()[0];
  const anchor = startA > startB ? startA : startB;

  let lastA = null;
  let lastB = null;
  let a0 = null;
  let b0 = null;
  const out = new Map();

  for (const t of times) {
    if (assetMap.has(t)) lastA = assetMap.get(t);
    if (btcMap.has(t)) lastB = btcMap.get(t);
    if (t < anchor) continue;
    if (a0 == null && lastA > 0 && lastB > 0) {
      a0 = lastA;
      b0 = lastB;
    }
    if (a0 > 0 && b0 > 0 && lastA > 0 && lastB > 0) {
      const rel = ((lastA / a0) / (lastB / b0)) * 100;
      out.set(t, rel);
    }
  }
  return out;
}

function avgDefined(values) {
  const valid = values.filter((v) => v != null && isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/** Rolling peak drawdown for BTC (0 = at high, 0.55 = 55% below ~2yr high). */
export function btcDrawdownFromPeak(btcPrices, index, lookback = FLOOR_ECHO_DRAWDOWN_LOOKBACK) {
  const start = Math.max(0, index - lookback + 1);
  const slice = btcPrices.slice(start, index + 1).filter((p) => p > 0 && isFinite(p));
  const current = btcPrices[index];
  if (!slice.length || !current) return 0;
  const peak = Math.max(...slice);
  return peak > 0 ? clamp01(1 - current / peak) : 0;
}

/**
 * Scales capitulation by drawdown depth so shallow corrections (e.g. 60k→40k)
 * do not produce full floor-echo readings.
 */
export function btcDrawdownDampening(
  drawdown,
  soft = FLOOR_ECHO_DRAWDOWN_SOFT,
  full = FLOOR_ECHO_DRAWDOWN_FULL,
) {
  if (drawdown <= soft) return 0.35;
  if (drawdown >= full) return 1;
  return 0.35 + (0.65 * (drawdown - soft) / (full - soft));
}

/**
 * @param {object} inputs - aligned workbench datasets
 * @returns {{ time, fei, capitulation, btcPrice, inFloorZone, components }[]}
 */
export function computeFloorEchoIndex({
  btcData = [],
  fearAndGreedData = [],
  mvrvRiskData = [],
  puellRiskData = [],
  soplRiskData = [],
  minerCapThermoCapRiskData = [],
  txCountData = [],
  dominanceData = [],
  altcoinSeasonTimeseriesData = [],
  fredVix = [],
  fredUmcsent = [],
  fredT10y2y = [],
  mstrRelativeMap = new Map(),
  weights = FLOOR_ECHO_WEIGHTS,
  macroWeights = null,
  rollingDays = FLOOR_ECHO_ROLLING_DAYS,
  smoothDays = FLOOR_ECHO_SMOOTH_DAYS,
  drawdownLookback = FLOOR_ECHO_DRAWDOWN_LOOKBACK,
  useDrawdownDampening = true,
} = {}) {
  if (!btcData.length) return [];

  const times = btcData.map((d) => normalizeDateKey(d.time)).filter(Boolean);
  const btcMap = buildLocfMap(btcData);

  const fgMap = new Map();
  fearAndGreedData.forEach((item) => {
    const t = item.timestamp
      ? new Date(item.timestamp * 1000).toISOString().split('T')[0]
      : normalizeDateKey(item.time);
    const v = parseFloat(item.value);
    if (t && isFinite(v)) fgMap.set(t, v);
  });

  const riskMaps = {
    mvrv: buildLocfMap(mvrvRiskData, 'Risk'),
    puell: buildLocfMap(puellRiskData, 'Risk'),
    sopl: buildLocfMap(soplRiskData, 'Risk'),
    miner: buildLocfMap(minerCapThermoCapRiskData, 'Risk'),
  };
  const txMap = buildLocfMap(txCountData);
  const domMap = new Map();
  (dominanceData || []).forEach((item) => {
    const t = normalizeDateKey(item.time);
    const v = parseFloat(item.btc);
    if (t && isFinite(v)) domMap.set(t, v);
  });
  const altMap = new Map();
  (altcoinSeasonTimeseriesData || []).forEach((item) => {
    const t = normalizeDateKey(item.time);
    const v = parseFloat(item.index);
    if (t && isFinite(v)) altMap.set(t, v);
  });
  const vixMap = buildLocfMap(fredVix);
  const umcsentMap = buildLocfMap(fredUmcsent);
  const t10y2yMap = buildLocfMap(fredT10y2y);

  const rawSeries = times.map((time, i) => {
    const btcPrice = locfLookup(btcMap, times, i);
    const fg = locfLookup(fgMap, times, i);
    const mvrv = locfLookup(riskMaps.mvrv, times, i);
    const puell = locfLookup(riskMaps.puell, times, i);
    const sopl = locfLookup(riskMaps.sopl, times, i);
    const miner = locfLookup(riskMaps.miner, times, i);
    const tx = locfLookup(txMap, times, i);
    const dom = locfLookup(domMap, times, i);
    const alt = locfLookup(altMap, times, i);
    const vix = locfLookup(vixMap, times, i);
    const umcsent = locfLookup(umcsentMap, times, i);
    const t10y2y = locfLookup(t10y2yMap, times, i);
    const mstrRel = locfLookup(mstrRelativeMap, times, i);

    const components = {};

    if (fg != null) components.fearGreed = clamp01(1 - fg / 100);
    if (mvrv != null || puell != null || sopl != null) {
      components.onChainRisk = clamp01(1 - avgDefined([mvrv, puell, sopl].filter((v) => v != null)));
    }
    if (tx != null) components.txRaw = tx;
    if (dom != null) components.domRaw = dom;
    if (alt != null) components.altRaw = alt;
    if (vix != null) components.vixRaw = vix;
    if (umcsent != null) components.umcsentRaw = umcsent;
    if (t10y2y != null) components.t10y2yRaw = t10y2y;
    if (mstrRel != null) components.mstrRelRaw = mstrRel;
    if (miner != null) components.minerRaw = miner;

    return { time, btcPrice, components };
  });

  const txVals = rawSeries.map((r) => r.components.txRaw ?? null);
  const domVals = rawSeries.map((r) => r.components.domRaw ?? null);
  const altVals = rawSeries.map((r) => r.components.altRaw ?? null);
  const vixVals = rawSeries.map((r) => r.components.vixRaw ?? null);
  const umcsentVals = rawSeries.map((r) => r.components.umcsentRaw ?? null);
  const t10y2yVals = rawSeries.map((r) => r.components.t10y2yRaw ?? null);
  const mstrVals = rawSeries.map((r) => r.components.mstrRelRaw ?? null);
  const minerVals = rawSeries.map((r) => r.components.minerRaw ?? null);

  const withStress = rawSeries.map((row, i) => {
    const c = { ...row.components };
    const stressParts = {};

    if (c.fearGreed != null) stressParts.fearGreed = c.fearGreed;
    if (c.onChainRisk != null) stressParts.onChainRisk = c.onChainRisk;

    const txRank = expandingPercentileRank(txVals, i);
    if (txRank != null) stressParts.txActivity = clamp01(1 - txRank);

    const domRank = expandingPercentileRank(domVals, i);
    const altRank = expandingPercentileRank(altVals, i);
    if (domRank != null || altRank != null) {
      stressParts.altRegime = clamp01(avgDefined([
        domRank != null ? domRank : null,
        altRank != null ? 1 - altRank : null,
      ].filter((v) => v != null)));
    }

    const vixRank = expandingPercentileRank(vixVals, i);
    const umcsentRank = expandingPercentileRank(umcsentVals, i);
    const t10y2yRank = expandingPercentileRank(t10y2yVals, i);
    if (vixRank != null || umcsentRank != null || t10y2yRank != null) {
      stressParts.macroStress = clamp01(avgDefined([
        vixRank,
        umcsentRank != null ? 1 - umcsentRank : null,
        t10y2yRank != null ? 1 - t10y2yRank : null,
      ].filter((v) => v != null)));
    }

    const mstrRank = expandingPercentileRank(mstrVals, i);
    if (mstrRank != null) stressParts.cryptoEquity = clamp01(1 - mstrRank);

    const minerRank = expandingPercentileRank(minerVals, i);
    if (minerRank != null) stressParts.minerStress = clamp01(1 - minerRank);

    if (stressParts.macroStress != null && t10y2yRank != null) {
      stressParts.liquidityStress = clamp01(1 - t10y2yRank);
    }

    const activeWeights = { ...weights };
    if (macroWeights) {
      Object.assign(activeWeights, macroWeights);
    }

    let capitulation = 0;
    let totalWeight = 0;
    for (const [key, w] of Object.entries(activeWeights)) {
      if (stressParts[key] != null) {
        capitulation += stressParts[key] * w;
        totalWeight += w;
      }
    }
    if (totalWeight === 0) return { ...row, capitulation: null, feiRaw: null, stressParts };

    capitulation /= totalWeight;
    return { ...row, capitulation, feiRaw: null, stressParts };
  });

  const btcPrices = withStress.map((r) => r.btcPrice ?? null);
  const withDrawdown = withStress.map((row, i) => {
    if (row.capitulation == null) return row;
    const drawdown = btcDrawdownFromPeak(btcPrices, i, drawdownLookback);
    const dampening = useDrawdownDampening ? btcDrawdownDampening(drawdown) : 1;
    const adjustedCapitulation = row.capitulation * dampening;
    return { ...row, drawdown, dampening, capitulation: adjustedCapitulation };
  });

  const capVals = withDrawdown.map((r) => r.capitulation);
  const withFeiRaw = withDrawdown.map((row, i) => {
    if (row.capitulation == null) return row;
    const capRank = globalPercentileRank(capVals, i);
    if (capRank == null) return row;
    const feiRaw = 100 * (1 - capRank);
    return { ...row, feiRaw, capRank };
  });

  const feiVals = withFeiRaw.map((r) => r.feiRaw);
  const smoothed = withFeiRaw.map((row, i) => {
    if (row.feiRaw == null) return { ...row, fei: null };
    const start = Math.max(0, i - smoothDays + 1);
    const slice = feiVals.slice(start, i + 1).filter((v) => v != null && isFinite(v));
    if (!slice.length) return { ...row, fei: null };
    const fei = slice.reduce((s, v) => s + v, 0) / slice.length;
    return { ...row, fei };
  });

  const validFei = smoothed.map((r) => r.fei).filter((v) => v != null && isFinite(v));
  if (!validFei.length) return [];

  const levels = getFloorEchoReferenceLevels(
    smoothed.filter((r) => r.fei != null && isFinite(r.fei)).map((r) => ({ fei: r.fei }))
  );
  const floorBand = levels.floorBand ?? FLOOR_ECHO_FIXED_FLOOR_BAND;
  const echoBand = levels.echoBand ?? FLOOR_ECHO_FIXED_ECHO_BAND;

  return smoothed
    .filter((r) => r.fei != null && isFinite(r.fei))
    .map((r) => ({
      time: r.time,
      fei: r.fei,
      capitulation: r.capitulation,
      btcPrice: r.btcPrice,
      inFloorZone: r.fei <= echoBand * 1.12 && (r.dampening ?? 1) >= 0.75,
      nearHistoricFloor: r.fei <= floorBand * 1.2 && (r.dampening ?? 1) >= 0.85,
      drawdown: r.drawdown,
      dampening: r.dampening,
      stressParts: r.stressParts,
    }));
}

/** Per-component weighted contribution to capitulation (for diagnostics). */
export function getFloorEchoComponentContributions(stressParts, weights = FLOOR_ECHO_WEIGHTS) {
  if (!stressParts) return [];
  let totalWeight = 0;
  const rows = [];
  for (const [key, w] of Object.entries(weights)) {
    if (stressParts[key] != null) {
      rows.push({ key, weight: w, stress: stressParts[key], contribution: stressParts[key] * w });
      totalWeight += w;
    }
  }
  if (!totalWeight) return [];
  return rows
    .map((r) => ({ ...r, share: (r.contribution / totalWeight) }))
    .sort((a, b) => b.share - a.share);
}

/** Reference levels derived from FEI history (prior bottom clusters). */
export function getFloorEchoReferenceLevels(series) {
  const feiValues = (series || []).map((d) => d.fei).filter((v) => isFinite(v));
  if (!feiValues.length) return { floorBand: null, echoBand: null, median: null };
  const sorted = [...feiValues].sort((a, b) => a - b);
  return {
    floorBand: sorted[Math.floor(sorted.length * 0.08)] ?? sorted[0],
    echoBand: sorted[Math.floor(sorted.length * 0.15)] ?? sorted[0],
    median: sorted[Math.floor(sorted.length * 0.5)] ?? sorted[0],
  };
}

export function getCurrentFloorEchoState(series) {
  if (!series?.length) return null;
  const last = series[series.length - 1];
  const levels = getFloorEchoReferenceLevels(series);
  return {
    ...last,
    levels,
    signal: last.nearHistoricFloor
      ? 'Floor Echo: approaching prior bottom cluster'
      : last.inFloorZone
        ? 'Capitulation zone: watch for local minimum'
        : last.fei < (levels.median ?? 50)
          ? 'Below median: cooling'
          : 'Neutral / recovery',
  };
}