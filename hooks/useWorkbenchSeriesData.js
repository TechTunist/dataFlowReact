/**
 * useWorkbenchSeriesData
 *
 * Custom hook extracted from Workbench.jsx during professionalization sprint.
 * Centralizes:
 * - getRawData (with branching for macro/crypto/indicator/derived + fred vs custom)
 * - getNormalizedData (delegates to DataService normalize + dedup)
 * - getType, getValueKey, getSeriesInfo, getSeriesColor (for non-state colors), getLastTime
 *
 * Data access integration notes:
 * - Currently sources raw series from DataContext state (the source of truth for loaded data).
 * - BTC/ETH/MarketCap/Dominance etc are populated in context via DataService.getBtcPriceSeries etc (see DataContext delegations).
 * - Macro/FRED still use direct context.fredSeriesData + fetchFredSeriesData.
 * - This hook is the place to evolve reads toward DataService when it grows read-side APIs (e.g. getSeriesObservations or cached getters).
 *
 * // INTEGRATE WITH DATA LAYER
 * TODO (for data-layer agent or future): 
 *   - Add DataService.getMacroSeries(id), getFredSeries(seriesId), getIndicatorSeries etc that return current cached values (sync or via subscription).
 *   - Then refactor getRawData here to prefer service reads (with fallback to context during transition).
 *   - Move more of the fetch triggering (currently in useWorkbenchSeriesManagement) into service-aware hooks.
 *   - For derived: see useWorkbenchDerivedSeries + future DataService.getDerivedSeries(def, sources).
 *
 * Preserves 100% original behavior and LOCF/mixed-freq handling expectations.
 * No side effects; pure getters + stable callbacks.
 */

import { useCallback, useMemo } from 'react';
import { normalizePriceData, deduplicateByTime } from '../data';
// DataService specific getters available for future routing / comments (do not call for state reads yet)
import {
  getPriceSeries,
  getBtcPriceSeries,
  getEthPriceSeries,
  getMvrvSeries,
  getMarketCapSeries,
  getDominanceSeries,
} from '../data';
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
} from '../components/workbench/availableSeries';

export function useWorkbenchSeriesData({ dataContext, derivedData = {}, derivedSeriesDefs = [] }) {
  const getType = useCallback((id) => {
    if (availableMacroSeries[id]) return 'macro';
    if (availableCryptoSeries[id]) return 'crypto';
    if (availableIndicatorSeries[id]) return 'indicator';
    return null;
  }, []);

  const getSeriesType = useCallback((id, activeDerived = []) => {
    const t = getType(id);
    if (t) return t;
    if (derivedSeriesDefs.some(d => d.id === id) || activeDerived.includes(id)) return 'derived';
    return null;
  }, [getType, derivedSeriesDefs]);

  const getValueKey = useCallback((id) => {
    return (availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.valueKey || 'value';
  }, []);

  const getSeriesInfo = useCallback((id, type) => {
    if (type === 'macro') return availableMacroSeries[id];
    if (type === 'crypto') return availableCryptoSeries[id];
    if (type === 'indicator') return availableIndicatorSeries[id];
    if (type === 'derived') return derivedSeriesDefs.find(d => d.id === id);
    return null;
  }, [derivedSeriesDefs]);

  // Note: full color resolution that checks seriesColors state lives in the orchestrator or moving-avg hook for now.
  // This provides the base/fallback.
  const getSeriesColorBase = useCallback((id, type) => {
    if (type === 'macro') return availableMacroSeries[id]?.color || '#00FFFF';
    if (type === 'crypto') return availableCryptoSeries[id]?.color || '#00FFFF';
    if (type === 'indicator') return availableIndicatorSeries[id]?.color || '#00FFFF';
    if (type === 'derived') return derivedSeriesDefs.find(d => d.id === id)?.color || '#00FFFF';
    return '#00FFFF';
  }, [derivedSeriesDefs]);

  const getRawData = useCallback((id, type) => {
    if (type === 'derived') {
      return derivedData[id] || [];
    }
    if (type === 'macro') {
      const info = availableMacroSeries[id];
      if (!info) return [];
      if (info.isFred) {
        // fredSeriesData is keyed by seriesId (e.g. 'SP500')
        return dataContext?.fredSeriesData?.[info.seriesId] || [];
      }
      return dataContext?.[info.dataKey] || [];
    }
    if (type === 'crypto') {
      const info = availableCryptoSeries[id];
      if (!info) return [];
      // INTEGRATE WITH DATA LAYER
      // Context.btcData / ethData are populated by DataContext.fetchBtcData which now delegates
      // to DataService.getBtcPriceSeries (see DataContext.js). Same for others.
      // We read the already-normalized {time, value} from context state here (sync getter).
      // TODO: When DataService exposes a getLoadedSeries(cacheId) or integrates with a store,
      // route e.g. if (id==='BTC') return await getBtcPriceSeries(...) but since this must be sync
      // and context is the current subscriber, keep for now + comment.
      if (info.dataKey === 'btcData') return dataContext?.btcData || [];
      if (info.dataKey === 'ethData') return dataContext?.ethData || [];
      if (info.dataKey === 'altcoinData') return dataContext?.altcoinData?.[info.coin] || [];
      return [];
    }
    if (type === 'indicator') {
      const info = availableIndicatorSeries[id];
      if (!info) return [];
      // Some indicators (risks etc) may be precomputed in context; dominance/marketCap now also delegated in DS.
      return dataContext?.[info.dataKey] || [];
    }
    return [];
  }, [dataContext, derivedData]);

  const getNormalizedData = useCallback((rawData, valueKey) => {
    // Fully delegated to DataService helpers (normalizePriceData + deduplicateByTime).
    // This was the first integration point; kept here for all call sites (derived creation + chart prep).
    const normalized = normalizePriceData(rawData, valueKey);
    return deduplicateByTime(normalized);
  }, []);

  const getLastTime = useCallback((id, type) => {
    const raw = getRawData(id, type);
    if (!raw || raw.length === 0) return 0;
    const last = raw[raw.length - 1];
    const timeField = last.time || last.date || last.end_date ||
      (last.timestamp ? new Date(last.timestamp * 1000).toISOString().split('T')[0] : 0);
    return new Date(timeField).getTime();
  }, [getRawData]);

  // Memoized list helpers if useful to consumers
  const allAvailable = useMemo(() => ({
    macro: availableMacroSeries,
    crypto: availableCryptoSeries,
    indicator: availableIndicatorSeries,
  }), []);

  return {
    getType,
    getSeriesType,
    getValueKey,
    getSeriesInfo,
    getSeriesColorBase,
    getRawData,
    getNormalizedData,
    getLastTime,
    allAvailable,
    // Re-export DS accessors for consumers that want to trigger loads explicitly in future
    dataService: {
      getPriceSeries,
      getBtcPriceSeries,
      getEthPriceSeries,
      getMvrvSeries,
      getMarketCapSeries,
      getDominanceSeries,
    },
  };
}

export default useWorkbenchSeriesData;
