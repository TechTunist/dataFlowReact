// src/components/OnChainHistoricalRisk.js
import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Select, MenuItem, FormControl, InputLabel, Box, Button, Typography } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const OnChainHistoricalRisk = ({ isDashboard = false, mvrvData: propMvrvData, btcData: propBtcData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const riskSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();
  const [selectedMetric, setSelectedMetric] = useState('mvrv');
  const [smoothingPeriod, setSmoothingPeriod] = useState(7); // Default to 7-day smoothing

  // Access DataContext
  const {
    btcData: contextBtcData,
    mvrvData: contextMvrvData,
    onchainMetricsData,
    fetchBtcData,
    fetchMvrvData,
    fetchOnchainMetricsData,
  } = useContext(DataContext);
  const btcData = propBtcData || contextBtcData;
  const mvrvData = propMvrvData || contextMvrvData;

  // Smoothing period options
  const allSmoothingOptions = [
    { value: 7, label: '7 Days' },
    { value: 28, label: '28 Days' },
    { value: 90, label: '90 Days' },
    { value: 180, label: '180 Days' },
    { value: 365, label: '1 Year' },
  ];

  // Restrict Puell to 7 and 28 days
  const puellSmoothingOptions = allSmoothingOptions.filter(option => [7, 28].includes(option.value));

  // Metric labels for UI
  const metricLabels = {
    mvrv: 'MVRV Z-Score',
    puell: 'Puell Multiple',
  };

  // Calculate daily issuance based on block reward schedule (for fallback)
  const calculateDailyIssuance = (date) => {
    const halvingInterval = 210000; // Blocks per halving
    const blocksPerDay = 144; // Approx. 144 blocks/day
    const genesisDate = new Date('2009-01-03');
    const daysSinceGenesis = Math.floor((new Date(date) - genesisDate) / (1000 * 60 * 60 * 24));
    const blocksMined = daysSinceGenesis * blocksPerDay;
    const halvingCount = Math.floor(blocksMined / halvingInterval);
    const reward = 50 / Math.pow(2, halvingCount);
    return reward * blocksPerDay; // Daily issuance in BTC
  };

  // Normalize time to 'YYYY-MM-DD'
  const normalizeTime = (time) => new Date(time).toISOString().split('T')[0];

  // Prepare price and issuance data with alignment
  const prepareData = useMemo(() => {
    const rawPriceData = btcData.map(d => ({
      time: normalizeTime(d.time),
      value: parseFloat(d.value) || 0,
    })).sort((a, b) => a.time.localeCompare(b.time));

    let issuanceData = onchainMetricsData
      .filter(d => d.metric.toLowerCase() === 'isscontusd')
      .map(d => ({
        time: normalizeTime(d.time),
        value: parseFloat(d.value) || 0,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (issuanceData.length === 0 && rawPriceData.length > 0) {
      console.warn('IssContUSD data missing, calculating issuance using block reward');
      issuanceData = rawPriceData.map(d => ({
        time: d.time,
        value: calculateDailyIssuance(d.time) * d.value, // Issuance in USD
      }));
    }

    // Filter priceData to match issuanceData times
    const issuanceTimes = new Set(issuanceData.map(d => d.time));
    const priceData = rawPriceData.filter(d => issuanceTimes.has(d.time));

    return { priceData, issuanceData };
  }, [btcData, onchainMetricsData]);

  // Calculate Puell Multiple
  const puellDataRaw = useMemo(() => {
    const { issuanceData } = prepareData;
    const puellData = [];

    for (let i = 0; i < issuanceData.length; i++) {
      const startIndex = Math.max(0, i - 365);
      const windowData = issuanceData.slice(startIndex, i + 1);
      const movingAverage = windowData.length > 0
        ? windowData.reduce((sum, d) => sum + d.value, 0) / windowData.length
        : 0;
      const puellMultiple = movingAverage !== 0 ? issuanceData[i].value / movingAverage : null;
      puellData.push({
        time: issuanceData[i].time,
        value: puellMultiple !== null ? parseFloat(puellMultiple.toFixed(2)) : null,
      });
    }

    return puellData;
  }, [prepareData]);

  // Apply smoothing to any data array
  const applySmoothing = (data, period) => {
    const smoothedData = [];
    for (let i = 0; i < data.length; i++) {
      const startIndex = Math.max(0, i - period + 1);
      const window = data.slice(startIndex, i + 1).filter(d => d.value !== null);
      const smoothedValue = window.length > 0
        ? window.reduce((sum, d) => sum + d.value, 0) / window.length
        : null;
      smoothedData.push({
        time: data[i].time,
        value: smoothedValue !== null ? parseFloat(smoothedValue.toFixed(2)) : null,
      });
    }
    return smoothedData;
  };

// Convert Puell Multiple to Risk Score
const calculatePuellRisk = (puellData, btcData) => {
  if (!puellData.length || !btcData.length) return [];

  const cutoffDate = new Date('2010-09-05').getTime();
  const allDates = new Set([...btcData.map(d => d.time), ...puellData.map(d => d.time)]);
  const sortedDates = Array.from(allDates)
    .filter((date) => new Date(date).getTime() >= cutoffDate)
    .sort((a, b) => new Date(a) - new Date(b));

  let lastBtcValue = null;
  const alignedBtcData = sortedDates.map((date) => {
    const btcItem = btcData.find((b) => b.time === date);
    if (btcItem && btcItem.value != null) {
      lastBtcValue = btcItem.value;
      return { time: date, value: btcItem.value };
    }
    return lastBtcValue != null ? { time: date, value: lastBtcValue } : null;
  }).filter((item) => item != null);

  const btcStartTime = Math.max(new Date(btcData[0].time).getTime(), cutoffDate);
  const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
  let lastPuellValue = null;
  const alignedPuellData = sortedDates.map((date) => {
    const itemTime = new Date(date).getTime();
    if (itemTime < btcStartTime || itemTime > btcEndTime) return null;
    const puellItem = puellData.find((p) => p.time === date);
    if (puellItem && puellItem.value != null) {
      lastPuellValue = puellItem.value;
      return { time: date, value: puellItem.value };
    }
    return lastPuellValue != null ? { time: date, value: lastPuellValue } : null;
  }).filter((item) => item != null);

  const decayRate = 0.5; // Same as MVRV for recent data emphasis
  const peakSensitivity = 0.6; // Slightly lower than MVRV to avoid extreme highs
  const capitulationSensitivity = 0.02; // Higher than MVRV to emphasize low Puell
  const earlySmoothingFactor = 0.0; // Same as MVRV
  const shiftConstant = 0.2; // Slightly higher to narrow risk range
  const extensionFactor = 0.25; // Slightly lower than MVRV for Puell
  const multiplierScale = 0.6; // Same as MVRV
  const multiplierRate = 0.001; // Same as MVRV

  const weights = alignedPuellData.map((_, index) => Math.exp(decayRate * (index / (alignedPuellData.length - 1))));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const weightedMean = alignedPuellData.reduce((sum, item, index) => sum + item.value * weights[index], 0) / weightSum;
  const weightedVariance = alignedPuellData.reduce(
    (sum, item, index) => sum + weights[index] * Math.pow(item.value - weightedMean, 2),
    0
  ) / weightSum;
  const weightedStdDev = Math.sqrt(weightedVariance) || 1;

  const puellZScores = alignedPuellData.map((item, index) => ({
    time: item.time,
    value: item.value,
    zScore: (item.value - weightedMean) / weightedStdDev,
  }));

  const zScoreMA = puellZScores.map((item, i) => {
    const windowSize = 50; // Same as MVRV
    const start = Math.max(0, i - windowSize + 1);
    const window = puellZScores.slice(start, i + 1);
    const ma = window.reduce((sum, val) => sum + val.zScore, 0) / window.length;
    return { time: item.time, zScore: item.zScore, zScoreMA: ma };
  });

  const riskScores = zScoreMA.map((item) => {
    const daysSinceStart = (new Date(item.time).getTime() - cutoffDate) / (1000 * 60 * 60 * 24);
    const multiplier = 1 + multiplierScale * (1 - Math.exp(-multiplierRate * daysSinceStart));
    const extension = item.zScore - item.zScoreMA;
    return {
      time: item.time,
      value: item.value,
      risk: 1 / (1 + Math.exp(
        -peakSensitivity * item.zScore * multiplier -
        capitulationSensitivity * Math.max(0, -item.zScore) * multiplier -
        extensionFactor * extension * multiplier
      )),
    };
  });

  const smoothedRisk = riskScores.map((item, i) => {
    const t = i / (riskScores.length - 1);
    const windowSize = Math.round(5 + earlySmoothingFactor * (1 - t) * 25);
    const start = Math.max(0, i - windowSize + 1);
    const window = riskScores.slice(start, i + 1);
    return {
      ...item,
      risk: window.reduce((sum, val) => sum + val.risk, 0) / window.length,
    };
  });

  const normalizedRisk = smoothedRisk.map((item) => {
    const btcItem = alignedBtcData.find((b) => b.time === item.time);
    if (!btcItem) return null;
    const adjustedRisk = Math.max(0, (item.risk - shiftConstant) / (1 - shiftConstant));
    return { time: item.time, value: btcItem.value, Risk: adjustedRisk };
  }).filter((item) => item != null);

  // Apply user-selected smoothing to risk scores (assuming applySmoothing is defined in the component)
  return applySmoothing(normalizedRisk.map(item => ({
    time: item.time,
    value: item.Risk,
  })), smoothingPeriod).map((smoothed, i) => ({
    time: smoothed.time,
    value: normalizedRisk[i].value,
    Risk: smoothed.value,
  }));
};

  // Calculate MVRV-Z Risk with Smoothing
  const calculateMvrvZRisk = (mvrvData, btcData) => {
    if (!mvrvData.length || !btcData.length) return [];

    const cutoffDate = new Date('2010-09-05').getTime();
    const allDates = new Set([...btcData.map((item) => item.time), ...mvrvData.map((item) => item.time)]);
    const sortedDates = Array.from(allDates)
      .filter((date) => new Date(date).getTime() >= cutoffDate)
      .sort((a, b) => new Date(a) - new Date(b));

    let lastBtcValue = null;
    const alignedBtcData = sortedDates.map((date) => {
      const btcItem = btcData.find((b) => b.time === date);
      if (btcItem && btcItem.value != null) {
        lastBtcValue = btcItem.value;
        return { time: date, value: btcItem.value };
      }
      return lastBtcValue != null ? { time: date, value: lastBtcValue } : null;
    }).filter((item) => item != null);

    const btcStartTime = Math.max(new Date(btcData[0].time).getTime(), cutoffDate);
    const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
    let lastMvrvValue = null;
    const alignedMvrvData = sortedDates.map((date) => {
      const itemTime = new Date(date).getTime();
      if (itemTime < btcStartTime || itemTime > btcEndTime) return null;
      const mvrvItem = mvrvData.find((m) => m.time === date);
      if (mvrvItem && mvrvItem.value != null) {
        lastMvrvValue = mvrvItem.value;
        return { time: date, value: mvrvItem.value };
      }
      return lastMvrvValue != null ? { time: date, value: lastMvrvValue } : null;
    }).filter((item) => item != null);

    const decayRate = 0.5;
    const peakSensitivity = 0.6;
    const capitulationSensitivity = 0.01;
    const earlySmoothingFactor = 0.0;
    const shiftConstant = 0.24;
    const extensionFactor = 0.3;
    const multiplierScale = 0.4;
    const multiplierRate = 0.0005;

    const weights = alignedMvrvData.map((_, index) => Math.exp(decayRate * (index / (alignedMvrvData.length - 1))));
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const weightedMean = alignedMvrvData.reduce((sum, item, index) => sum + item.value * weights[index], 0) / weightSum;
    const weightedVariance = alignedMvrvData.reduce(
      (sum, item, index) => sum + weights[index] * Math.pow(item.value - weightedMean, 2),
      0
    ) / weightSum;
    const weightedStdDev = Math.sqrt(weightedVariance) || 1;

    const mvrvZScores = alignedMvrvData.map((item, index) => ({
      time: item.time,
      value: item.value,
      zScore: (item.value - weightedMean) / weightedStdDev,
    }));

    const zScoreMA = mvrvZScores.map((item, i) => {
      const windowSize = 50;
      const start = Math.max(0, i - windowSize + 1);
      const window = mvrvZScores.slice(start, i + 1);
      const ma = window.reduce((sum, val) => sum + val.zScore, 0) / window.length;
      return { time: item.time, zScore: item.zScore, zScoreMA: ma };
    });

    const riskScores = zScoreMA.map((item) => {
      const daysSinceStart = (new Date(item.time).getTime() - cutoffDate) / (1000 * 60 * 60 * 24);
      const multiplier = 1 + multiplierScale * (1 - Math.exp(-multiplierRate * daysSinceStart));
      const extension = item.zScore - item.zScoreMA;
      return {
        time: item.time,
        value: item.value,
        risk: 1 / (1 + Math.exp(
          -peakSensitivity * item.zScore * multiplier -
          capitulationSensitivity * Math.max(0, -item.zScore) * multiplier -
          extensionFactor * extension * multiplier
        )),
      };
    });

    const smoothedRisk = riskScores.map((item, i) => {
      const t = i / (riskScores.length - 1);
      const windowSize = Math.round(5 + earlySmoothingFactor * (1 - t) * 25);
      const start = Math.max(0, i - windowSize + 1);
      const window = riskScores.slice(start, i + 1);
      return {
        ...item,
        risk: window.reduce((sum, val) => sum + val.risk, 0) / window.length,
      };
    });

    const normalizedRisk = smoothedRisk.map((item) => {
      const btcItem = alignedBtcData.find((b) => b.time === item.time);
      if (!btcItem) return null;
      const adjustedRisk = Math.max(0, (item.risk - shiftConstant) / (1 - shiftConstant));
      return { time: item.time, value: btcItem.value, Risk: adjustedRisk };
    }).filter((item) => item != null);

    // Apply user-selected smoothing to risk scores
    return applySmoothing(normalizedRisk.map(item => ({
      time: item.time,
      value: item.Risk,
    })), smoothingPeriod).map((smoothed, i) => ({
      time: smoothed.time,
      value: normalizedRisk[i].value,
      Risk: smoothed.value,
    }));
  };

  // Calculate chart data based on selected metric
  const chartData = useMemo(() => {
    const metricDataMap = {
      mvrv: mvrvData.length && btcData.length ? calculateMvrvZRisk(mvrvData, btcData) : [],
      puell: puellDataRaw.length && btcData.length ? calculatePuellRisk(
        applySmoothing(puellDataRaw, smoothingPeriod),
        btcData
      ) : [],
    };
    return metricDataMap[selectedMetric] || [];
  }, [selectedMetric, mvrvData, btcData, puellDataRaw, smoothingPeriod]);

  // Toggle interactivity
  const setInteractivity = () => setIsInteractive(!isInteractive);

  // Format numbers for price scale
  const compactNumberFormatter = value => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  // Reset chart view
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Fetch data on mount
  useEffect(() => {
    fetchBtcData();
    fetchMvrvData();
    fetchOnchainMetricsData();
  }, [fetchBtcData, fetchMvrvData, fetchOnchainMetricsData]);

  // Reset smoothing period when switching metrics
  useEffect(() => {
    if (selectedMetric === 'puell' && ![7, 28].includes(smoothingPeriod)) {
      setSmoothingPeriod(7); // Default to 7 days for Puell
    }
  }, [selectedMetric, smoothingPeriod]);

  // Render chart
  useEffect(() => {
    if (chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: 'rgba(70, 70, 70, 0.5)' }, horzLines: { color: 'rgba(70, 70, 70, 0.5)' } },
      rightPriceScale: { scaleMargins: { top: 0.01, bottom: 0.01 }, borderVisible: false },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const riskSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(2) },
    });
    riskSeriesRef.current = riskSeries;
    const riskSeriesData = chartData.map(data => ({ time: data.time, value: data.Risk }));
    riskSeries.setData(riskSeriesData);

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;
    const priceSeriesData = btcData.map(data => ({ time: data.time, value: data.value }));
    priceSeries.setData(priceSeriesData);

    chart.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    chart.priceScale('left').applyOptions({ mode: 1, borderVisible: false, priceFormat: { type: 'custom', formatter: compactNumberFormatter } });
    chart.priceScale('right').applyOptions({ 
      mode: 0, 
      borderVisible: false,
      title: `${metricLabels[selectedMetric]} Risk (${smoothingPeriod}-Day SMA)`,
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const latestBtcData = btcData[btcData.length - 1];
    const latestRiskData = chartData[chartData.length - 1];
    if (latestBtcData) setCurrentBtcPrice(Math.floor(latestBtcData.value / 1000));
    if (latestRiskData) {
      try {
        setCurrentRiskLevel(latestRiskData.Risk.toFixed(2));
      } catch (error) {
        console.error('Failed to set risk level:', error);
      }
    }

    window.addEventListener('resize', resizeChart);
    window.addEventListener('resize', resetChartView);
    resizeChart();
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
      window.removeEventListener('resize', resetChartView);
    };
  }, [chartData, theme.palette.mode, isDashboard, btcData, isInteractive, colors, selectedMetric, smoothingPeriod]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            marginTop: '30px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="risk-metric-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Risk Metric
            </InputLabel>
            <Select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              label="Risk Metric"
              labelId="risk-metric-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[600],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {Object.keys(metricLabels).map(key => (
                <MenuItem key={key} value={key}>{metricLabels[key]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '150px' } }}>
            <InputLabel
              id="smoothing-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Smoothing Period
            </InputLabel>
            <Select
              value={smoothingPeriod}
              onChange={e => setSmoothingPeriod(e.target.value)}
              label="Smoothing Period"
              labelId="smoothing-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[600],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {(selectedMetric === 'puell' ? puellSmoothingOptions : allSmoothingOptions).map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="span-container">
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {metricLabels[selectedMetric]} Risk
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!isDashboard && (
              <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </button>
            )}
            {!isDashboard && (
              <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
            )}
          </div>
        </div>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={() => {
          if (!isInteractive && !isDashboard) setInteractivity(true);
          else setInteractivity(false);
        }}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>
      {!isDashboard && <LastUpdated storageKey={selectedMetric === 'mvrv' ? 'mvrvData' : selectedMetric === 'combined' ? 'combinedRisk' : 'onchainMetricsData'} />}
      {!isDashboard && (
        <Box sx={{ marginTop: '20px' }}>
          <Typography sx={{ display: 'inline-block', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {metricLabels[selectedMetric]} Risk Level: <b>{currentRiskLevel}</b> (${currentBtcPrice.toFixed(0)}k)
          </Typography>
          <Typography sx={{ marginTop: '10px', color: colors.grey[100], fontSize: '0.9rem' }}>
            The On-Chain Historical Risk chart displays a selected risk metric alongside Bitcoin price (logarithmic scale). 
            MVRV Z-Score uses a weighted approach to emphasize recent data, smoothing early volatility. 
            Puell Multiple measures miner revenue relative to its 365-day average, transformed into a risk score where low values (~0.5) indicate low risk and high values (~4) indicate high risk, with diminishing peaks over time. 
            Combined Risk averages the MVRV and Puell risk scores for a balanced risk assessment.
          </Typography>
        </Box>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(OnChainHistoricalRisk);