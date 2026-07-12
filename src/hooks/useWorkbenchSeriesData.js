/**
 * useWorkbenchSeriesData
 *
 * Centralizes Workbench raw/normalized reads from DataContext cache state.
 * Normalize/dedup and ensureSeriesLoaded come from DataService.
 *
 * Reads stay sync from context (source of truth after loads). Loads are triggered
 * by useWorkbenchSeriesManagement via ensureSeriesLoaded.
 */

import { useCallback, useMemo } from 'react';
import {
  normalizePriceData,
  deduplicateByTime,
  ensureSeriesLoaded,
  series as dataServiceSeries,
} from '../data';
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  availableStockSeries,
} from '../components/workbench/availableSeries';
import { resolveIndicatorRawData } from '../utils/workbenchSeriesUtils';

export function useWorkbenchSeriesData({ dataContext, derivedData = {}, derivedSeriesDefs = [] }) {
  const getType = useCallback((id) => {
    if (availableMacroSeries[id]) return 'macro';
    if (availableCryptoSeries[id]) return 'crypto';
    if (availableIndicatorSeries[id]) return 'indicator';
    if (availableStockSeries[id]) return 'stock';
    return null;
  }, []);

  const getSeriesType = useCallback((id, activeDerived = []) => {
    const t = getType(id);
    if (t) return t;
    if (derivedSeriesDefs.some((d) => d.id === id) || activeDerived.includes(id)) return 'derived';
    return null;
  }, [getType, derivedSeriesDefs]);

  const getValueKey = useCallback((id) => {
    return (
      availableMacroSeries[id] ||
      availableCryptoSeries[id] ||
      availableIndicatorSeries[id] ||
      availableStockSeries[id]
    )?.valueKey || 'value';
  }, []);

  const getSeriesInfo = useCallback((id, type) => {
    if (type === 'macro') return availableMacroSeries[id];
    if (type === 'crypto') return availableCryptoSeries[id];
    if (type === 'indicator') return availableIndicatorSeries[id];
    if (type === 'stock') return availableStockSeries[id];
    if (type === 'derived') return derivedSeriesDefs.find((d) => d.id === id);
    return null;
  }, [derivedSeriesDefs]);

  const getSeriesColorBase = useCallback((id, type) => {
    if (type === 'macro') return availableMacroSeries[id]?.color || '#00FFFF';
    if (type === 'crypto') return availableCryptoSeries[id]?.color || '#00FFFF';
    if (type === 'indicator') return availableIndicatorSeries[id]?.color || '#00FFFF';
    if (type === 'stock') return availableStockSeries[id]?.color || '#00FFFF';
    if (type === 'derived') return derivedSeriesDefs.find((d) => d.id === id)?.color || '#00FFFF';
    return '#00FFFF';
  }, [derivedSeriesDefs]);

  /**
   * Sync read of already-loaded series from context (populated by DataService-backed fetches).
   */
  const getRawData = useCallback((id, type) => {
    if (type === 'derived') {
      return derivedData[id] || [];
    }
    if (type === 'macro') {
      const info = availableMacroSeries[id];
      if (!info) return [];
      if (info.isFred) {
        return dataContext?.fredSeriesData?.[info.seriesId] || [];
      }
      return dataContext?.[info.dataKey] || [];
    }
    if (type === 'crypto') {
      const info = availableCryptoSeries[id];
      if (!info) return [];
      if (info.dataKey === 'btcData') return dataContext?.btcData || [];
      if (info.dataKey === 'ethData') return dataContext?.ethData || [];
      if (info.dataKey === 'altcoinData') return dataContext?.altcoinData?.[info.coin] || [];
      return [];
    }
    if (type === 'indicator') {
      const info = availableIndicatorSeries[id];
      if (!info) return [];
      return resolveIndicatorRawData(info, dataContext);
    }
    if (type === 'stock') {
      const info = availableStockSeries[id];
      if (!info) return [];
      return dataContext?.altcoinData?.[info.symbol] || [];
    }
    return [];
  }, [dataContext, derivedData]);

  const getNormalizedData = useCallback((rawData, valueKey) => {
    const normalized = normalizePriceData(rawData, valueKey);
    return deduplicateByTime(normalized);
  }, []);

  const getLastTime = useCallback((id, type) => {
    const raw = getRawData(id, type);
    if (!raw || raw.length === 0) return 0;
    const last = raw[raw.length - 1];
    const timeField =
      last.time ||
      last.date ||
      last.end_date ||
      (last.timestamp ? new Date(last.timestamp * 1000).toISOString().split('T')[0] : 0);
    return new Date(timeField).getTime();
  }, [getRawData]);

  /**
   * Ensure a catalog series is loaded into context (async). Useful for callers
   * that know a series id but not which fetch* to call.
   */
  const ensureLoaded = useCallback(
    async (id, type) => {
      const t = type || getType(id);
      const info = getSeriesInfo(id, t);
      if (!info || !dataContext) return getRawData(id, t);

      if (t === 'macro') {
        if (info.isFred) {
          await ensureSeriesLoaded(dataContext, { isFred: true, seriesId: info.seriesId || id });
        } else {
          await ensureSeriesLoaded(dataContext, {
            dataKey: info.dataKey,
            fetchFunction: info.fetchFunction,
          });
        }
      } else if (t === 'crypto') {
        if (info.dataKey === 'altcoinData') {
          await ensureSeriesLoaded(dataContext, { dataKey: 'altcoinData', coin: info.coin });
        } else {
          await ensureSeriesLoaded(dataContext, { dataKey: info.dataKey });
        }
      } else if (t === 'stock') {
        await ensureSeriesLoaded(dataContext, { dataKey: 'altcoinData', coin: info.symbol });
      }
      return getRawData(id, t);
    },
    [dataContext, getType, getSeriesInfo, getRawData]
  );

  const allAvailable = useMemo(
    () => ({
      macro: availableMacroSeries,
      crypto: availableCryptoSeries,
      indicator: availableIndicatorSeries,
      stock: availableStockSeries,
    }),
    []
  );

  return {
    getType,
    getSeriesType,
    getValueKey,
    getSeriesInfo,
    getSeriesColorBase,
    getRawData,
    getNormalizedData,
    getLastTime,
    ensureLoaded,
    allAvailable,
    dataService: dataServiceSeries,
  };
}

export default useWorkbenchSeriesData;
