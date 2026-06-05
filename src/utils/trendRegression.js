/**
 * Trend Regression utilities for Workbench "Create Derived" trendline feature.
 *
 * Implements common trendline fits using ordinary least squares (linear regression
 * on raw or log-transformed variables). Uses sequential integer x (1..n) for
 * numerical stability instead of raw timestamps.
 *
 * Supported:
 *  - linear:       y = a + b*x
 *  - logarithmic:  y = a + b*ln(x)
 *  - polynomial:   y = c0 + c1*x + c2*x^2 + ... (degree 2-4)
 *  - power:        y = a * x^b          (uses positive y only for fit)
 *  - exponential:  y = a * exp(b*x)     (uses positive y only for fit)
 *
 * All functions accept and return arrays of { time: string, value: number }.
 * Non-finite results are dropped to keep charts stable.
 */

function _toCleanPoints(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(d => d && d.time != null && d.value != null && isFinite(+d.value))
    .map(d => ({ time: d.time, value: +d.value }));
}

function _getSequentialX(n) {
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(i + 1);
  return xs;
}

/** Simple linear regression on (x, y) -> {a, b} where y = a + b*x */
function _linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { a: ys[0] || 0, b: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { a: sumY / n, b: 0 };
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

/** Gaussian elimination with partial pivoting for small square system. Returns coefs or zeros on singular. */
function _gaussianSolve(A, b) {
  const n = A.length;
  if (n === 0) return [];
  // Augment
  const M = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }
  // Forward elim
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const piv = M[col][col];
    if (Math.abs(piv) < 1e-12) {
      // singular; return zeros (caller may fallback)
      return Array(n).fill(0);
    }
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / piv;
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }
  // Back subst
  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let s = M[row][n];
    for (let j = row + 1; j < n; j++) s -= M[row][j] * x[j];
    x[row] = s / M[row][row];
  }
  return x;
}

/** Linear trend */
function linearFit(cleanData) {
  const n = cleanData.length;
  if (n === 0) return [];
  if (n === 1) return [{ time: cleanData[0].time, value: cleanData[0].value }];
  const xs = _getSequentialX(n);
  const ys = cleanData.map(d => d.value);
  const { a, b } = _linearRegression(xs, ys);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = a + b * xs[i];
    if (isFinite(v)) out.push({ time: cleanData[i].time, value: v });
  }
  return out;
}

/** Logarithmic: y = a + b*ln(x) */
function logarithmicFit(cleanData) {
  const n = cleanData.length;
  if (n === 0) return [];
  if (n === 1) return [{ time: cleanData[0].time, value: cleanData[0].value }];
  const xs = _getSequentialX(n);
  const ys = cleanData.map(d => d.value);
  const logx = xs.map(x => Math.log(x));
  const { a, b } = _linearRegression(logx, ys);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = a + b * Math.log(xs[i]);
    if (isFinite(v)) out.push({ time: cleanData[i].time, value: v });
  }
  return out;
}

/** Polynomial via normal equations + gaussian solve. Degree 1..4 clamped to data size. */
function polynomialFit(cleanData, degree = 2) {
  const n = cleanData.length;
  if (n === 0) return [];
  if (n === 1) return [{ time: cleanData[0].time, value: cleanData[0].value }];
  let d = Math.max(1, Math.min(4, Math.floor(degree || 2)));
  if (n <= d) d = Math.max(1, n - 1);
  const m = d + 1; // coef count
  const xs = _getSequentialX(n);
  const ys = cleanData.map(p => p.value);

  // Build XTX and XTy
  const XTX = Array.from({ length: m }, () => Array(m).fill(0));
  const XTy = Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    // powers[0]=1, powers[1]=x, ... powers[d]=x^d
    const powers = [1];
    for (let p = 1; p <= d; p++) powers.push(powers[p - 1] * x);
    for (let j = 0; j < m; j++) {
      XTy[j] += powers[j] * y;
      for (let k = 0; k < m; k++) {
        XTX[j][k] += powers[j] * powers[k];
      }
    }
  }
  const coef = _gaussianSolve(XTX, XTy);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    let v = 0;
    let xp = 1;
    for (let j = 0; j < m; j++) {
      v += coef[j] * xp;
      xp *= x;
    }
    if (isFinite(v)) out.push({ time: cleanData[i].time, value: v });
  }
  return out;
}

/** Power: y = a * x^b   (fit on positive y only) */
function powerFit(cleanData) {
  const n = cleanData.length;
  if (n === 0) return [];
  if (n === 1) return [{ time: cleanData[0].time, value: cleanData[0].value }];
  const xs = _getSequentialX(n);
  const ys = cleanData.map(d => d.value);

  const valid = [];
  for (let i = 0; i < n; i++) {
    if (ys[i] > 0) valid.push(i);
  }
  if (valid.length < 2) {
    // not enough; fallback to mean of positives or overall mean
    const pos = ys.filter(v => v > 0);
    const mean = pos.length ? pos.reduce((s, v) => s + v, 0) / pos.length : (ys.reduce((s, v) => s + v, 0) / n);
    return cleanData.map((d, i) => ({ time: d.time, value: mean }));
  }
  const logx = valid.map(i => Math.log(xs[i]));
  const logy = valid.map(i => Math.log(ys[i]));
  const { a: la, b } = _linearRegression(logx, logy); // la = ln(a)
  const a = Math.exp(la);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = a * Math.pow(xs[i], b);
    if (isFinite(v)) out.push({ time: cleanData[i].time, value: v });
  }
  return out;
}

/** Exponential: y = a * exp(b * x)  (fit on positive y) */
function exponentialFit(cleanData) {
  const n = cleanData.length;
  if (n === 0) return [];
  if (n === 1) return [{ time: cleanData[0].time, value: cleanData[0].value }];
  const xs = _getSequentialX(n);
  const ys = cleanData.map(d => d.value);

  const valid = [];
  for (let i = 0; i < n; i++) {
    if (ys[i] > 0) valid.push(i);
  }
  if (valid.length < 2) {
    const pos = ys.filter(v => v > 0);
    const mean = pos.length ? pos.reduce((s, v) => s + v, 0) / pos.length : (ys.reduce((s, v) => s + v, 0) / n);
    return cleanData.map((d, i) => ({ time: d.time, value: mean }));
  }
  const xV = valid.map(i => xs[i]);
  const logyV = valid.map(i => Math.log(ys[i]));
  const { a: la, b } = _linearRegression(xV, logyV);
  const a = Math.exp(la);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = a * Math.exp(b * xs[i]);
    if (isFinite(v)) out.push({ time: cleanData[i].time, value: v });
  }
  return out;
}

/**
 * Main entry: compute a trend fit for the given base series points.
 * trendType: 'linear' | 'logarithmic' | 'polynomial' | 'power' | 'exponential'
 * Returns array of {time, value} aligned to (cleaned) input times.
 */
export function computeTrendData(baseData, trendType = 'linear', polyDegree = 2) {
  const clean = _toCleanPoints(baseData);
  if (clean.length === 0) return [];
  try {
    switch (trendType) {
      case 'linear':
        return linearFit(clean);
      case 'logarithmic':
        return logarithmicFit(clean);
      case 'polynomial':
        return polynomialFit(clean, polyDegree);
      case 'power':
        return powerFit(clean);
      case 'exponential':
        return exponentialFit(clean);
      default:
        return linearFit(clean);
    }
  } catch (e) {
    // Hardened: never throw to UI; return a flat mean line as last resort
    const mean = clean.reduce((s, p) => s + p.value, 0) / clean.length;
    return clean.map(p => ({ time: p.time, value: mean }));
  }
}

export default computeTrendData;
