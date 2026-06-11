import { useMemo, useState, useCallback } from 'react';
import useMacroOverlaySeries from './useMacroOverlaySeries';
import {
  OVERLAY_NONE,
  applySmoothing,
  cleanSeriesData,
  defaultOverlayFormatter,
  filterOverlayFromPrimary,
} from '../utils/macroChartUtils';

export function useUsMacroChartEnhancements({
  primaryData = [],
  scaleMode = 1,
  defaultOverlaySeriesId = 'SP500',
  setIsLoading,
  setError,
}) {
  const [overlaySeriesId, setOverlaySeriesId] = useState(defaultOverlaySeriesId);
  const [smoothingPeriod, setSmoothingPeriod] = useState(0);

  const cleanedPrimaryData = useMemo(
    () => cleanSeriesData(primaryData, { scaleMode }),
    [primaryData, scaleMode],
  );

  const plottedPrimaryData = useMemo(
    () => applySmoothing(cleanedPrimaryData, smoothingPeriod),
    [cleanedPrimaryData, smoothingPeriod],
  );

  const { cleanedOverlayData, hasOverlay, overlayMeta } = useMacroOverlaySeries({
    overlaySeriesId,
    scaleMode,  // single scale applies to overlay too
    setIsLoading,
    setError,
  });

  const plottedOverlayData = useMemo(() => {
    if (!hasOverlay) return [];
    const filtered = filterOverlayFromPrimary(cleanedOverlayData, plottedPrimaryData);
    return applySmoothing(filtered, smoothingPeriod);
  }, [hasOverlay, cleanedOverlayData, plottedPrimaryData, smoothingPeriod]);

  const formatOverlayValue = useCallback(
    (value) => defaultOverlayFormatter(overlaySeriesId, value),
    [overlaySeriesId],
  );

  return {
    overlaySeriesId,
    setOverlaySeriesId,
    smoothingPeriod,
    setSmoothingPeriod,
    cleanedPrimaryData,
    plottedPrimaryData,
    plottedOverlayData,
    hasOverlay,
    overlayMeta,
    formatOverlayValue,
    defaultOverlay: defaultOverlaySeriesId,
    disableOverlay: () => setOverlaySeriesId(OVERLAY_NONE),
  };
}

export default useUsMacroChartEnhancements;