/**
 * Ratio comparison utilities for Workbench derived series.
 *
 * Anchor: first date both series have data (start of the shorter-history / "younger" series).
 * All ratio outputs are computed from that anchor forward using LOCF alignment.
 */

/** @typedef {'relative_performance' | 'spread' | 'rolling_zscore'} RatioOutputType */

/**
 * Find anchor date = later of the two series start dates (younger dataset boundary).
 * @param {{ time: string, value: number }[]} series1
 * @param {{ time: string, value: number }[]} series2
 * @returns {string | null}
 */
export function findRatioAnchorTime(series1, series2) {
  if (!series1?.length || !series2?.length) return null;
  const start1 = series1[0].time;
  const start2 = series2[0].time;
  return start1 > start2 ? start1 : start2;
}

/**
 * LOCF-align two normalized series from anchor forward (only times where both sides are defined).
 * @returns {{ anchorTime: string, a0: number, b0: number, aligned: { time: string, v1: number, v2: number }[] } | null}
 */
export function alignSeriesFromAnchor(series1, series2) {
  const anchorTime = findRatioAnchorTime(series1, series2);
  if (!anchorTime) return null;

  const map1 = new Map(series1.map((d) => [d.time, d.value]));
  const map2 = new Map(series2.map((d) => [d.time, d.value]));
  const allTimes = [...new Set([...series1.map((d) => d.time), ...series2.map((d) => d.time)])].sort();

  let last1 = null;
  let last2 = null;
  for (const t of allTimes) {
    if (t < anchorTime) {
      if (map1.has(t)) last1 = map1.get(t);
      if (map2.has(t)) last2 = map2.get(t);
      continue;
    }
    if (map1.has(t)) last1 = map1.get(t);
    if (map2.has(t)) last2 = map2.get(t);
    break;
  }

  if (last1 == null || last2 == null || !isFinite(last1) || !isFinite(last2) || last1 <= 0 || last2 <= 0) {
    return null;
  }

  const a0 = last1;
  const b0 = last2;
  const aligned = [];

  for (const t of allTimes) {
    if (t < anchorTime) continue;
    if (map1.has(t)) last1 = map1.get(t);
    if (map2.has(t)) last2 = map2.get(t);
    if (last1 != null && last2 != null && isFinite(last1) && isFinite(last2) && last1 > 0 && last2 > 0) {
      aligned.push({ time: t, v1: last1, v2: last2 });
    }
  }

  if (aligned.length === 0) return null;
  return { anchorTime, a0, b0, aligned };
}

const rollingStd = (values) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Compute ratio comparison points with all display fields stored on each point.
 * @param {{ time: string, value: number }[]} series1 - numerator
 * @param {{ time: string, value: number }[]} series2 - denominator
 * @param {{ ratioOutput?: RatioOutputType, zscoreWindow?: number }} options
 * @returns {{ anchorTime: string, points: object[] } | null}
 */
export function computeRatioComparison(series1, series2, options = {}) {
  const { ratioOutput = 'relative_performance', zscoreWindow = 252 } = options;
  const alignment = alignSeriesFromAnchor(series1, series2);
  if (!alignment) return null;

  const { anchorTime, a0, b0, aligned } = alignment;
  const rawRatios = aligned.map(({ time, v1, v2 }) => ({ time, rawRatio: v1 / v2 }));

  const minZPeriods = Math.max(10, Math.floor(zscoreWindow / 4));

  const points = aligned.map(({ time, v1, v2 }, i) => {
    const idx1 = (v1 / a0) * 100;
    const idx2 = (v2 / b0) * 100;
    const relative = (idx1 / idx2) * 100;
    const spread = idx1 - idx2;
    const logSpread = Math.log(v1 / a0) - Math.log(v2 / b0);
    const rawRatio = v1 / v2;

    let zscore = null;
    const windowSlice = rawRatios.slice(Math.max(0, i - zscoreWindow + 1), i + 1);
    if (windowSlice.length >= minZPeriods) {
      const vals = windowSlice.map((w) => w.rawRatio);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const std = rollingStd(vals);
      zscore = std > 0 ? (rawRatio - mean) / std : 0;
    }

    return {
      time,
      relative,
      spread,
      logSpread,
      rawRatio,
      zscore,
      value: pickRatioDisplayValue({ relative, spread, logSpread, zscore }, ratioOutput, 0),
    };
  });

  const filtered = ratioOutput === 'rolling_zscore'
    ? points.filter((p) => p.zscore != null && isFinite(p.zscore))
    : points.filter((p) => p.value != null && isFinite(p.value));

  if (filtered.length === 0) return null;
  return { anchorTime, points: filtered };
}

/**
 * Pick the chart value for a ratio point based on output type and global scale mode.
 * scaleMode: 0 = linear, 1 = logarithmic
 * @param {object} point
 * @param {RatioOutputType} ratioOutput
 * @param {number} scaleMode
 * @returns {number | null}
 */
export function pickRatioDisplayValue(point, ratioOutput, scaleMode) {
  if (!point) return null;
  if (ratioOutput === 'rolling_zscore') {
    return point.zscore != null && isFinite(point.zscore) ? point.zscore : null;
  }
  if (scaleMode === 1) {
    return point.logSpread != null && isFinite(point.logSpread) ? point.logSpread : null;
  }
  if (ratioOutput === 'spread') {
    return point.spread != null && isFinite(point.spread) ? point.spread : null;
  }
  return point.relative != null && isFinite(point.relative) && point.relative > 0 ? point.relative : null;
}

/**
 * Resolve derived ratio points to sparse chart points for a given scale mode.
 * @param {object} def - derived series definition
 * @param {object[]} points - enriched ratio points
 * @param {number} scaleMode
 * @returns {{ time: string, value: number }[]}
 */
export function resolveRatioChartPoints(def, points, scaleMode) {
  if (!def?.ratioOutput || !Array.isArray(points)) return [];
  return points
    .map((p) => {
      const value = pickRatioDisplayValue(p, def.ratioOutput, scaleMode);
      return value != null && isFinite(value) ? { time: p.time, value } : null;
    })
    .filter(Boolean);
}

/**
 * Whether log y-axis is appropriate for this ratio def at the current scale toggle.
 * @param {object} def
 * @param {number} scaleMode
 * @returns {boolean}
 */
export function ratioAllowsLogScale(def, scaleMode) {
  if (!def?.ratioOutput) return def?.allowLogScale !== false;
  if (def.ratioOutput === 'rolling_zscore') return false;
  if (scaleMode === 1) return false;
  return def.ratioOutput === 'relative_performance';
}

/**
 * Human-readable description for ratio derived defs.
 */
export function describeRatioDerived(def, getSeriesLabel) {
  const l1 = getSeriesLabel(def.series1);
  const l2 = getSeriesLabel(def.series2);
  const anchor = def.anchorTime ? ` from ${def.anchorTime}` : '';
  if (def.ratioOutput === 'rolling_zscore') {
    return `${l1}/${l2} z-score (${def.zscoreWindow || 252}d)${anchor}`;
  }
  if (def.ratioOutput === 'spread') {
    return `${l1} − ${l2} spread${anchor}`;
  }
  return `${l1} rel. ${l2}${anchor}`;
}