
import React, { useRef, useEffect, useState, useMemo, useCallback, useContext, memo } from 'react';
import logger from '../utils/logger';
import ErrorBoundary from './ErrorBoundary';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
// Data layer: normalize/dedup now primarily used via useWorkbenchSeriesData (which imports from DataService).
// We keep the direct import only for any transitional direct use; prefer the hook.
import { normalizePriceData, deduplicateByTime, getBtcPriceSeries, getEthPriceSeries } from '../data';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Snackbar, Alert } from '@mui/material';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

// === Extracted for decomposition (professionalization) ===
// Series metadata moved to small extracted piece (allowed location).
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  colorMap,
  hexToRgb,
} from './workbench/availableSeries';

// Custom hooks extracted (useWorkbench* in hooks/ per plan). These shrink the 1600-line monolith.
import useWorkbenchSeriesData from '../hooks/useWorkbenchSeriesData';
import useWorkbenchMovingAverages from '../hooks/useWorkbenchMovingAverages';
import useWorkbenchDerivedSeries from '../hooks/useWorkbenchDerivedSeries';
import useWorkbenchSeriesManagement from '../hooks/useWorkbenchSeriesManagement';
import useWorkbenchTooltip from '../hooks/useWorkbenchTooltip';

// Note: hexToRgb and colorMap are re-exported from the config module for the chart series creation effect (area fills etc).
// All available* now single source of truth in workbench/availableSeries.js

const WorkbenchChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => value.toLocaleString(),
  explanation = '',
  scaleMode = 'linear',
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRefs = useRef({});
  // Direct DOM tooltip refs for high-frequency smooth updates (bypasses React re-renders on every mouse move)
  const tooltipElRef = useRef(null);
  const rafIdRef = useRef(null);
  // Pre-computed fast lookup maps per series (time -> value) for O(1) tooltip lookups
  const seriesDataMapsRef = useRef({});
  // Original cleaned sparse points per series (for robust "last known value" / LOCF lookups on mixed-frequency data)
  const seriesPointsRef = useRef({});
  const prevSeriesRef = useRef({ macro: [], crypto: [], indicator: [], derived: [] });

  // Ref to break composition cycle between useWorkbenchSeriesData (needs live derivedData) and
  // useWorkbenchDerivedSeries (needs the getter methods for handleCreate). Updated at end of render.
  const seriesDataRef = useRef(null);

  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const dataContext = useContext(DataContext);
  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;

  // Local state kept in orchestrator (not extracted to hooks): scale, interactivity, loading chrome, dialog chrome, zoom, snackbar.
  // All series/derived/MA state + their handlers now owned by the extracted hooks below.
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editClicked, setEditClicked] = useState({});
  const [openDialog, setOpenDialog] = useState({ open: false, seriesId: null, type: null });
  const [zoomRange, setZoomRange] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // === Hook orchestration (the decomposition) ===
  // Order chosen to satisfy deps + ref for cycle:
  const movingAverages = useWorkbenchMovingAverages();
  const mgmt = useWorkbenchSeriesManagement({
    dataContext,
    setIsLoading,
    setError,
    onSnackbar: (s) => setSnackbar(s),
  });

  // derived first with ref (or previous) seriesData methods; create path only needs non-derived getters which work on dummy.
  const derivedHook = useWorkbenchDerivedSeries({
    seriesData: seriesDataRef.current || {
      getRawData: () => [],
      getNormalizedData: (r) => r || [],
      getType: () => null,
      getValueKey: () => 'value',
    },
    onSnackbar: (s) => setSnackbar(s),
    onActivateDerived: (id) => mgmt.setActiveDerived(id),
  });

  // seriesData receives live derived state from derivedHook (for getRaw on 'derived' types in chart/last-updated).
  const seriesData = useWorkbenchSeriesData({
    dataContext,
    derivedData: derivedHook.derivedData,
    derivedSeriesDefs: derivedHook.derivedSeriesDefs,
  });
  // Update ref for *next* render's derivedHook (create will see fresh getters).
  seriesDataRef.current = seriesData;

  const tooltip = useWorkbenchTooltip({
    chartContainerRef,
    theme,
    colors,
    valueFormatter,
    getSeriesInfo: seriesData.getSeriesInfo,
    getSeriesColor: (id, type) => movingAverages.getSeriesColor(id, type, seriesData.getSeriesColorBase),
    seriesMovingAverages: movingAverages.seriesMovingAverages,
    activeMacroSeries: mgmt.activeMacroSeries,
    activeCryptoSeries: mgmt.activeCryptoSeries,
    activeIndicatorSeries: mgmt.activeIndicatorSeries,
    activeDerivedSeries: mgmt.activeDerivedSeries,
  });

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);
  // clearAll now delegates to the management + derived hooks (kept local wrapper for the button)
  const clearAllSeries = useCallback(() => {
    mgmt.clearAllSeries();
    derivedHook.resetDerived();
    setZoomRange(null);
  }, [mgmt, derivedHook]);
  useEffect(() => {
    if (!chartContainerRef.current) {
      logger.error('Chart container is not available');
      return;
    }
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: {
        minBarSpacing: 0.001,
        timeVisible: true,
        secondsVisible: false,
        smoothScroll: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        visible: false,
      },
    });
    chartRef.current = chart;
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
        chartRef.current.remove();
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors]);
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
  }, [colors]);
  useEffect(() => {
    if (!chartRef.current) return;
    // Use actives from useWorkbenchSeriesManagement hook (no direct mutation of arrays)
    const mActMacro = mgmt.activeMacroSeries || [];
    const mActCrypto = mgmt.activeCryptoSeries || [];
    const mActInd = mgmt.activeIndicatorSeries || [];
    const mActDer = mgmt.activeDerivedSeries || [];
    const isNewSeries =
      JSON.stringify([...mActMacro].sort()) !== JSON.stringify([...prevSeriesRef.current.macro].sort()) ||
      JSON.stringify([...mActCrypto].sort()) !== JSON.stringify([...prevSeriesRef.current.crypto].sort()) ||
      JSON.stringify([...mActInd].sort()) !== JSON.stringify([...prevSeriesRef.current.indicator].sort()) ||
      JSON.stringify([...mActDer].sort()) !== JSON.stringify([...prevSeriesRef.current.derived].sort());
    prevSeriesRef.current = { macro: mActMacro, crypto: mActCrypto, indicator: mActInd, derived: mActDer };
    Object.keys(seriesRefs.current).forEach(id => {
      if (chartRef.current && seriesRefs.current[id]) {
        try {
          chartRef.current.removeSeries(seriesRefs.current[id]);
        } catch (err) {
          logger.error(`Error removing series ${id}:`, err);
        }
      }
      delete seriesRefs.current[id];
      delete seriesDataMapsRef.current[id];
      delete seriesPointsRef.current[id];
      // createStepData doesn't need cleanup (pure)
    });
    const allSeries = [
      ...mActMacro.map(id => ({ id, type: 'macro' })),
      ...mActCrypto.map(id => ({ id, type: 'crypto' })),
      ...mActInd.map(id => ({ id, type: 'indicator' })),
      ...mActDer.map(id => ({ id, type: 'derived' })),
    ];
    const sortedSeries = allSeries.sort((a, b) => {
      if (a.id === 'USRECD') return 1;
      if (b.id === 'USRECD') return -1;
      return 0;
    });
    const usedPriceScales = new Set();
    sortedSeries.forEach(({ id, type }) => {
      const seriesInfo = seriesData.getSeriesInfo(id, type);
      const seriesColor = movingAverages.getSeriesColor(id, type, seriesData.getSeriesColorBase);
      const rgbColor = seriesColor.startsWith('rgba') ? seriesColor : hexToRgb(seriesColor);
      let series;
      if (seriesInfo.chartType === 'area') {
        series = chartRef.current.addAreaSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          topColor: `rgba(${rgbColor}, 0.56)`,
          bottomColor: `rgba(${rgbColor}, 0.04)`,
          lineColor: seriesColor,
        });
      } else if (seriesInfo.chartType === 'line') {
        series = chartRef.current.addLineSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesColor,
        });
      } else if (seriesInfo.chartType === 'histogram') {
        series = chartRef.current.addHistogramSeries({
          priceScaleId: seriesInfo.scaleId,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesColor,
        });
      }
      seriesRefs.current[id] = series;
      usedPriceScales.add(seriesInfo.scaleId);
      let rawData = seriesData.getRawData(id, type);
      let valueKey = seriesData.getValueKey(id);
      const timeKey = (type === 'indicator' && seriesInfo.dataKey === 'txMvrvData') ? 'date' : 'time';
      rawData = rawData
        .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
        .map(item => ({
          time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
          value: parseFloat(item[valueKey]),
        }))
        .filter(item => item.time !== null && isFinite(item.value))
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      // Deduplicate by time to prevent lightweight-charts crashes (especially important for dominance data)
      const seen = new Set();
      rawData = rawData.filter(item => {
        const key = item.time;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (rawData.length > 0) {
        try {
          const validData = scaleModeState === 1 && seriesInfo.allowLogScale
            ? rawData.filter(item => item.value > 0)
            : rawData;
          if (validData.length === 0 && scaleModeState === 1 && seriesInfo.allowLogScale) {
            logger.warn(`No valid data for series ${id} in logarithmic scale`);
            setError(`Cannot display ${seriesInfo.label} in logarithmic scale due to non-positive values.`);
          } else {
            // NOTE: We intentionally use the (possibly MA-processed) cleaned sparse points directly here.
            // Previous attempt to auto-convert low-frequency series to step data caused duplicate timestamps
            // at transition points, which made lightweight-charts reject the data with "incompatible" errors.
            // The visual "stretched" appearance for monthly data is a known limitation for now.
            // We keep the original sparse points + robust LOCF tooltip (see below) as the safer approach.
            const dataForChart = movingAverages.getSeriesData(id, validData);
            series.setData(dataForChart);

            // Build fast lookup map + store original sparse points for robust LOCF on mixed-frequency data
            const lookup = new Map();
            validData.forEach(d => {
              if (d.time && d.value != null) lookup.set(String(d.time), d.value);
            });
            seriesDataMapsRef.current[id] = lookup;
            seriesPointsRef.current[id] = [...validData];
          }
        } catch (err) {
          logger.error(`Error setting data for series ${id}:`, err);
          setError(`Failed to display ${seriesInfo.label}. The data may be incompatible.`);
        }
      }
    });
    const priceScales = {};
    [...Object.keys(availableMacroSeries), ...Object.keys(availableCryptoSeries), ...Object.keys(availableIndicatorSeries), 'derived-scale'].forEach(key => {
      const seriesInfo = availableMacroSeries[key] || availableCryptoSeries[key] || availableIndicatorSeries[key] || { allowLogScale: true };
      priceScales[key === 'derived-scale' ? 'derived-scale' : seriesInfo.scaleId] = {
        mode: key === 'USRECD' ? 0 : (seriesInfo.allowLogScale ? scaleModeState : 0),
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'right',
        width: 50,
        visible: usedPriceScales.has(key === 'derived-scale' ? 'derived-scale' : seriesInfo.scaleId),
      };
    });
    try {
      chartRef.current.applyOptions({
        priceScales: priceScales,
      });
    } catch (err) {
      logger.error('Error applying price scales:', err);
      setError('Failed to apply chart scales.');
    }
    usedPriceScales.forEach(scaleId => {
      try {
        const seriesInfo = [...Object.values(availableMacroSeries), ...Object.values(availableCryptoSeries), ...Object.values(availableIndicatorSeries), ...(derivedHook.derivedSeriesDefs || [])].find(s => s.scaleId === scaleId);
        const mode = scaleId === 'usrecd-scale' ? 0 : (seriesInfo?.allowLogScale ? scaleModeState : 0);
        chartRef.current.priceScale(scaleId).applyOptions({ mode });
      } catch (err) {
        logger.error(`Failed to apply scale mode for ${scaleId}:`, err);
        setError(`Cannot apply ${scaleModeState === 1 ? 'logarithmic' : 'linear'} scale to ${scaleId}.`);
      }
    });
    if (isNewSeries || zoomRange === null) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);

      // When new series are added (especially derived series computed from other series),
      // lightweight-charts sometimes fails to expand the visible range to include the new data
      // on the initial fitContent. Doing a second fitContent in the next animation frame
      // reliably fixes cases where the new series appears as a flat line until the user pans.
      if (isNewSeries) {
        // Stronger timing fix for derived series visibility.
        requestAnimationFrame(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        });
        // User-requested compromise: when derived series are newly activated,
        // aggressively force fitContent so the derived series is always plotted correctly
        // instead of appearing as a flat line until manual panning.
        if ((mgmt.activeDerivedSeries || []).length > 0) {
          setTimeout(() => {
            if (chartRef.current) chartRef.current.timeScale().fitContent();
          }, 0);
          setTimeout(() => {
            if (chartRef.current) chartRef.current.timeScale().fitContent();
          }, 80);
          setTimeout(() => {
            if (chartRef.current) chartRef.current.timeScale().fitContent();
          }, 180);
        }
      }
    }

    // === HIGH-PERFORMANCE DIRECT DOM TOOLTIP ===
    // Creates a tooltip element once and updates it via requestAnimationFrame + direct DOM mutation.
    // This allows smooth, constant (every frame) tooltip updates even with many long series (SP500, macro data, etc.)
    // without causing React re-renders on every mouse move.
    if (!tooltipElRef.current && chartContainerRef.current) {
      const el = document.createElement('div');
      el.className = 'workbench-tooltip';
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '1000';
      el.style.padding = '6px 10px';
      el.style.borderRadius = '4px';
      el.style.fontSize = '13px';
      el.style.lineHeight = '1.3';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
      el.style.whiteSpace = 'nowrap';
      el.style.display = 'none';
      chartContainerRef.current.appendChild(el);
      tooltipElRef.current = el;
    }

    const updateTooltipDOM = (tooltipInfo) => {
      const el = tooltipElRef.current;
      if (!el) return;

      if (!tooltipInfo) {
        el.style.display = 'none';
        return;
      }

      // The tooltip is appended directly to the chart container, so tooltipInfo.x/y are already
      // relative to it. We only need small, reliable offsets + edge flipping.
      const container = chartContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const tooltipWidth = 220;   // approximate, we could measure but this is good enough
      const tooltipHeight = 80;   // rough estimate; actual height varies with # of series

      const offsetX = 14;         // horizontal gap from cursor
      const offsetY = -10;        // appear slightly above cursor

      let left = tooltipInfo.x + offsetX;
      let top = tooltipInfo.y + offsetY;

      // Flip horizontally if it would overflow the right edge
      if (left + tooltipWidth > containerWidth - 8) {
        left = tooltipInfo.x - tooltipWidth - offsetX;
      }

      // Flip vertically if near the top (so it doesn't get cut off or sit under the cursor badly)
      if (top < 8) {
        top = tooltipInfo.y + 18; // push below cursor
      }
      // Also avoid going off the bottom
      if (top + tooltipHeight > containerHeight - 8) {
        top = containerHeight - tooltipHeight - 8;
      }

      // Ensure we never go negative
      left = Math.max(4, left);
      top = Math.max(4, top);

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.backgroundColor = theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200];
      el.style.color = theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900];
      el.style.display = 'block';

      // Build content
      // Use hook-provided actives + getters (preserves exact original tooltip content including MA suffix + derived)
      let html = '';
      const tActMacro = mgmt.activeMacroSeries || [];
      const tActCrypto = mgmt.activeCryptoSeries || [];
      const tActInd = mgmt.activeIndicatorSeries || [];
      const tActDer = mgmt.activeDerivedSeries || [];
      const allActive = [...tActMacro, ...tActCrypto, ...tActInd, ...tActDer];
      allActive.forEach(id => {
        const isM = tActMacro.includes(id);
        const isC = tActCrypto.includes(id);
        const isI = tActInd.includes(id);
        const t = isM ? 'macro' : isC ? 'crypto' : isI ? 'indicator' : 'derived';
        const info = seriesData.getSeriesInfo(id, t);
        const color = movingAverages.getSeriesColor(id, t, seriesData.getSeriesColorBase);
        const ma = movingAverages.seriesMovingAverages[id] && movingAverages.seriesMovingAverages[id] !== 'None' ? ` (${movingAverages.seriesMovingAverages[id]} MA)` : '';
        const val = tooltipInfo.values[id] != null ? valueFormatter(tooltipInfo.values[id]) : 'N/A';
        html += `<div style="margin: 1px 0;"><span style="color:${color};">${info?.label || id}${ma}: ${val}</span></div>`;
      });
      const dateStr = tooltipInfo.date.toString().substring(0, 4) === new Date().getFullYear().toString()
        ? `${tooltipInfo.date} — latest`
        : tooltipInfo.date;
      html += `<div style="margin-top: 4px; opacity: 0.85; font-size: 12px;">${dateStr}</div>`;
      el.innerHTML = html;
    };

    chartRef.current.subscribeCrosshairMove(param => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        rafIdRef.current = requestAnimationFrame(() => updateTooltipDOM(null));
        return;
      }

      // Build tooltip data (still does work per move — further optimization can pre-build lookup maps per series)
      const tooltip = {
        date: param.time,
        values: {},
        x: param.point.x,
        y: param.point.y,
      };

      sortedSeries.forEach(({ id, type }) => {
        const series = seriesRefs.current[id];
        if (!series) return;

        // Prefer the value lightweight-charts already computed for the highlighted point (very fast)
        const directValue = param.seriesData.get(series)?.value;
        if (directValue != null) {
          tooltip.values[id] = directValue;
          return;
        }

        // Robust previous-value lookup for mixed-frequency data (monthly, etc.)
        // This fixes tooltip showing N/A when cursor is not exactly on a sparse datapoint.
        const points = seriesPointsRef.current[id];
        if (points && points.length > 0) {
          const targetTime = new Date(param.time).getTime();
          let left = 0;
          let right = points.length - 1;
          let latest = null;

          while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const ptTime = new Date(points[mid].time).getTime();
            if (ptTime <= targetTime) {
              latest = points[mid].value;
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
          if (latest != null) {
            tooltip.values[id] = latest;
            return;
          }
        }

        // Last resort
        tooltip.values[id] = null;
      });

      rafIdRef.current = requestAnimationFrame(() => updateTooltipDOM(tooltip));
    });

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove();
      }
      if (tooltipElRef.current && tooltipElRef.current.parentNode) {
        tooltipElRef.current.parentNode.removeChild(tooltipElRef.current);
        tooltipElRef.current = null;
      }
    };
  }, [
    dataContext,
    // Now from hooks (stable where possible via their internal useMemo/useCallback)
    mgmt.activeMacroSeries, mgmt.activeCryptoSeries, mgmt.activeIndicatorSeries, mgmt.activeDerivedSeries,
    derivedHook.derivedSeriesDefs, derivedHook.derivedData,
    movingAverages.seriesMovingAverages, movingAverages.seriesColors,
    chartType, valueFormatter, scaleModeState, isMobile, theme.palette.mode, colors,
    // Note: seriesData and tooltip provide stable getters; we don't list their internals here to avoid churn.
  ]);
  useEffect(() => {
    if (!chartRef.current || !zoomRange) return;
    chartRef.current.timeScale().setVisibleLogicalRange(zoomRange);
  }, [zoomRange]);
  useEffect(() => {
    if (!chartRef.current) return;
    let zoomTimeout = null;
    const handler = () => {
      const range = chartRef.current.timeScale().getVisibleLogicalRange();
      if (range) {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          setZoomRange(range);
        }, 100);
      }
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      clearTimeout(zoomTimeout);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      }
    };
  }, []);
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true },
      });
    }
  }, [isInteractive]);
  // getLastTime + hasDerived/numSelectors now use the hooks (seriesData provides getLastTime using its getRawData).
  // We keep lightweight local vars for the breakpoint calc (derived from hook state for render).
  const rActMacro = mgmt.activeMacroSeries || [];
  const rActCrypto = mgmt.activeCryptoSeries || [];
  const rActInd = mgmt.activeIndicatorSeries || [];
  const rActDer = mgmt.activeDerivedSeries || [];
  const allActiveForCalc = [...rActMacro, ...rActCrypto, ...rActInd];
  const hasDerived = (derivedHook.derivedSeriesDefs || []).length > 0;
  const numSelectors = hasDerived ? 4 : 3;
  const minWidthNeeded = numSelectors * 250 + (numSelectors - 1) * 20;
  let breakpointForRow;
  if (minWidthNeeded <= 600) breakpointForRow = 'sm';
  else if (minWidthNeeded <= 900) breakpointForRow = 'md';
  else if (minWidthNeeded <= 1200) breakpointForRow = 'lg';
  else breakpointForRow = 'xl';
  return (
    <ErrorBoundary fallbackMessage="The custom indicator workbench failed to load. Try refreshing or selecting different series.">
      <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', [breakpointForRow]: 'row' },
            alignItems: { xs: 'stretch', [breakpointForRow]: 'center' },
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            marginTop: '50px',
            width: '100%',
            mx: 'auto',
          }}
        >
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="macro-series"
            options={Object.entries(availableMacroSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={(mgmt.activeMacroSeries || []).map(id => ({ id, label: availableMacroSeries[id].label }))}
            onChange={(event, newValue) => mgmt.handleMacroSeriesChange({ target: { value: newValue.map(v => v.id) } }, availableMacroSeries)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'macro')}
                    disabled={!activeMacroSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeMacroSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeMacroSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeMacroSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeMacroSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Macro Data"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="crypto-series"
            options={Object.entries(availableCryptoSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={activeCryptoSeries.map(id => ({ id, label: availableCryptoSeries[id].label }))}
            onChange={(event, newValue) => handleCryptoSeriesChange({ target: { value: newValue.map(v => v.id) } })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'crypto')}
                    disabled={!activeCryptoSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeCryptoSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeCryptoSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeCryptoSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeCryptoSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Crypto Series"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="indicator-series"
            options={Object.entries(availableIndicatorSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={activeIndicatorSeries.map(id => ({ id, label: availableIndicatorSeries[id].label }))}
            onChange={(event, newValue) => handleIndicatorSeriesChange({ target: { value: newValue.map(v => v.id) } })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'indicator')}
                    disabled={!activeIndicatorSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeIndicatorSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeIndicatorSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeIndicatorSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeIndicatorSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Indicators"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          {hasDerived && (
            <Autocomplete
              multiple
              disableCloseOnSelect={true}
              id="derived-series"
              options={derivedSeriesDefs.map(d => ({ id: d.id, label: d.label }))}
              getOptionLabel={(option) => option.label}
              value={activeDerivedSeries.map(id => ({ id, label: derivedSeriesDefs.find(d => d.id === id).label }))}
              onChange={(event, newValue) => handleDerivedSeriesChange({ target: { value: newValue.map(v => v.id) } })}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(tagValue) => (
                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tagValue.map((option) => option.label).join(', ')}
                </Box>
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox
                    style={{ marginRight: 8 }}
                    checked={selected}
                    sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  {option.label}
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      onClick={(e) => handleEditClick(e, option.id, 'derived')}
                      disabled={!activeDerivedSeries.includes(option.id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: activeDerivedSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        border: `1px solid ${activeDerivedSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        minWidth: '50px',
                        backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                        ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                        '&:hover': {
                          borderColor: activeDerivedSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                          backgroundColor: activeDerivedSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                        },
                        '&.Mui-disabled': {
                          pointerEvents: 'none',
                          opacity: 0.6,
                        },
                      }}
                    >
                      Edit
                    </Button>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Derived Series"
                  sx={{
                    minWidth: '250px',
                    width: { xs: '100%', [breakpointForRow]: '250px' },
                    '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                    '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                    '& .MuiOutlinedInput-root': {
                      color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                      '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                      '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                      '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                    },
                  }}
                />
              )}
            />
          )}
        </Box>
      )}
      <Dialog
        open={showDerivedDialog}
        onClose={() => setShowDerivedDialog(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], fontSize: '18px' }}>
          Create Derived Series
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-series1-label">Series 1</InputLabel>
            <Select
              labelId="derived-series1-label"
              label="Series 1"
              value={newDerivedSeries1}
              onChange={(e) => setNewDerivedSeries1(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              {allActive.map(id => (
                <MenuItem key={id} value={id}>
                  {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-operation-label">Operation</InputLabel>
            <Select
              labelId="derived-operation-label"
              label="Operation"
              value={newDerivedOperation}
              onChange={(e) => setNewDerivedOperation(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="+">Addition (+)</MenuItem>
              <MenuItem value="-">Subtraction (-)</MenuItem>
              <MenuItem value="*">Multiplication (*)</MenuItem>
              <MenuItem value="/">Division (/)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-series2-label">Series 2</InputLabel>
            <Select
              labelId="derived-series2-label"
              label="Series 2"
              value={newDerivedSeries2}
              onChange={(e) => setNewDerivedSeries2(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              {allActive.map(id => (
                <MenuItem key={id} value={id}>
                  {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Label"
            value={newDerivedLabel}
            onChange={(e) => setNewDerivedLabel(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-color-label">Color</InputLabel>
            <input
              type="color"
              value={newDerivedColor}
              onChange={(e) => setNewDerivedColor(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                marginTop: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDerivedDialog(false)}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDerived}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openDialog.open}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], fontSize: '18px' }}>
          {openDialog.seriesId ? getSeriesInfo(openDialog.seriesId, openDialog.type)?.label : ''}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="moving-average-label">Moving Averages</InputLabel>
            <Select
              labelId="moving-average-label"
              label="Moving Averages"
              value={dialogMovingAverage}
              onChange={handleMovingAverageChange}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="None">None</MenuItem>
              <MenuItem value="7 day">7 day</MenuItem>
              <MenuItem value="28 day">28 day</MenuItem>
              <MenuItem value="3 month">3 month</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="color-label">Color</InputLabel>
            <input
              type="color"
              value={dialogColor}
              onChange={handleColorChange}
              style={{
                width: '100%',
                height: '40px',
                marginTop: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button onClick={handleSaveDialog}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="error" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: theme.palette.mode === 'dark' ? colors.primary[100] : colors.grey[900] }}>
              {scaleModeState === 1 ? 'Logarithmic' : 'Linear'}
            </span>
            {isLoading && (
              <span style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}>
                Loading...
              </span>
            )}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : (theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900]),
                borderColor: isInteractive ? 'violet' : (theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700]),
              }}
            >
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button
              onClick={resetChartView}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Reset Chart
            </button>
            <button
              onClick={clearAllSeries}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Clear All
            </button>
            <button
              onClick={() => setShowDerivedDialog(true)}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Create Derived
            </button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}` }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {(activeMacroSeries.length === 0 && activeCryptoSeries.length === 0 && activeIndicatorSeries.length === 0 && activeDerivedSeries.length === 0) && !isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              fontSize: '16px',
              zIndex: 2,
            }}
          >
            Select a series to display
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
            padding: '5px 10px',
            borderRadius: '4px',
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Series</div>}
          {[...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: getSeriesColor(id, activeMacroSeries.includes(id) ? 'macro' : activeCryptoSeries.includes(id) ? 'crypto' : activeIndicatorSeries.includes(id) ? 'indicator' : 'derived'),
                  marginRight: '5px',
                }}
              />
              {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id] || derivedSeriesDefs.find(d => d.id === id))?.label || id}
            </div>
          ))}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && [...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].some(id => {
          let data = [];
          const type = getType(id) || (activeDerivedSeries.includes(id) ? 'derived' : null);
          const raw = getRawData(id, type);
          const valueKey = getValueKey(id);
          const timeKey = (type === 'indicator' && getSeriesInfo(type, type)?.dataKey === 'txMvrvData') ? 'date' : 'time';
          const norm = raw
            .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
            .map(item => ({
              time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
              value: parseFloat(item[valueKey]),
            }))
            .filter(item => item.time !== null)
            .sort((a, b) => new Date(a.time) - new Date(b.time));
          data = getSeriesData(id, norm);
          return data?.length > 0;
        }) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...[...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].map(id => {
                    const type = getType(id) || (activeDerivedSeries.includes(id) ? 'derived' : null);
                    if (type === 'derived') {
                      const def = derivedSeriesDefs.find(d => d.id === id);
                      if (def) {
                        return Math.max(getLastTime(def.series1, getType(def.series1)), getLastTime(def.series2, getType(def.series2)));
                      }
                      return 0;
                    } else {
                      return getLastTime(id, type);
                    }
                  })
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {/* Old React tooltip disabled — we now use a high-performance direct-DOM tooltip updated via requestAnimationFrame.
          This enables smooth, constant (per-frame) updates even with heavy long-series data like SP500 + many macros. */}
      {/* {!isDashboard && tooltipData && ... (old React tooltip removed for perf) } */}
      {!isDashboard && explanation && (
        <p className='chart-info' style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}>
          {explanation}
        </p>
      )}
      </div>
    </ErrorBoundary>
  );
};
const MemoizedWorkbenchChart = memo(WorkbenchChart);
export default restrictToPaidSubscription(MemoizedWorkbenchChart);