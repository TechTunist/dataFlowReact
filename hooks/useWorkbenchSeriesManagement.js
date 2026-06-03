/**
 * useWorkbenchSeriesManagement
 *
 * Extracted hook for the "add / remove / reorder / load" concerns of Workbench series.
 * Handles the four active lists + change handlers that also trigger on-demand fetches via DataContext.
 *
 * Extracted from the large handle*SeriesChange + clearAll + related.
 *
 * Data access:
 * - Receives dataContext (do not mutate it).
 * - On selection, checks length===0 then calls the appropriate fetch* (which for many now delegate inside DataContext to DataService).
 * - Sets local loading/error via callbacks (so main component can surface them).
 *
 * Preserves exact original fetch-trigger + error handling behavior (including the one remaining console -> logger).
 *
 * The large "sync active series to chart" effect remains in the Workbench orchestrator for now
 * (because it owns chartRef, seriesRefs, dataMaps, pointsRef, scaleMode, tooltip subscribe etc).
 * This hook provides stable actives + handlers for that effect's deps.
 *
 * // INTEGRATE WITH DATA LAYER
 * TODO: Move the per-type "if not present, fetch via context" into the DataService or a useSeriesData hook
 * that can also expose isLoading per series. The parallel data-layer work will enable getMacroSeries etc
 * that can be called here without knowing the internal fetchFunction names.
 */

import { useState, useCallback } from 'react';
import logger from '../utils/logger';

export function useWorkbenchSeriesManagement({ dataContext, setIsLoading, setError, onSnackbar = () => {} } = {}) {
  const [activeMacroSeries, setActiveMacroSeries] = useState([]);
  const [activeCryptoSeries, setActiveCryptoSeries] = useState([]);
  const [activeIndicatorSeries, setActiveIndicatorSeries] = useState([]);
  const [activeDerivedSeries, setActiveDerivedSeries] = useState([]);

  const handleMacroSeriesChange = useCallback((event) => {
    const selected = event.target.value;
    setActiveMacroSeries(selected);
    selected.forEach(id => {
      const seriesInfo = /* will be injected or global, but for now we duplicate minimal lookup */
        // To avoid circular, we accept a lookup or hardcode minimal here? Better: pass the available or use from data hook.
        // For extraction cleanliness, the caller can pre-resolve or we accept a getSeriesMeta.
        // Simpler for v1: keep the lookup inside but since config moved, we import here (allowed).
        null; // placeholder, actual impl will use injected meta or re-import config for the check
    });
  }, []);

  // NOTE: Because the original lookups use the large available* objects (now in workbench/availableSeries),
  // we import them here for the change handlers. This is fine (small dependency).
  // To keep this file focused we will perform the actual data presence + fetch inside the impl below.
  // The skeleton above was illustrative; real code follows.

  // Re-implement the handlers fully (moved verbatim logic + logger routing, with stable callbacks)
  const handleMacroSeriesChangeImpl = useCallback((event, availableMacro) => {
    const selected = event.target.value;
    setActiveMacroSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableMacro[id];
      if (!seriesInfo) return;
      if (seriesInfo.isFred) {
        if (!dataContext?.fredSeriesData?.[id]) {  // note: fred uses seriesId actually, but original used id for check; keep behavior
          setIsLoading?.(true);
          setError?.(null);
          dataContext.fetchFredSeriesData(id)
            .catch(err => {
              setError?.(`Failed to fetch data for ${id}. Please try again later.`);
              logger.error(`Error fetching ${id}:`, err);
            })
            .finally(() => setIsLoading?.(false));
        }
      } else {
        if ((dataContext?.[seriesInfo.dataKey] || []).length === 0) {
          setIsLoading?.(true);
          setError?.(null);
          dataContext[seriesInfo.fetchFunction]()
            .catch(err => {
              setError?.(`Failed to fetch data for ${id}. Please try again later.`);
              logger.error(`Error fetching ${id}:`, err);
            })
            .finally(() => setIsLoading?.(false));
        }
      }
    });
  }, [dataContext, setIsLoading, setError]);

  const handleCryptoSeriesChangeImpl = useCallback((event, availableCrypto) => {
    const selected = event.target.value;
    setActiveCryptoSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableCrypto[id];
      if (!seriesInfo) return;
      const dataKey = seriesInfo.dataKey;
      const coin = seriesInfo.coin;
      if (dataKey === 'btcData' && (dataContext?.btcData || []).length === 0) {
        setIsLoading?.(true);
        setError?.(null);
        dataContext.fetchBtcData()
          .catch(err => {
            setError?.(`Failed to fetch Bitcoin data. Please try again later.`);
            logger.error(`Error fetching Bitcoin data:`, err);
          })
          .finally(() => setIsLoading?.(false));
      } else if (dataKey === 'ethData' && (dataContext?.ethData || []).length === 0) {
        setIsLoading?.(true);
        setError?.(null);
        dataContext.fetchEthData()
          .catch(err => {
            setError?.(`Failed to fetch Ethereum data. Please try again later.`);
            logger.error(`Error fetching Ethereum data:`, err);
          })
          .finally(() => setIsLoading?.(false));
      } else if (dataKey === 'altcoinData' && (!dataContext?.altcoinData?.[coin] || dataContext.altcoinData[coin].length === 0)) {
        setIsLoading?.(true);
        setError?.(null);
        dataContext.fetchAltcoinData(coin)
          .catch(err => {
            setError?.(`Failed to fetch ${coin} data. Please try again later.`);
            logger.error(`Error fetching ${coin} data:`, err);
          })
          .finally(() => setIsLoading?.(false));
      }
    });
  }, [dataContext, setIsLoading, setError]);

  const handleIndicatorSeriesChangeImpl = useCallback((event, availableIndicator) => {
    const selected = event.target.value;
    setActiveIndicatorSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableIndicator[id];
      if (!seriesInfo) return;
      if ((dataContext?.[seriesInfo.dataKey] || []).length === 0) {
        setIsLoading?.(true);
        setError?.(null);
        dataContext[seriesInfo.fetchFunction]()
          .catch(err => {
            setError?.(`Failed to fetch data for ${id}. Please try again later.`);
            logger.error(`Error fetching ${id}:`, err);  // was console.error; now routed
          })
          .finally(() => setIsLoading?.(false));
      }
    });
  }, [dataContext, setIsLoading, setError]);

  const handleDerivedSeriesChange = useCallback((event) => {
    const selected = event.target.value;
    setActiveDerivedSeries(selected);
  }, []);

  const clearAllSeries = useCallback(() => {
    setActiveMacroSeries([]);
    setActiveCryptoSeries([]);
    setActiveIndicatorSeries([]);
    setActiveDerivedSeries([]);
    // Note: caller should also reset derived defs/data via its derived hook
  }, []);

  const setActiveDerived = useCallback((idOrList) => {
    if (typeof idOrList === 'string') {
      setActiveDerivedSeries(prev => prev.includes(idOrList) ? prev : [...prev, idOrList]);
    } else {
      setActiveDerivedSeries(idOrList || []);
    }
  }, []);

  return {
    // Active lists (for UI selectors + chart effect)
    activeMacroSeries,
    setActiveMacroSeries,
    activeCryptoSeries,
    setActiveCryptoSeries,
    activeIndicatorSeries,
    setActiveIndicatorSeries,
    activeDerivedSeries,
    setActiveDerivedSeries,

    // Change handlers (pass the available* maps from config)
    handleMacroSeriesChange: (e, availMacro) => handleMacroSeriesChangeImpl(e, availMacro),
    handleCryptoSeriesChange: (e, availCrypto) => handleCryptoSeriesChangeImpl(e, availCrypto),
    handleIndicatorSeriesChange: (e, availIndicator) => handleIndicatorSeriesChangeImpl(e, availIndicator),
    handleDerivedSeriesChange,

    // Bulk
    clearAllSeries,
    setActiveDerived, // for derived hook to activate newly created
  };
}

export default useWorkbenchSeriesManagement;
