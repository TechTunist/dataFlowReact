/**
 * useWorkbenchSeriesManagement
 *
 * Active series lists + change handlers that on-demand load data via DataContext.
 * Load routing goes through DataService.ensureSeriesLoaded where possible so this
 * hook does not hardcode every fetch* name for macro/FRED/crypto.
 */

import { useState, useCallback } from 'react';
import logger from '../utils/logger';
import { ensureSeriesLoaded } from '../data';
import {
  fetchIndicatorDependencies,
  isIndicatorDataLoaded,
} from '../utils/workbenchSeriesUtils';

export function useWorkbenchSeriesManagement({ dataContext, setIsLoading, setError, onSnackbar = () => {} } = {}) {
  const [activeMacroSeries, setActiveMacroSeries] = useState([]);
  const [activeCryptoSeries, setActiveCryptoSeries] = useState([]);
  const [activeIndicatorSeries, setActiveIndicatorSeries] = useState([]);
  const [activeStockSeries, setActiveStockSeries] = useState([]);
  const [activeDerivedSeries, setActiveDerivedSeries] = useState([]);

  // NOTE: The real handler impls are below. We import the config in the caller and pass the maps
  // (avoids large duplication of the 100+ series objects inside this hook).

  // Re-implement the handlers fully (moved verbatim logic + logger routing, with stable callbacks)
  const loadWithUi = useCallback((label, promiseFactory) => {
    setIsLoading?.(true);
    setError?.(null);
    Promise.resolve()
      .then(promiseFactory)
      .catch((err) => {
        setError?.(`Failed to fetch data for ${label}. Please try again later.`);
        logger.error(`Error fetching ${label}:`, err);
      })
      .finally(() => setIsLoading?.(false));
  }, [setIsLoading, setError]);

  const handleMacroSeriesChangeImpl = useCallback((event, availableMacro) => {
    const selected = event.target.value;
    setActiveMacroSeries(selected);
    selected.forEach((id) => {
      const seriesInfo = availableMacro[id];
      if (!seriesInfo) return;
      if (seriesInfo.isFred) {
        // Original check keyed by id (not seriesId); preserve that short-circuit.
        if (!dataContext?.fredSeriesData?.[id]) {
          loadWithUi(id, () =>
            ensureSeriesLoaded(dataContext, {
              isFred: true,
              seriesId: id,
            })
          );
        }
      } else if ((dataContext?.[seriesInfo.dataKey] || []).length === 0) {
        loadWithUi(id, () =>
          ensureSeriesLoaded(dataContext, {
            dataKey: seriesInfo.dataKey,
            fetchFunction: seriesInfo.fetchFunction,
          })
        );
      }
    });
  }, [dataContext, loadWithUi]);

  const handleCryptoSeriesChangeImpl = useCallback((event, availableCrypto) => {
    const selected = event.target.value;
    setActiveCryptoSeries(selected);
    selected.forEach((id) => {
      const seriesInfo = availableCrypto[id];
      if (!seriesInfo) return;
      const dataKey = seriesInfo.dataKey;
      const coin = seriesInfo.coin;
      if (dataKey === 'btcData' && (dataContext?.btcData || []).length === 0) {
        loadWithUi('Bitcoin', () => ensureSeriesLoaded(dataContext, { dataKey: 'btcData' }));
      } else if (dataKey === 'ethData' && (dataContext?.ethData || []).length === 0) {
        loadWithUi('Ethereum', () => ensureSeriesLoaded(dataContext, { dataKey: 'ethData' }));
      } else if (
        dataKey === 'altcoinData' &&
        (!dataContext?.altcoinData?.[coin] || dataContext.altcoinData[coin].length === 0)
      ) {
        loadWithUi(coin, () => ensureSeriesLoaded(dataContext, { dataKey: 'altcoinData', coin }));
      }
    });
  }, [dataContext, loadWithUi]);

  const handleIndicatorSeriesChangeImpl = useCallback((event, availableIndicator) => {
    const selected = event.target.value;
    setActiveIndicatorSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableIndicator[id];
      if (!seriesInfo) return;
      if (!isIndicatorDataLoaded(seriesInfo, dataContext)) {
        setIsLoading?.(true);
        setError?.(null);
        fetchIndicatorDependencies(seriesInfo, dataContext)
          .catch(err => {
            setError?.(`Failed to fetch data for ${id}. Please try again later.`);
            logger.error(`Error fetching ${id}:`, err);
          })
          .finally(() => setIsLoading?.(false));
      }
    });
  }, [dataContext, setIsLoading, setError]);

  const handleStockSeriesChangeImpl = useCallback((event, availableStock) => {
    const selected = event.target.value;
    setActiveStockSeries(selected);
    selected.forEach((id) => {
      const seriesInfo = availableStock[id];
      if (!seriesInfo) return;
      const symbol = seriesInfo.symbol;
      if (!dataContext?.altcoinData?.[symbol] || dataContext.altcoinData[symbol].length === 0) {
        loadWithUi(seriesInfo.label || symbol, () =>
          ensureSeriesLoaded(dataContext, { dataKey: 'altcoinData', coin: symbol })
        );
      }
    });
  }, [dataContext, loadWithUi]);

  const handleDerivedSeriesChange = useCallback((event) => {
    const selected = event.target.value;
    setActiveDerivedSeries(selected);
  }, []);

  const clearAllSeries = useCallback(() => {
    setActiveMacroSeries([]);
    setActiveCryptoSeries([]);
    setActiveIndicatorSeries([]);
    setActiveStockSeries([]);
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
    activeStockSeries,
    setActiveStockSeries,
    activeDerivedSeries,
    setActiveDerivedSeries,

    // Change handlers (pass the available* maps from config)
    handleMacroSeriesChange: (e, availMacro) => handleMacroSeriesChangeImpl(e, availMacro),
    handleCryptoSeriesChange: (e, availCrypto) => handleCryptoSeriesChangeImpl(e, availCrypto),
    handleIndicatorSeriesChange: (e, availIndicator) => handleIndicatorSeriesChangeImpl(e, availIndicator),
    handleStockSeriesChange: (e, availStock) => handleStockSeriesChangeImpl(e, availStock),
    handleDerivedSeriesChange,

    // Bulk
    clearAllSeries,
    setActiveDerived, // for derived hook to activate newly created
  };
}

export default useWorkbenchSeriesManagement;
