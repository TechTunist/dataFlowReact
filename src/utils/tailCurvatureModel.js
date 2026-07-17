/**
 * Asymmetric Tail Curvature Quantile Model (Cowen 2026)
 *
 * Fixed coefficients from Table 3 of "Asymmetric Tail Curvature in Bitcoin Price
 * Quantiles" (full sample, asymmetric quadratic quantile regression).
 *
 * Formula (log10 price space):
 *   Qτ(log10 P(t)) = cτ + aτ·x + b(τ)·x²
 *   where x = ln(t) - μ, t = days since genesis anchor.
 *
 * Unconstrained fits can cross outside the sample. The paper enforces monotonicity
 * with the Chernozhukov, Fernández-Val, and Galichon (2010) rearrangement estimator:
 * at each evaluation point, sort raw predictions ascending and reassign to τ-ordered labels.
 */

export const GENESIS_DATE = '2009-01-03';
export const MU = 7.9914; // centering constant from the paper (~e^μ ≈ 2,955 days)

// Lower tail (incl. golden pocket) share shallow curvature b=-0.0241.
// The four extra below 1% (0.5% and lower) model "golden pocket" dislocation zones
// (not in Table 3; added to match Cowen's full chart). Must stay sorted by tau.
export const QUANTILE_PARAMS = [
  { tau: 0.0005, label: '0.05%', c: 2.621, a: 2.605, b: -0.0241, color: '#facc15' },
  { tau: 0.001, label: '0.1%', c: 2.707, a: 2.595, b: -0.0241, color: '#dde022ff' },
  { tau: 0.002, label: '0.2%', c: 2.738, a: 2.59, b: -0.0241, color: '#d7e611ff' },
  { tau: 0.005, label: '0.5%', c: 2.797, a: 2.585, b: -0.0241, color: '#d4eb0aff' },
  { tau: 0.01, label: '1%', c: 2.837, a: 2.578, b: -0.0241, color: '#4ade80' },
  { tau: 0.10, label: '10%', c: 2.933, a: 2.552, b: -0.0241, color: '#22c55e' },
  { tau: 0.25, label: '25%', c: 3.004, a: 2.554, b: -0.0241, color: '#16a34a' },
  { tau: 0.50, label: '50% (Median)', c: 3.214, a: 2.482, b: -0.1126, color: '#08ead7ff' },
  { tau: 0.75, label: '75%', c: 3.562, a: 2.283, b: -0.3259, color: '#f97316' },
  { tau: 0.95, label: '95%', c: 3.897, a: 1.964, b: -0.3259, color: '#ef4444' },
  { tau: 0.99, label: '99%', c: 4.028, a: 1.904, b: -0.3259, color: '#b91c1c' },
];

/** Days since Bitcoin genesis anchor (minimum 1). */
export function getDaysSinceGenesis(dateStr, genesisDate = GENESIS_DATE) {
  const genesis = new Date(genesisDate);
  const d = new Date(dateStr);
  return Math.max(1, Math.floor((d - genesis) / (1000 * 60 * 60 * 24)));
}

/** Centered log-time x = ln(t) − μ used by the quadratic specification. */
export function centeredLogTime(t, mu = MU) {
  return Math.log(Math.max(1, t)) - mu;
}

/** Unconstrained log10 price at days-since-genesis t for one quantile. */
export function computeRawLog10Price(t, param, mu = MU) {
  const x = centeredLogTime(t, mu);
  return param.c + param.a * x + param.b * x * x;
}

/** Unconstrained price level at a calendar date for one quantile. */
export function computeRawProjectedPrice(dateStr, param, options = {}) {
  const { genesisDate = GENESIS_DATE, mu = MU } = options;
  const t = getDaysSinceGenesis(dateStr, genesisDate);
  return Math.pow(10, computeRawLog10Price(t, param, mu));
}

/**
 * Chernozhukov et al. (2010) rearrangement at a single evaluation point.
 * Sorts raw price predictions ascending and reassigns them to labels in τ order
 * so Q̃_τ1 ≤ Q̃_τ2 whenever τ1 < τ2.
 *
 * @param {Record<string, number>} rawByLabel - map of quantile label → raw price
 * @param {typeof QUANTILE_PARAMS} [params] - ordered by increasing tau
 * @returns {Record<string, number>} rearranged prices keyed by label
 */
export function rearrangeQuantilePrices(rawByLabel, params = QUANTILE_PARAMS) {
  const labels = params.map((p) => p.label);
  const sortedValues = labels
    .map((label) => rawByLabel[label])
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  // If some labels were missing, still assign in order to available labels.
  const result = {};
  let valueIdx = 0;
  labels.forEach((label) => {
    if (!Number.isFinite(rawByLabel[label])) return;
    result[label] = sortedValues[valueIdx++];
  });
  return result;
}

/**
 * Raw (unconstrained) prices for every quantile at a date.
 * @returns {Record<string, number>}
 */
export function computeRawQuantilePrices(dateStr, params = QUANTILE_PARAMS, options = {}) {
  const raw = {};
  params.forEach((param) => {
    raw[param.label] = computeRawProjectedPrice(dateStr, param, options);
  });
  return raw;
}

/**
 * Rearranged (non-crossing) prices for every quantile at a date.
 * @returns {Record<string, number>}
 */
export function computeRearrangedQuantilePrices(dateStr, params = QUANTILE_PARAMS, options = {}) {
  return rearrangeQuantilePrices(computeRawQuantilePrices(dateStr, params, options), params);
}

/**
 * Projected price for one quantile after rearrangement at that date.
 * Prefer computeRearrangedQuantilePrices when multiple quantiles are needed
 * (rearrangement is joint across τ at each x).
 */
export function computeProjectedPrice(dateStr, param, params = QUANTILE_PARAMS, options = {}) {
  const rearranged = computeRearrangedQuantilePrices(dateStr, params, options);
  return rearranged[param.label];
}

/**
 * Build full time series of rearranged quantile prices for charting.
 * @param {Array<{time?: string, date?: string}>} datePoints - historical points with time/date
 * @returns {Record<string, Array<{time: string, value: number}>>}
 */
export function buildRearrangedModelSeries(datePoints, params = QUANTILE_PARAMS, options = {}) {
  const { genesisDate = GENESIS_DATE, mu = MU } = options;
  const genesis = new Date(genesisDate);
  const result = {};
  params.forEach((param) => {
    result[param.label] = [];
  });

  if (!datePoints || datePoints.length === 0) return result;

  datePoints.forEach((point) => {
    const time = point.time || point.date;
    if (!time) return;

    const date = new Date(time);
    const t = Math.max(1, Math.floor((date - genesis) / (1000 * 60 * 60 * 24)));
    const x = Math.log(t) - mu;

    const rawByLabel = {};
    params.forEach((param) => {
      const log10P = param.c + param.a * x + param.b * x * x;
      rawByLabel[param.label] = Math.pow(10, log10P);
    });

    const rearranged = rearrangeQuantilePrices(rawByLabel, params);
    params.forEach((param) => {
      result[param.label].push({
        time,
        value: rearranged[param.label],
      });
    });
  });

  return result;
}

/** True if values are non-decreasing (within a tiny relative tolerance). */
export function isMonotoneNonDecreasing(values, eps = 1e-9) {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] + eps < values[i - 1]) return false;
  }
  return true;
}
