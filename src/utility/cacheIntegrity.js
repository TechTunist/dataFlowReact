/**
 * Detect gaps and corrupt flat runs in cached daily time series.
 * Used to invalidate IndexedDB entries that have a recent last date but missing/bad middle data.
 */

function parsePointTime(point) {
  if (!point) return null;
  if (point.time) {
    const t = new Date(point.time);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  if (point.timestamp != null) {
    const ts = Number(point.timestamp);
    const ms = ts > 1e12 ? ts : ts * 1000;
    const t = new Date(ms);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  if (point.date) {
    const t = new Date(point.date);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  return null;
}

function getPointValue(point) {
  if (point == null) return null;
  const raw = point.value ?? point.close ?? point.y;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {Array|object} data - cached series (sorted or unsorted)
 * @param {object} options
 * @param {boolean} options.daily - expect consecutive calendar days (crypto etc.)
 * @param {number} options.maxGapDays - gap larger than this flags an issue (default 1)
 * @param {number} options.minFlatRunDays - identical value this many days in a row flags corruption
 * @returns {{ hasIssues: boolean, gapCount: number, maxGapDays: number, flatRunDays: number, reasons: string[] }}
 */
export function detectTimeSeriesIntegrityIssues(data, options = {}) {
  const {
    daily = true,
    maxGapDays = 1,
    minFlatRunDays = 7,
  } = options;

  const reasons = [];
  const arr = Array.isArray(data) ? data : data ? [data] : [];
  if (arr.length < 2) {
    return { hasIssues: false, gapCount: 0, maxGapDays: 0, flatRunDays: 0, reasons };
  }

  const sorted = [...arr]
    .map((p) => ({ point: p, time: parsePointTime(p), value: getPointValue(p) }))
    .filter((p) => p.time != null)
    .sort((a, b) => a.time - b.time);

  if (sorted.length < 2) {
    return { hasIssues: false, gapCount: 0, maxGapDays: 0, flatRunDays: 0, reasons };
  }

  let gapCount = 0;
  let largestGap = 0;

  if (daily) {
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].time;
      const curr = sorted[i].time;
      const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
      if (diffDays > maxGapDays) {
        gapCount++;
        largestGap = Math.max(largestGap, diffDays);
      }
    }
    if (gapCount > 0) {
      reasons.push(`gaps:${gapCount},maxGap:${largestGap}d`);
    }
  }

  let flatRunDays = 0;
  let runLen = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevVal = sorted[i - 1].value;
    const currVal = sorted[i].value;
    if (prevVal != null && currVal != null && prevVal === currVal) {
      runLen++;
      flatRunDays = Math.max(flatRunDays, runLen);
    } else {
      runLen = 1;
    }
  }
  if (flatRunDays >= minFlatRunDays) {
    reasons.push(`flatRun:${flatRunDays}d`);
  }

  const hasIssues = reasons.length > 0;
  return { hasIssues, gapCount, maxGapDays: largestGap, flatRunDays, reasons };
}

/**
 * Merge integrity rules for cache config (daily price series).
 */
export function shouldInvalidateDailyCache(cachedData, useDateCheck) {
  if (!useDateCheck || !cachedData) return false;
  return detectTimeSeriesIntegrityIssues(cachedData, {
    daily: true,
    maxGapDays: 1,
    minFlatRunDays: 7,
  }).hasIssues;
}