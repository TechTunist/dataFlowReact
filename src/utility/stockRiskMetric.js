/**
 * Equity risk metric, stable Mayer-style extension with tail compression.
 *
 * v1 pipeline:
 * 1. price / 200-day SMA (extension ratio)
 * 2. Map into 0–1 via rolling 20th/80th percentile band
 * 3. 21-day EMA smoothing
 * 4. Log-odds tail compression
 *
 * v2: identical pipeline with extremity-aware upward resistance on the smoothed
 * score before tail compression. Grinds face progressive drag above 0.5; genuine
 * blow-offs (extension far above the rolling upper band) bypass resistance so
 * risk can briefly reach ~1.0, then fall back as the band catches up.
 */

const MA_WINDOW = 200;
const LOOKBACK = 756;
const MIN_LOOKBACK = 126;
const SMOOTH_PERIOD = 21;
const MIN_DATA = MA_WINDOW + MIN_LOOKBACK + SMOOTH_PERIOD;

const P_LOW = 20;
const P_MID = 50;
const P_HIGH = 80;

/** Base log-odds steepness, higher = more time spent away from 0/1 */
const BASE_TAIL_STEEPNESS = 5.5;

export const STOCK_RISK_METRIC_VERSIONS = {
  v1: { label: 'Stable (v1)', description: '200-day MA + rolling percentile + tail compression' },
  v2: {
    label: 'High-band resistance (v2)',
    description: 'v1 with grind resistance above 0.5; blow-offs can still reach ~1.0 briefly',
  },
};

export const STOCK_RISK_V2_DEFAULTS = {
  onset: 0.5,
  stepSize: 0.01,
  resistancePerStep: 0.07,
  /** Extension credit (× upper-band width) needed to fully bypass upward resistance. */
  extremityFullPass: 1.2,
};

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

const computeMovingAverage = (data, maWindow) =>
  data.map((item, index) => {
    const start = Math.max(index - maWindow + 1, 0);
    const subset = data.slice(start, index + 1);
    const avg =
      subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });

const computeExtensionScores = (
  withMA,
  {
    maWindow = MA_WINDOW,
    lookback = LOOKBACK,
    minLookback = MIN_LOOKBACK,
  } = {}
) => {
  const warmup = maWindow;
  const scored = [];

  for (let i = warmup; i < withMA.length; i++) {
    const item = withMA[i];
    if (item.MA <= 0) continue;

    const extension = parseFloat(item.value) / item.MA;
    const windowStart = Math.max(warmup, i - lookback + 1);
    const extensionWindow = [];

    for (let j = windowStart; j <= i; j++) {
      const row = withMA[j];
      if (row.MA > 0) {
        extensionWindow.push(parseFloat(row.value) / row.MA);
      }
    }

    if (extensionWindow.length < minLookback) continue;

    const sorted = [...extensionWindow].sort((a, b) => a - b);
    const pLow = percentile(sorted, P_LOW);
    const pMid = percentile(sorted, P_MID);
    const pHigh = percentile(sorted, P_HIGH);
    const span = pHigh - pLow;
    const rawRisk = span <= 1e-9 ? 0.5 : clamp((extension - pLow) / span);

    scored.push({ ...item, RawRisk: rawRisk, extension, pLow, pMid, pHigh });
  }

  return scored;
};

/**
 * Progressively dampens risk above onset. Each 0.01 band requires more
 * underlying momentum to penetrate — delays early high readings during
 * steady grinds higher while leaving sub-onset behaviour unchanged.
 */
export const applyUpwardResistance = (risk, options = {}) => {
  const {
    onset = STOCK_RISK_V2_DEFAULTS.onset,
    stepSize = STOCK_RISK_V2_DEFAULTS.stepSize,
    resistancePerStep = STOCK_RISK_V2_DEFAULTS.resistancePerStep,
  } = options;

  const clamped = clamp(risk);
  if (clamped <= onset) return clamped;

  let output = onset;
  let inputPos = onset;
  let band = 0;

  while (inputPos < clamped - 1e-9) {
    const nextInput = Math.min(clamped, inputPos + stepSize);
    const inputMarginal = nextInput - inputPos;
    const resistanceFactor = 1 / (1 + resistancePerStep * band);
    output += inputMarginal * resistanceFactor;
    inputPos = nextInput;
    band += 1;
  }

  return clamp(output);
};

const extensionExtremity = (extension, pLow, pMid, pHigh) => {
  if (extension > pHigh && pHigh > pMid) {
    return (extension - pHigh) / (pHigh - pMid);
  }
  if (extension < pLow && pMid > pLow) {
    return (pLow - extension) / (pMid - pLow);
  }
  return 0;
};

/**
 * Delays grind-high readings via upward resistance, but relaxes toward the raw
 * smoothed score as extension proves genuinely extreme (brief blow-off spikes).
 */
export const applyExtremityAwareUpwardResistance = (
  smoothedRisk,
  extension,
  pLow,
  pMid,
  pHigh,
  options = {}
) => {
  const {
    extremityFullPass = STOCK_RISK_V2_DEFAULTS.extremityFullPass,
    ...resistanceOptions
  } = options;

  if (smoothedRisk <= (resistanceOptions.onset ?? STOCK_RISK_V2_DEFAULTS.onset)) {
    return smoothedRisk;
  }

  const resisted = applyUpwardResistance(smoothedRisk, resistanceOptions);
  const upperExtremity = Math.max(0, extensionExtremity(extension, pLow, pMid, pHigh));
  const relax = clamp(upperExtremity / extremityFullPass, 0, 1);

  return resisted * (1 - relax) + smoothedRisk * relax;
};

/**
 * Compress risk toward 0.5 using log-odds scaling.
 * Steepness relaxes when extension is materially beyond the calibration band,
 * so only genuine blow-offs / crashes can reach the outer risk bands.
 */
export const compressRiskTails = (
  risk,
  extension,
  pLow,
  pMid,
  pHigh,
  baseTailSteepness = BASE_TAIL_STEEPNESS
) => {
  const eps = 1e-4;
  const r = clamp(risk, eps, 1 - eps);

  let extremity = 0;
  if (extension > pHigh && pHigh > pMid) {
    extremity = (extension - pHigh) / (pHigh - pMid);
  } else if (extension < pLow && pMid > pLow) {
    extremity = (pLow - extension) / (pMid - pLow);
  }

  const relax = 1 + Math.min(Math.max(extremity, 0), 2);
  const steepness = baseTailSteepness / relax;

  const logit = Math.log(r / (1 - r));
  const scaled = logit / steepness;
  return clamp(1 / (1 + Math.exp(-scaled)));
};

const runStockRiskPipeline = (data, { applyResistance = false, resistanceOptions } = {}) => {
  if (!data || data.length < MIN_DATA) return [];

  const withMA = computeMovingAverage(data, MA_WINDOW);
  const scored = computeExtensionScores(withMA);

  if (scored.length === 0) return [];

  const smoothed = ema(
    scored.map((row) => row.RawRisk),
    SMOOTH_PERIOD
  );

  return scored.map((row, idx) => {
    const smoothedRisk = smoothed[idx];
    const adjustedSmoothed = applyResistance
      ? applyExtremityAwareUpwardResistance(
          smoothedRisk,
          row.extension,
          row.pLow,
          row.pMid,
          row.pHigh,
          resistanceOptions
        )
      : smoothedRisk;

    return {
      ...row,
      SmoothedRisk: smoothedRisk,
      AdjustedSmoothed: adjustedSmoothed,
      Risk: compressRiskTails(
        adjustedSmoothed,
        row.extension,
        row.pLow,
        row.pMid,
        row.pHigh
      ),
    };
  });
};

/** Stable production metric — unchanged behaviour. */
export const calculateStockRiskMetric = (data) =>
  runStockRiskPipeline(data).map((row) => ({ ...row, MetricVersion: 'v1' }));

/** v1 pipeline + extremity-aware upward resistance before tail compression. */
export const calculateStockRiskMetricV2 = (data, options = {}) => {
  const resistanceOptions = { ...STOCK_RISK_V2_DEFAULTS, ...options };
  return runStockRiskPipeline(data, { applyResistance: true, resistanceOptions }).map((row) => ({
    ...row,
    MetricVersion: 'v2',
  }));
};

export const calculateStockRiskMetricByVersion = (data, version = 'v1', options) => {
  if (version === 'v2') return calculateStockRiskMetricV2(data, options);
  return calculateStockRiskMetric(data);
};