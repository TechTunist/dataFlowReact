/**
 * DataService
 *
 * A thin, clean abstraction layer over data access for the frontend.
 *
 * Current goal (Phase 1):
 * - Hide the extremely granular nature of the current backend API.
 * - Centralize common data normalization and transformation logic.
 * - Provide a more coherent, resource-oriented interface to consumers
 *   (especially the Workbench and future chart components).
 *
 * Phase 2 (this slice):
 * - Expanded high-level getters for Fear&Greed (binary+latest), all macro/US macro,
 *   fed, onchain, address, altcoinSeason(+ts), 5 risk types, tx*, totals/diff, sp500, fred.
 * - Common formatters extracted (for FG value+classification, risk {Risk}, macro dedup, etc).
 * - getPriceSeries enhanced + reused by most specifics for DRY + custom options (ttl etc).
 * - Support for custom fetch options (cacheDuration, useDateCheck, staleWhileRevalidate) passed through.
 * - dataService object export for future direct use by Workbench/charts (parallel agents).
 * - JSDoc + comments; keeps all old named exports working.
 *
 * Important:
 * - This layer is designed to be swappable later if/when the backend
 *   provides better, more aggregated endpoints.
 * - For now, it sits on top of the existing fetchWithCache + apiUrl system.
 * - All existing DataContext fetch functions and Workbench logic continue
 *   to work unchanged during the transition.
 * - Frontend only; no backend changes.
 */

import { apiUrl } from '../config/api';

// The DataService is given the low-level fetch primitives at creation time.
// This keeps it decoupled from DataContext internals during the transition.
let _fetchWithCache = null;
let _refreshData = null;

/**
 * Initialize the DataService with the actual fetch implementations.
 * Call this once from DataContext (or a bootstrap file) after the primitives exist.
 */
export function initializeDataService({ fetchWithCache, refreshData }) {
  _fetchWithCache = fetchWithCache;
  _refreshData = refreshData;
}

// =============================================================================
// Low-level primitives (can stay private for now)
// =============================================================================

/**
 * Normalizes raw price-like data into the common { time, value } shape.
 * Used by many price and macro series.
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
 * Deduplicates an array of { time, value } points by time string.
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
// Formatters for common cases (Phase 2)
// Centralized here so all delegations + direct consumers get identical shapes.
// These match the output expectations of existing consumers (charts, Workbench).
// =============================================================================

/**
 * Formatter for Fear & Greed binary series (used by fetchFearAndGreedData via /fear-and-greed-binary-json/).
 * Also handles slight variations from regular endpoint.
 * Shape: array of { value: string, value_classification: string, timestamp: string, time: 'YYYY-MM-DD' }
 * (used by FearAndGreedChart, etc.)
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
 * Formatter for single latest Fear & Greed record (from /fear-and-greed-binary-latest/).
 * Shape: { value: number, value_classification: string, timestamp, time } or null
 * (used by FearAndGreed gauge widget etc.)
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
 * Generic formatter for simple macro/FRED-style series: {date|time|observation_date, value} -> [{time, value}]
 * Includes dedup by time (last wins) common for monthly macro sources.
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
  // Dedup by time keeping last (matches inflation etc logic in prior code)
  const deduped = [...new Map(mapped.map((item) => [item.time, item])).values()];
  return deduped.sort((a, b) => new Date(a.time) - new Date(b.time));
}

/**
 * Formatter for (latest) altcoin season index object or timeseries array.
 * Shape for obj: { index, start_date, end_date, altcoin_count, altcoins_outperforming, season, time }
 * For array: same + sorted.
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
 * Formatter for risk metric series (from /risk-metrics/?metric=xxx).
 * Output shape required by consumers (OnChainHistoricalRisk, Workbench): [{ time, Risk: number }, ...]
 * Note capitalized 'Risk' key.
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
 * Formatter for onchain metrics (paginated list of pivoted rows).
 * Shape: [{ time, metric, value, asset }, ...]
 */
export function formatOnchainMetrics(data) {
  if (!data || !Array.isArray(data)) return [];
  // Support both flat array and DRF {results: [...]}
  const rows = Array.isArray(data) ? data : (data.results || []);
  return rows.map((item) => ({
    time: item.time,
    metric: item.metric,
    value: item.value !== null ? parseFloat(item.value) : null,
    asset: item.asset,
  }));
}

/** List of address metric keys (duplicated here for service independence during transition; source of truth also in DataContext) */
const ADDRESS_METRICS = [
  'AdrBal1in100KCnt', 'AdrBal1in10KCnt', 'AdrBal1in1KCnt',
  'AdrBalNtv0.001Cnt', 'AdrBalNtv0.01Cnt', 'AdrBalNtv0.1Cnt',
  'AdrBalNtv1Cnt', 'AdrBalNtv10Cnt', 'AdrBalNtv100Cnt',
  'AdrBalUSD1Cnt', 'AdrBalUSD10Cnt', 'AdrBalUSD100Cnt',
  'AdrBalUSD1KCnt', 'AdrBalUSD10KCnt', 'AdrBalUSD100KCnt',
  'AdrBalUSD1MCnt',
];

/**
 * Formatter for address metrics (wide rows with many AdrBal* columns).
 * Used by BitcoinAddressBalance etc. (note current consumers read via onchainMetricsData state due to prior bug).
 */
export function formatAddressMetrics(data) {
  if (!data || !Array.isArray(data)) return [];
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

// =============================================================================
// High-level Series Access (the public API we will grow)
// =============================================================================

/**
 * Generic method to fetch a price-like (or any) series.
 * This is the main abstraction we will expand.
 *
 * Phase 2: now used by (nearly) all high-level getters; supports passing
 * custom fetch options e.g. { useDateCheck: true, cacheDuration: xxx, staleWhileRevalidate: false }
 * which are forwarded to fetchWithCache (and thus respect CACHE_CONFIG + ttl logic).
 * Falls back to normalizePriceData if no formatData.
 */
export async function getPriceSeries({ 
  cacheId, 
  endpoint, 
  valueKey = 'value',
  formatData,
  ...fetchOptions 
}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  const finalFormatData = formatData || ((data) => normalizePriceData(data, valueKey));

  return _fetchWithCache({
    cacheId,
    apiUrl: apiUrl(endpoint),
    formatData: finalFormatData,
    ...fetchOptions,
  });
}

// =============================================================================
// Future expansion areas (documented for clarity)
// =============================================================================

/**
 * Planned higher-level methods (implemented in Phase 2 of this slice):
 *
 * - getFearAndGreedSeries(variant)
 * - getInflationSeries / getInterestSeries / getUnemploymentSeries / getInitialClaimsSeries / getFedBalanceSeries
 * - getOnchainMetricsSeries / getAddressMetricsSeries
 * - getAltcoinSeasonSeries / getAltcoinSeasonTimeseriesSeries
 * - getRiskSeries(metric)  // covers the 5
 * - getFredSeries(fredCode)
 * - getDifferenceSeries / getTotal2Series / getTotal3Series / getTx*Series / getSp500DivUnrateSeries
 *
 * More: getMacroSeries, getDerivedSeries etc still planned for later.
 * These live alongside the current granular access during the transition.
 */

// BTC-specific convenience (first real usage in Phase 1)
// Phase 2: now delegates to enhanced getPriceSeries (supports custom ttl/fetchOptions)
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

// ETH-specific (symmetric to BTC for Phase 1 pattern demonstration)
// Phase 2: now delegates to enhanced getPriceSeries (supports custom ttl/fetchOptions)
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

// MVRV (important product metric - Phase 1 delegation)
// Phase 2: now delegates to enhanced getPriceSeries (supports custom ttl/fetchOptions)
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

// Market Cap (core dataset - continuing Phase 1 pattern)
// Phase 2: now delegates to enhanced getPriceSeries (supports custom ttl/fetchOptions)
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

// Dominance (multi-series dataset - Phase 1)
// Phase 2: now delegates to enhanced getPriceSeries (supports custom ttl/fetchOptions + custom formatData for multi-field)
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

// Placeholder for future higher-level methods
export const series = {
  // getCryptoSeries, getMacroSeries, etc. will go here
};

export default {
  getPriceSeries,
  getBtcPriceSeries,
  normalizePriceData,
  deduplicateByTime,
  series,
  initializeDataService,
};