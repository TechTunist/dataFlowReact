/**
 * DataService
 *
 * Thin abstraction over frontend data access.
 *
 * Goals:
 * - Hide granular backend endpoints behind resource-oriented getters.
 * - Centralize normalization / formatters so charts share one shape.
 * - Keep fetchWithCache + apiUrl under the hood (swappable later).
 *
 * Transition: DataContext still owns React state + preload guards.
 * Fetch bodies delegate here so context thins without consumer churn.
 *
 * Frontend only; no backend changes.
 */

import { apiUrl } from '../config/api';
import logger from '../utils/logger';
import { cacheData, getCachedData } from '../utility/idbUtils';
import { getAuthHeaders } from '../utils/clerkAuth';

// Injected from DataContext after primitives exist (keeps service decoupled).
let _fetchWithCache = null;
let _refreshData = null;

/**
 * Initialize the DataService with the actual fetch implementations.
 * Call once from DataContext after the primitives exist.
 */
export function initializeDataService({ fetchWithCache, refreshData }) {
  _fetchWithCache = fetchWithCache;
  _refreshData = refreshData;
}

function assertInitialized() {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }
}

// =============================================================================
// Low-level transforms
// =============================================================================

/**
 * Normalizes raw price-like data into the common { time, value } shape.
 */
export function normalizePriceData(rawData, valueKey = 'value') {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData
    .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
    .map(item => ({
      time: item.time || item.date || item.end_date ||
            (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
      value: parseFloat(item[valueKey]),
    }))
    .filter(item => item.time !== null)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Deduplicates an array of { time, value } points by time string (first wins).
 * Critical for lightweight-charts stability.
 */
export function deduplicateByTime(data) {
  if (!data || !Array.isArray(data)) return [];

  const seen = new Set();
  return data.filter(item => {
    const key = item.time;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================================================================
// Formatters (must match prior DataContext output shapes)
// =============================================================================

/**
 * Fear & Greed binary series (/fear-and-greed-binary-json/).
 * Shape: [{ value, value_classification, timestamp, time }, ...]
 */
export function formatFearAndGreedBinary(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => ({
      value: item.value != null ? item.value.toString() : '',
      value_classification: item.category || item.value_classification || '',
      timestamp: item.date != null ? item.date.toString() : (item.timestamp != null ? item.timestamp.toString() : ''),
      time: item.date != null
        ? new Date(Number(item.date) * 1000).toISOString().split('T')[0]
        : (item.timestamp != null ? new Date(Number(item.timestamp) * 1000).toISOString().split('T')[0] : null),
    }))
    .filter((d) => d.time != null);
}

/**
 * Latest Fear & Greed (/fear-and-greed-binary-latest/).
 */
export function formatLatestFearAndGreed(data) {
  if (!data) return null;
  const ts = data.timestamp != null ? Number(data.timestamp) : null;
  return {
    value: data.value != null ? parseInt(data.value, 10) : null,
    value_classification: data.value_classification || '',
    timestamp: data.timestamp,
    time: ts ? new Date(ts * 1000).toISOString().split('T')[0] : null,
  };
}

/**
 * Generic macro/FRED-style: {date|time|..., value} -> [{time, value}], dedup last-wins, sorted.
 */
export function formatSimpleMacroSeries(data, valueKey = 'value', timeKey = 'date') {
  if (!data || !Array.isArray(data)) return [];
  const mapped = data
    .map((item) => {
      const t = item[timeKey] || item.time || item.date || item.end_date || item.observation_date;
      const v = item[valueKey] != null ? item[valueKey] : item.value;
      return {
        time: t,
        value: parseFloat(v),
      };
    })
    .filter((item) => item.time != null && !isNaN(item.value));
  const deduped = [...new Map(mapped.map((item) => [item.time, item])).values()];
  return deduped.sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * US macro endpoints (inflation/interest/unemployment/claims): Map dedup by date, preserve order.
 * Matches historical DataContext behavior (no sort).
 */
export function formatUsMacroSeries(data, valueParser = (v) => parseFloat(v)) {
  if (!data || !Array.isArray(data)) return [];
  const mapped = data.map((item) => ({
    time: item.date,
    value: valueParser(item.value),
  }));
  return [...new Map(mapped.map((item) => [item.time, item])).values()];
}

/**
 * Fed balance: observation_date + value scaled by 1e6.
 */
export function formatFedBalanceSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.map((item) => ({
    time: item.observation_date,
    value: parseFloat(item.value) / 1000000,
  }));
}

/**
 * Total market-cap difference: value + 100 offset, strict date validation.
 */
export function formatDifferenceSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (
        !item.time ||
        typeof item.time !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.time) ||
        isNaN(parseFloat(item.value))
      ) {
        logger.warn('Invalid differenceData item:', item);
        return null;
      }
      return {
        time: item.time,
        value: parseFloat(item.value) + 100,
      };
    })
    .filter((item) => item !== null)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export function formatTotal2Series(data) {
  if (!data || !Array.isArray(data)) return [];
  const cutoffDate = new Date('2014-06-18');
  return data
    .filter((item) => new Date(item.date) >= cutoffDate)
    .map((item) => ({
      time: item.date,
      value: parseFloat(item.total2),
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export function formatTotal3Series(data) {
  if (!data || !Array.isArray(data)) return [];
  const cutoffDate = new Date('2014-06-21');
  return data
    .filter((item) => new Date(item.date) >= cutoffDate)
    .map((item) => ({
      time: item.date,
      value: parseFloat(item.total3),
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export function formatSp500DivUnrateSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => ({
      time: item.time,
      value: parseFloat(item.value),
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Altcoin season index (object or timeseries array).
 */
export function formatAltcoinSeasonData(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        index: parseFloat(item.index),
        start_date: item.start_date,
        end_date: item.end_date,
        altcoin_count: parseInt(item.altcoin_count, 10),
        altcoins_outperforming: parseInt(item.altcoins_outperforming, 10),
        season: item.season,
        time: item.end_date,
      }))
      .filter((d) => d.time)
      .sort((a, b) => new Date(a.time) - new Date(b.time));
  }
  return {
    index: parseFloat(data.index),
    start_date: data.start_date,
    end_date: data.end_date,
    altcoin_count: parseInt(data.altcoin_count, 10),
    altcoins_outperforming: parseInt(data.altcoins_outperforming, 10),
    season: data.season,
    time: data.end_date,
  };
}

/**
 * Risk metrics (/risk-metrics/?metric=xxx): [{ time, Risk }, ...]
 */
export function formatRiskSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item || !item.time || item.value == null) {
        return null;
      }
      return {
        time: item.time,
        Risk: parseFloat(item.value),
      };
    })
    .filter((item) => item !== null)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Onchain metrics (flat array or DRF { results }).
 */
export function formatOnchainMetrics(data) {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : (data.results || []);
  return rows.map((item) => ({
    time: item.time,
    metric: item.metric,
    value: item.value !== null ? parseFloat(item.value) : null,
    asset: item.asset,
  }));
}

const ADDRESS_METRICS = [
  'AdrBal1in100KCnt', 'AdrBal1in10KCnt', 'AdrBal1in1KCnt',
  'AdrBalNtv0.001Cnt', 'AdrBalNtv0.01Cnt', 'AdrBalNtv0.1Cnt',
  'AdrBalNtv1Cnt', 'AdrBalNtv10Cnt', 'AdrBalNtv100Cnt',
  'AdrBalUSD1Cnt', 'AdrBalUSD10Cnt', 'AdrBalUSD100Cnt',
  'AdrBalUSD1KCnt', 'AdrBalUSD10KCnt', 'AdrBalUSD100KCnt',
  'AdrBalUSD1MCnt',
];

export function formatAddressMetrics(data) {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : (data.results || []);
  return rows.map((item) => ({
    time: item.time,
    ...Object.fromEntries(
      Object.entries(item)
        .filter(([key]) => key === 'time' || ADDRESS_METRICS.includes(key))
        .map(([key, value]) => [key, value !== null ? parseFloat(value) : null])
    ),
  }));
}

export function formatTxCountSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => ({
      time: item.time.split('T')[0],
      value: parseFloat(item.tx_count),
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * BTC/ETH/altcoin OHLC-style rows: date + close -> { time, value }.
 */
export function formatClosePriceSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return data
    .filter(
      (item) =>
        item.close != null &&
        !isNaN(parseFloat(item.close)) &&
        parseFloat(item.close) > 0
    )
    .map((item) => ({
      time: item.date,
      value: parseFloat(item.close),
    }));
}

/**
 * FRED observations with last-observation-carried-forward for gaps.
 */
export function formatFredObservations(data) {
  if (!data || !Array.isArray(data)) return [];
  let lastValidValue = null;
  return data
    .map((item) => {
      const value =
        item.value != null && !isNaN(parseFloat(item.value))
          ? parseFloat(item.value)
          : lastValidValue;
      if (value !== null) {
        lastValidValue = value;
      }
      return {
        time: item.date,
        value,
      };
    })
    .filter((item) => item.value !== null);
}

export function formatTxCountCombinedSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  let lastInflation = null;
  let lastUnemployment = null;
  let lastFedFunds = null;
  return data
    .map((item) => {
      if (item.inflation_rate !== null) lastInflation = parseFloat(item.inflation_rate);
      if (item.unemployment_rate !== null) lastUnemployment = parseFloat(item.unemployment_rate);
      if (item.interest_rate !== null) lastFedFunds = parseFloat(item.interest_rate);
      return {
        time: item.date.split('T')[0],
        tx_count: item.tx_count ? parseFloat(item.tx_count) : null,
        price: item.price ? parseFloat(item.price) : null,
        inflation_rate: lastInflation,
        unemployment_rate: lastUnemployment,
        fed_funds_rate: lastFedFunds,
      };
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Enrich tx/mvrv rows with derived realized_cap when missing.
 */
export function enrichTxMvrvDataset(data) {
  if (!Array.isArray(data)) return data;
  return data.map((item) => {
    const mvrv = item.mvrv;
    const marketCap = item.market_cap;
    let realizedCap = item.realized_cap;
    if (
      (realizedCap === null || realizedCap === undefined || Number.isNaN(realizedCap)) &&
      marketCap !== null &&
      marketCap !== undefined &&
      !Number.isNaN(marketCap) &&
      mvrv !== null &&
      mvrv !== undefined &&
      !Number.isNaN(mvrv) &&
      mvrv !== 0
    ) {
      realizedCap = marketCap / mvrv;
    }
    return realizedCap !== item.realized_cap ? { ...item, realized_cap: realizedCap } : item;
  });
}

export function formatTxMvrvSeries(data) {
  if (!data || !Array.isArray(data)) return [];
  return enrichTxMvrvDataset(
    data
      .filter((item) => item.date && item.mvrv !== null && !isNaN(parseFloat(item.mvrv)))
      .map((item) => ({
        time: item.date,
        tx_count: parseFloat(item.tx_count),
        mvrv: parseFloat(item.mvrv),
        market_cap: item.market_cap !== null ? parseFloat(item.market_cap) : null,
        realized_cap: item.realized_cap !== null ? parseFloat(item.realized_cap) : null,
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time))
  );
}

export function formatTxMvrvRatioPayload(data) {
  const series = (data?.series || [])
    .map((item) => ({
      time: item.time,
      value: parseFloat(item.value),
    }))
    .filter((item) => !isNaN(item.value))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  return {
    smoothing: data?.smoothing,
    horizontalThreshold: parseFloat(data?.horizontal_threshold),
    time: data?.last_updated || series[series.length - 1]?.time || null,
    series,
  };
}

export function formatFloorEchoPayload(data) {
  const series = (data?.series || [])
    .map((item) => ({
      time: item.time,
      fei: parseFloat(item.fei),
      btcPrice: item.btc_price != null ? parseFloat(item.btc_price) : null,
      capitulation: item.capitulation != null ? parseFloat(item.capitulation) : null,
      drawdown: item.drawdown != null ? parseFloat(item.drawdown) : null,
      dampening: item.dampening != null ? parseFloat(item.dampening) : null,
      inFloorZone: Boolean(item.in_floor_zone),
      nearHistoricFloor: Boolean(item.near_historic_floor),
    }))
    .filter((item) => !Number.isNaN(item.fei))
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  return {
    formulaVersion: data?.formula_version,
    floorBand: data?.floor_band != null ? parseFloat(data.floor_band) : null,
    echoBand: data?.echo_band != null ? parseFloat(data.echo_band) : null,
    time: data?.last_updated || series[series.length - 1]?.time || null,
    series,
  };
}

// =============================================================================
// High-level series access
// =============================================================================

/**
 * Generic fetch via injected fetchWithCache.
 * Pass setData / setLastUpdated / setIsFetched / useDateCheck / cacheDuration via options.
 */
export async function getPriceSeries({
  cacheId,
  endpoint,
  valueKey = 'value',
  formatData,
  ...fetchOptions
}) {
  assertInitialized();

  const finalFormatData = formatData || ((data) => normalizePriceData(data, valueKey));

  return _fetchWithCache({
    cacheId,
    apiUrl: apiUrl(endpoint),
    formatData: finalFormatData,
    ...fetchOptions,
  });
}

// --- Core crypto ---

export async function getBtcPriceSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'btcData',
    endpoint: '/api/btc/price/',
    formatData: (data) =>
      data
        .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
        .map((item) => ({
          time: item.date,
          value: parseFloat(item.close),
        })),
    ...options,
  });
}

export async function getEthPriceSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'ethData',
    endpoint: '/api/eth/price/',
    formatData: (data) =>
      data
        .filter((item) => item.close != null && !isNaN(parseFloat(item.close)))
        .map((item) => ({
          time: item.date,
          value: parseFloat(item.close),
        })),
    ...options,
  });
}

export async function getMvrvSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'mvrvData',
    endpoint: '/api/mvrv/',
    formatData: (data) =>
      data.map((item) => ({
        time: item.time.split('T')[0],
        value: parseFloat(item.cap_mvrv_cur),
      })),
    ...options,
  });
}

export async function getMarketCapSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'marketCapData',
    endpoint: '/api/total/marketcap/',
    formatData: (data) =>
      data.map((item) => ({
        time: item.date,
        value: parseFloat(item.market_cap),
      })),
    ...options,
  });
}

export async function getDominanceSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'dominanceData',
    endpoint: '/api/dominance/',
    formatData: (data) =>
      data.map((item) => ({
        time: item.date,
        btc: parseFloat(item.btc),
        eth: parseFloat(item.eth),
        alt: parseFloat(item.alt),
        stable: parseFloat(item.stable),
      })),
    ...options,
  });
}

export async function getAltcoinPriceSeries(coin, options = {}) {
  // cacheId must match historical DataContext keys (`altcoinData_${coin}` as passed by callers).
  return getPriceSeries({
    cacheId: `altcoinData_${coin}`,
    endpoint: `/api/${String(coin).toLowerCase()}/price/`,
    formatData: formatClosePriceSeries,
    ...options,
  });
}

// --- Sentiment ---

export async function getFearAndGreedSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'fearAndGreedData',
    endpoint: '/api/fear-and-greed-binary-json/',
    formatData: formatFearAndGreedBinary,
    ...options,
  });
}

export async function getLatestFearAndGreed(options = {}) {
  return getPriceSeries({
    cacheId: 'latestFearAndGreed',
    endpoint: '/api/fear-and-greed-binary-latest/',
    formatData: formatLatestFearAndGreed,
    ...options,
  });
}

// --- Market totals ---

export async function getDifferenceSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'differenceData',
    endpoint: '/api/total/difference/',
    formatData: formatDifferenceSeries,
    ...options,
  });
}

export async function getTotal2Series(options = {}) {
  return getPriceSeries({
    cacheId: 'total2Data',
    endpoint: '/api/total2/',
    formatData: formatTotal2Series,
    ...options,
  });
}

export async function getTotal3Series(options = {}) {
  return getPriceSeries({
    cacheId: 'total3Data',
    endpoint: '/api/total3/',
    formatData: formatTotal3Series,
    ...options,
  });
}

export async function getSp500DivUnrateSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'sp500DivUnrateData',
    endpoint: '/api/sp500-div-unrate-squared/',
    formatData: formatSp500DivUnrateSeries,
    ...options,
  });
}

// --- Altcoin season ---

export async function getAltcoinSeasonSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'altcoinSeasonData',
    endpoint: '/api/altcoin-season-index/',
    formatData: formatAltcoinSeasonData,
    ...options,
  });
}

export async function getAltcoinSeasonTimeseriesSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'altcoinSeasonTimeseriesData',
    endpoint: '/api/altcoin-season-index-timeseries/',
    formatData: formatAltcoinSeasonData,
    ...options,
  });
}

// --- Macro / US ---

export async function getMacroDataSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'macroData',
    endpoint: '/api/combined-macro-data/',
    formatData: (data) => data,
    ...options,
  });
}

export async function getInflationSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'inflationData',
    endpoint: '/api/us-inflation/',
    formatData: (data) => formatUsMacroSeries(data, (v) => parseFloat(v)),
    ...options,
  });
}

export async function getInitialClaimsSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'initialClaimsData',
    endpoint: '/api/initial-claims/',
    formatData: (data) => formatUsMacroSeries(data, (v) => parseInt(v, 10)),
    ...options,
  });
}

export async function getInterestSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'interestData',
    endpoint: '/api/us-interest/',
    formatData: (data) => formatUsMacroSeries(data, (v) => parseFloat(v)),
    ...options,
  });
}

export async function getUnemploymentSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'unemploymentData',
    endpoint: '/api/us-unemployment/',
    formatData: (data) => formatUsMacroSeries(data, (v) => parseFloat(v)),
    ...options,
  });
}

export async function getFedBalanceSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'fedBalanceData',
    endpoint: '/api/fed-balance/',
    formatData: formatFedBalanceSeries,
    ...options,
  });
}

// --- On-chain / tx ---

export async function getTxCountSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'txCountData',
    endpoint: '/api/btc-tx-count/',
    formatData: formatTxCountSeries,
    ...options,
  });
}

export async function getTxCountCombinedSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'txCountCombinedData',
    endpoint: '/api/tx-macro/',
    formatData: formatTxCountCombinedSeries,
    ...options,
  });
}

export async function getTxMvrvSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'txMvrvData_v2',
    endpoint: '/api/tx-mvrv/',
    formatData: formatTxMvrvSeries,
    ...options,
  });
}

export async function getTxMvrvRatioSeries(smoothing = 'sma-7', options = {}) {
  return getPriceSeries({
    cacheId: `txMvrvRatioData_v2_${smoothing}`,
    endpoint: `/api/tx-mvrv-ratio/?smoothing=${smoothing}`,
    formatData: formatTxMvrvRatioPayload,
    ...options,
  });
}

export async function getFloorEchoSeries(options = {}) {
  return getPriceSeries({
    cacheId: 'floorEchoData',
    endpoint: '/api/floor-echo/',
    formatData: formatFloorEchoPayload,
    ...options,
  });
}

// --- Risk ---

const RISK_METRIC_CACHE = {
  mvrv_zscore: 'mvrvRiskData',
  puell_multiple: 'puellRiskData',
  miner_cap_thermo: 'minerCapThermoCapRiskData',
  fee_risk: 'feeRiskData',
  sopl_risk: 'soplRiskData',
};

/**
 * Single precomputed risk series.
 * @param {string} metric - backend metric key (e.g. mvrv_zscore)
 */
export async function getRiskSeries(metric, options = {}) {
  const cacheId = options.cacheId || RISK_METRIC_CACHE[metric] || `riskData_${metric}`;
  const { cacheId: _ignored, ...rest } = options;
  return getPriceSeries({
    cacheId,
    endpoint: `/api/risk-metrics/?metric=${metric}&time__gte=2010-09-05`,
    formatData: formatRiskSeries,
    ...rest,
  });
}

export { RISK_METRIC_CACHE };

// --- FRED ---

export async function getFredSeries(seriesId, options = {}) {
  return getPriceSeries({
    cacheId: `fredSeriesData_${seriesId}`,
    endpoint: `/api/series/${seriesId}/observations/`,
    formatData: formatFredObservations,
    useDateCheck: false,
    cacheDuration: 7 * 24 * 60 * 60 * 1000,
    ...options,
  });
}

// =============================================================================
// Paginated / composite loaders (formerly inline in DataContext)
// =============================================================================

/**
 * Walk DRF-style pagination (or accept a flat array) with auth headers.
 */
export async function fetchAllPages(url) {
  let results = [];
  let nextUrl = url;
  const headers = await getAuthHeaders({ maxRetries: 1, delayMs: 250 });
  while (nextUrl) {
    const response = await fetch(nextUrl, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      results = results.concat(data);
      nextUrl = null;
    } else if (data.results && Array.isArray(data.results)) {
      const validResults = data.results.filter((item) => item && typeof item === 'object');
      results = results.concat(validResults);
      nextUrl = data.next;
    } else {
      throw new Error('Invalid API response structure');
    }
  }
  return results;
}

/**
 * Load onchain metrics (PriceUSD + IssContUSD) with same-day IndexedDB short-circuit.
 * @returns {{ ok: true, data, lastUpdated, fromCache } | { ok: false, error }}
 */
export async function loadOnchainMetrics({
  metrics = ['PriceUSD', 'IssContUSD'],
  startTime = '2010-01-01',
  cacheId = 'onchainMetricsData',
} = {}) {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentTimestamp = Date.now();

  try {
    if (typeof indexedDB !== 'undefined') {
      const cached = await getCachedData(cacheId);
      if (cached && cached.data?.length > 0) {
        const sortedCachedData = [...cached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
        const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
        if (latestCachedDate >= currentDate) {
          return {
            ok: true,
            data: sortedCachedData,
            lastUpdated: latestCachedDate,
            fromCache: true,
          };
        }
      }
    }

    const metricQuery = metrics.map((m) => `metric=${encodeURIComponent(m)}`).join('&');
    const onchainUrl = apiUrl(`/api/onchain-metrics/?${metricQuery}&start_time=${startTime}`);
    const allData = await fetchAllPages(onchainUrl);

    if (!allData || allData.length === 0) {
      throw new Error('No onchain metrics data returned');
    }

    const formattedData = formatOnchainMetrics(allData);
    const lastUpdated = formattedData[formattedData.length - 1]?.time || null;

    if (typeof indexedDB !== 'undefined' && formattedData.length > 0) {
      await cacheData(cacheId, formattedData, currentTimestamp);
    }

    return {
      ok: true,
      data: formattedData,
      lastUpdated,
      fromCache: false,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || String(error),
      data: [],
      lastUpdated: null,
      fromCache: false,
    };
  }
}

/** Last-value lookup helper for sparse daily maps (indicator join). */
function lookupPrior(map, date) {
  if (map.has(date)) return map.get(date);
  const prior = [...map.keys()].reverse().find((d) => d < date);
  return prior != null ? map.get(prior) : undefined;
}

/**
 * Pure join: BTC price + T10Y2Y + USRECD + fed funds + M2 YoY growth.
 * Used by Bitcoin10YearRecession / Workbench indicator path.
 */
export function buildBtcYieldRecessionSeries({
  btcData,
  t10y2yData,
  usrecdData,
  fedFundsData,
  m2Data,
  startDate = '2011-08-19',
  endDate = new Date().toISOString().split('T')[0],
}) {
  const dateRange = [];
  let currentDateObj = new Date(startDate);
  const end = new Date(endDate);
  while (currentDateObj <= end) {
    dateRange.push(currentDateObj.toISOString().split('T')[0]);
    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  const btcMap = new Map((btcData || []).map((d) => [d.date, parseFloat(d.close)]));
  const t10y2yMap = new Map((t10y2yData || []).map((d) => [d.date, parseFloat(d.value)]));
  const usrecdMap = new Map((usrecdData || []).map((d) => [d.date, parseInt(d.value, 10)]));
  const fedFundsMap = new Map((fedFundsData || []).map((d) => [d.date, parseFloat(d.value)]));
  const m2Map = new Map((m2Data || []).map((d) => [d.date, parseFloat(d.value)]));

  const m2GrowthMap = new Map();
  dateRange.forEach((date) => {
    const dateObj = new Date(date);
    const oneYearAgo = new Date(dateObj);
    oneYearAgo.setFullYear(dateObj.getFullYear() - 1);
    const oneYearAgoDate = oneYearAgo.toISOString().split('T')[0];
    const currentM2 = lookupPrior(m2Map, date);
    const pastM2 = lookupPrior(m2Map, oneYearAgoDate);
    if (currentM2 && pastM2) {
      m2GrowthMap.set(date, ((currentM2 - pastM2) / pastM2) * 100);
    }
  });

  // LOCF recession flag onto every calendar day
  const usrecdFilled = new Map();
  dateRange.forEach((date) => {
    usrecdFilled.set(date, lookupPrior(usrecdMap, date) || 0);
  });

  return dateRange
    .map((date) => ({
      date,
      btc: lookupPrior(btcMap, date),
      t10y2y: lookupPrior(t10y2yMap, date),
      fedFunds: lookupPrior(fedFundsMap, date),
      m2Growth: lookupPrior(m2GrowthMap, date),
      usrecd: usrecdFilled.get(date) || 0,
    }))
    .filter(
      (d) =>
        d.btc !== undefined &&
        d.t10y2y !== undefined &&
        d.fedFunds !== undefined &&
        d.m2Growth !== undefined
    );
}

/**
 * Fetch + join + cache the btc-yield-recession indicator composite.
 * @returns {{ ok, data, fromCache, error? }}
 */
export async function loadBtcYieldRecessionIndicator({
  cacheId = 'indicatorData_btc-yield-recession',
} = {}) {
  const currentDate = new Date().toISOString().split('T')[0];

  try {
    if (typeof indexedDB !== 'undefined') {
      const cached = await getCachedData(cacheId);
      if (cached && cached.data?.length > 0) {
        const latestCachedDate = cached.data[cached.data.length - 1].date;
        if (latestCachedDate >= currentDate) {
          return { ok: true, data: cached.data, fromCache: true };
        }
      }
    }

    const headers = await getAuthHeaders({ maxRetries: 1, delayMs: 200 });
    const fetchOpts = { headers };

    const [btcResponse, t10y2yResponse, usrecdResponse, fedFundsResponse, m2Response] =
      await Promise.all([
        fetch(apiUrl('/api/btc/price/'), fetchOpts),
        fetch(apiUrl('/api/series/T10Y2Y/observations/'), fetchOpts),
        fetch(apiUrl('/api/series/USRECD/observations/'), fetchOpts),
        fetch(apiUrl('/api/us-interest/'), fetchOpts),
        fetch(apiUrl('/api/series/M2SL/observations/'), fetchOpts),
      ]);

    const [btcData, t10y2yData, usrecdData, fedFundsData, m2Data] = await Promise.all([
      btcResponse.json(),
      t10y2yResponse.json(),
      usrecdResponse.json(),
      fedFundsResponse.json(),
      m2Response.json(),
    ]);

    const combinedData = buildBtcYieldRecessionSeries({
      btcData,
      t10y2yData,
      usrecdData,
      fedFundsData,
      m2Data,
      endDate: currentDate,
    });

    if (typeof indexedDB !== 'undefined' && combinedData.length > 0) {
      await cacheData(cacheId, combinedData, Date.now());
    }

    return { ok: true, data: combinedData, fromCache: false };
  } catch (error) {
    return {
      ok: false,
      data: [],
      fromCache: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Workbench / chart helper: if context series empty, call the matching fetch*.
 * Keeps load routing out of UI components.
 *
 * @param {object} dataContext - useChartData() value (or actions + data)
 * @param {{ dataKey?: string, isFred?: boolean, seriesId?: string, coin?: string, fetchFunction?: string, fetchArgs?: any[] }} spec
 */
export async function ensureSeriesLoaded(dataContext, spec = {}) {
  if (!dataContext) return;

  if (spec.isFred || spec.seriesId) {
    const id = spec.seriesId || spec.dataKey;
    if (!dataContext.fredSeriesData?.[id]?.length) {
      await dataContext.fetchFredSeriesData?.(id);
    }
    return;
  }

  if (spec.coin || (spec.dataKey === 'altcoinData' && spec.coin)) {
    const coin = spec.coin;
    if (!dataContext.altcoinData?.[coin]?.length) {
      await dataContext.fetchAltcoinData?.(coin);
    }
    return;
  }

  if (spec.fetchFunction) {
    const fn = dataContext[spec.fetchFunction];
    if (typeof fn !== 'function') return;
    const dataKey = spec.dataKey;
    const current = dataKey ? dataContext[dataKey] : null;
    if (Array.isArray(current) && current.length > 0) return;
    if (spec.fetchArgs?.length) {
      await fn(...spec.fetchArgs);
    } else {
      await fn();
    }
    return;
  }

  // Convention: dataKey "btcData" -> fetchBtcData via map
  const dataKey = spec.dataKey;
  if (!dataKey) return;
  const current = dataContext[dataKey];
  if (Array.isArray(current) && current.length > 0) return;

  const FETCH_BY_KEY = {
    btcData: 'fetchBtcData',
    ethData: 'fetchEthData',
    mvrvData: 'fetchMvrvData',
    marketCapData: 'fetchMarketCapData',
    dominanceData: 'fetchDominanceData',
    fearAndGreedData: 'fetchFearAndGreedData',
    macroData: 'fetchMacroData',
    inflationData: 'fetchInflationData',
    initialClaimsData: 'fetchInitialClaimsData',
    interestData: 'fetchInterestData',
    unemploymentData: 'fetchUnemploymentData',
    fedBalanceData: 'fetchFedBalanceData',
    txCountData: 'fetchTxCountData',
    txCountCombinedData: 'fetchTxCountCombinedData',
    txMvrvData: 'fetchTxMvrvData',
    floorEchoData: 'fetchFloorEchoData',
    differenceData: 'fetchDifferenceData',
    total2Data: 'fetchTotal2Data',
    total3Data: 'fetchTotal3Data',
    sp500DivUnrateData: 'fetchSp500DivUnrateData',
    altcoinSeasonData: 'fetchAltcoinSeasonData',
    altcoinSeasonTimeseriesData: 'fetchAltcoinSeasonTimeseriesData',
    onchainMetricsData: 'fetchOnchainMetricsData',
  };
  const name =
    FETCH_BY_KEY[dataKey] ||
    `fetch${dataKey.charAt(0).toUpperCase()}${dataKey.slice(1)}`;
  const fn = dataContext[name];
  if (typeof fn === 'function') {
    await fn();
  }
}

// Convenience map for future direct consumers (Workbench, charts)
export const series = {
  getBtcPriceSeries,
  getEthPriceSeries,
  getMvrvSeries,
  getMarketCapSeries,
  getDominanceSeries,
  getAltcoinPriceSeries,
  getFearAndGreedSeries,
  getLatestFearAndGreed,
  getDifferenceSeries,
  getTotal2Series,
  getTotal3Series,
  getSp500DivUnrateSeries,
  getAltcoinSeasonSeries,
  getAltcoinSeasonTimeseriesSeries,
  getMacroDataSeries,
  getInflationSeries,
  getInitialClaimsSeries,
  getInterestSeries,
  getUnemploymentSeries,
  getFedBalanceSeries,
  getTxCountSeries,
  getTxCountCombinedSeries,
  getTxMvrvSeries,
  getTxMvrvRatioSeries,
  getFloorEchoSeries,
  getRiskSeries,
  getFredSeries,
  loadOnchainMetrics,
  loadBtcYieldRecessionIndicator,
  ensureSeriesLoaded,
};

export const dataService = {
  initializeDataService,
  getPriceSeries,
  normalizePriceData,
  deduplicateByTime,
  fetchAllPages,
  buildBtcYieldRecessionSeries,
  series,
  ...series,
};

export default dataService;
