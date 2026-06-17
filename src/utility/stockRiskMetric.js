/**
 * Equity risk metric — stable Mayer-style extension with tail compression.
 *
 * Pipeline:
 * 1. price / 200-day SMA (extension ratio)
 * 2. Map into 0–1 via rolling 20th/80th percentile band
 * 3. 21-day EMA smoothing
 * 4. Log-odds tail compression — progressively harder to reach 0 or 1 unless
 *    price extension is genuinely beyond the historical band (earns "extremity credit")
 */

const MA_WINDOW = 200;
const LOOKBACK = 756;
const MIN_LOOKBACK = 126;
const SMOOTH_PERIOD = 21;
const MIN_DATA = MA_WINDOW + MIN_LOOKBACK + SMOOTH_PERIOD;

const P_LOW = 20;
const P_MID = 50;
const P_HIGH = 80;

/** Base log-odds steepness — higher = more time spent away from 0/1 */
const BASE_TAIL_STEEPNESS = 5.5;

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const ema = (values, period) => {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  let prev = values[0];
  return values.map((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    return prev;
  });
};

/**
 * Compress risk toward 0.5 using log-odds scaling.
 * Steepness relaxes when extension is materially beyond the calibration band,
 * so only genuine blow-offs / crashes can reach the outer risk bands.
 */
export const compressRiskTails = (risk, extension, pLow, pMid, pHigh) => {
  const eps = 1e-4;
  const r = clamp(risk, eps, 1 - eps);

  let extremity = 0;
  if (extension > pHigh && pHigh > pMid) {
    extremity = (extension - pHigh) / (pHigh - pMid);
  } else if (extension < pLow && pMid > pLow) {
    extremity = (pLow - extension) / (pMid - pLow);
  }

  // extremity 0 → full compression; extremity ≥ 2 → ~3× easier to reach tails
  const relax = 1 + Math.min(Math.max(extremity, 0), 2);
  const steepness = BASE_TAIL_STEEPNESS / relax;

  const logit = Math.log(r / (1 - r));
  const scaled = logit / steepness;
  return clamp(1 / (1 + Math.exp(-scaled)));
};

export const calculateStockRiskMetric = (data) => {
  if (!data || data.length < MIN_DATA) return [];

  const withMA = data.map((item, index) => {
    const start = Math.max(index - MA_WINDOW + 1, 0);
    const subset = data.slice(start, index + 1);
    const avg =
      subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });

  const warmup = MA_WINDOW;
  const scored = [];

  for (let i = warmup; i < withMA.length; i++) {
    const item = withMA[i];
    if (item.MA <= 0) continue;

    const extension = parseFloat(item.value) / item.MA;
    const windowStart = Math.max(warmup, i - LOOKBACK + 1);
    const extensionWindow = [];

    for (let j = windowStart; j <= i; j++) {
      const row = withMA[j];
      if (row.MA > 0) {
        extensionWindow.push(parseFloat(row.value) / row.MA);
      }
    }

    if (extensionWindow.length < MIN_LOOKBACK) continue;

    const sorted = [...extensionWindow].sort((a, b) => a - b);
    const pLow = percentile(sorted, P_LOW);
    const pMid = percentile(sorted, P_MID);
    const pHigh = percentile(sorted, P_HIGH);
    const span = pHigh - pLow;

    const rawRisk = span <= 1e-9 ? 0.5 : clamp((extension - pLow) / span);

    scored.push({ ...item, RawRisk: rawRisk, extension, pLow, pMid, pHigh });
  }

  if (scored.length === 0) return [];

  const smoothed = ema(
    scored.map((row) => row.RawRisk),
    SMOOTH_PERIOD
  );

  return scored.map((row, idx) => ({
    ...row,
    Risk: compressRiskTails(smoothed[idx], row.extension, row.pLow, row.pMid, row.pHigh),
  }));
};