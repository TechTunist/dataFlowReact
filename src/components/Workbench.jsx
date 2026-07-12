
import React, { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react';
import logger from '../utils/logger';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { useData } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  availableStockSeries,
  hexToRgb,
} from './workbench/availableSeries';
import { STOCK_GROUPS } from '../config/stocksConfig';
import WorkbenchView from './workbench/WorkbenchView';

import useWorkbenchSeriesData from '../hooks/useWorkbenchSeriesData';
import useWorkbenchMovingAverages from '../hooks/useWorkbenchMovingAverages';
import useWorkbenchDerivedSeries from '../hooks/useWorkbenchDerivedSeries';
import useWorkbenchSeriesManagement from '../hooks/useWorkbenchSeriesManagement';
import useWorkbenchTooltip from '../hooks/useWorkbenchTooltip';
import useWorkbenchPersistence from '../hooks/useWorkbenchPersistence';
import { resolveRatioChartPoints, ratioAllowsLogScale } from '../utils/derivedRatioUtils';

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
  const prevSeriesRef = useRef({ macro: [], crypto: [], indicator: [], stock: [], derived: [] });

  // Ref to break composition cycle between useWorkbenchSeriesData (needs live derivedData) and
  // useWorkbenchDerivedSeries (needs the getter methods for handleCreate). Updated at end of render.
  const seriesDataRef = useRef(null);

  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  // Full bag (data + stable fetch*) for Workbench load routing / ensureSeriesLoaded.
  const dataContext = useData();
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
    activeStockSeries: mgmt.activeStockSeries,
    activeDerivedSeries: mgmt.activeDerivedSeries,
  });

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
    movingAverages.resetAllOverrides();
    setScaleModeState(0);
    setZoomRange(null);
    setError(null);
  }, [mgmt, derivedHook, movingAverages]);

  const { handleSaveWorkbench } = useWorkbenchPersistence({
    isDashboard,
    mgmt,
    derivedHook,
    movingAverages,
    scaleModeState,
    setScaleModeState,
    setSnackbar,
    dataContext,
  });

  // Local thin wrappers for edit/save dialog that delegate to useWorkbenchMovingAverages
  // (keeps the openDialog/editClicked local state + the click flash effect in the original UI).
  const handleEditClick = useCallback((event, seriesId, type) => {
    event.stopPropagation();
    event.preventDefault();
    setEditClicked(prev => ({ ...prev, [seriesId]: true }));
    const curMA = movingAverages.seriesMovingAverages[seriesId] || 'None';
    const baseCol = seriesData.getSeriesColorBase(seriesId, type);
    const curCol = movingAverages.seriesColors[seriesId] || baseCol;
    movingAverages.openEditDialogForMA(seriesId, curMA, curCol, baseCol);
    setOpenDialog({ open: true, seriesId, type });
    setTimeout(() => {
      setEditClicked(prev => ({ ...prev, [seriesId]: false }));
    }, 300);
  }, [movingAverages, seriesData]);

  const handleMovingAverageChange = movingAverages.handleMovingAverageChange;
  const handleColorChange = movingAverages.handleColorChange;

  const handleSaveDialog = useCallback(() => {
    if (openDialog.seriesId) {
      movingAverages.applyDialogToSeries(openDialog.seriesId);
    }
    setOpenDialog({ open: false, seriesId: null, type: null });
    movingAverages.closeDialogMA();
  }, [openDialog.seriesId, movingAverages]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog({ open: false, seriesId: null, type: null });
    movingAverages.closeDialogMA();
  }, [movingAverages]);

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
    const mActStock = mgmt.activeStockSeries || [];
    const mActDer = mgmt.activeDerivedSeries || [];
    const isNewSeries =
      JSON.stringify([...mActMacro].sort()) !== JSON.stringify([...prevSeriesRef.current.macro].sort()) ||
      JSON.stringify([...mActCrypto].sort()) !== JSON.stringify([...prevSeriesRef.current.crypto].sort()) ||
      JSON.stringify([...mActInd].sort()) !== JSON.stringify([...prevSeriesRef.current.indicator].sort()) ||
      JSON.stringify([...mActStock].sort()) !== JSON.stringify([...prevSeriesRef.current.stock].sort()) ||
      JSON.stringify([...mActDer].sort()) !== JSON.stringify([...prevSeriesRef.current.derived].sort());
    prevSeriesRef.current = { macro: mActMacro, crypto: mActCrypto, indicator: mActInd, stock: mActStock, derived: mActDer };
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
      ...mActStock.map(id => ({ id, type: 'stock' })),
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
      if (type === 'derived' && seriesInfo?.ratioOutput) {
        rawData = resolveRatioChartPoints(seriesInfo, rawData, scaleModeState);
      }
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
          const seriesAllowsLog = type === 'derived' && seriesInfo?.ratioOutput
            ? ratioAllowsLogScale(seriesInfo, scaleModeState)
            : seriesInfo.allowLogScale;
          const validData = scaleModeState === 1 && seriesAllowsLog
            ? rawData.filter(item => item.value > 0)
            : rawData;
          if (validData.length === 0 && scaleModeState === 1 && seriesAllowsLog) {
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
    [...Object.keys(availableMacroSeries), ...Object.keys(availableCryptoSeries), ...Object.keys(availableIndicatorSeries), ...Object.keys(availableStockSeries), 'derived-scale'].forEach(key => {
      const seriesInfo = availableMacroSeries[key] || availableCryptoSeries[key] || availableIndicatorSeries[key] || availableStockSeries[key] || { allowLogScale: true };
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
        const seriesInfo = [...Object.values(availableMacroSeries), ...Object.values(availableCryptoSeries), ...Object.values(availableIndicatorSeries), ...Object.values(availableStockSeries), ...(derivedHook.derivedSeriesDefs || [])].find(s => s.scaleId === scaleId);
        const mode = scaleId === 'usrecd-scale' ? 0 : (
          seriesInfo?.ratioOutput
            ? (ratioAllowsLogScale(seriesInfo, scaleModeState) ? scaleModeState : 0)
            : (seriesInfo?.allowLogScale ? scaleModeState : 0)
        );
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
      const tActStock = mgmt.activeStockSeries || [];
      const tActDer = mgmt.activeDerivedSeries || [];
      const allActive = [...tActMacro, ...tActCrypto, ...tActInd, ...tActStock, ...tActDer];
      allActive.forEach(id => {
        const isM = tActMacro.includes(id);
        const isC = tActCrypto.includes(id);
        const isI = tActInd.includes(id);
        const isS = tActStock.includes(id);
        const t = isM ? 'macro' : isC ? 'crypto' : isI ? 'indicator' : isS ? 'stock' : 'derived';
        const info = seriesData.getSeriesInfo(id, t);
        const color = movingAverages.getSeriesColor(id, t, seriesData.getSeriesColorBase);
        const ma = movingAverages.seriesMovingAverages[id] && movingAverages.seriesMovingAverages[id] !== 'None' ? ` (${movingAverages.seriesMovingAverages[id]} MA)` : '';
        const val = tooltipInfo.values[id] != null ? valueFormatter(tooltipInfo.values[id]) : 'N/A';
        html += `<div style="margin: 1px 0;"><span style="color:${color};">${info?.label || id}${ma}: ${val}</span></div>`;
      });
      const dateStr = tooltipInfo.date.toString().substring(0, 4) === new Date().getFullYear().toString()
        ? `${tooltipInfo.date}, latest`
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

      // Build tooltip data (still does work per move, further optimization can pre-build lookup maps per series)
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
    mgmt.activeMacroSeries, mgmt.activeCryptoSeries, mgmt.activeIndicatorSeries, mgmt.activeStockSeries, mgmt.activeDerivedSeries,
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
  const rActStock = mgmt.activeStockSeries || [];
  const rActDer = mgmt.activeDerivedSeries || [];
  const allActiveForCalc = [...rActMacro, ...rActCrypto, ...rActInd, ...rActStock];
  // allActive now includes created derived so Create Derived dialog can use prior derived as base (for trends or even arith)
  const allActive = [...rActMacro, ...rActCrypto, ...rActInd, ...rActStock, ...rActDer];
  const createDialogSeriesIds = Array.from(new Set(allActive)); // deduped for selects
  const hasDerived = (derivedHook.derivedSeriesDefs || []).length > 0;
  const numSelectors = hasDerived ? 5 : 4;
  const stockSelectorOptions = useMemo(
    () => STOCK_GROUPS.flatMap((group) =>
      group.stocks.map((stock) => ({ id: stock.value, label: stock.label, group: group.label }))
    ),
    []
  );
  const minWidthNeeded = numSelectors * 250 + (numSelectors - 1) * 20;
  let breakpointForRow;
  if (minWidthNeeded <= 600) breakpointForRow = 'sm';
  else if (minWidthNeeded <= 900) breakpointForRow = 'md';
  else if (minWidthNeeded <= 1200) breakpointForRow = 'lg';
  else breakpointForRow = 'xl';

  return (
    <WorkbenchView
      isDashboard={isDashboard}
      theme={theme}
      colors={colors}
      chartContainerRef={chartContainerRef}
      breakpointForRow={breakpointForRow}
      stockSelectorOptions={stockSelectorOptions}
      hasDerived={hasDerived}
      editClicked={editClicked}
      openDialog={openDialog}
      snackbar={snackbar}
      setSnackbar={setSnackbar}
      scaleModeState={scaleModeState}
      isInteractive={isInteractive}
      isLoading={isLoading}
      error={error}
      mgmt={mgmt}
      derivedHook={derivedHook}
      movingAverages={movingAverages}
      seriesData={seriesData}
      handleEditClick={handleEditClick}
      handleMovingAverageChange={handleMovingAverageChange}
      handleColorChange={handleColorChange}
      handleSaveDialog={handleSaveDialog}
      handleCloseDialog={handleCloseDialog}
      toggleScaleMode={toggleScaleMode}
      setInteractivity={setInteractivity}
      resetChartView={resetChartView}
      clearAllSeries={clearAllSeries}
      handleSaveWorkbench={handleSaveWorkbench}
      explanation={explanation}
      createDialogSeriesIds={createDialogSeriesIds}
    />
  );
};
const MemoizedWorkbenchChart = memo(WorkbenchChart);
export default restrictToPaidSubscription(MemoizedWorkbenchChart);
