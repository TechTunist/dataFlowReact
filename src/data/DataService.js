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
 * Important:
 * - This layer is designed to be swappable later if/when the backend
 *   provides better, more aggregated endpoints.
 * - For now, it sits on top of the existing fetchWithCache + apiUrl system.
 * - All existing DataContext fetch functions and Workbench logic continue
 *   to work unchanged during the transition.
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
// High-level Series Access (the public API we will grow)
// =============================================================================

/**
 * Generic method to fetch a price-like series.
 * This is the main abstraction we will expand.
 *
 * For now this is a thin wrapper. As we migrate, more logic moves here.
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
 * Planned higher-level methods (to be implemented incrementally):
 *
 * - getCryptoSeries(coin)
 * - getMacroSeries(seriesId)
 * - getRiskMetric(metric)
 * - getDerivedSeries(definition, sources)   // moves Workbench derivation logic here
 * - getObservations(seriesId)               // unifies the /api/series/... pattern
 *
 * These will live alongside the current granular access during the transition.
 */

// BTC-specific convenience (first real usage in Phase 1)
export async function getBtcPriceSeries(options = {}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  return _fetchWithCache({
    cacheId: 'btcData',
    apiUrl: apiUrl('/api/btc/price/'),
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
export async function getEthPriceSeries(options = {}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  return _fetchWithCache({
    cacheId: 'ethData',
    apiUrl: apiUrl('/api/eth/price/'),
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
export async function getMvrvSeries(options = {}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  return _fetchWithCache({
    cacheId: 'mvrvData',
    apiUrl: apiUrl('/api/mvrv/'),
    formatData: (data) =>
      data.map((item) => ({
        time: item.time.split('T')[0],
        value: parseFloat(item.cap_mvrv_cur),
      })),
    ...options,
  });
}

// Market Cap (core dataset - continuing Phase 1 pattern)
export async function getMarketCapSeries(options = {}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  return _fetchWithCache({
    cacheId: 'marketCapData',
    apiUrl: apiUrl('/api/total/marketcap/'),
    formatData: (data) =>
      data.map((item) => ({
        time: item.date,
        value: parseFloat(item.market_cap),
      })),
    ...options,
  });
}

// Dominance (multi-series dataset - Phase 1)
export async function getDominanceSeries(options = {}) {
  if (!_fetchWithCache) {
    throw new Error('DataService not initialized. Call initializeDataService() first.');
  }

  return _fetchWithCache({
    cacheId: 'dominanceData',
    apiUrl: apiUrl('/api/dominance/'),
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