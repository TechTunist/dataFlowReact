/**
 * Shared Market Overview metric calculations (same formulas as the classic widgets).
 * Used by the experimental presentation so data stays identical while UI can change.
 */
import { calculateRiskMetric } from '../utility/riskMetric';
import { getBtcReferenceDate } from '../utility/cycleBottomDaysLeft';

export const GAUGE_COLORS = [
  '#4BC0C8', '#33D1FF', '#66A3FF', '#9996FF', '#CC89FF',
  '#FF7DFF', '#FF61C3', '#FF4590', '#FF295D', '#FF0033', '#FF0033',
];

export function getHeatColor(value) {
  const v = Number(value) || 0;
  const index = Math.min(Math.floor((v / 100) * GAUGE_COLORS.length), GAUGE_COLORS.length - 1);
  return GAUGE_COLORS[index];
}

export function getHeatLabel(value) {
  const v = Number(value) || 0;
  if (v <= 30) return 'Cold';
  if (v <= 50) return 'Cool';
  if (v <= 70) return 'Neutral';
  if (v <= 85) return 'Warm';
  return 'Hot';
}

export function getHeatReading(value) {
  const v = Number(value) || 0;
  if (v <= 30) return 'Quiet / risk-off zone';
  if (v <= 50) return 'Calm — room to run or still recovering';
  if (v <= 70) return 'Balanced — no extreme signal';
  if (v <= 85) return 'Heating up — stay selective';
  return 'Overheated — elevated cycle risk';
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

export function calculateMvrvPeakProjection(mvrvData) {
  if (!mvrvData?.length) return { peaks: [], projectedPeak: null };
  const smoothPeriod = 30;
  const smoothedMvrv = [];
  for (let i = smoothPeriod - 1; i < mvrvData.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothPeriod; j++) {
      sum += mvrvData[i - j].value;
    }
    smoothedMvrv.push({
      time: mvrvData[i].time,
      value: sum / smoothPeriod,
    });
  }

  const peaks = [];
  const window = 365;
  for (let i = window; i < smoothedMvrv.length - window; i++) {
    const isPeak = smoothedMvrv.slice(i - window, i + window + 1).every(
      (item, idx) => item.value <= smoothedMvrv[i].value || idx === window
    );
    if (isPeak && smoothedMvrv[i].value > 3) {
      peaks.push(smoothedMvrv[i]);
    }
  }
  const decreases = [];
  for (let i = 1; i < peaks.length; i++) {
    const decrease = (peaks[i - 1].value - peaks[i].value) / peaks[i - 1].value;
    decreases.push(decrease);
  }
  const avgDecrease = decreases.length > 0
    ? decreases.reduce((sum, val) => sum + val, 0) / decreases.length
    : 0;
  const latestPeak = peaks[peaks.length - 1];
  const projectedPeak = latestPeak ? latestPeak.value * (1 - avgDecrease) : null;
  return { peaks, projectedPeak };
}

/** Same windowed RSI as classic Market Overview widgets (not Wilder smoothing). */
export function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return [];
  const rsiData = [];
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = 1; j <= period; j++) {
      const diff = parseFloat(data[i - j + 1].value) - parseFloat(data[i - j].value);
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsiData.push({ time: data[i].time, value: rsi });
  }
  return rsiData;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Linear heat 0–100 between a cold floor and hot ceiling (clamped outside the band).
 * e.g. Mayer 0.6→0, 2.1→100; MVRV 0.9→0, 3.0→100.
 */
export function linearHeat(value, cold, hot) {
  if (value == null || !Number.isFinite(value) || hot === cold) return null;
  return clamp(((value - cold) / (hot - cold)) * 100, 0, 100);
}

/** Heat-scale anchors for overview gauges (experimental presentation). */
export const MAYER_HEAT_RANGE = { cold: 0.6, hot: 2.1 };
export const MVRV_HEAT_RANGE = { cold: 0.9, hot: 3.0 };
export const PI_CYCLE_HEAT_RANGE = { cold: 0.27, hot: 0.8 };

/**
 * Build all overview metrics from chart data. Same heat math as classic widgets.
 */
export function buildMarketOverviewSnapshot({
  btcData = [],
  fearAndGreedData = [],
  latestFearAndGreed = null,
  mvrvData = [],
  altcoinSeasonData = null,
}) {
  const metrics = [];

  // —— Fear & Greed ——
  const latestFg =
    latestFearAndGreed ||
    (fearAndGreedData?.length ? fearAndGreedData[fearAndGreedData.length - 1] : null);
  const fgValue = latestFg != null ? clamp(Number(latestFg.value), 0, 100) : null;
  let fgLabel = '—';
  if (fgValue != null) {
    if (fgValue <= 25) fgLabel = 'Extreme Fear';
    else if (fgValue <= 50) fgLabel = 'Fear';
    else if (fgValue <= 75) fgLabel = 'Greed';
    else fgLabel = 'Extreme Greed';
  }
  metrics.push({
    id: 'fearAndGreed',
    group: 'sentiment',
    title: 'Fear & Greed',
    chartPath: '/fear-and-greed-chart',
    heat: fgValue,
    primary: fgValue != null ? fgValue.toFixed(0) : 'N/A',
    secondary: fgLabel,
    unit: '/100',
    explanation:
      'Crowd sentiment from 0 (extreme fear) to 100 (extreme greed). Extremes often reverse; mid-range is less actionable.',
    reading:
      fgValue == null
        ? 'Waiting for data'
        : fgValue <= 30
          ? 'Market is fearful — historically better for accumulation'
          : fgValue >= 75
            ? 'Euphoria risk — late-cycle behaviour more common'
            : 'Sentiment is in a normal range',
  });

  // —— Altcoin season ——
  const altIndex =
    altcoinSeasonData?.index !== undefined
      ? clamp(Number(altcoinSeasonData.index), 0, 100)
      : null;
  metrics.push({
    id: 'altcoinSeason',
    group: 'sentiment',
    title: 'Altcoin Season',
    chartPath: '/altcoin-season-index',
    heat: altIndex,
    primary: altIndex != null ? altIndex.toFixed(0) : 'N/A',
    secondary: altIndex == null ? '—' : altIndex >= 75 ? 'Alt season' : altIndex <= 25 ? 'BTC season' : 'Mixed',
    unit: '/100',
    explanation:
      'How altcoins are performing vs Bitcoin. High = broad alt outperformance; low = Bitcoin dominance.',
    reading:
      altIndex == null
        ? 'Waiting for data'
        : altIndex >= 75
          ? 'Capital is rotating into alts'
          : altIndex <= 25
            ? 'Bitcoin is leading — typical early or late cycle'
            : 'Neither full alt season nor pure BTC season',
  });

  // —— Bitcoin risk ——
  let risk01 = null;
  if (btcData?.length) {
    try {
      const riskArr = calculateRiskMetric(btcData);
      if (riskArr?.length) {
        const r = riskArr[riskArr.length - 1].Risk;
        if (Number.isFinite(r)) risk01 = r;
      }
    } catch {
      risk01 = null;
    }
  }
  const riskHeat = risk01 != null ? clamp(risk01 * 100, 0, 100) : null;
  metrics.push({
    id: 'bitcoinRisk',
    group: 'positioning',
    title: 'Bitcoin Risk',
    chartPath: '/risk',
    heat: riskHeat,
    primary: riskHeat != null ? riskHeat.toFixed(1) : 'N/A',
    secondary: riskHeat != null ? getHeatLabel(riskHeat) : '—',
    unit: '/100',
    explanation:
      'Composite risk from price vs long MA and time spent elevated. Higher = more stretched / late-cycle risk.',
    reading:
      riskHeat == null
        ? 'Waiting for data'
        : riskHeat >= 85
          ? 'Very high risk — historically late bull territory'
          : riskHeat <= 30
            ? 'Low risk zone — historically closer to accumulation'
            : 'Mid-cycle risk profile',
  });

  // —— MVRV —— heat 0–100 maps linearly to 0.9–3.0
  let mvrvCurrent = null;
  let mvrvPeak = null;
  let mvrvHeat = null;
  let mvrvZ = null;
  if (mvrvData?.length) {
    const latestMvrvRaw = mvrvData[mvrvData.length - 1].value;
    const latestMvrv = clamp(latestMvrvRaw, 0, 10000);
    if (Number.isFinite(latestMvrv) && latestMvrv > 0) {
      mvrvCurrent = latestMvrv;
      mvrvHeat = linearHeat(latestMvrv, MVRV_HEAT_RANGE.cold, MVRV_HEAT_RANGE.hot);
      const { projectedPeak } = calculateMvrvPeakProjection(mvrvData);
      if (projectedPeak) {
        const cappedPeak = clamp(projectedPeak, 0, 10000);
        mvrvPeak = cappedPeak;
        const values = mvrvData.map((item) => clamp(item.value, 0, 10000));
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        mvrvZ = stdDev > 0 ? (latestMvrv - cappedPeak) / stdDev : 0;
      }
    }
  }
  metrics.push({
    id: 'mvrv',
    group: 'positioning',
    title: 'MVRV Ratio',
    chartPath: '/tx-mvrv',
    heat: mvrvHeat,
    primary: mvrvCurrent != null ? mvrvCurrent.toFixed(2) : 'N/A',
    secondary: mvrvPeak != null ? `Peak ~${mvrvPeak.toFixed(2)}` : '0.9 → 3.0 heat scale',
    unit: '',
    explanation:
      'Market value vs realized value. Heat scale: 0 at MVRV 0.9 (cold) through 100 at 3.0 (hot). High MVRV = market rich vs cost basis.',
    reading:
      mvrvCurrent == null
        ? 'Waiting for data'
        : mvrvHeat >= 85
          ? 'Near the hot end of the MVRV scale (≥ ~2.7)'
          : mvrvCurrent <= MVRV_HEAT_RANGE.cold
            ? 'At or below the cold floor (0.9) — historically deep value'
            : mvrvCurrent < 1
              ? 'Below realized price — historically deep value'
              : 'MVRV mid-band on the 0.9–3.0 heat scale',
    extra: mvrvZ != null ? `Z vs peak: ${mvrvZ.toFixed(2)}` : null,
  });

  // —— Mayer —— heat 0–100 maps linearly to 0.6–2.1
  let mayerCurrent = null;
  let mayerHeat = null;
  let mayerZ = null;
  if (btcData?.length > 200) {
    const mayers = calculateMayerMultiple(btcData);
    const latestRaw = mayers[mayers.length - 1]?.value;
    const latest = latestRaw ? clamp(latestRaw, 0, 100) : 0;
    if (latest) {
      mayerCurrent = latest;
      mayerHeat = linearHeat(latest, MAYER_HEAT_RANGE.cold, MAYER_HEAT_RANGE.hot);
      const values = mayers.map((item) => clamp(item.value, 0, 100));
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      mayerZ = stdDev > 0 ? (latest - MAYER_HEAT_RANGE.hot) / stdDev : 0;
    }
  }
  metrics.push({
    id: 'mayer',
    group: 'positioning',
    title: 'Mayer Multiple',
    chartPath: '/bitcoin',
    heat: mayerHeat,
    primary: mayerCurrent != null ? mayerCurrent.toFixed(2) : 'N/A',
    secondary: '0.6 → 2.1 heat scale',
    unit: '×',
    explanation:
      'Price divided by the 200-day moving average. Heat scale: 0 at 0.6× (cold) through 100 at 2.1× (hot).',
    reading:
      mayerCurrent == null
        ? 'Waiting for data'
        : mayerCurrent >= MAYER_HEAT_RANGE.hot
          ? 'At or above 2.1× the 200-day average — hot end of the scale'
          : mayerCurrent <= MAYER_HEAT_RANGE.cold
            ? 'At or below 0.6× the 200-day average — cold end of the scale'
            : 'Trading mid-band on the 0.6–2.1 Mayer heat scale',
    extra: mayerZ != null ? `Z vs 2.1: ${mayerZ.toFixed(2)}` : null,
  });

  // —— Pi Cycle —— heat 0–100 maps linearly to ratio 0.27–0.8
  let piRatio = null;
  let piPeak = null;
  let piHeat = null;
  if (btcData?.length > 350) {
    const ratioData = calculateRatioSeries(btcData);
    const latestRaw = ratioData[ratioData.length - 1]?.value;
    const latest = latestRaw != null && Number.isFinite(latestRaw) ? clamp(latestRaw, 0, 100) : null;
    if (latest != null) {
      piRatio = latest;
      piHeat = linearHeat(latest, PI_CYCLE_HEAT_RANGE.cold, PI_CYCLE_HEAT_RANGE.hot);
    }
    const historicalPeaks = [
      { timestamp: Date.parse('2017-12-17'), ratio: 1.05 },
      { timestamp: Date.parse('2021-04-12'), ratio: 1.00 },
    ];
    const targetDate = Date.parse('2025-10-13');
    const t1 = historicalPeaks[0].timestamp;
    const t2 = historicalPeaks[1].timestamp;
    const y1 = historicalPeaks[0].ratio;
    const y2 = historicalPeaks[1].ratio;
    const m = (y2 - y1) / (t2 - t1);
    const b = y1 - m * t1;
    piPeak = m * targetDate + b;
  }
  metrics.push({
    id: 'piCycle',
    group: 'positioning',
    title: 'Pi Cycle Top',
    chartPath: '/pi-cycle',
    heat: piHeat,
    // Match MVRV/Mayer primary width (2 dp). Keep secondary short so layout columns stay aligned.
    primary: piRatio != null ? piRatio.toFixed(2) : 'N/A',
    secondary: piPeak != null ? `Peak ~${piPeak.toFixed(2)}` : '0.27 → 0.8 heat scale',
    unit: '',
    explanation:
      '111DMA / (2×350DMA). Heat scale: 0 at ratio 0.27 (cold) through 100 at 0.8 (hot). Historical tops near ~1.0 sit above the hot end of this scale.',
    reading:
      piRatio == null
        ? 'Waiting for data'
        : piRatio >= PI_CYCLE_HEAT_RANGE.hot
          ? 'At or above 0.8 — hot end of the Pi Cycle heat scale'
          : piRatio <= PI_CYCLE_HEAT_RANGE.cold
            ? 'At or below 0.27 — cold end of the Pi Cycle heat scale'
            : 'Mid-band on the 0.27–0.8 Pi Cycle heat scale',
  });

  // —— ROI cycle comparison from peak ——
  let roiCurrent = null;
  let roiAvg = null;
  let roiDiff = null;
  let roiHeat = null;
  if (btcData?.length) {
    const peakStarts = {
      'Cycle 2': '2017-12-17',
      'Cycle 3': '2021-11-10',
      'Cycle 5': '2025-10-07',
    };
    const processCycleFromPeak = (start, cycleName) => {
      const filteredData = btcData.filter((d) => new Date(d.time) >= new Date(start));
      if (!filteredData.length) return null;
      const basePrice = filteredData[0].value;
      return filteredData.map((item, index) => ({
        day: index,
        roi: Math.log10(item.value / basePrice) + 1,
        date: item.time,
        cycle: cycleName,
      }));
    };
    const cycle2 = processCycleFromPeak(peakStarts['Cycle 2'], 'Cycle 2');
    const cycle3 = processCycleFromPeak(peakStarts['Cycle 3'], 'Cycle 3');
    const cycle5 = processCycleFromPeak(peakStarts['Cycle 5'], 'Cycle 5');
    if (cycle2 && cycle3 && cycle5) {
      const days = cycle5.length;
      const currentRoiValue = cycle5[cycle5.length - 1].roi;
      const maxDays = Math.min(cycle2.length, cycle3.length, days);
      const avgRois = [];
      for (let day = 0; day < maxDays; day++) {
        const rois = [cycle2[day]?.roi, cycle3[day]?.roi].filter((r) => r !== undefined);
        if (rois.length) avgRois.push(rois.reduce((s, r) => s + r, 0) / rois.length);
      }
      if (avgRois.length) {
        const latestAvgRoi = avgRois[avgRois.length - 1];
        roiCurrent = currentRoiValue;
        roiAvg = latestAvgRoi;
        roiDiff = currentRoiValue - latestAvgRoi;
        const mean = avgRois.reduce((s, v) => s + v, 0) / avgRois.length;
        const variance = avgRois.reduce((s, v) => s + (v - mean) ** 2, 0) / avgRois.length;
        const stdDev = Math.sqrt(variance);
        const z = stdDev > 0 ? (currentRoiValue - latestAvgRoi) / stdDev : 0;
        const avgPostPeakDays = 370;
        const timeProgress = Math.min(1, days / avgPostPeakDays);
        const performancePenalty = z < 0 ? Math.abs(z) : 0;
        let heat = timeProgress * 35 + performancePenalty * 30;
        if (timeProgress > 0.75 && z < -0.5) heat += 20;
        roiHeat = clamp(heat, 0, 100);
      }
    }
  }
  metrics.push({
    id: 'roiCycle',
    group: 'positioning',
    title: 'ROI vs Past Cycles',
    chartPath: '/market-cycles',
    heat: roiHeat,
    primary:
      roiDiff != null ? `${roiDiff >= 0 ? '+' : ''}${roiDiff.toFixed(2)}` : 'N/A',
    secondary:
      roiCurrent != null && roiAvg != null
        ? `Now ${roiCurrent.toFixed(2)} · Avg ${roiAvg.toFixed(2)}`
        : 'From peak',
    unit: '',
    explanation:
      'Post-peak log-ROI vs average of prior cycles after their tops. Heat rises deep into a weak bear.',
    reading:
      roiDiff == null
        ? 'Waiting for data'
        : roiDiff >= 0
          ? 'Holding up better than average post-peak paths'
          : 'Weaker than average post-peak path so far',
  });

  // —— RSI daily / weekly ——
  let dailyRsi = null;
  let weeklyRsi = null;
  if (btcData?.length > 14) {
    const d = calculateRSI(btcData, 14);
    dailyRsi = d[d.length - 1]?.value;
    if (dailyRsi != null) dailyRsi = clamp(dailyRsi, 0, 100);
  }
  if (btcData?.length > 98) {
    const w = calculateRSI(btcData, 98);
    weeklyRsi = w[w.length - 1]?.value;
    if (weeklyRsi != null) weeklyRsi = clamp(weeklyRsi, 0, 100);
  }
  metrics.push({
    id: 'dailyRsi',
    group: 'momentum',
    title: 'Daily RSI',
    chartPath: '/bitcoin',
    heat: dailyRsi,
    primary: dailyRsi != null ? dailyRsi.toFixed(1) : 'N/A',
    secondary: dailyRsi != null ? (dailyRsi >= 70 ? 'Overbought' : dailyRsi <= 30 ? 'Oversold' : 'Neutral') : '—',
    unit: '',
    explanation: '14-day RSI. Above 70 often overbought; below 30 oversold.',
    reading:
      dailyRsi == null
        ? 'Waiting for data'
        : dailyRsi >= 70
          ? 'Short-term momentum stretched higher'
          : dailyRsi <= 30
            ? 'Short-term oversold bounce conditions'
            : 'Daily momentum not at an extreme',
  });
  metrics.push({
    id: 'weeklyRsi',
    group: 'momentum',
    title: 'Weekly RSI',
    chartPath: '/bitcoin',
    heat: weeklyRsi,
    primary: weeklyRsi != null ? weeklyRsi.toFixed(1) : 'N/A',
    secondary: weeklyRsi != null ? (weeklyRsi >= 70 ? 'Overbought' : weeklyRsi <= 30 ? 'Oversold' : 'Neutral') : '—',
    unit: '',
    explanation: '14-week RSI (98 days). Higher timeframe momentum extremes matter more for cycle turns.',
    reading:
      weeklyRsi == null
        ? 'Waiting for data'
        : weeklyRsi >= 70
          ? 'Higher-timeframe overbought — respect cycle tops'
          : weeklyRsi <= 30
            ? 'Higher-timeframe oversold — historically strong for multi-month bottoms'
            : 'Weekly momentum in a mid-range',
  });

  // —— Market heat composite (same weights as classic gauge widget) ——
  let marketHeat = null;
  if (mvrvData?.length && btcData?.length > 350 && fearAndGreedData?.length) {
    let mvrvH = 0;
    if (mvrvCurrent && mvrvPeak) {
      const thresholds = [mvrvPeak, 3.7];
      const distances = thresholds.map((t) => ((mvrvCurrent - t) / t) * 100);
      const minDistance = Math.min(...distances.map(Math.abs));
      // Classic market-heat widget uses /10 not /20 for MVRV/Mayer
      mvrvH = clamp(100 - (minDistance / 10) * 100, 0, 100);
    }
    let mayerH = 0;
    if (mayerCurrent) {
      const thresholds = [2.4, 0.6];
      const distances = thresholds.map((t) => ((mayerCurrent - t) / t) * 100);
      const minDistance = Math.min(...distances.map(Math.abs));
      mayerH = clamp(100 - (minDistance / 10) * 100, 0, 100);
    }
    const riskH = riskHeat || 0;
    const fgH = fgValue || 0;
    let piH = 0;
    if (piRatio) {
      const buffer = 0.5;
      const heatOffset = 0.28;
      piH = clamp(((piRatio / buffer) * 100) + heatOffset, 0, 100);
    }
    marketHeat = clamp(
      mvrvH * 0.25 + mayerH * 0.25 + riskH * 0.15 + fgH * 0.2 + piH * 0.15,
      0,
      100
    );
  }
  metrics.unshift({
    id: 'marketHeat',
    group: 'sentiment',
    title: 'Market Heat Index',
    chartPath: '/market-heat-index',
    heat: marketHeat,
    primary: marketHeat != null ? marketHeat.toFixed(0) : 'N/A',
    secondary: marketHeat != null ? getHeatLabel(marketHeat) : '—',
    unit: '/100',
    explanation:
      'Weighted blend of MVRV, Mayer, Risk, Fear & Greed, and Pi Cycle — overall “how hot is the market?”',
    reading:
      marketHeat == null
        ? 'Waiting for data'
        : getHeatReading(marketHeat),
  });

  // —— Cycle timing (days since Oct 2025 top) ——
  const TOP_START = '2025-10-06';
  const averageTopToBottomDays = 370;
  let daysElapsed = null;
  let daysLeft = null;
  let cycleHeat = null;
  let projectedBottom = null;
  if (btcData?.length) {
    const currentDate = getBtcReferenceDate(btcData);
    const start = new Date(TOP_START);
    const end = new Date(currentDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      daysElapsed = Math.round((end - start) / (1000 * 60 * 60 * 24));
      daysLeft = Math.max(0, averageTopToBottomDays - daysElapsed);
      const progress = daysElapsed / averageTopToBottomDays;
      cycleHeat = clamp(progress ** 3 * 100, 0, 100);
      const projected = new Date(start);
      projected.setDate(projected.getDate() + averageTopToBottomDays);
      projectedBottom = projected.toISOString().split('T')[0];
    }
  }
  metrics.push({
    id: 'cycleTiming',
    group: 'timing',
    title: 'Days to Avg. Cycle Bottom',
    chartPath: '/market-cycles',
    heat: cycleHeat,
    primary: daysLeft != null ? String(daysLeft) : 'N/A',
    secondary:
      daysElapsed != null
        ? `${daysElapsed}d since top · avg ${averageTopToBottomDays}d`
        : 'From 6 Oct 2025 top',
    unit: ' days left',
    explanation:
      'Days since the 6 Oct 2025 bull-market top and estimated days left until the ~370-day average top-to-bottom window.',
    reading:
      daysLeft == null
        ? 'Waiting for data'
        : daysLeft > 180
          ? 'Still early in the typical post-top window'
          : daysLeft > 60
            ? 'Midway through a typical post-top bear window'
            : 'Late in the historical average bottom window',
    extra: projectedBottom
      ? `Avg bottom window ~${new Date(projectedBottom).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : null,
  });

  // Composite headline = market heat if available, else mean of heats
  const heats = metrics.map((m) => m.heat).filter((h) => h != null && Number.isFinite(h));
  const composite =
    marketHeat != null
      ? marketHeat
      : heats.length
        ? heats.reduce((s, h) => s + h, 0) / heats.length
        : null;

  return {
    composite,
    compositeLabel: composite != null ? getHeatLabel(composite) : '—',
    compositeReading: composite != null ? getHeatReading(composite) : 'Loading market signals…',
    metrics,
    groups: {
      sentiment: metrics.filter((m) => m.group === 'sentiment'),
      positioning: metrics.filter((m) => m.group === 'positioning'),
      momentum: metrics.filter((m) => m.group === 'momentum'),
      timing: metrics.filter((m) => m.group === 'timing'),
    },
  };
}
