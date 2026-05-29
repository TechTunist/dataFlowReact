/**
 * Technical Indicators - DRY utilities for moving averages and related calculations.
 *
 * Goal: Single source of truth for common moving averages used across
 * BitcoinPrice, EthereumPrice, AltcoinPrice, FredSeriesChart, and future charts.
 *
 * This allows us to add many more MAs without duplicating definitions,
 * calculation logic, or UI rendering code.
 */

export const MA_CATEGORIES = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly / Cycle',
  LONG_TERM: 'Long-term / Cycle',
  COMPOSITE: 'Composites',
};

/**
 * Master list of moving average presets.
 * Keys are stable identifiers used in state (activeSMAs, etc.).
 *
 * period = number of data points (days if using daily data).
 * For weekly-style analysis on daily data, multiply weeks * 7.
 */
export const MOVING_AVERAGE_PRESETS = {
  // ===================== DAILY =====================
  // Short-term
  '7d-sma': { period: 7, type: 'sma', label: '7 Day SMA', color: '#3498DB', category: MA_CATEGORIES.DAILY },
  '14d-sma': { period: 14, type: 'sma', label: '14 Day SMA', color: '#1ABC9C', category: MA_CATEGORIES.DAILY },

  // Medium-term daily
  '20d-sma': { period: 20, type: 'sma', label: '20 Day SMA', color: '#2ECC71', category: MA_CATEGORIES.DAILY },
  '21d-sma': { period: 21, type: 'sma', label: '21 Day SMA', color: '#58D68D', category: MA_CATEGORIES.DAILY },
  '50d-sma': { period: 50, type: 'sma', label: '50 Day SMA', color: '#F1C40F', category: MA_CATEGORIES.DAILY },
  '100d-sma': { period: 100, type: 'sma', label: '100 Day SMA', color: '#D35400', category: MA_CATEGORIES.DAILY },
  '200d-sma': { period: 200, type: 'sma', label: '200 Day SMA', color: '#C0392B', category: MA_CATEGORIES.DAILY },

  // Daily EMAs (very popular)
  '8d-ema': { period: 8, type: 'ema', label: '8 Day EMA', color: '#E74C3C', category: MA_CATEGORIES.DAILY },
  '9d-ema': { period: 9, type: 'ema', label: '9 Day EMA', color: '#C0392B', category: MA_CATEGORIES.DAILY },
  '12d-ema': { period: 12, type: 'ema', label: '12 Day EMA', color: '#922B21', category: MA_CATEGORIES.DAILY },
  '20d-ema': { period: 20, type: 'ema', label: '20 Day EMA', color: '#A93226', category: MA_CATEGORIES.DAILY },
  '21d-ema': { period: 21, type: 'ema', label: '21 Day EMA', color: '#7B241C', category: MA_CATEGORIES.DAILY },
  '26d-ema': { period: 26, type: 'ema', label: '26 Day EMA', color: '#641E16', category: MA_CATEGORIES.DAILY },
  '50d-ema': { period: 50, type: 'ema', label: '50 Day EMA', color: '#5B2C6F', category: MA_CATEGORIES.DAILY },
  '100d-ema': { period: 100, type: 'ema', label: '100 Day EMA', color: '#4A235A', category: MA_CATEGORIES.DAILY },
  '200d-ema': { period: 200, type: 'ema', label: '200 Day EMA', color: '#2C3E50', category: MA_CATEGORIES.DAILY },

  // ===================== WEEKLY / CYCLE =====================
  '2w-sma': { period: 14, type: 'sma', label: '2 Week SMA', color: '#5DADE2', category: MA_CATEGORIES.WEEKLY },
  '3w-sma': { period: 21, type: 'sma', label: '3 Week SMA', color: '#3498DB', category: MA_CATEGORIES.WEEKLY },
  '4w-sma': { period: 28, type: 'sma', label: '4 Week SMA', color: '#2980B9', category: MA_CATEGORIES.WEEKLY },
  '6w-sma': { period: 42, type: 'sma', label: '6 Week SMA', color: '#1F618D', category: MA_CATEGORIES.WEEKLY },
  '8w-sma': { period: 56, type: 'sma', label: '8 Week SMA', color: '#1ABC9C', category: MA_CATEGORIES.WEEKLY },
  '10w-sma': { period: 70, type: 'sma', label: '10 Week SMA', color: '#16A085', category: MA_CATEGORIES.WEEKLY },
  '12w-sma': { period: 84, type: 'sma', label: '12 Week SMA', color: '#27AE60', category: MA_CATEGORIES.WEEKLY },
  '17w-sma': { period: 119, type: 'sma', label: '17 Week SMA', color: '#58D68D', category: MA_CATEGORIES.WEEKLY },
  '20w-sma': { period: 140, type: 'sma', label: '20 Week SMA', color: '#E67E22', category: MA_CATEGORIES.WEEKLY },
  '40w-sma': { period: 280, type: 'sma', label: '40 Week SMA', color: '#F1C40F', category: MA_CATEGORIES.WEEKLY },
  '50w-sma': { period: 350, type: 'sma', label: '50 Week SMA', color: '#F39C12', category: MA_CATEGORIES.WEEKLY },
  '52w-sma': { period: 364, type: 'sma', label: '52 Week SMA (1 Year)', color: '#D4AC0D', category: MA_CATEGORIES.WEEKLY },
  '100w-sma': { period: 700, type: 'sma', label: '100 Week SMA', color: '#E91E63', category: MA_CATEGORIES.LONG_TERM },
  '150w-sma': { period: 1050, type: 'sma', label: '150 Week SMA', color: '#AD1457', category: MA_CATEGORIES.LONG_TERM },
  '200w-sma': { period: 1400, type: 'sma', label: '200 Week SMA', color: '#00BCD4', category: MA_CATEGORIES.LONG_TERM },

  // Weekly EMAs
  '8w-ema': { period: 56, type: 'ema', label: '8 Week EMA', color: '#E74C3C', category: MA_CATEGORIES.WEEKLY },
  '12w-ema': { period: 84, type: 'ema', label: '12 Week EMA', color: '#C0392B', category: MA_CATEGORIES.WEEKLY },
  '21w-ema': { period: 147, type: 'ema', label: '21 Week EMA', color: '#2ECC71', category: MA_CATEGORIES.WEEKLY },
  '26w-ema': { period: 182, type: 'ema', label: '26 Week EMA', color: '#27AE60', category: MA_CATEGORIES.WEEKLY },
  '50w-ema': { period: 350, type: 'ema', label: '50 Week EMA', color: '#1E8449', category: MA_CATEGORIES.WEEKLY },
};

/**
 * Special composite: Bull Market Support Band
 * (20 Week SMA + 21 Week EMA). Treated specially in rendering logic.
 */
export const BULL_MARKET_SUPPORT_BAND = {
  key: 'bull-market-support',
  type: 'composite',
  label: 'Bull Market Support Band',
  category: MA_CATEGORIES.COMPOSITE,
  sma: {
    type: 'sma',
    period: 140,
    color: '#E74C3C',
    label: '20 Week SMA (Bull Market Support)',
  },
  ema: {
    type: 'ema',
    period: 147,
    color: '#2ECC71',
    label: '21 Week EMA (Bull Market Support)',
  },
};

/**
 * Pure SMA calculation.
 * @param {Array<{time: string, value: number}>} data - Sorted price-like data
 * @param {number} period
 * @returns {Array<{time: string, value: number}>}
 */
export function calculateSMA(data, period) {
  if (!data || data.length < period) return [];

  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value;
    }
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  return result;
}

/**
 * Pure EMA calculation.
 * @param {Array<{time: string, value: number}>} data
 * @param {number} period
 * @returns {Array<{time: string, value: number}>}
 */
export function calculateEMA(data, period) {
  if (!data || data.length < period) return [];

  const k = 2 / (period + 1);
  const result = [];

  // Seed with SMA of first 'period' points
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].value;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].value * k) + (ema * (1 - k));
    result.push({ time: data[i].time, value: ema });
  }

  return result;
}

/**
 * Generic dispatcher. Use this in chart components.
 */
export function calculateMovingAverage(data, config) {
  if (!config) return [];

  if (config.type === 'sma') {
    return calculateSMA(data, config.period);
  }
  if (config.type === 'ema') {
    return calculateEMA(data, config.period);
  }
  return [];
}

/**
 * Helper to get a nice distinct color for a key (fallback).
 * Components should prefer colors defined in the presets.
 */
export function getDefaultMAColor(key) {
  const preset = MOVING_AVERAGE_PRESETS[key];
  if (preset?.color) return preset.color;
  if (key === BULL_MARKET_SUPPORT_BAND.key) return BULL_MARKET_SUPPORT_BAND.sma.color;
  return '#888888';
}

/**
 * Returns all available moving average options (including composites).
 * Useful for building dropdowns.
 */
export function getAllMovingAverageOptions() {
  return {
    ...MOVING_AVERAGE_PRESETS,
    [BULL_MARKET_SUPPORT_BAND.key]: BULL_MARKET_SUPPORT_BAND,
  };
}

/**
 * Returns moving averages grouped by category for nice dropdown rendering.
 * Order: Daily → Weekly/Cycle → Long-term → Composites
 */
export function getMovingAveragesGrouped(includeComposites = true) {
  const all = getAllMovingAverageOptions();
  const groups = {
    [MA_CATEGORIES.DAILY]: [],
    [MA_CATEGORIES.WEEKLY]: [],
    [MA_CATEGORIES.LONG_TERM]: [],
  };

  if (includeComposites) {
    groups[MA_CATEGORIES.COMPOSITE] = [];
  }

  Object.entries(all).forEach(([key, value]) => {
    const cat = value.category || MA_CATEGORIES.WEEKLY;

    if (groups[cat]) {
      groups[cat].push({ key, ...value });
    } else if (cat === MA_CATEGORIES.COMPOSITE && includeComposites) {
      groups[MA_CATEGORIES.COMPOSITE].push({ key, ...value });
    }
  });

  // Sort each group by period (nice ordering)
  Object.keys(groups).forEach(cat => {
    groups[cat].sort((a, b) => (a.period || 0) - (b.period || 0));
  });

  return groups;
}

/**
 * Recommended sets for different chart types (can be used to pre-select or group).
 */
export const RECOMMENDED_SETS = {
  BITCOIN_CYCLE: [
    '20w-sma',
    '21w-ema',
    '50w-sma',
    '100w-sma',
    '200w-sma',
    'bull-market-support',
  ],
  CLASSIC_DAILY: [
    '50d-sma',
    '200d-sma',
    '21d-ema',
  ],
  ALL_MAJOR: Object.keys(MOVING_AVERAGE_PRESETS),
};

/**
 * Returns only the daily moving averages (including their full objects + key).
 */
export function getDailyMAs() {
  const all = getAllMovingAverageOptions();
  return Object.entries(all)
    .filter(([_, v]) => v.category === MA_CATEGORIES.DAILY)
    .map(([key, v]) => ({ key, ...v }));
}

/**
 * Returns only the weekly + long-term + composite moving averages.
 */
export function getWeeklyMAs() {
  const all = getAllMovingAverageOptions();
  return Object.entries(all)
    .filter(([_, v]) => 
      v.category === MA_CATEGORIES.WEEKLY || 
      v.category === MA_CATEGORIES.LONG_TERM ||
      v.category === MA_CATEGORIES.COMPOSITE
    )
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (a.period || 0) - (b.period || 0));
}
