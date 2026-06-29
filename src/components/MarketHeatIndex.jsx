import React, { useRef, useEffect, useState, useContext, useCallback, useMemo, useDeferredValue } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, useMediaQuery, Typography, Button, Slider, Switch, FormControlLabel } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import logger from '../utils/logger';
import { UnderChartRow, ChartUnderSection, UnderChartValue, UnderChartScroll } from './ChartUnderSection';
import ChartTooltip from './ChartTooltip';

import { useAuth, useUser } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import {
  TX_MVRV_SMOOTHING,
  MARKET_HEAT_WEIGHT_KEYS,
  MARKET_HEAT_SMA_PERIODS,
  DEFAULT_MARKET_HEAT_WEIGHTS,
  DEFAULT_MARKET_HEAT_SETTINGS,
  computeMarketHeatPipeline,
} from '../utility/marketHeatUtils';

// ==================== MAIN COMPONENT ====================

const MarketHeatIndex = ({ isDashboard = false, isChartPage = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const heatSeriesRef = useRef(null);
  const btcSeriesRef = useRef(null);
  const overheatPriceLineRef = useRef(null);
  const coldPriceLineRef = useRef(null);
  const prevPlottedLenRef = useRef(0);
  const prevBtcLenRef = useRef(0);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, mvrvData, fearAndGreedData, altcoinSeasonTimeseriesData, txMvrvRatioDataBySmoothing, fetchBtcData, fetchMvrvData, fetchFearAndGreedData, fetchAltcoinSeasonTimeseriesData, fetchTxMvrvRatioData } = useContext(DataContext);
  // Clerk for user-settings persistence (load/save tunable sliders)
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // Refs for load-once + debounce + unmount-save + dirty tracking (persistence added for tunable heat weights etc)
  const hasLoadedSettings = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const saveFnRef = useRef(null);
  const latestSettingsRef = useRef(null); // populated after state inits

  const [isInteractive, setIsInteractive] = useState(false);
  const [currentHeat, setCurrentHeat] = useState(null);
  const [smaPeriod, setSmaPeriod] = useState('28d');
  const [tooltipData, setTooltipData] = useState(null);
  const [error, setError] = useState(null);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Experimental weight tuning + range controls (for balancing the heat equation)
  const [weights, setWeights] = useState({ ...DEFAULT_MARKET_HEAT_WEIGHTS });
  const [overheatThreshold, setOverheatThreshold] = useState(DEFAULT_MARKET_HEAT_SETTINGS.overheatThreshold);
  const [coldThreshold, setColdThreshold] = useState(DEFAULT_MARKET_HEAT_SETTINGS.coldThreshold);
  const [stretchToFullRange, setStretchToFullRange] = useState(DEFAULT_MARKET_HEAT_SETTINGS.stretchToFullRange);
  const [heatSeriesReady, setHeatSeriesReady] = useState(false);



  // Initialize latestSettingsRef with initial defaults (will be kept in sync via effect)
  if (!latestSettingsRef.current) {
    latestSettingsRef.current = { ...DEFAULT_MARKET_HEAT_SETTINGS };
  }

  // Keep latestSettingsRef in sync on every change (for debounced save + unmount save)
  useEffect(() => {
    latestSettingsRef.current = { weights, smaPeriod, overheatThreshold, coldThreshold, stretchToFullRange };
  }, [weights, smaPeriod, overheatThreshold, coldThreshold, stretchToFullRange]);

  // ==================== PERSISTENCE FOR MARKET HEAT INDEX SETTINGS ====================
  // Load once on mount (if not dashboard + signed in). Uses Clerk + /api/user-settings/get/
  // Save debounced on any change of the tunable states (after load); also on unmount if dirty.
  // Only for !isDashboard. Errors silent/graceful. Settings survive logout/login (server in Clerk metadata).
  // (Restored to simple pre-loading-screen pattern that preserved save functionality.)

  const saveMarketHeatSettings = useCallback(async (settings) => {
    if (!settings || isDashboard) return;
    try {
      const token = await getToken();
      const resp = await fetch(apiUrl('/api/user-settings/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketHeatIndexSettings: settings }),
      });
      if (!resp.ok) {
        console.warn('Save marketHeatIndexSettings responded not ok:', resp.status);
      }
    } catch (err) {
      // graceful, don't break UI
      console.warn('Failed to persist marketHeatIndexSettings (non-fatal):', err);
    }
  }, [isDashboard, getToken]);

  // Sync saveFnRef (for unmount access to latest save closure)
  useEffect(() => {
    saveFnRef.current = saveMarketHeatSettings;
  }, [saveMarketHeatSettings]);

  // Load persisted settings once (if signed in, not dashboard). Simple unconditional apply on success.
  useEffect(() => {
    const loadSettings = async () => {
      if (hasLoadedSettings.current || isDashboard || !isSignedIn || !user) {
        hasLoadedSettings.current = true;
        return;
      }
      try {
        const token = await getToken();
        const response = await fetch(apiUrl('/api/user-settings/get/'), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.marketHeatIndexSettings) {
            const s = data.marketHeatIndexSettings;
            if (s.weights && typeof s.weights === 'object') {
              setWeights(prev => ({ ...prev, ...s.weights }));
            }
            if (s.smaPeriod) {
              setSmaPeriod(s.smaPeriod);
            }
            if (typeof s.overheatThreshold === 'number') {
              setOverheatThreshold(s.overheatThreshold);
            }
            if (typeof s.coldThreshold === 'number') {
              setColdThreshold(s.coldThreshold);
            }
            if (typeof s.stretchToFullRange === 'boolean') {
              setStretchToFullRange(s.stretchToFullRange);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load market heat index settings (using defaults):', err);
      } finally {
        hasLoadedSettings.current = true;
      }
    };
    loadSettings();
  }, [isDashboard, isSignedIn, user, getToken]);

  // Debounced auto-save on any relevant state change (after initial load has completed). 800ms.
  useEffect(() => {
    if (!hasLoadedSettings.current || isDashboard) return;
    isDirtyRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const snapshot = { ...latestSettingsRef.current };
    saveTimeoutRef.current = setTimeout(() => {
      if (saveFnRef.current) {
        saveFnRef.current(snapshot);
      }
    }, 800);
  }, [weights, smaPeriod, overheatThreshold, coldThreshold, stretchToFullRange, isDashboard]);

  // Save on unmount if changed (in case unmount before debounce fires)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (isDirtyRef.current && !isDashboard && saveFnRef.current) {
        const snapshot = { ...latestSettingsRef.current };
        saveFnRef.current(snapshot).catch(() => {});
        isDirtyRef.current = false;
      }
    };
  }, []); // run cleanup on unmount only

  const smaPeriods = MARKET_HEAT_SMA_PERIODS;
  const WEIGHT_KEYS = MARKET_HEAT_WEIGHT_KEYS;

  const {
    factorScoresBase,
    smoothedData,
    plottedData,
  } = useMemo(() => computeMarketHeatPipeline({
    btcData,
    mvrvData,
    fearAndGreedData,
    altcoinSeasonTimeseriesData,
    txMvrvRatioDataBySmoothing,
    weights,
    smaPeriod,
    stretchToFullRange,
    txMvrvSmoothing: TX_MVRV_SMOOTHING,
  }), [
    btcData,
    mvrvData,
    fearAndGreedData,
    altcoinSeasonTimeseriesData,
    txMvrvRatioDataBySmoothing,
    weights,
    smaPeriod,
    stretchToFullRange,
  ]);

  const filteredBtcData = useMemo(() => {
    if (!factorScoresBase.length) return [];
    const startDate = factorScoresBase[0].time;
    return btcData.filter(item => new Date(item.time) >= new Date(startDate));
  }, [btcData, factorScoresBase]);

  // Defer only the chart redraw, stats/slider labels stay immediate while weight blending is cheap
  const deferredPlottedData = useDeferredValue(plottedData);

  // Raw stats (pre-stretch) so user can see the natural excursion and tune weights to expand it
  const heatStats = useMemo(() => {
    if (!smoothedData.length) return { min: '-', max: '-', avg: '-' };
    const vals = smoothedData.map(d => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1) };
  }, [smoothedData]);

  // Fetch data - ensure all factors loaded for heat calc
  useEffect(() => {
    Promise.all([
      fetchBtcData(),
      fetchMvrvData(),
      fetchFearAndGreedData(),
      fetchAltcoinSeasonTimeseriesData ? fetchAltcoinSeasonTimeseriesData() : Promise.resolve(),
      fetchTxMvrvRatioData ? fetchTxMvrvRatioData(TX_MVRV_SMOOTHING) : Promise.resolve(),
    ]).catch(err => {
      setError('Failed to load data');
      logger.error('Error fetching data:', err);
    });
  }, [fetchBtcData, fetchMvrvData, fetchFearAndGreedData, fetchAltcoinSeasonTimeseriesData, fetchTxMvrvRatioData]);

  // Initialize chart once (robust creation + initial data population if preloaded).
  // Data updates handled in dedicated effects below so zoom/interactivity preserved.
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialWidth = chartContainerRef.current.clientWidth || 800;
    const initialHeight = chartContainerRef.current.clientHeight || 500;

    const chart = createChart(chartContainerRef.current, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
        mode: 0,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1,
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const btcSeries = chart.addLineSeries({
      color: '#808080',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(0) },
    });
    btcSeriesRef.current = btcSeries;

    // Use AreaSeries for the heat index so the historic "heat" is visually prominent (filled band under the line).
    const heatSeries = chart.addAreaSeries({
      lineColor: colors.greenAccent[400],
      topColor: 'rgba(76, 175, 80, 0.35)',
      bottomColor: 'rgba(76, 175, 80, 0.02)',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(1) },
    });
    heatSeriesRef.current = heatSeries;
    setHeatSeriesReady(true);

    // Price lines are now managed dynamically by a dedicated effect (see below) so thresholds are live-adjustable.

    chart.subscribeCrosshairMove(param => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const heatData = param.seriesData.get(heatSeriesRef.current);
        const btcDataPoint = param.seriesData.get(btcSeriesRef.current);
        setTooltipData({
          date: param.time,
          heat: heatData?.value,
          btcPrice: btcDataPoint?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;

    // Populate with data available at creation time (e.g. preloaded context data on mount).
    // Subsequent changes (incl. weight/stretch changes) are handled by the data-specific effects (no chart recreate).
    if (plottedData.length > 0 && heatSeriesRef.current) {
      heatSeriesRef.current.setData(
        plottedData.map(data => ({ time: data.time, value: data.value }))
      );
    }
    if (filteredBtcData.length > 0 && btcSeriesRef.current) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
    }
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    return () => {
      // Best effort cleanup of any price lines we attached
      const hs = heatSeriesRef.current;
      if (hs) {
        if (overheatPriceLineRef.current) {
          try { hs.removePriceLine(overheatPriceLineRef.current); } catch (e) {}
        }
        if (coldPriceLineRef.current) {
          try { hs.removePriceLine(coldPriceLineRef.current); } catch (e) {}
        }
      }
      overheatPriceLineRef.current = null;
      coldPriceLineRef.current = null;
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

  // Apply theme color updates without recreating chart (preserves zoom, data, interactivity state).
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
    if (heatSeriesRef.current) {
      heatSeriesRef.current.applyOptions({
        lineColor: colors.greenAccent[400],
        topColor: 'rgba(76, 175, 80, 0.35)',
        bottomColor: 'rgba(76, 175, 80, 0.02)',
      });
    }
    if (btcSeriesRef.current) {
      btcSeriesRef.current.applyOptions({ color: '#808080' });
    }
  }, [colors]);

  // Dynamic price lines (Overheated / Cold), recreated when thresholds or theme change.
  // This lets the user move the reference levels while experimenting with weights.
  useEffect(() => {
    const hs = heatSeriesRef.current;
    if (!heatSeriesReady || !hs) return;

    // Remove any previous price lines we created
    if (overheatPriceLineRef.current) {
      try { hs.removePriceLine(overheatPriceLineRef.current); } catch (e) {}
      overheatPriceLineRef.current = null;
    }
    if (coldPriceLineRef.current) {
      try { hs.removePriceLine(coldPriceLineRef.current); } catch (e) {}
      coldPriceLineRef.current = null;
    }

    // Create fresh ones with live threshold values (and current theme colors)
    try {
      overheatPriceLineRef.current = hs.createPriceLine({
        price: overheatThreshold,
        color: colors.redAccent[500],
        lineWidth: 2,
        lineStyle: 2,
        title: 'Overheated',
        axisLabelColor: colors.redAccent[500],
      });
      coldPriceLineRef.current = hs.createPriceLine({
        price: coldThreshold,
        color: colors.blueAccent[400],
        lineWidth: 2,
        lineStyle: 2,
        title: 'Cold',
        axisLabelColor: colors.blueAccent[400],
      });
    } catch (e) {
      // ignore transitional states
    }
  }, [heatSeriesReady, overheatThreshold, coldThreshold, colors]);

  // Update heat series data (deferred redraw keeps sliders responsive during drag)
  useEffect(() => {
    if (heatSeriesRef.current && deferredPlottedData.length > 0) {
      heatSeriesRef.current.setData(
        deferredPlottedData.map(data => ({ time: data.time, value: data.value }))
      );
      // Only fit on initial data load, avoid resetting zoom on every weight tweak
      if (prevPlottedLenRef.current === 0) {
        chartRef.current?.timeScale().fitContent();
      }
      prevPlottedLenRef.current = deferredPlottedData.length;
    }
  }, [deferredPlottedData]);

  // Update Bitcoin series data (unchanged)
  useEffect(() => {
    if (btcSeriesRef.current && filteredBtcData.length > 0) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
      if (prevBtcLenRef.current === 0) {
        chartRef.current?.timeScale().fitContent();
      }
      prevBtcLenRef.current = filteredBtcData.length;
    }
  }, [filteredBtcData]);

  // Update chart options (unchanged)
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        title: `Market Heat Index${smaPeriod !== 'none' ? ` (${smaPeriod} SMA)` : ''}`,
        minimum: 0,
        maximum: 100,
      });
      chartRef.current.priceScale('left').applyOptions({
        title: 'Bitcoin Price (USD)',
        mode: 1,
      });
    }
  }, [isInteractive, smaPeriod]);

  // Update current heat value, when stretch is on this reflects the stretched value (useful for seeing relative position vs thresholds)
  useEffect(() => {
    const latestData = plottedData[plottedData.length - 1];
    setCurrentHeat(latestData ? latestData.value.toFixed(1) : null);
  }, [plottedData]);

  const handleSmaPeriodChange = e => setSmaPeriod(e.target.value);
  const setInteractivity = () => setIsInteractive(!isInteractive);
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Weight / threshold tuning handlers (for the experimental panel)
  const handleResetWeights = () => {
    setWeights({ fg: 15, mvrv: 25, mayer: 20, risk: 20, roirisk: 10, pi: 10, alt: 10, txmvrv: 10 });
  };
  const handleNormalizeWeights = () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    const norm = {};
    Object.entries(weights).forEach(([k, v]) => {
      norm[k] = Math.round((v / total) * 100);
    });
    let newTotal = Object.values(norm).reduce((a, b) => a + b, 0);
    if (newTotal !== 100) {
      // Adjust the largest to make sum exactly 100
      let maxK = Object.keys(norm)[0];
      let maxV = -Infinity;
      Object.entries(norm).forEach(([k, v]) => { if (v > maxV) { maxV = v; maxK = k; } });
      norm[maxK] += (100 - newTotal);
    }
    setWeights(norm);
  };

  if (error) {
    return (
      <Box sx={{ color: colors.redAccent[400], textAlign: 'center', padding: '20px' }}>
        {error}
      </Box>
    );
  }

  const wrapperSx = isDashboard
    ? {
        backgroundColor: colors.primary[400],
        borderRadius: '12px',
        padding: { xs: '16px', sm: '20px' },
        height: '100%',
        minHeight: '400px',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      };

  return (
    <Box sx={wrapperSx}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '8px',
            marginTop: '4px',
            width: '100%',
          }}
        >
          <div className="span-container" style={{ marginRight: 'auto' }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: colors.greenAccent[400],
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'Heat Index' : 'Market Heat Index'}
            </span>
            <span style={{ display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: '#808080',
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'BTC' : 'Bitcoin Price'}
            </span>
          </div>
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' }, margin: '0 auto' }}>
            <InputLabel
              id="sma-period-label"
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              Smoothing
            </InputLabel>
            <Select
              value={smaPeriod}
              onChange={handleSmaPeriodChange}
              label="Smoothing"
              labelId="sma-period-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {smaPeriods.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginLeft: 'auto' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : '#31d6aa',
                borderColor: isInteractive ? 'violet' : '#70d8bd',
              }}
            >
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </Box>
      )}

      {/* Experimental weight + threshold tuning panel (only on full page, not dashboard embeds) */}
      {!isDashboard && (
        <Box sx={{
          mb: 1,
          p: { xs: 1, sm: 1.5 },
          backgroundColor: colors.primary[500],
          borderRadius: '8px',
          border: `1px solid ${colors.primary[300]}`,
        }}>
          <Typography variant="subtitle2" sx={{ color: colors.grey[100], mb: 0.5, fontSize: '0.85rem' }}>
            Weight Tuning &amp; Range (experimental, live updates the historic chart)
          </Typography>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1.5,
            mb: 1,
          }}>
            {Object.keys(weights).map((key) => {
              const labelMap = {
                fg: 'F&G',
                mvrv: 'MVRV',
                mayer: 'Mayer',
                risk: 'Risk',
                roirisk: 'ROI Risk',
                pi: 'PiCycle',
                alt: 'Alt Season',
                txmvrv: 'MVRV/Tx',
              };
              const label = labelMap[key] || key.toUpperCase();
              return (
                <Box key={key}>
                  <Typography variant="caption" sx={{ color: colors.grey[200], display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                    {label} <b>{weights[key]}%</b>
                  </Typography>
                  <Slider
                    value={weights[key]}
                    min={0}
                    max={100}
                    step={1}
                    size="small"
                    onChange={(_, v) => setWeights(prev => ({ ...prev, [key]: Number(v) }))}
                    sx={{ color: colors.greenAccent[400] }}
                  />
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ color: colors.grey[300] }}>
              Sum: {Object.values(weights).reduce((a,b)=>a+b,0)}% (auto-normalized in calc)
            </Typography>
            <Button size="small" variant="outlined" onClick={handleNormalizeWeights} sx={{ fontSize: '0.7rem', py: 0.2, px: 1, minWidth: 0 }}>
              Normalize
            </Button>
            <Button size="small" variant="outlined" onClick={handleResetWeights} sx={{ fontSize: '0.7rem', py: 0.2, px: 1, minWidth: 0 }}>
              Reset defaults
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={stretchToFullRange}
                  onChange={(e) => setStretchToFullRange(e.target.checked)}
                  size="small"
                  sx={{
                    ml: 0.5,
                    '& .MuiSwitch-switchBase': {
                      color: colors.grey[400],
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: colors.grey[600],
                      opacity: 1,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: colors.greenAccent[500],
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: colors.greenAccent[500],
                      opacity: 0.65,
                    },
                  }}
                />
              }
              label={<Typography variant="caption" sx={{ color: colors.grey[200] }}>Stretch observed range to 0-100</Typography>}
              sx={{ ml: 0.5 }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: colors.blueAccent[400], display: 'block', mb: 0.25 }}>
                Cold threshold: <b>{coldThreshold}</b>
              </Typography>
              <Slider
                value={coldThreshold}
                min={0}
                max={50}
                step={1}
                size="small"
                onChange={(_, v) => setColdThreshold(Number(v))}
                sx={{ color: colors.blueAccent[400] }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: colors.redAccent[500], display: 'block', mb: 0.25 }}>
                Overheated threshold: <b>{overheatThreshold}</b>
              </Typography>
              <Slider
                value={overheatThreshold}
                min={50}
                max={100}
                step={1}
                size="small"
                onChange={(_, v) => setOverheatThreshold(Number(v))}
                sx={{ color: colors.redAccent[500] }}
              />
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
            Raw (pre-stretch) composite: min <b>{heatStats.min}</b> / max <b>{heatStats.max}</b> / avg <b>{heatStats.avg}</b>.
            {stretchToFullRange && ' (Plotted values are stretched for full visual range.)'}
          </Typography>
        </Box>
      )}

      <div
        className="chart-container"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: isDashboard ? '100%' : undefined,
          minHeight: isDashboard ? '350px' : undefined,
          maxHeight: isDashboard ? '750px' : undefined,
          flexShrink: 0,
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ flex: '1 1 auto', minHeight: isDashboard ? '400px' : undefined, width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) setIsInteractive(true);
            else setIsInteractive(false);
          }}
        />
        {!isDashboard && tooltipData && (
          <ChartTooltip
            tooltipData={tooltipData}
            chartContainerRef={chartContainerRef}
            isNarrowScreen={isNarrowScreen}
            xNudge={50}
            style={{
              backgroundColor: colors.primary[900],
              padding: isNarrowScreen ? '6px 8px' : '8px 12px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '10px' : '12px',
            }}
            render={(tooltipData) => (
              <>
                <div style={{ fontSize: isNarrowScreen ? '14px' : '16px', fontWeight: 'bold' }}>
                  Market Heat Index
                </div>
                {tooltipData.heat != null && (
                  <div style={{ fontSize: isNarrowScreen ? '18px' : '22px', margin: '4px 0' }}>
                    {tooltipData.heat.toFixed(1)}
                  </div>
                )}
                {tooltipData.btcPrice != null && <div>BTC Price: ${tooltipData.btcPrice.toFixed(2)}</div>}
                {tooltipData.date && (
                  <>
                    <div style={{ fontSize: isNarrowScreen ? '16px' : '18px', fontWeight: 'bold', marginTop: '4px' }}>
                      Heat:{' '}
                      <span
                        style={{
                          color:
                            tooltipData.heat >= overheatThreshold
                              ? colors.redAccent[500]
                              : tooltipData.heat <= coldThreshold
                              ? colors.blueAccent[400]
                              : colors.greenAccent[400],
                          fontWeight: 'bold',
                        }}
                      >
                        {tooltipData.heat >= overheatThreshold ? 'Overheated' : tooltipData.heat <= coldThreshold ? 'Cold' : 'Neutral'}
                      </span>
                    </div>
                    <div>{tooltipData.date}</div>
                  </>
                )}
              </>
            )}
          />
        )}
      </div>

      {/* Last Updated row (standardized via ChartUnderSection) */}
      {!isDashboard && (
        <UnderChartRow style={{ justifyContent: 'flex-start' }}>
          <LastUpdated storageKey="btcData" />
        </UnderChartRow>
      )}

      {/* Lower content area - always inside the card (standardized) */}
      {!isDashboard && (
        <ChartUnderSection borderColor={colors.primary[500]} sx={{ color: colors.primary[100] }}>
          {/* Current value callout - the reference pattern to mimic for "value under the chart" */}
          <UnderChartValue>
            <Typography variant="h6" sx={{ color: colors.primary[100], fontSize: "1.1rem" }}>
              Current Heat Index (plotted):{' '}
              <b style={{
                color: (parseFloat(currentHeat) >= overheatThreshold)
                  ? colors.redAccent[500]
                  : (parseFloat(currentHeat) <= coldThreshold)
                  ? colors.blueAccent[400]
                  : colors.greenAccent[400]
              }}>{currentHeat}</b>
            </Typography>
            {!stretchToFullRange && (
              <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                (raw range min {heatStats.min} / max {heatStats.max})
              </Typography>
            )}
          </UnderChartValue>

          <UnderChartScroll
            maxHeight={{ xs: "140px", sm: "180px" }}
            sx={{ color: colors.grey[300] }}
          >
            The Market Heat Index combines multiple indicators (MVRV, Mayer Multiple, Risk, Fear and Greed, PiCycle, Alt Season, MVRV/Tx Ratio) using live-adjustable weights (see panel above). MVRV/Tx ratio is included as a heat factor (higher values signal potential overvaluation). Use the weight sliders + "Stretch observed range" to explore balances that produce fuller 0-100 excursions (the natural composite often compresses e.g. ~8–81). Threshold lines are also draggable. Core indicators (MVRV + derived Mayer/Risk/PiCycle) extend back to ~2011; F&G and Alt Season contribute from 2018 onward (and TxMVRV from 2014). When an indicator lacks data for a period its weight is excluded and the remaining active weights are renormalized. Bitcoin price overlay for reference. Experiment to find the most useful signal. MVRV/Tx values are dynamically min-max normalized to 0-100 heat contribution.
          </UnderChartScroll>
        </ChartUnderSection>
      )}
    </Box>
  );
};

export default restrictToPaidSubscription(MarketHeatIndex);