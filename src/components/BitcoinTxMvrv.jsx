import React, { useRef, useEffect, useState, useContext, useMemo, useCallback, memo } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, useMediaQuery, Checkbox, Typography, Button, Grid, TextField } from '@mui/material';
import { UnderChartRow, ChartUnderSection, UnderChartScroll, ChartInfo } from './ChartUnderSection';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartTooltip from './ChartTooltip';

const BitcoinTxMvrvChart = ({ isDashboard = false, isChartPage = false, txMvrvData: propTxMvrvData, simulatorDcaLevels = null, hideControls = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const txCountSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const ratioSeriesRef = useRef(null);
  const bearTrendSeriesRef = useRef(null);
  const horizontalLineSeriesRef = useRef(null);
  const overboughtSeriesRef = useRef(null);
  const bottomShadedSeriesRef = useRef(null);
  const dcaLevelSeriesRefs = useRef([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [displayMode, setDisplayMode] = useState('ratio');
  const [smoothingMode, setSmoothingMode] = useState('sma-7');
  const [activeTrends, setActiveTrends] = useState([]);

  // === DCA Simulation using MVRV/Tx Ratio (copied and adapted from BitcoinRisk.jsx) ===
  // Do not change the /risk component. This is a copy for tx-mvrv.
  const [dcaAmount, setDcaAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState(7);
  const [dcaStartDate, setDcaStartDate] = useState('2021-01-01');
  const [dcaRatioThreshold, setDcaRatioThreshold] = useState(10); // adjustable, default in low range 5-16
  const [sellThresholds, setSellThresholds] = useState([
    { ratioLevel: 20, percentage: 10 },
    { ratioLevel: 30, percentage: 25 },
    { ratioLevel: 40, percentage: 50 },
  ]);
  const [totalUsdInvested, setTotalUsdInvested] = useState(0);
  const [totalUsdRealized, setTotalUsdRealized] = useState(0);
  const [btcHeld, setBtcHeld] = useState(0);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [simulationRun, setSimulationRun] = useState(false);
  const [percentageGains, setPercentageGains] = useState(0);
  const [unrealizedGains, setUnrealizedGains] = useState(0);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [showTransactions, setShowTransactions] = useState(false);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const {
    txMvrvData: contextTxMvrvData,
    fetchTxMvrvData,
    txMvrvRatioDataBySmoothing,
    fetchTxMvrvRatioData,
    btcData: contextBtcData,
    fetchBtcData,
    txMvrvLastUpdated,
    txMvrvRatioLastUpdated,
  } = useContext(DataContext);

  // Memoize raw data selection for stable references (like MVRV Z-Score hardening)
  const txMvrvData = useMemo(() => (propTxMvrvData || contextTxMvrvData) || [], [propTxMvrvData, contextTxMvrvData]);
  const btcData = useMemo(() => contextBtcData || [], [contextBtcData]);
  const ratioPayload = useMemo(
    () => txMvrvRatioDataBySmoothing?.[smoothingMode] || null,
    [txMvrvRatioDataBySmoothing, smoothingMode]
  );

  // Calculate EMA (stable) — used for tx-mvrv display mode only
  const calculateEMA = useCallback((data, period, key = 'value') => {
    const alpha = 2 / (period + 1);
    const result = [{ time: data[0].time, value: data[0][key] }];
    for (let i = 1; i < data.length; i++) {
      const value = alpha * data[i][key] + (1 - alpha) * result[i - 1].value;
      result.push({ time: data[i].time, value });
    }
    return result;
  }, []);

  // Calculate SMA (stable)
  const calculateSMA = useCallback((data, period, key = 'value') => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: data[i][key] });
      } else {
        const window = data.slice(i - period + 1, i + 1);
        const avg = window.reduce((sum, item) => sum + item[key], 0) / period;
        result.push({ time: data[i].time, value: avg });
      }
    }
    return result;
  }, []);

  const getSmoothingLabel = useCallback((mode) => {
    const map = {
      'ema-3': '3-day EMA',
      'ema-7': '7-day EMA',
      'ema-14': '14-day EMA',
      'ema-21': '21-day EMA',
      'ema-28': '28-day EMA',
      'ema-42': '6-week EMA',
      'ema-56': '8-week EMA',
      'ema-140': '20-week EMA',
      'sma-3': '3-day SMA',
      'sma-7': '7-day SMA',
      'sma-14': '14-day SMA',
      'sma-21': '21-day SMA',
      'sma-28': '28-day SMA',
      'sma-42': '6-week SMA',
      'sma-56': '8-week SMA',
      'sma-140': '20-week SMA',
    };
    return map[mode] || mode;
  }, []);

  const trends = useMemo(() => ({
    'bottom': {
      color: theme.palette.mode === 'dark' ? colors.greenAccent[400] : colors.greenAccent[500],
      label: 'Oversold',
      description: 'Linear trend line through MVRV/Tx ratio at historical bear market bottoms (2015, 2019, 2022), projected forward. Lightly shaded vertical areas highlight periods when the ratio falls below this trend line.',
    },
    'threshold': {
      color: theme.palette.mode === 'dark' ? colors.primary[300] : colors.primary[400],
      label: 'Overbought',
      description: 'Horizontal line at ~88% of the historical max MVRV/Tx ratio, indicating potential overbought conditions when peaks break through. Lightly shaded vertical areas highlight periods when the ratio exceeds this threshold.',
    },
  }), [theme.palette.mode, colors]);

  const getIndicators = useCallback((mode, smoothing) => ({
    'tx-count': {
      color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
      label: `Tx Count${smoothing === 'none' ? '' : ` (${getSmoothingLabel(smoothing)})`}`,
      description: `The ${smoothing === 'none' ? 'daily' : getSmoothingLabel(smoothing)} of Bitcoin transaction counts, indicating network activity and usage over time.`,
    },
    'mvrv': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
      label: 'MVRV',
      description: 'Market Value to Realized Value ratio, showing Bitcoin’s valuation relative to its realized capitalization.',
    },
    'ratio': {
      color: theme.palette.mode === 'dark' ? 'rgba(147, 112, 219, 1)' : 'rgba(128, 0, 128, 1)',
      label: `MVRV/Tx Ratio${smoothing === 'none' ? '' : ` (${getSmoothingLabel(smoothing)})`}`,
      description: `The ratio of normalized MVRV to normalized transaction count${smoothing === 'none' ? '' : `, smoothed with a ${smoothing.startsWith('ema-') ? 'exponential' : 'simple'} moving average`}, dynamically normalized to a rolling maximum. High values may indicate overvaluation (market tops), low values may suggest undervaluation (market bottoms).`,
    },
  }), [theme.palette.mode, getSmoothingLabel]);

  const setInteractivity = useCallback(() => {
    setIsInteractive(prev => !prev);
  }, []);

  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  const handleDisplayModeChange = useCallback((event, newMode) => {
    if (newMode) {
      setDisplayMode(newMode);
      if (newMode !== 'ratio') {
        setActiveTrends([]);
      }
    }
  }, []);

  const handleSmoothingModeChange = useCallback((event) => {
    setSmoothingMode(event.target.value);
  }, []);

  const handleTrendsChange = useCallback((event) => {
    setActiveTrends(event.target.value);
  }, []);

  // Adapted from BitcoinRisk - DCA simulation for ratio values
  // high ratio = overbought (sell), low ratio = oversold (buy more)
  const handleThresholdChange = (index, newPercentage) => {
    const updatedThresholds = sellThresholds.map((threshold, idx) => {
      if (idx === index) {
        return { ...threshold, percentage: newPercentage };
      }
      return threshold;
    });
    setSellThresholds(updatedThresholds);
  };

  const handleDcaSimulation = () => {
    // Use ratio data if in ratio mode, else fallback
    let simData = [];
    if (displayMode === 'ratio' && processedData && processedData.ratioData && processedData.ratioData.length > 0) {
      const { ratioData, filteredBtcData } = processedData;
      simData = ratioData.map((r, i) => {
        const b = filteredBtcData[i] || { value: 0, time: r.time };
        return {
          time: r.time,
          value: b.value,
          ratio: r.value,
        };
      });
    } else if (txMvrvData.length > 0) {
      // fallback: if txMvrvData has mvrv, but for ratio we prefer the precomputed
      // for now use empty or simple
      simData = [];
    }
    if (simData.length === 0) {
      alert('Switch to MVRV/Tx Ratio mode or ensure data is loaded for simulation.');
      return;
    }

    let localBtcHeld = 0;
    let localTotalUsdRealized = 0;
    let localTotalUsdInvested = 0;
    let localTransactionHistory = [];
    let nextPurchaseDate = new Date(dcaStartDate);
    let lastSellDate = new Date(dcaStartDate);
    lastSellDate.setDate(lastSellDate.getDate() - dcaFrequency);

    let currentBtcPrice = 0;
    let currentRatio = 0;

    simData.forEach(day => {
      const dayDate = new Date(day.time);
      currentBtcPrice = day.value;
      currentRatio = day.ratio;

      if (dayDate >= nextPurchaseDate && currentRatio <= dcaRatioThreshold) {
        const btcPurchased = dcaAmount / day.value;
        localBtcHeld += btcPurchased;
        localTotalUsdInvested += dcaAmount;
        localTransactionHistory.push({
          type: 'buy',
          date: day.time,
          amount: btcPurchased,
          price: day.value,
          ratio: currentRatio,
        });
        nextPurchaseDate = new Date(dayDate);
        nextPurchaseDate.setDate(dayDate.getDate() + dcaFrequency);
      }

      const daysSinceLastSale = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);

      if (localBtcHeld > 0 && daysSinceLastSale >= dcaFrequency) {
        let maxApplicableThreshold = null;

        sellThresholds.forEach(threshold => {
          if (currentRatio >= threshold.ratioLevel && threshold.percentage > 0) {
            if (!maxApplicableThreshold || threshold.ratioLevel > maxApplicableThreshold.ratioLevel) {
              maxApplicableThreshold = threshold;
            }
          }
        });

        if (maxApplicableThreshold && maxApplicableThreshold.percentage > 0) {
          const btcSold = localBtcHeld * (maxApplicableThreshold.percentage / 100);
          localBtcHeld -= btcSold;
          const usdRealized = btcSold * day.value;
          localTotalUsdRealized += usdRealized;
          localTransactionHistory.push({
            type: 'sell',
            date: day.time,
            amount: btcSold,
            price: day.value,
            ratio: currentRatio,
            sellPercent: maxApplicableThreshold.percentage,
          });
          lastSellDate = new Date(dayDate);
        }
      }
    });

    const calculatePercentageGains = localTotalUsdInvested > 0
      ? ((localTotalUsdRealized - localTotalUsdInvested) / localTotalUsdInvested) * 100
      : 0;

    const unrealizedGains = localBtcHeld * currentBtcPrice;

    setBtcHeld(localBtcHeld);
    setTotalUsdRealized(localTotalUsdRealized);
    setTotalUsdInvested(localTotalUsdInvested);
    setPercentageGains(calculatePercentageGains);
    setTransactionHistory(localTransactionHistory);
    setUnrealizedGains(unrealizedGains);
    setTotalPortfolioValue(localTotalUsdRealized + unrealizedGains);

    setSimulationRun(true);
  };

  const getBearMarketBottoms = useCallback((ratioData, bottomDates) => {
    return bottomDates.map(date => {
      const targetTime = new Date(date).getTime();
      const closestPoint = ratioData.reduce((closest, point) => {
        const pointTime = new Date(point.time).getTime();
        const closestTime = new Date(closest.time).getTime();
        return Math.abs(pointTime - targetTime) < Math.abs(closestTime - targetTime) ? point : closest;
      }, ratioData[0]);
      return { time: date, value: closestPoint.value };
    });
  }, []);

  const buildOverboughtData = useCallback((ratioData, horizontalLineValue) => (
    ratioData
      .map(point => ({
        time: point.time,
        value: point.value > horizontalLineValue ? 1 : 0,
      }))
      .filter(point => point.value === 1)
  ), []);

  // Memoize processed data — ratio mode uses server-precomputed series; tx-mvrv mode stays client-side
  const processedData = useMemo(() => {
    const cutoffDate = new Date('2014-10-21');
    const filteredBtcData = btcData.filter(item => new Date(item.time) >= cutoffDate);
    if (filteredBtcData.length === 0) return null;

    if (displayMode === 'ratio') {
      if (!ratioPayload?.series?.length) return null;
      const ratioData = ratioPayload.series;
      const horizontalLineValue = ratioPayload.horizontalThreshold;
      return {
        filteredTxMvrvData: [],
        filteredBtcData,
        txCountData: [],
        ratioData,
        horizontalLineValue,
        overboughtData: buildOverboughtData(ratioData, horizontalLineValue),
      };
    }

    if (txMvrvData.length === 0) return null;
    const filteredTxMvrvData = txMvrvData.filter(
      item => {
        const timeValid = new Date(item.time) >= cutoffDate;
        const txValid = typeof item.tx_count === 'number' && !isNaN(item.tx_count);
        const mvrvValid = typeof item.mvrv === 'number' && !isNaN(item.mvrv);
        return timeValid && txValid && mvrvValid;
      }
    );
    if (filteredTxMvrvData.length === 0) return null;

    let txCountData = filteredTxMvrvData.map(item => ({ time: item.time, value: item.tx_count }));
    if (smoothingMode === 'ema-3') {
      txCountData = calculateEMA(txCountData, 3);
    } else if (smoothingMode === 'ema-7') {
      txCountData = calculateEMA(txCountData, 7);
    } else if (smoothingMode === 'ema-14') {
      txCountData = calculateEMA(txCountData, 14);
    } else if (smoothingMode === 'ema-21') {
      txCountData = calculateEMA(txCountData, 21);
    } else if (smoothingMode === 'ema-28') {
      txCountData = calculateEMA(txCountData, 28);
    } else if (smoothingMode === 'ema-42') {
      txCountData = calculateEMA(txCountData, 42);
    } else if (smoothingMode === 'ema-56') {
      txCountData = calculateEMA(txCountData, 56);
    } else if (smoothingMode === 'ema-140') {
      txCountData = calculateEMA(txCountData, 140);
    } else if (smoothingMode === 'sma-3') {
      txCountData = calculateSMA(txCountData, 3);
    } else if (smoothingMode === 'sma-7') {
      txCountData = calculateSMA(txCountData, 7);
    } else if (smoothingMode === 'sma-14') {
      txCountData = calculateSMA(txCountData, 14);
    } else if (smoothingMode === 'sma-21') {
      txCountData = calculateSMA(txCountData, 21);
    } else if (smoothingMode === 'sma-28') {
      txCountData = calculateSMA(txCountData, 28);
    } else if (smoothingMode === 'sma-42') {
      txCountData = calculateSMA(txCountData, 42);
    } else if (smoothingMode === 'sma-56') {
      txCountData = calculateSMA(txCountData, 56);
    } else if (smoothingMode === 'sma-140') {
      txCountData = calculateSMA(txCountData, 140);
    }

    return {
      filteredTxMvrvData,
      filteredBtcData,
      txCountData,
      ratioData: [],
      horizontalLineValue: 0,
      overboughtData: [],
    };
  }, [
    txMvrvData,
    btcData,
    smoothingMode,
    displayMode,
    ratioPayload,
    calculateEMA,
    calculateSMA,
    buildOverboughtData,
  ]);

  const lastUpdatedDate = displayMode === 'ratio'
    ? txMvrvRatioLastUpdated?.[smoothingMode]
    : txMvrvLastUpdated;

  useEffect(() => {
    fetchBtcData();
    if (displayMode === 'ratio') {
      fetchTxMvrvRatioData(smoothingMode);
    } else {
      fetchTxMvrvData();
    }
  }, [fetchBtcData, fetchTxMvrvData, fetchTxMvrvRatioData, displayMode, smoothingMode]);

  // Create chart once, add all series with initial empty data
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
      },
      handleScroll: isInteractive && !isDashboard,
      handleScale: isInteractive && !isDashboard,
      leftPriceScale: {
        mode: 0,
        borderVisible: false,
        scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 },
      },
      rightPriceScale: {
        mode: 1,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 },
      },
    });

    // Add overbought series first to create the scale
    const overboughtSeries = chart.addHistogramSeries({
      priceScaleId: 'overbought-scale',
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 0.3)' : 'rgba(255, 140, 0, 0.3)', // Muted red/orange with higher opacity for visibility
      priceFormat: {
        type: 'custom',
        minMove: 0.01,
        formatter: (value) => (value === 1 ? '' : ''), // Hide labels
      },
      visible: false, // Initially hidden
    });
    overboughtSeriesRef.current = overboughtSeries;
    overboughtSeries.setData([]); // Initial empty data

    // Add bottom shaded series
    const bottomShadedSeries = chart.addHistogramSeries({
      priceScaleId: 'overbought-scale',
      color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.3)' : 'rgba(0, 128, 0, 0.3)', // Muted cyan/green with higher opacity for visibility
      priceFormat: {
        type: 'custom',
        minMove: 0.01,
        formatter: (value) => (value === 1 ? '' : ''), // Hide labels
      },
      visible: false, // Initially hidden
    });
    bottomShadedSeriesRef.current = bottomShadedSeries;
    bottomShadedSeries.setData([]); // Initial empty data

    // Now configure the overbought scale
    chart.priceScale('overbought-scale').applyOptions({
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: 0.05 },
      visible: false, // Invisible scale for overlay
    });

    // Configure other scales
    chart.priceScale('left').applyOptions({
      mode: 0,
      borderVisible: false,
      scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 },
    });
    chart.priceScale('right').applyOptions({
      mode: 1,
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 },
    });

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
        const dateStr = param.time;
        const txCountData = param.seriesData.get(txCountSeriesRef.current);
        const mvrvData = param.seriesData.get(mvrvSeriesRef.current);
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const ratioData = param.seriesData.get(ratioSeriesRef.current);
        setTooltipData({
          date: dateStr,
          txCount: txCountData?.value,
          mvrv: mvrvData?.value,
          price: priceData?.value,
          ratio: ratioData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    // Define colors
    const lightThemeColors = {
      txCount: { lineColor: 'rgba(255, 140, 0, 0.8)' },
      mvrv: { lineColor: 'rgba(0, 128, 0, 1)' },
      price: { lineColor: 'gray' },
      ratio: { lineColor: 'rgba(128, 0, 128, 1)' },
    };
    const darkThemeColors = {
      txCount: { lineColor: 'rgba(38, 198, 218, 1)' },
      mvrv: { lineColor: 'rgba(255, 99, 71, 1)' },
      price: { lineColor: 'gray' },
      ratio: { lineColor: 'rgba(147, 112, 219, 1)' },
    };
    const { txCount: txCountColors, mvrv: mvrvColors, price: priceColors, ratio: ratioColors } =
      theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    // Transaction Count Series
    const txCountSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: txCountColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'custom', minMove: 1, formatter: value => value.toFixed(0) },
      visible: displayMode === 'tx-mvrv',
    });
    txCountSeriesRef.current = txCountSeries;
    txCountSeries.setData([]);

    // Bitcoin Price Series
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: priceColors.lineColor,
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: value => (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)),
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData([]);

    // MVRV Series
    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: mvrvColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: displayMode === 'tx-mvrv',
    });
    mvrvSeriesRef.current = mvrvSeries;
    mvrvSeries.setData([]);

    // MVRV/Tx Ratio Series
    const ratioSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: ratioColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: displayMode === 'ratio',
    });
    ratioSeriesRef.current = ratioSeries;
    ratioSeries.setData([]);
    // prepare for custom dca levels
    dcaLevelSeriesRefs.current = [];

    chartRef.current = chart;
    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Empty deps: create chart only once on mount

  // Update data when processedData changes
  useEffect(() => {
    if (!chartRef.current || !processedData) return;
    const { filteredTxMvrvData, filteredBtcData, txCountData, ratioData, overboughtData } = processedData;
    // Update core series data
    txCountSeriesRef.current?.setData(txCountData);
    priceSeriesRef.current?.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));
    mvrvSeriesRef.current?.setData(filteredTxMvrvData.map(item => ({ time: item.time, value: item.mvrv * 100000 })));
    ratioSeriesRef.current?.setData(ratioData);
    // Update overbought series data and visibility
    overboughtSeriesRef.current?.setData(overboughtData);
    overboughtSeriesRef.current?.applyOptions({
      visible: activeTrends.includes('threshold') && displayMode === 'ratio'
    });
    // Update visibility for displayMode
    txCountSeriesRef.current?.applyOptions({ visible: displayMode === 'tx-mvrv' });
    mvrvSeriesRef.current?.applyOptions({ visible: displayMode === 'tx-mvrv' });
    ratioSeriesRef.current?.applyOptions({ visible: displayMode === 'ratio' });

    // Draw simulator custom DCA levels (extra horizontals on ratio scale)
    // Only active when simulatorDcaLevels prop is passed (used exclusively by the Dynamic DCA Simulator)
    if (simulatorDcaLevels && simulatorDcaLevels.length > 0 && displayMode === 'ratio' && chartRef.current) {
      dcaLevelSeriesRefs.current.forEach(s => {
        try { chartRef.current.removeSeries(s); } catch (e) {}
      });
      dcaLevelSeriesRefs.current = [];

      const times = ratioData.map(d => d.time);
      simulatorDcaLevels.forEach((lvl) => {
        const lvlSeries = chartRef.current.addLineSeries({
          color: lvl.color || (lvl.type === 'buy' ? colors.greenAccent[500] : '#f472b6'),
          lineWidth: 1.2,
          lineStyle: 2,
          priceScaleId: 'left',
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const lineData = times.map(t => ({ time: t, value: lvl.level }));
        lvlSeries.setData(lineData);
        dcaLevelSeriesRefs.current.push(lvlSeries);
      });
    }
    // Always fit content to ensure full view of data
    chartRef.current.timeScale().fitContent();
  }, [processedData, displayMode, activeTrends, simulatorDcaLevels]);

  // Update trends lines when activeTrends or processedData changes
  useEffect(() => {
    if (!chartRef.current || !processedData) return;
    const { ratioData, horizontalLineValue } = processedData;
    const msPerDay = 1000 * 60 * 60 * 24;
    // Remove existing trend series if present
    if (bearTrendSeriesRef.current) {
      chartRef.current.removeSeries(bearTrendSeriesRef.current);
      bearTrendSeriesRef.current = null;
    }
    if (horizontalLineSeriesRef.current) {
      chartRef.current.removeSeries(horizontalLineSeriesRef.current);
      horizontalLineSeriesRef.current = null;
    }
    // Bottom Indicator
    if (activeTrends.includes('bottom') && displayMode === 'ratio') {
      const bottomDates = ['2015-04-27', '2019-02-07', '2022-10-02'];
      const bearMarketBottoms = getBearMarketBottoms(ratioData, bottomDates);
      const baseDate = new Date('2015-04-27').getTime();
      const days = bearMarketBottoms.map(point => ({
        x: (new Date(point.time).getTime() - baseDate) / msPerDay,
        y: point.value,
      }));
      const n = days.length;
      const sumX = days.reduce((sum, d) => sum + d.x, 0);
      const sumY = days.reduce((sum, d) => sum + d.y, 0);
      const sumXY = days.reduce((sum, d) => sum + d.x * d.y, 0);
      const sumXX = days.reduce((sum, d) => sum + d.x * d.x, 0);
      const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const c = (sumY - m * sumX) / n;
      const startTime = '2015-04-27';
      const startDays = 0;
      const startValue = Math.max(0, c);
      const endTime = ratioData[ratioData.length - 1].time;
      const endTimestamp = new Date(endTime).getTime();
      const endDays = (endTimestamp - baseDate) / msPerDay;
      const endValue = Math.max(0, m * endDays + c);
      const trendData = [
        { time: startTime, value: startValue },
        { time: endTime, value: endValue }
      ];
      const bearTrendSeries = chartRef.current.addLineSeries({
        priceScaleId: 'left',
        color: trends['bottom'].color,
        lineWidth: 2,
        lineStyle: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        visible: displayMode === 'ratio',
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bearTrendSeries.applyOptions({
        autoscaleInfoProvider: () => null,
      });
      bearTrendSeriesRef.current = bearTrendSeries;
      bearTrendSeries.setData(trendData);
      // Compute bottom shaded data directly using linear formula
      const bottomShadedData = ratioData
        .map(point => {
          const pointTimestamp = new Date(point.time).getTime();
          const daysSinceStart = (pointTimestamp - baseDate) / msPerDay;
          let trendVal;
          if (daysSinceStart < 0) {
            trendVal = c; // Use start value for points before base date to match original behavior
          } else {
            trendVal = m * daysSinceStart + c;
          }
          return {
            time: point.time,
            value: point.value < Math.max(0, trendVal) ? 1 : 0,
          };
        })
        .filter(point => point.value === 1);
      bottomShadedSeriesRef.current?.setData(bottomShadedData);
      bottomShadedSeriesRef.current?.applyOptions({
        visible: activeTrends.includes('bottom') && displayMode === 'ratio'
      });
    } else {
      // Hide bottom shaded when not active
      bottomShadedSeriesRef.current?.applyOptions({ visible: false });
      bottomShadedSeriesRef.current?.setData([]);
    }
    // Horizontal Threshold Line
    if (activeTrends.includes('threshold') && displayMode === 'ratio') {
      const thresholdData = ratioData.map(point => ({ time: point.time, value: horizontalLineValue }));
      const horizontalLineSeries = chartRef.current.addLineSeries({
        priceScaleId: 'left',
        color: trends['threshold'].color,
        lineWidth: 2,
        lineStyle: 3,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        visible: displayMode === 'ratio',
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      horizontalLineSeriesRef.current = horizontalLineSeries;
      horizontalLineSeries.setData(thresholdData);
      horizontalLineSeries.applyOptions({
        autoscaleInfoProvider: () => null,
      });
    }
  }, [activeTrends, displayMode, processedData, trends]);

  // Update interactivity and scales
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
      chartRef.current.priceScale('left').applyOptions({
        scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 },
      });
      chartRef.current.priceScale('right').applyOptions({
        scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 },
      });
    }
  }, [isInteractive, isDashboard, displayMode]);

  const indicatorsForMode = getIndicators(displayMode, smoothingMode);

  const getBottomShadedColor = useCallback(() => {
    return theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.3)' : 'rgba(0, 128, 0, 0.3)';
  }, [theme.palette.mode]);

  const getOverboughtShadedColor = useCallback(() => {
    return theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 0.3)' : 'rgba(255, 140, 0, 0.3)';
  }, [theme.palette.mode]);

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
      {!isDashboard && !hideControls && (
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
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              flex: 1,
            }}
          >
            <ToggleButtonGroup
              value={displayMode}
              exclusive
              onChange={handleDisplayModeChange}
              sx={{
                backgroundColor: colors.primary[500],
                '& .MuiToggleButton-root': {
                  color: colors.grey[100],
                  borderColor: colors.grey[300],
                  '&.Mui-selected': {
                    backgroundColor: colors.greenAccent[500],
                    color: colors.primary[900],
                  },
                  '&:hover': {
                    backgroundColor: colors.greenAccent[700],
                  },
                },
              }}
            >
              <ToggleButton value="tx-mvrv">Tx Count & MVRV</ToggleButton>
              <ToggleButton value="ratio">MVRV/Tx Ratio</ToggleButton>
            </ToggleButtonGroup>
            <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
              <InputLabel
                id="smoothing-mode-label"
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                }}
              >
                Smoothing
              </InputLabel>
              <Select
                value={smoothingMode}
                onChange={handleSmoothingModeChange}
                labelId="smoothing-mode-label"
                label="Smoothing"
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
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="sma-3">3-day SMA</MenuItem>
                <MenuItem value="sma-7">7-day SMA</MenuItem>
                <MenuItem value="sma-14">14-day SMA</MenuItem>
                <MenuItem value="sma-21">21-day SMA</MenuItem>
                <MenuItem value="sma-28">28-day SMA</MenuItem>
                <MenuItem value="sma-42">6-week SMA (42-day)</MenuItem>
                <MenuItem value="sma-56">8-week SMA (56-day)</MenuItem>
                <MenuItem value="sma-140">20-week SMA (140-day)</MenuItem>
                <MenuItem value="ema-3">3-day EMA</MenuItem>
                <MenuItem value="ema-7">7-day EMA</MenuItem>
                <MenuItem value="ema-14">14-day EMA</MenuItem>
                <MenuItem value="ema-21">21-day EMA</MenuItem>
                <MenuItem value="ema-28">28-day EMA</MenuItem>
                <MenuItem value="ema-42">6-week EMA (42-day)</MenuItem>
                <MenuItem value="ema-56">8-week EMA (56-day)</MenuItem>
                <MenuItem value="ema-140">20-week EMA (140-day)</MenuItem>
              </Select>
            </FormControl>
            {displayMode === 'ratio' && (
              <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
                <InputLabel
                  id="trends-label"
                  shrink
                  sx={{
                    color: colors.grey[100],
                    '&.Mui-focused': { color: colors.greenAccent[500] },
                  }}
                >
                  Trends
                </InputLabel>
                <Select
                  multiple
                  value={activeTrends}
                  onChange={handleTrendsChange}
                  labelId="trends-label"
                  label="Trends"
                  displayEmpty
                  renderValue={(selected) =>
                    selected.length > 0
                      ? selected.map((key) => trends[key].label).join(', ')
                      : 'Select Trends'
                  }
                  sx={{
                    color: colors.grey[100],
                    backgroundColor: colors.primary[500],
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '& .MuiSelect-select': { py: 1.5, pl: 2 },
                    '& .MuiSelect-select:empty': { color: colors.grey[500] },
                  }}
                >
                  {Object.entries(trends).map(([key, { label }]) => (
                    <MenuItem key={key} value={key}>
                      <Checkbox
                        checked={activeTrends.includes(key)}
                        sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                      />
                      <span>{label}</span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
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
        onDoubleClick={() => {
          if (!isInteractive && !isDashboard) setIsInteractive(true);
          else setIsInteractive(false);
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ flex: '1 1 auto', minHeight: isDashboard ? '400px' : undefined, width: '100%', zIndex: 1 }}
        />
        {!isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 2,
              backgroundColor: colors.primary[900],
              padding: '5px 10px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '8px' : '12px',
            }}
          >
            {displayMode === 'tx-mvrv' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['tx-count'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['tx-count'].label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['mvrv'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['mvrv'].label}
                </div>
              </>
            )}
            {displayMode === 'ratio' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['ratio'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['ratio'].label}
                </div>
                {activeTrends.includes('bottom') && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          backgroundColor: trends['bottom'].color,
                          marginRight: '5px',
                        }}
                      />
                      {trends['bottom'].label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          backgroundColor: getBottomShadedColor(),
                          marginRight: '5px',
                        }}
                      />
                      Bottom Shaded Areas
                    </div>
                  </>
                )}
                {activeTrends.includes('threshold') && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          backgroundColor: trends['threshold'].color,
                          marginRight: '5px',
                        }}
                      />
                      {trends['threshold'].label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          backgroundColor: getOverboughtShadedColor(),
                          marginRight: '5px',
                        }}
                      />
                      Overbought Shaded Areas
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {!isDashboard && tooltipData && (
          <ChartTooltip
            tooltipData={tooltipData}
            chartContainerRef={chartContainerRef}
            isNarrowScreen={isNarrowScreen}
            style={{
              backgroundColor: colors.primary[900],
              padding: isNarrowScreen ? '6px 8px' : '8px 12px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '10px' : '12px',
            }}
            render={(tooltipData) => (
              <>
                <div style={{ fontSize: isNarrowScreen ? '12px' : '14px', color: colors.grey[300] }}>
                  BTC price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
                </div>
                {displayMode === 'tx-mvrv' && (
                  <>
                    <div style={{ color: indicatorsForMode['tx-count'].color }}>
                      {indicatorsForMode['tx-count'].label}: {tooltipData.txCount?.toFixed(0) ?? 'N/A'}
                    </div>
                    <div style={{ color: indicatorsForMode['mvrv'].color }}>
                      MVRV: {(tooltipData.mvrv / 100000)?.toFixed(2) ?? 'N/A'}
                    </div>
                  </>
                )}
                {displayMode === 'ratio' && (
                  <div style={{ color: indicatorsForMode['ratio'].color }}>
                    {indicatorsForMode['ratio'].label}: {tooltipData.ratio?.toFixed(2) ?? 'N/A'}
                  </div>
                )}
                <div>{tooltipData.date?.toString()}</div>
              </>
            )}
          />
        )}
      </div>

      {/* DCA Simulation Tool copied/adapted from /risk for Tx Tension (MVRV/Tx Ratio) */}
      {/* Uses the ratio values (high=overbought/sell, low=oversold/buy more). Thresholds adjustable in the raw ratio scale (e.g. ~5-43 range). */}
      {!isDashboard && (
        <Box sx={{
          mt: 2,
          p: 2,
          backgroundColor: colors.primary[400],
          borderRadius: '8px',
          border: `1px solid ${colors.primary[500]}`,
        }}>
          <Typography variant="h6" sx={{ mb: 1, color: colors.primary[100] }}>
            DCA Simulation using MVRV/Tx Ratio
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: colors.grey[300] }}>
            Backtest dynamic DCA: buy more when ratio is low (oversold), sell portions when ratio is high (overbought). 
            Adjust thresholds below (typical raw ratio range ~5-16 low, up to ~43 high). Simulation uses current display mode data if ratio.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={dcaStartDate}
                onChange={e => setDcaStartDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="USD per DCA Period"
                type="number"
                value={dcaAmount}
                onChange={e => setDcaAmount(parseFloat(e.target.value) || 100)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ color: colors.grey[200] }}>DCA Frequency (days):</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {[7,14,28].map(f => (
                  <Button
                    key={f}
                    variant={dcaFrequency === f ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setDcaFrequency(f)}
                    sx={{ 
                      color: dcaFrequency === f ? '#111' : colors.greenAccent[500],
                      borderColor: colors.greenAccent[500],
                      backgroundColor: dcaFrequency === f ? colors.greenAccent[500] : 'transparent'
                    }}
                  >
                    {f}
                  </Button>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Buy Threshold (ratio <= this to buy)"
                type="number"
                value={dcaRatioThreshold}
                onChange={e => setDcaRatioThreshold(parseFloat(e.target.value) || 10)}
                fullWidth
                size="small"
                helperText="Low ratio = oversold, buy (e.g. 5-16)"
              />
            </Grid>
          </Grid>

          {/* Sell thresholds - adjustable like risk levels */}
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: colors.primary[100] }}>Sell Thresholds (high ratio = sell % of holdings)</Typography>
          {sellThresholds.map((t, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
              <TextField
                label="Ratio Level"
                type="number"
                value={t.ratioLevel}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 20;
                  const updated = [...sellThresholds];
                  updated[idx] = { ...updated[idx], ratioLevel: val };
                  setSellThresholds(updated);
                }}
                size="small"
                sx={{ width: 120 }}
              />
              <TextField
                label="% to Sell"
                type="number"
                value={t.percentage}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 10;
                  const updated = [...sellThresholds];
                  updated[idx] = { ...updated[idx], percentage: val };
                  setSellThresholds(updated);
                }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
          ))}

          <Button
            onClick={handleDcaSimulation}
            variant="contained"
            sx={{ mt: 2, backgroundColor: colors.greenAccent[500], color: '#111' }}
          >
            Run DCA Simulation
          </Button>

          {simulationRun && (
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: colors.primary[500], borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ color: colors.greenAccent[400] }}>Results</Typography>
              <Typography variant="body2">Total Invested: ${totalUsdInvested.toFixed(0)}</Typography>
              <Typography variant="body2">Total Realized from Sales: ${totalUsdRealized.toFixed(0)}</Typography>
              <Typography variant="body2">BTC Held: {btcHeld.toFixed(4)}</Typography>
              <Typography variant="body2">Unrealized Gains: ${unrealizedGains.toFixed(0)}</Typography>
              <Typography variant="body2">Total Portfolio Value: ${totalPortfolioValue.toFixed(0)}</Typography>
              <Typography variant="body2" sx={{ color: percentageGains >= 0 ? colors.greenAccent[400] : '#f472b6' }}>
                Realized Gains: {percentageGains.toFixed(1)}%
              </Typography>
              {transactionHistory.length > 0 && (
                <Button size="small" onClick={() => setShowTransactions(!showTransactions)} sx={{ mt: 1 }}>
                  {showTransactions ? 'Hide' : 'Show'} Transactions ({transactionHistory.length})
                </Button>
              )}
              {showTransactions && transactionHistory.length > 0 && (
                <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1, fontSize: '0.8rem', color: colors.grey[300] }}>
                  {transactionHistory.slice(0, 20).map((t, i) => (
                    <div key={i}>{t.date} - {t.type} {t.amount.toFixed(4)} BTC @ ${t.price.toFixed(0)} (ratio: {t.ratio?.toFixed(2)}){t.sellPercent ? ` - ${t.sellPercent}%` : ''}</div>
                  ))}
                  {transactionHistory.length > 20 && <div>... and more</div>}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {!isDashboard && (
        <UnderChartRow>
          <LastUpdated customDate={lastUpdatedDate} />
          <BitcoinFees />
        </UnderChartRow>
      )}

      {!isDashboard && (
        <ChartUnderSection borderColor={colors.primary[500]} sx={{ color: colors.primary[100] }}>
          <UnderChartScroll
            maxHeight={{ xs: '180px', sm: '240px' }}
            sx={{ color: colors.grey[300] }}
          >
            {Object.entries(indicatorsForMode).map(([key, { label, color, description }]) => (
              (displayMode === 'tx-mvrv' ? (key === 'tx-count' || key === 'mvrv') :
                key === 'ratio') && (
                <Typography key={key} component="p" sx={{ margin: '5px 0' }}>
                  <strong style={{ color }}>{label}:</strong> {description}
                </Typography>
              )
            ))}
            {activeTrends.map(key => (
              <Typography key={key} component="p" sx={{ margin: '5px 0' }}>
                <strong style={{ color: trends[key].color }}>
                  {trends[key].label}:
                </strong> {trends[key].description}
              </Typography>
            ))}
            {activeTrends.includes('bottom') && (
              <Typography component="p" sx={{ margin: '5px 0' }}>
                <strong style={{ color: getBottomShadedColor() }}>Bottom Shaded Areas:</strong> Lightly shaded vertical areas highlighting periods when the MVRV/Tx ratio falls below the bottom indicator trend line, indicating potential undervaluation.
              </Typography>
            )}
            {activeTrends.includes('threshold') && (
              <Typography component="p" sx={{ margin: '5px 0' }}>
                <strong style={{ color: getOverboughtShadedColor() }}>Overbought Shaded Areas:</strong> Lightly shaded vertical areas highlighting periods when the MVRV/Tx ratio exceeds the overbought threshold, indicating potential overvaluation.
              </Typography>
            )}
          </UnderChartScroll>

          {/* Main long-form explanation - outside the scroll (always visible) and using the centralized ChartInfo / .chart-info for bigger/prominent text vs the small activetrends metas */}
          <ChartInfo sx={{ mt: 1, color: colors.grey[300] }}>
              <br />
              The Bitcoin Tx Count, Price & MVRV chart shows the {displayMode === 'tx-mvrv' ? `${smoothingMode === 'none' ? 'daily transaction count' : getSmoothingLabel(smoothingMode)} of transaction count and scaled MVRV` : `MVRV-to-transaction-count ratio${smoothingMode === 'none' ? '' : ` with ${smoothingMode.startsWith('ema-') ? 'exponential' : 'simple'} moving average`}`} and Bitcoin price starting from October 21, 2014, illustrating network activity, price trends, and valuation. {displayMode === 'ratio' ? `The MVRV/Tx Ratio is the normalized MVRV divided by normalized transaction count, dynamically normalized to a rolling maximum and optionally smoothed with a moving average.${activeTrends.includes('bottom') ? ' The Bottom Indicator projects historical ratio lows forward.' : ''}${activeTrends.includes('threshold') ? ' The Overbought Threshold is a horizontal line near the historical max, signaling potential tops when breached.' : ''}` : 'MVRV is scaled by 100,000 to fit the linear axis.'}
              <br /><br />
              This chart shows the Bitcoin transaction count, Bitcoin price, MVRV ratio, or MVRV/Tx ratio, providing a snapshot of how Bitcoin’s network and value interact over time.
              The transaction count reflects activity on the Bitcoin network, and potential hype cycles that see an influx of new investors, and conversely bear markets where interest has decreased.
              The MVRV (market value to realised value) ratio shows the difference between the current market value of bitcoin and the realised value (the average value of all Bitcoin when last transacted).
              <br /><br />
              The MVRV/Tx ratio compares the MVRV to network activity. One interpretation of the spikes of this ratio is that the price has increased speculatively without corresponding network activity that would have led to a "natural" increase of value.
              There is currently a monotonically increasing trendline under the lows in the MVRV/Tx ratio that has held for 10 years and has indicated relatively low risk entry points.
          </ChartInfo>
        </ChartUnderSection>
      )}
    </Box>
  );
};

export default restrictToPaidSubscription(BitcoinTxMvrvChart);