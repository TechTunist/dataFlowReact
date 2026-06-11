import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import logger from '../utils/logger';
import LastUpdated from '../hooks/LastUpdated';
import ChartTooltip from './ChartTooltip';
import MacroChartControls, { getOverlaySeriesLabel } from './macro/MacroChartControls';
import useMacroOverlaySeries from '../hooks/useMacroOverlaySeries';
import { getMacroSeriesExplanation } from '../config/macroSeriesExplanations';
import { availableMacroSeries } from './workbench/availableSeries';
import {
  OVERLAY_NONE,
  applySmoothing,
  cleanSeriesData,
  defaultOverlayFormatter,
  filterOverlayFromPrimary,
  getSeriesMeta,
} from '../utils/macroChartUtils';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Box,
  ListSubheader,
} from '@mui/material';

import {
  getAllMovingAverageOptions,
  getDailyMAs,
  getWeeklyMAs,
  calculateMovingAverage as calculateMA,
  BULL_MARKET_SUPPORT_BAND,
} from '../utils/technicalIndicators';

const FredSeriesChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => (value != null ? value.toLocaleString() : ''),
  explanation = '',
  scaleMode = 'logarithmic',
  defaultScaleMode,
  showSP500Overlay = false,
  enableAssetOverlay,
  defaultOverlaySeriesId = 'SP500',
  enableTechnicalIndicators = false,
  seriesLabel: seriesLabelProp,
}) => {
  const assetOverlayEnabled = enableAssetOverlay ?? showSP500Overlay;
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const primarySeriesRef = useRef(null);
  const overlaySeriesRef = useRef(null);
  const prevSeriesIdRef = useRef(null);
  const smaSeriesRefs = useRef({});
  const rsiSeriesRef = useRef(null);

  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);

  // Full power from the shared master list (daily/weekly tabs make the long list easy to use)
  const maIndicators = useMemo(() => getAllMovingAverageOptions(), []);

  const rsiPeriods = useMemo(() => ({
    'Daily': { days: 14, label: 'Daily RSI (14)' },
    'Weekly': { days: 98, label: 'Weekly RSI (14)' },
  }), []);

  const effectiveInitialScale = (scaleMode || defaultScaleMode) === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(effectiveInitialScale);

  const [overlaySeriesId, setOverlaySeriesId] = useState(
    assetOverlayEnabled && seriesId !== defaultOverlaySeriesId ? defaultOverlaySeriesId : OVERLAY_NONE,
  );

  const isRecessionPrimary = seriesId === 'USRECD';
  const isRecessionOverlay = overlaySeriesId === 'USRECD';
  const [smoothingPeriod, setSmoothingPeriod] = useState(0);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [maFilter, setMaFilter] = useState('daily');
  const [activeRsiPeriod, setActiveRsiPeriod] = useState('');

  const seriesLabel = seriesLabelProp || availableMacroSeries[seriesId]?.label || seriesId;
  const chartExplanation = explanation || getMacroSeriesExplanation(seriesId);

  const clearMovingAverages = useCallback(() => {
    setActiveSMAs([]);
  }, []);
  const [showRsi, setShowRsi] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(!isMobile);

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  const primarySeriesData = fredSeriesData[seriesId] || [];
  const primaryDataRef = useRef([]);
  const overlayDataRef = useRef([]);

  const overlayCleanScale = isRecessionOverlay ? 0 : scaleModeState;
  const { cleanedOverlayData, hasOverlay, overlayMeta } = useMacroOverlaySeries({
    overlaySeriesId,
    scaleMode: overlayCleanScale,
    setIsLoading,
    setError,
  });

  const overlayColor = isRecessionOverlay
    ? (theme.palette.mode === 'dark' ? 'rgba(120, 90, 130, 0.18)' : 'rgba(140, 100, 120, 0.15)')
    : (overlayMeta?.color || (theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)'));

  // Cleaned data used for BOTH primary series plotting AND technical indicator (MA/RSI) calculations.
  // This ensures consistency (same points, same time normalization, same log-scale filtering)
  // and matches the pattern used in BitcoinPrice / AltcoinPrice / etc.
  const cleanedPrimaryData = useMemo(
    () => cleanSeriesData(primarySeriesData, { scaleMode: isRecessionPrimary ? 0 : scaleModeState }),
    [primarySeriesData, scaleModeState, isRecessionPrimary],
  );

  const plottedPrimaryData = useMemo(
    () => applySmoothing(cleanedPrimaryData, smoothingPeriod),
    [cleanedPrimaryData, smoothingPeriod],
  );

  const plottedOverlayData = useMemo(() => {
    if (!hasOverlay) return [];
    const filtered = filterOverlayFromPrimary(cleanedOverlayData, plottedPrimaryData.length ? plottedPrimaryData : cleanedPrimaryData);
    return applySmoothing(filtered, smoothingPeriod);
  }, [hasOverlay, cleanedOverlayData, plottedPrimaryData, cleanedPrimaryData, smoothingPeriod]);

  const handleSMAChange = useCallback((event) => setActiveSMAs(event.target.value), []);
  const handleRsiPeriodChange = useCallback((event) => {
    setActiveRsiPeriod(event.target.value);
    setShowRsi(!!event.target.value);
  }, []);

  const calculateMovingAverage = useCallback((data, period) => {
    if (!data || data.length < period) return [];
    const movingAverages = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].value;
      movingAverages.push({ time: data[i].time, value: sum / period });
    }
    return movingAverages;
  }, []);

  const calculateRSI = useCallback((data, period) => {
    if (!data || data.length <= period) return [];
    const rsiData = [];
    const gains = [];
    const losses = [];
    for (let i = 1; i < data.length; i++) {
      const change = data[i].value - data[i - 1].value;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    for (let i = period; i < data.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiData.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
    }
    return rsiData;
  }, []);

  const findNearestData = useCallback((data, targetTime) => {
    if (data.length === 0) return null;
    const target = new Date(targetTime).getTime();
    let left = 0, right = data.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = new Date(data[mid].time).getTime();
      if (midTime === target) return data[mid];
      else if (midTime < target) left = mid + 1;
      else right = mid - 1;
    }
    const prev = right >= 0 ? data[right] : null;
    const next = left < data.length ? data[left] : null;
    if (!prev) return next;
    if (!next) return prev;
    return Math.abs(new Date(prev.time).getTime() - target) <= Math.abs(new Date(next.time).getTime() - target) ? prev : next;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (primarySeriesData.length === 0) await fetchFredSeriesData(seriesId);
      } catch (err) {
        setError(`Failed to fetch data for ${seriesId}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFredSeriesData, seriesId, primarySeriesData.length]);

  // Create chart once + resize listener
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      timeScale: {
        minBarSpacing: 0.001,
        timeVisible: true,
        secondsVisible: false,
        smoothScroll: true,
      },
      rightPriceScale: { visible: true, borderVisible: false },
      leftPriceScale: { visible: hasOverlay, borderVisible: false },
    });
    chartRef.current = chart;
    smaSeriesRefs.current = {};

    const resizeChart = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    return () => {
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (e) {}
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors, hasOverlay]);

  // Moving Averages effect
  useEffect(() => {
    if (!chartRef.current || cleanedPrimaryData.length === 0 || !enableTechnicalIndicators) {
      Object.keys(smaSeriesRefs.current).forEach(key => {
        if (smaSeriesRefs.current[key] && chartRef.current) {
          try { chartRef.current.removeSeries(smaSeriesRefs.current[key]); } catch (e) {}
          delete smaSeriesRefs.current[key];
        }
      });
      return;
    }

    Object.keys(smaSeriesRefs.current).forEach(key => {
      if (smaSeriesRefs.current[key] && chartRef.current) {
        try { chartRef.current.removeSeries(smaSeriesRefs.current[key]); } catch (e) {}
        delete smaSeriesRefs.current[key];
      }
    });

    activeSMAs.forEach(key => {
      const indicator = maIndicators[key];
      if (!indicator) return;

      try {
        if (indicator.type === 'sma' || indicator.type === 'ema') {
          const series = chartRef.current.addLineSeries({
            priceScaleId: 'right',
            color: indicator.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          smaSeriesRefs.current[key] = series;
          const maData = calculateMA(cleanedPrimaryData, indicator);
          if (maData.length > 0) series.setData(maData);
        } else if (indicator.type === 'composite' && key === BULL_MARKET_SUPPORT_BAND.key) {
          // Bull Market Support Band (SMA + EMA)
          const smaSeries = chartRef.current.addLineSeries({
            priceScaleId: 'right',
            color: indicator.sma.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          smaSeriesRefs.current[`${key}-sma`] = smaSeries;
          const smaData = calculateMA(cleanedPrimaryData, indicator.sma);
          if (smaData.length > 0) smaSeries.setData(smaData);

          const emaSeries = chartRef.current.addLineSeries({
            priceScaleId: 'right',
            color: indicator.ema.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          smaSeriesRefs.current[`${key}-ema`] = emaSeries;
          const emaData = calculateMA(cleanedPrimaryData, indicator.ema);
          if (emaData.length > 0) emaSeries.setData(emaData);
        }
      } catch (error) {
        logger.error('Error adding MA series:', error);
      }
    });
  }, [activeSMAs, cleanedPrimaryData, enableTechnicalIndicators, maIndicators, calculateMA]);

  // RSI effect
  useEffect(() => {
    if (!chartRef.current || cleanedPrimaryData.length === 0 || !enableTechnicalIndicators || !activeRsiPeriod) {
      if (rsiSeriesRef.current && chartRef.current) {
        try { chartRef.current.removeSeries(rsiSeriesRef.current); } catch (e) {}
        rsiSeriesRef.current = null;
      }
      return;
    }

    if (rsiSeriesRef.current && chartRef.current) {
      try { chartRef.current.removeSeries(rsiSeriesRef.current); } catch (e) {}
      rsiSeriesRef.current = null;
    }

    const rsiConfig = rsiPeriods[activeRsiPeriod];
    if (!rsiConfig) return;

    const rsiSeries = chartRef.current.addLineSeries({
      priceScaleId: 'left',
      color: '#FF6B6B',
      lineWidth: 2,
      priceLineVisible: false,
    });
    rsiSeriesRef.current = rsiSeries;

    const rsiData = calculateRSI(cleanedPrimaryData, rsiConfig.days);
    if (rsiData.length > 0) rsiSeries.setData(rsiData);
  }, [activeRsiPeriod, cleanedPrimaryData, enableTechnicalIndicators, calculateRSI, rsiPeriods]);

  // Update colors
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: colors.greenAccent[700] },
          horzLines: { color: colors.greenAccent[700] },
        },
      });
    }
  }, [colors]);

  useEffect(() => {
    if (!chartRef.current) return;
    const mode = scaleModeState;

    // Dedicated hidden linear scale for recession shading (full height, always linear, never log)
    try {
      chartRef.current.priceScale('recession').applyOptions({
        mode: 0,
        visible: false,
        borderVisible: false,
        scaleMargins: { top: 0, bottom: 0 },
      });
    } catch (e) {
      // scale may not exist yet; will be configured when series is added
    }

    if (isRecessionPrimary) {
      // Recession is primary: its shading uses 'recession' scale (always linear).
      // Overlay (if any) goes on left and respects the toggle.
      chartRef.current.priceScale('left').applyOptions({
        visible: hasOverlay,
        mode,
        borderVisible: false,
      });
      chartRef.current.priceScale('right').applyOptions({ visible: false, borderVisible: false });
    } else if (isRecessionOverlay && hasOverlay) {
      // Recession as overlay: shading on 'recession' (linear, hidden).
      // Primary data on right, controlled by toggle.
      chartRef.current.priceScale('right').applyOptions({ mode, borderVisible: false });
      chartRef.current.priceScale('left').applyOptions({ visible: false, borderVisible: false });
    } else {
      // Normal case
      chartRef.current.priceScale('right').applyOptions({ mode, borderVisible: false });
      chartRef.current.priceScale('left').applyOptions({
        visible: hasOverlay,
        mode,
        borderVisible: false,
      });
    }
  }, [scaleModeState, hasOverlay, isRecessionPrimary, isRecessionOverlay]);

  useEffect(() => {
    if (!chartRef.current || plottedPrimaryData.length === 0) return;

    const isNewSeries = seriesId !== prevSeriesIdRef.current;
    prevSeriesIdRef.current = seriesId;

    if (plottedPrimaryData.length === 0) {
      setError(`No valid data for ${seriesId}`);
      return;
    }
    primaryDataRef.current = plottedPrimaryData;

    // Subtle recession shading color (used for area fill to create clean vertical bands)
    const recessionColor = theme.palette.mode === 'dark'
      ? 'rgba(186, 12, 245, 0.3)'
      : 'rgba(172, 58, 115, 0.3)';

    // Always clear previous overlay (line or recession shading) before (re)adding the current overlay.
    // This ensures clean switches between normal overlays and recession shading.
    if (overlaySeriesRef.current) {
      try { chartRef.current.removeSeries(overlaySeriesRef.current); } catch (e) {}
      overlaySeriesRef.current = null;
    }

    // If recession is the *overlay*, add its shading *first* so it renders behind the main data series.
    if (isRecessionOverlay && plottedOverlayData.length > 0) {
      if (overlaySeriesRef.current) {
        try { chartRef.current.removeSeries(overlaySeriesRef.current); } catch (e) {}
        overlaySeriesRef.current = null;
      }
      const recOverlaySeries = chartRef.current.addAreaSeries({
        priceScaleId: 'recession',
        lineVisible: false,
        crosshairMarkerVisible: false,
        topColor: recessionColor,
        bottomColor: recessionColor,
        lineColor: 'transparent',
        baseValue: { type: 'price', price: 0 },
        priceFormat: { type: 'custom', minMove: 1, formatter: (v) => defaultOverlayFormatter(overlaySeriesId, v) },
      });
      overlaySeriesRef.current = recOverlaySeries;
      recOverlaySeries.setData(plottedOverlayData);
      overlayDataRef.current = plottedOverlayData;

      try {
        chartRef.current.priceScale('recession').applyOptions({
          mode: 0,
          visible: false,
          borderVisible: false,
          scaleMargins: { top: 0, bottom: 0 },
        });
      } catch (e) {}
    }

    if (primarySeriesRef.current) {
      try { chartRef.current.removeSeries(primarySeriesRef.current); } catch (e) {}
      primarySeriesRef.current = null;
    }

    const { topColor, bottomColor, lineColor, color } = theme.palette.mode === 'dark'
      ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)', color: 'rgba(38, 198, 218, 1)' }
      : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)', color: 'rgba(255, 140, 0, 0.8)' };

    let primarySeries;
    if (isRecessionPrimary) {
      // Use AreaSeries + dedicated hidden scale for recession shading.
      // This produces clean, solid vertical bands for recession periods at any zoom level
      // (no per-day thin bars turning into a solid mass when zoomed out).
      // Always linear (the 'recession' scale is forced linear above).
      primarySeries = chartRef.current.addAreaSeries({
        priceScaleId: 'recession',
        lineVisible: false,
        crosshairMarkerVisible: false,
        topColor: recessionColor,
        bottomColor: recessionColor,
        lineColor: 'transparent',
        baseValue: { type: 'price', price: 0 },
        priceFormat: { type: 'custom', minMove: 1, formatter: valueFormatter },
      });
    } else if (chartType === 'area') {
      primarySeries = chartRef.current.addAreaSeries({
        priceScaleId: 'right', lineWidth: 2, topColor, bottomColor, lineColor,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    } else if (chartType === 'line') {
      primarySeries = chartRef.current.addLineSeries({
        priceScaleId: 'right', lineWidth: 2, color: lineColor,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    } else {
      primarySeries = chartRef.current.addHistogramSeries({
        priceScaleId: 'right',
        color,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    }
    primarySeriesRef.current = primarySeries;
    primarySeries.setData(plottedPrimaryData);

    // Ensure recession scale is configured (hidden, linear, full height) whenever we add recession shading
    if (isRecessionPrimary && chartRef.current) {
      try {
        chartRef.current.priceScale('recession').applyOptions({
          mode: 0,
          visible: false,
          borderVisible: false,
          scaleMargins: { top: 0, bottom: 0 },
        });
      } catch (e) {}
    }

    if (overlaySeriesRef.current) {
      try { chartRef.current.removeSeries(overlaySeriesRef.current); } catch (e) {}
      overlaySeriesRef.current = null;
    }

    if (hasOverlay && plottedOverlayData.length > 0) {
      if (!isRecessionOverlay) {
        // Normal (non-recession) overlay as line on left scale.
        // (Recession overlay, if present, was already added earlier as background shading.)
        const overlaySeries = chartRef.current.addLineSeries({
          priceScaleId: 'left',
          lineWidth: 2,
          color: overlayColor,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: (v) => defaultOverlayFormatter(overlaySeriesId, v),
          },
        });
        overlaySeriesRef.current = overlaySeries;
        overlaySeries.setData(plottedOverlayData);
      }
      overlayDataRef.current = plottedOverlayData;
    } else {
      overlayDataRef.current = [];
    }

    if (isNewSeries || !zoomRange) {
      chartRef.current.timeScale().fitContent();
    }
  }, [plottedPrimaryData, plottedOverlayData, chartType, valueFormatter, theme.palette.mode, seriesId, hasOverlay, overlaySeriesId, overlayColor, isRecessionPrimary, isRecessionOverlay, zoomRange]);

  // Tooltip
  useEffect(() => {
    if (!chartRef.current) return;

    let tooltipTimeout = null;
    const handleCrosshair = (param) => {
      if (!param.point || !param.time) {
        setTooltipData(null);
        return;
      }
      let primaryNearest = param.seriesData.get(primarySeriesRef.current);
      if (!primaryNearest) primaryNearest = findNearestData(primaryDataRef.current, param.time);

      let overlayNearest = null;
      if (hasOverlay && overlaySeriesRef.current) {
        overlayNearest = param.seriesData.get(overlaySeriesRef.current) || findNearestData(overlayDataRef.current, param.time);
      }

      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        setTooltipData({
          date: param.time,
          primaryValue: primaryNearest?.value,
          overlayValue: overlayNearest?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }, 1);
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshair);
    return () => {
      clearTimeout(tooltipTimeout);
      if (chartRef.current) chartRef.current.unsubscribeCrosshairMove(handleCrosshair);
    };
  }, [findNearestData, hasOverlay]);

  // Interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true },
      });
    }
  }, [isInteractive]);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);
  const toggleLegend = useCallback(() => setIsLegendVisible(prev => !prev), []);

  const recessionLegendColor = theme.palette.mode === 'dark' ? 'rgba(120, 90, 130, 0.18)' : 'rgba(140, 100, 120, 0.15)';
  const primaryColor = isRecessionPrimary
    ? recessionLegendColor
    : (theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)');
  const excludeOverlayIds = useMemo(() => {
    const ids = [seriesId];
    if (getSeriesMeta(seriesId)) ids.push(seriesId);
    return ids;
  }, [seriesId]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && enableTechnicalIndicators && (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px',
          marginTop: '8px',
        }}>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="sma-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              Moving Averages
            </InputLabel>
            <Select
              multiple
              value={activeSMAs}
              onChange={handleSMAChange}
              labelId="sma-label"
              label="Moving Averages"
              displayEmpty
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return 'Select Moving Averages';
                return selected
                  .map((key) => maIndicators[key]?.label || key)
                  .join(', ');
              }}
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {/* Daily / Weekly filter tabs + Clear button at the top of the dropdown (defaults to daily) */}
              <Box
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid',
                  borderColor: 'rgba(255,255,255,0.15)',
                  mx: 0.5,
                  mt: 0.5,
                  mb: 0.5,
                  alignItems: 'center',
                }}
              >
                <Box
                  onClick={() => setMaFilter('daily')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 0.6,
                    fontSize: '0.78rem',
                    fontWeight: maFilter === 'daily' ? 600 : 400,
                    color: maFilter === 'daily' ? colors.greenAccent[400] : colors.grey[300],
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: maFilter === 'daily' ? `2px solid ${colors.greenAccent[400]}` : '2px solid transparent',
                  }}
                >
                  Daily
                </Box>
                <Box
                  onClick={() => setMaFilter('weekly')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 0.6,
                    fontSize: '0.78rem',
                    fontWeight: maFilter === 'weekly' ? 600 : 400,
                    color: maFilter === 'weekly' ? colors.greenAccent[400] : colors.grey[300],
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: maFilter === 'weekly' ? `2px solid ${colors.greenAccent[400]}` : '2px solid transparent',
                  }}
                >
                  Weekly / Cycle
                </Box>
                <Box
                  onClick={clearMovingAverages}
                  sx={{
                    fontSize: '0.72rem',
                    color: colors.grey[400],
                    cursor: 'pointer',
                    px: 1,
                    '&:hover': { color: colors.redAccent ? colors.redAccent[400] : '#ff6b6b' },
                  }}
                  title="Clear all selected moving averages"
                >
                  ✕ Clear
                </Box>
              </Box>

              {/* Filtered list */}
              {(maFilter === 'daily' ? getDailyMAs() : getWeeklyMAs())
                .filter(item => maIndicators[item.key])
                .map(({ key, label }) => (
                  <MenuItem key={key} value={key}>
                    <Checkbox
                      checked={activeSMAs.includes(key)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <span>{label}</span>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="rsi-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              RSI
            </InputLabel>
            <Select
              value={activeRsiPeriod}
              onChange={handleRsiPeriodChange}
              labelId="rsi-label"
              label="RSI"
              displayEmpty
              renderValue={(selected) =>
                selected ? rsiPeriods[selected]?.label : 'Select RSI Period'
              }
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              <MenuItem value="">
                <span>None</span>
              </MenuItem>
              {Object.entries(rsiPeriods).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {!isDashboard && (
        <MacroChartControls
          colors={colors}
          overlaySeriesId={overlaySeriesId}
          onOverlayChange={setOverlaySeriesId}
          smoothingPeriod={smoothingPeriod}
          onSmoothingChange={setSmoothingPeriod}
          enableOverlay
          excludeOverlayIds={excludeOverlayIds}
        />
      )}

      {!isDashboard && (
        <div className="chart-top-div">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            { (seriesId !== 'USRECD' || hasOverlay) && (
              <>
                <label className="switch">
                  <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
                  <span className="slider round"></span>
                </label>
                <span style={{ color: colors.primary[100] }}>
                  {scaleModeState === 1 ? 'Logarithmic' : 'Linear'}
                </span>
              </>
            )}
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={setInteractivity} className="button-reset" style={{
              backgroundColor: isInteractive ? '#4cceac' : 'transparent',
              color: isInteractive ? 'black' : '#31d6aa',
              borderColor: isInteractive ? 'violet' : '#70d8bd',
            }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}

      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />

        {!isDashboard && isLegendVisible && (
          <div className="chart-legend" style={{ position: 'absolute', top: '10px', left: '10px', background: colors.primary[900], color: colors.primary[100], padding: '25px 10px 10px 10px', borderRadius: '5px', zIndex: 1000, fontSize: '14px' }}>
            <button onClick={toggleLegend} className="legend-minimize-button" style={{ position: 'absolute', top: '5px', left: '5px', background: 'transparent', border: 'none', color: colors.primary[100], fontSize: '16px', cursor: 'pointer' }}>−</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: primaryColor, borderRadius: '2px' }}></div>
              <span>{seriesLabel}</span>
            </div>
            {hasOverlay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: overlayColor, borderRadius: '2px' }}></div>
                <span>{getOverlaySeriesLabel(overlaySeriesId)}</span>
              </div>
            )}
          </div>
        )}

        {!isDashboard && !isLegendVisible && (
          <button onClick={toggleLegend} className="legend-minimize-button" style={{ position: 'absolute', top: '10px', left: '10px', background: colors.primary[900], border: 'none', color: colors.primary[100], fontSize: '16px', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px', zIndex: 1000 }}>+</button>
        )}
      </div>

      <div className="under-chart">
        {!isDashboard && primarySeriesData.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated customDate={primarySeriesData[primarySeriesData.length - 1].time} />
          </div>
        )}
      </div>

      

      {!isDashboard && chartExplanation && <p className="chart-info">{chartExplanation}</p>}

        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} xNudge={70} render={(tooltipData) => (
<>
<div style={{ fontSize: '15px' }}>{seriesLabel}</div>
          <div style={{ fontSize: '20px' }}>{tooltipData.primaryValue != null ? valueFormatter(tooltipData.primaryValue) : 'N/A'}</div>
          {hasOverlay && (
            <>
              <div style={{ fontSize: '15px', color: overlayColor }}>{getOverlaySeriesLabel(overlaySeriesId)}</div>
              <div style={{ fontSize: '20px', color: overlayColor }}>
                {tooltipData.overlayValue != null ? defaultOverlayFormatter(overlaySeriesId, tooltipData.overlayValue) : 'N/A'}
              </div>
            </>
          )}
          <div>{tooltipData.date}</div>
</>
)} />
        )}
        </div>
  );
};

export default restrictToPaidSubscription(FredSeriesChart);