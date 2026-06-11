import { useCallback, useEffect, useMemo, useContext } from 'react';
import { DataContext } from '../DataContext';
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
} from '../components/workbench/availableSeries';
import {
  OVERLAY_NONE,
  cleanSeriesData,
  getSeriesMeta,
} from '../utils/macroChartUtils';
import logger from '../utils/logger';

function getRawOverlayData(dataContext, seriesId) {
  const macro = availableMacroSeries[seriesId];
  if (macro) {
    if (macro.isFred) {
      return dataContext?.fredSeriesData?.[macro.seriesId] || [];
    }
    return dataContext?.[macro.dataKey] || [];
  }

  const crypto = availableCryptoSeries[seriesId];
  if (crypto) {
    if (crypto.dataKey === 'btcData') return dataContext?.btcData || [];
    if (crypto.dataKey === 'ethData') return dataContext?.ethData || [];
    if (crypto.dataKey === 'altcoinData') return dataContext?.altcoinData?.[crypto.coin] || [];
    return [];
  }

  const indicator = availableIndicatorSeries[seriesId];
  if (indicator) {
    return dataContext?.[indicator.dataKey] || [];
  }

  return [];
}

async function fetchOverlaySeries(dataContext, seriesId) {
  const macro = availableMacroSeries[seriesId];
  if (macro) {
    if (macro.isFred) {
      await dataContext.fetchFredSeriesData(macro.seriesId);
      return;
    }
    await dataContext[macro.fetchFunction]();
    return;
  }

  const crypto = availableCryptoSeries[seriesId];
  if (crypto) {
    if (crypto.dataKey === 'btcData') {
      await dataContext.fetchBtcData();
    } else if (crypto.dataKey === 'ethData') {
      await dataContext.fetchEthData();
    } else if (crypto.dataKey === 'altcoinData') {
      await dataContext.fetchAltcoinData(crypto.coin);
    }
    return;
  }

  const indicator = availableIndicatorSeries[seriesId];
  if (indicator) {
    await dataContext[indicator.fetchFunction]();
  }
}

export function useMacroOverlaySeries({
  overlaySeriesId = OVERLAY_NONE,
  scaleMode = 1,
  setIsLoading,
  setError,
}) {
  const dataContext = useContext(DataContext);

  const overlayMeta = useMemo(
    () => (overlaySeriesId === OVERLAY_NONE ? null : getSeriesMeta(overlaySeriesId)),
    [overlaySeriesId],
  );

  const overlayValueKey = overlayMeta?.valueKey || 'value';

  useEffect(() => {
    if (overlaySeriesId === OVERLAY_NONE || !dataContext) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading?.(true);
      setError?.(null);
      try {
        await fetchOverlaySeries(dataContext, overlaySeriesId);
      } catch (err) {
        if (!cancelled) {
          setError?.(`Failed to fetch overlay data for ${overlaySeriesId}`);
          logger.error(`Error fetching overlay ${overlaySeriesId}:`, err);
        }
      } finally {
        if (!cancelled) setIsLoading?.(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [overlaySeriesId, dataContext, setIsLoading, setError]);

  const rawOverlayData = useMemo(() => {
    if (overlaySeriesId === OVERLAY_NONE || !dataContext) return [];
    return getRawOverlayData(dataContext, overlaySeriesId);
  }, [
    overlaySeriesId,
    dataContext,
    dataContext?.fredSeriesData,
    dataContext?.btcData,
    dataContext?.ethData,
    dataContext?.altcoinData,
    dataContext?.inflationData,
    dataContext?.interestData,
    dataContext?.initialClaimsData,
    dataContext?.unemploymentData,
    dataContext?.dominanceData,
    dataContext?.fearAndGreedData,
    dataContext?.marketCapData,
    dataContext?.differenceData,
    dataContext?.txCountData,
    dataContext?.altcoinSeasonTimeseriesData,
    dataContext?.mvrvRiskData,
    dataContext?.puellRiskData,
    dataContext?.minerCapThermoCapRiskData,
    dataContext?.feeRiskData,
    dataContext?.soplRiskData,
  ]);

  const cleanedOverlayData = useMemo(
    () => cleanSeriesData(rawOverlayData, { scaleMode, valueKey: overlayValueKey }),
    [rawOverlayData, scaleMode, overlayValueKey],
  );

  const fetchOverlay = useCallback(async () => {
    if (overlaySeriesId === OVERLAY_NONE || !dataContext) return;
    await fetchOverlaySeries(dataContext, overlaySeriesId);
  }, [overlaySeriesId, dataContext]);

  return {
    overlayMeta,
    overlayValueKey,
    rawOverlayData,
    cleanedOverlayData,
    fetchOverlay,
    hasOverlay: overlaySeriesId !== OVERLAY_NONE,
  };
}

export default useMacroOverlaySeries;