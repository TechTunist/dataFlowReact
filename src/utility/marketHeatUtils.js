import { calculateRunningRoiRiskSeries } from './runningRoiUtils';

/** MVRV/Tx ratio smoothing used by Market Heat Index (fixed; not user-tunable on MHI page). */
export const TX_MVRV_SMOOTHING = 'sma-7';

export const MARKET_HEAT_WEIGHT_KEYS = ['fg', 'mvrv', 'mayer', 'risk', 'roirisk', 'pi', 'alt', 'txmvrv'];

export const DEFAULT_MARKET_HEAT_WEIGHTS = {
  fg: 15,
  mvrv: 25,
  mayer: 20,
  risk: 20,
  roirisk: 10,
  pi: 10,
  alt: 10,
  txmvrv: 10,
};

export const MARKET_HEAT_SMA_PERIODS = [
  { value: 'none', label: 'None' },
  { value: '7d', label: '7 Days', days: 7 },
  { value: '28d', label: '28 Days', days: 28 },
  { value: '90d', label: '90 Days', days: 90 },
];

export const DEFAULT_MARKET_HEAT_SETTINGS = {
  weights: DEFAULT_MARKET_HEAT_WEIGHTS,
  smaPeriod: '28d',
  overheatThreshold: 85,
  coldThreshold: 30,
  stretchToFullRange: false,
};

export function normalizeDateKey(time) {
  if (!time) return null;
  if (typeof time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(time)) return time;
  const parsed = new Date(time);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return String(time).split('T')[0];
}

export function calculateHeatRiskFactor(data) {
  const movingAverage = data.map((item, index) => {
    const start = Math.max(index - 373, 0);
    const subset = data.slice(start, index + 1);
    const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });
  const movingAverageWithPreavg = movingAverage.map((item, index) => {
    const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
    return { ...item, Preavg: preavg };
  });
  const preavgValues = movingAverageWithPreavg.map((item) => item.Preavg);
  const preavgMin = Math.min(...preavgValues);
  const preavgMax = Math.max(...preavgValues);
  return movingAverageWithPreavg.map((item) => ({
    ...item,
    Risk: preavgMax === preavgMin ? 0 : (item.Preavg - preavgMin) / (preavgMax - preavgMin),
  }));
}

export function calculateSMA(data, windowSize) {
  if (!data || data.length < windowSize) return [];
  const sma = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    sma.push({ time: data[i].time, value: sum / windowSize });
  }
  return sma;
}

export function calculateRatioSeries(data) {
  if (!data || data.length < 350) return [];
  const sma111 = calculateSMA(data, 111);
  const sma350 = calculateSMA(data, 350);
  const ratioData = [];
  for (let i = 349; i < data.length; i++) {
    if (i - 110 >= 0 && sma111[i - 110] && sma350[i - 349]) {
      const sma350Value = sma350[i - 349].value;
      const ratio = sma350Value > 0.001 ? sma111[i - 110].value / (sma350Value * 2) : 0;
      ratioData.push({ time: data[i].time, value: ratio });
    }
  }
  return ratioData;
}

export function calculateMayerMultiple(data) {
  if (!data || data.length < 200) return [];
  const period = 200;
  const mayerMultiples = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    const ma200 = sum / period;
    mayerMultiples.push({
      time: data[i].time,
      value: data[i].value / ma200,
    });
  }
  return mayerMultiples;
}

export function buildTxMvrvRatioSeries(txMvrvRatioDataBySmoothing, smoothing = TX_MVRV_SMOOTHING) {
  const payload = txMvrvRatioDataBySmoothing?.[smoothing] || {};
  return (payload.series || [])
    .map((item) => ({
      time: normalizeDateKey(item.time),
      value: Number(item.value),
    }))
    .filter((item) => item.time && !isNaN(item.value) && isFinite(item.value));
}

export function buildMarketHeatFactorScores({
  btcData = [],
  mvrvData = [],
  fearAndGreedData = [],
  altcoinSeasonTimeseriesData = [],
  txMvrvRatioSeries = [],
}) {
  if (!btcData.length) return [];

  let startDate = '2011-01-01';
  if (mvrvData.length > 0) {
    const sortedMvrv = [...mvrvData].sort((a, b) => a.time.localeCompare(b.time));
    startDate = sortedMvrv[0].time;
  }
  const alignedBtc = btcData.filter((item) => new Date(item.time) >= new Date(startDate));
  if (alignedBtc.length < 10) return [];

  const fgMap = {};
  fearAndGreedData.forEach((item) => {
    const d = new Date(item.timestamp * 1000).toISOString().split('T')[0];
    fgMap[d] = Number(item.value);
  });

  const mvrvMap = {};
  mvrvData.forEach((item) => { mvrvMap[item.time] = Number(item.value); });

  const mayerSeries = calculateMayerMultiple(alignedBtc);
  const riskSeries = calculateHeatRiskFactor(alignedBtc);
  const piRatioSeries = calculateRatioSeries(alignedBtc);
  const runningRoiRiskSeries = calculateRunningRoiRiskSeries(alignedBtc);

  const mayerMap = {};
  mayerSeries.forEach((item) => { mayerMap[item.time] = item.value; });
  const riskMap = {};
  riskSeries.forEach((item) => { riskMap[item.time] = item.Risk; });
  const piMap = {};
  piRatioSeries.forEach((item) => { piMap[item.time] = item.value; });
  const roiriskMap = {};
  runningRoiRiskSeries.forEach((item) => { roiriskMap[item.time] = item.riskScore; });

  const altSeasonMap = {};
  if (altcoinSeasonTimeseriesData?.length) {
    altcoinSeasonTimeseriesData.forEach((item) => {
      if (item.time) altSeasonMap[item.time] = Number(item.index) || 0;
    });
  }

  const txmvrvMap = {};
  txMvrvRatioSeries.forEach((item) => {
    txmvrvMap[item.time] = item.value;
  });

  let txmvrvMin = 0.2;
  let txmvrvMax = 1.0;
  if (txMvrvRatioSeries.length > 0) {
    const vals = txMvrvRatioSeries.map((d) => d.value);
    txmvrvMin = Math.min(...vals);
    txmvrvMax = Math.max(...vals);
  }

  return alignedBtc.map((item) => {
    const time = item.time;
    const scores = {};
    const available = {};

    if (fgMap[time] != null) {
      scores.fg = fgMap[time];
      available.fg = true;
    }

    const mvrvVal = mvrvMap[time] || 1.5;
    scores.mvrv = mvrvData.length > 0 ? Math.max(0, Math.min(100, ((mvrvVal - 1) / 3) * 100)) : 50;
    available.mvrv = true;

    const mayerVal = mayerMap[time] ?? 1.0;
    scores.mayer = mvrvData.length > 0 ? Math.max(0, Math.min(100, ((mayerVal - 0.6) / 1.8) * 100)) : 50;
    available.mayer = true;

    const riskVal = riskMap[time] ?? 0.5;
    scores.risk = btcData.length > 0 ? riskVal * 100 : 50;
    available.risk = true;

    if (roiriskMap[time] != null) {
      scores.roirisk = Math.max(0, Math.min(100, roiriskMap[time] * 100));
      available.roirisk = true;
    }

    const piVal = piMap[time] ?? 0;
    scores.pi = btcData.length > 0 ? Math.max(0, Math.min(100, piVal * 50)) : 50;
    available.pi = true;

    if (altSeasonMap[time] != null) {
      scores.alt = altSeasonMap[time] || 50;
      available.alt = true;
    }

    if (txmvrvMap[time] != null) {
      const txmvrvVal = txmvrvMap[time];
      scores.txmvrv = (txmvrvMax > txmvrvMin)
        ? Math.max(0, Math.min(100, ((txmvrvVal - txmvrvMin) / (txmvrvMax - txmvrvMin)) * 100))
        : 50;
      available.txmvrv = true;
    }

    return { time, btcPrice: item.value, scores, available };
  });
}

export function blendMarketHeatScores(factorScoresBase, weights = DEFAULT_MARKET_HEAT_WEIGHTS) {
  if (!factorScoresBase.length) return [];
  const w = weights;

  return factorScoresBase.map(({ time, btcPrice, scores, available }) => {
    let totalWeighted = 0;
    let totalWeight = 0;

    for (const key of MARKET_HEAT_WEIGHT_KEYS) {
      if (available[key]) {
        const weight = Number(w[key]) || 0;
        totalWeighted += scores[key] * weight;
        totalWeight += weight;
      }
    }

    const heat = totalWeight > 0 ? totalWeighted / totalWeight : 50;
    return {
      time,
      value: Math.max(0, Math.min(100, heat)),
      btcPrice,
    };
  });
}

export function applyMarketHeatSmoothing(marketHeatData, smaPeriod = '28d') {
  const selectedSma = MARKET_HEAT_SMA_PERIODS.find((sp) => sp.value === smaPeriod);
  const days = selectedSma?.days || 0;
  if (smaPeriod === 'none' || days === 0) return marketHeatData;
  const result = [];
  for (let i = 0; i < marketHeatData.length; i++) {
    if (i < days - 1) {
      result.push({ ...marketHeatData[i], value: marketHeatData[i].value });
      continue;
    }
    const window = marketHeatData.slice(i - days + 1, i + 1);
    const sum = window.reduce((acc, item) => acc + item.value, 0);
    const sma = sum / days;
    result.push({ ...marketHeatData[i], value: sma });
  }
  return result;
}

export function stretchMarketHeatRange(smoothedData, stretchToFullRange = false) {
  if (!stretchToFullRange || !smoothedData.length) return smoothedData;
  const vals = smoothedData.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  if (maxV <= minV) return smoothedData;
  return smoothedData.map((d) => ({
    ...d,
    value: Math.max(0, Math.min(100, ((d.value - minV) / (maxV - minV)) * 100)),
  }));
}

/**
 * Full Market Heat Index pipeline — matches /market-heat-index chart series.
 */
export function computeMarketHeatPipeline({
  btcData = [],
  mvrvData = [],
  fearAndGreedData = [],
  altcoinSeasonTimeseriesData = [],
  txMvrvRatioDataBySmoothing = {},
  weights = DEFAULT_MARKET_HEAT_WEIGHTS,
  smaPeriod = '28d',
  stretchToFullRange = false,
  txMvrvSmoothing = TX_MVRV_SMOOTHING,
}) {
  const txMvrvRatioSeries = buildTxMvrvRatioSeries(txMvrvRatioDataBySmoothing, txMvrvSmoothing);
  const factorScoresBase = buildMarketHeatFactorScores({
    btcData,
    mvrvData,
    fearAndGreedData,
    altcoinSeasonTimeseriesData,
    txMvrvRatioSeries,
  });
  const marketHeatData = blendMarketHeatScores(factorScoresBase, weights);
  const smoothedData = applyMarketHeatSmoothing(marketHeatData, smaPeriod);
  const plottedData = stretchMarketHeatRange(smoothedData, stretchToFullRange);

  return {
    factorScoresBase,
    marketHeatData,
    smoothedData,
    plottedData,
    txMvrvRatioSeries,
  };
}

export function getMarketHeatSmaLabel(smaPeriod) {
  return MARKET_HEAT_SMA_PERIODS.find((sp) => sp.value === smaPeriod)?.label || smaPeriod;
}