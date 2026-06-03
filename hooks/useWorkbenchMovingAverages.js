/**
 * useWorkbenchMovingAverages
 *
 * Extracted custom hook from Workbench.jsx (professionalization).
 * Owns:
 * - seriesMovingAverages state + dialog state for MA selection
 * - seriesColors state + dialog (edited in same dialog as MA)
 * - calculateMovingAverage (pure, frequency-agnostic for now; future: per-freq MA step)
 * - getSeriesData: applies MA if selected (memoized on the MA map)
 * - Handlers for dialog MA/color change + save
 *
 * Recent prior work preserved:
 * - calculateMovingAverage unchanged (simple SMA on the incoming points)
 * - MAs are applied *after* normalization/sparse point cleaning in the chart effect.
 * - Per-series (keyed by id) so different series can have different MA or none.
 *
 * Stability: all returned fns are useCallback stabilized.
 * No direct DOM or chart concerns (those stay with useWorkbenchTooltip / main effect).
 *
 * Future (per plans): smarter MA / step rendering aware of frequency (monthly macro vs daily crypto).
 * Add TODO when DataService.getDerivedSeries or frequency metadata arrives.
 */

import { useState, useCallback, useMemo } from 'react';

export function useWorkbenchMovingAverages(initialMovingAverages = {}, initialColors = {}) {
  const [seriesMovingAverages, setSeriesMovingAverages] = useState(initialMovingAverages);
  const [seriesColors, setSeriesColors] = useState(initialColors);

  // Dialog-local (ephemeral during edit)
  const [dialogMovingAverage, setDialogMovingAverage] = useState('');
  const [dialogColor, setDialogColor] = useState('');

  const calculateMovingAverage = useCallback((data, period) => {
    if (!data || data.length < period) return [];
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const window = data.slice(i - period + 1, i + 1);
      const avg = window.reduce((sum, item) => sum + (item.value || 0), 0) / period;
      result.push({
        time: data[i].time,
        value: avg,
      });
    }
    return result;
  }, []);

  // getSeriesData applies the per-id MA (or returns raw)
  // Memoized factory so consumers can depend on the function stably when MA map changes.
  const getSeriesData = useMemo(() => {
    return (seriesId, rawData) => {
      if (!rawData) return [];
      const movingAverage = seriesMovingAverages[seriesId];
      if (!movingAverage || movingAverage === 'None') return rawData;
      const periodMap = {
        '7 day': 7,
        '28 day': 28,
        '3 month': 90,
      };
      const period = periodMap[movingAverage];
      if (!period) return rawData;
      return calculateMovingAverage(rawData, period);
    };
  }, [seriesMovingAverages, calculateMovingAverage]);

  const getSeriesColor = useCallback((id, type, getBaseColor) => {
    if (seriesColors[id]) return seriesColors[id];
    return getBaseColor ? getBaseColor(id, type) : '#00FFFF';
  }, [seriesColors]);

  // Dialog handlers (called from edit click in UI)
  const openEditDialogForMA = useCallback((seriesId, currentMA, currentColor, baseColor) => {
    setDialogMovingAverage(currentMA || 'None');
    setDialogColor(currentColor || baseColor);
  }, []);

  const handleMovingAverageChange = useCallback((event) => {
    setDialogMovingAverage(event.target.value);
  }, []);

  const handleColorChange = useCallback((event) => {
    setDialogColor(event.target.value);
  }, []);

  const applyDialogToSeries = useCallback((seriesId) => {
    if (seriesId) {
      setSeriesMovingAverages(prev => ({
        ...prev,
        [seriesId]: dialogMovingAverage,
      }));
      setSeriesColors(prev => ({
        ...prev,
        [seriesId]: dialogColor,
      }));
    }
    // caller responsible for closing dialog state
    setDialogMovingAverage('');
    setDialogColor('');
  }, [dialogMovingAverage, dialogColor]);

  const closeDialogMA = useCallback(() => {
    setDialogMovingAverage('');
    setDialogColor('');
  }, []);

  const resetAllOverrides = useCallback(() => {
    setSeriesMovingAverages({});
    setSeriesColors({});
  }, []);

  return {
    // State
    seriesMovingAverages,
    setSeriesMovingAverages,
    seriesColors,
    setSeriesColors,

    // Dialog state + setters (for the MUI dialog)
    dialogMovingAverage,
    dialogColor,
    setDialogMovingAverage,
    setDialogColor,

    // Core logic
    calculateMovingAverage,
    getSeriesData,
    getSeriesColor,

    // Handlers
    openEditDialogForMA,
    handleMovingAverageChange,
    handleColorChange,
    applyDialogToSeries,
    closeDialogMA,
    resetAllOverrides,
  };
}

export default useWorkbenchMovingAverages;
