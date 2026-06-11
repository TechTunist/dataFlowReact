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
  primaryScaleMode = 0,
  defaultOverlaySeriesId = 'SP500',
  setIsLoading,
  setError,
}) {
  const [overlaySeriesId, setOverlaySeriesId] = useState(defaultOverlaySeriesId);
  const [overlayScaleMode, setOverlayScaleMode] = useState(0);
  const [smoothingPeriod, setSmoothingPeriod] = useState(0);

  const cleanedPrimaryData = useMemo(
    () => cleanSeriesData(primaryData, { scaleMode: primaryScaleMode }),
    [primaryData, primaryScaleMode],
  );

  const plottedPrimaryData = useMemo(
    () => applySmoothing(cleanedPrimaryData, smoothingPeriod),
    [cleanedPrimaryData, smoothingPeriod],
  );

  const { cleanedOverlayData, hasOverlay, overlayMeta } = useMacroOverlaySeries({
    overlaySeriesId,
    overlayScaleMode,
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
    overlayScaleMode,
    setOverlayScaleMode,
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