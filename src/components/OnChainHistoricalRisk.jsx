// src/components/OnChainHistoricalRisk.js
import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import { Select, MenuItem, FormControl, InputLabel, Slider, Box, Button, Typography } from '@mui/material';
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
  // const [weights, setWeights] = useState({
  //   mvrv: 0.3,
  //   puell: 0.25,
  //   minerCap: 0.2,
  //   feeRisk: 0.15,
  //   // terminalPrice: 0.1,
  // });
  // const [showWeightControls, setShowWeightControls] = useState(false);

  // Access DataContext
  const {
    btcData: contextBtcData,
    mvrvData: contextMvrvData,
    // puellData,
    // minerCapData,
    // feeRiskData,
    // terminalPriceData,
    fetchBtcData,
    fetchMvrvData,
    // fetchPuellData,
    // fetchMinerCapData,
    // fetchFeeRiskData,
    // fetchTerminalPriceData,
  } = useContext(DataContext);
  const btcData = propBtcData || contextBtcData;
  const mvrvData = propMvrvData || contextMvrvData;

  // Metric labels for UI
  const metricLabels = {
    mvrv: 'MVRV Z-Score',
    // puell: 'Puell Multiple',
    // minerCap: 'Miner Cap to Thermo Cap',
    // feeRisk: 'Transaction Fee Risk',
    // terminalPrice: 'Terminal Price Risk',
    // weighted: 'Weighted Average',
  };

  // Function to calculate MVRV-Z risk (unchanged)
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

    return normalizedRisk;
  };

  // Calculate weighted average risk
  // const calculateWeightedAverageRisk = useMemo(() => {
  //   const datasets = [
  //     { data: mvrvData.length && btcData.length ? calculateMvrvZRisk(mvrvData, btcData) : [], weight: weights.mvrv },
  //     { data: puellData, weight: weights.puell },
  //     { data: minerCapData, weight: weights.minerCap },
  //     { data: feeRiskData, weight: weights.feeRisk },
  //     { data: terminalPriceData, weight: weights.terminalPrice },
  //   ];

  //   if (datasets.some(ds => !ds.data.length)) return [];

  //   const allDates = new Set(datasets.flatMap(ds => ds.data.map(d => d.time)));
  //   return Array.from(allDates).sort().map(date => {
  //     let weightedSum = 0;
  //     let totalWeight = 0;
  //     datasets.forEach(ds => {
  //       const item = ds.data.find(d => d.time === date);
  //       if (item) {
  //         const riskValue = item.Risk !== undefined ? item.Risk : item.value; // MVRV uses Risk, others use value
  //         weightedSum += riskValue * ds.weight;
  //         totalWeight += ds.weight;
  //       }
  //     });
  //     const btcItem = btcData.find(b => b.time === date);
  //     return {
  //       time: date,
  //       value: btcItem?.value || 0,
  //       Risk: totalWeight ? weightedSum / totalWeight : 0,
  //     };
  //   });
  // }, [mvrvData, btcData, puellData, minerCapData, feeRiskData, weights]);

  // Calculate chart data based on selected metric
  const chartData = useMemo(() => {
    const metricDataMap = {
      mvrv: mvrvData.length && btcData.length ? calculateMvrvZRisk(mvrvData, btcData) : [],
      // puell: puellData.map(item => ({
      //   time: item.time,
      //   value: btcData.find(b => b.time === item.time)?.value || 0,
      //   Risk: item.value,
      // })),
      // minerCap: minerCapData.map(item => ({
      //   time: item.time,
      //   value: btcData.find(b => b.time === item.time)?.value || 0,
      //   Risk: item.value,
      // })),
      // feeRisk: feeRiskData.map(item => ({
      //   time: item.time,
      //   value: btcData.find(b => b.time === item.time)?.value || 0,
      //   Risk: item.value,
      // })),
      // terminalPrice: terminalPriceData.map(item => ({
      //   time: item.time,
      //   value: btcData.find(b => b.time === item.time)?.value || 0,
      //   Risk: item.value,
      // })),
      // weighted: calculateWeightedAverageRisk,
    };
    return metricDataMap[selectedMetric] || [];
  }, [
    selectedMetric,
    mvrvData,
    btcData,
    // puellData,
    // minerCapData,
    // feeRiskData,
    // terminalPriceData,
    // calculateWeightedAverageRisk,
  ]);

  // Handle weight changes
  // const handleWeightChange = (metric, value) => {
  //   setWeights(prev => ({ ...prev, [metric]: value / 100 }));
  // };

  // Normalize weights to sum to 1
  // const normalizeWeights = () => {
  //   const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  //   if (total === 0) return;
  //   setWeights(prev => {
  //     const normalized = {};
  //     Object.keys(prev).forEach(key => {
  //       normalized[key] = prev[key] / total;
  //     });
  //     return normalized;
  //   });
  // };

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
    // fetchPuellData();
    // fetchMinerCapData();
    // fetchFeeRiskData();
    // fetchTerminalPriceData();
  }, [fetchBtcData, fetchMvrvData]);

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
    chart.priceScale('right').applyOptions({ mode: 0, borderVisible: false });

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
  }, [chartData, theme.palette.mode, isDashboard, btcData, isInteractive, colors]);

  return (
    <div style={{ height: '100%', padding: isMobile ? '10px' : '20px' }}>
      {!isDashboard && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="risk-metric-label">Risk Metric</InputLabel>
              <Select
                labelId="risk-metric-label"
                value={selectedMetric}
                label="Risk Metric"
                onChange={e => setSelectedMetric(e.target.value)}
                sx={{
                  bgcolor: colors.primary[600],
                  color: colors.primary[100],
                  '& .MuiSvgIcon-root': { color: colors.primary[100] },
                }}
              >
                {Object.keys(metricLabels).map(key => (
                  <MenuItem key={key} value={key}>{metricLabels[key]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Button
                onClick={setInteractivity}
                variant="outlined"
                sx={{
                  mr: 1,
                  bgcolor: isInteractive ? colors.greenAccent[500] : 'transparent',
                  color: isInteractive ? colors.grey[900] : colors.greenAccent[400],
                  borderColor: isInteractive ? colors.greenAccent[500] : colors.greenAccent[400],
                  '&:hover': { bgcolor: colors.greenAccent[600], borderColor: colors.greenAccent[600] },
                }}
              >
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </Button>
              <Button
                onClick={resetChartView}
                variant="outlined"
                sx={{
                  bgcolor: 'transparent',
                  color: colors.blueAccent[400],
                  borderColor: colors.blueAccent[400],
                  '&:hover': { bgcolor: colors.blueAccent[600], borderColor: colors.blueAccent[600] },
                }}
              >
                Reset Chart
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ color: colors.primary[100], mr: 2 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, bgcolor: 'gray', mr: 5 }} />
              Bitcoin Price
            </Typography>
            <Typography sx={{ color: colors.primary[100] }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, bgcolor: '#ff0062', mr: 5 }} />
              {metricLabels[selectedMetric]} Risk
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        className="chart-container"
        sx={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 100px)',
          width: '100%',
          border: `2px solid ${colors.grey[500]}`,
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => !isDashboard && setInteractivity(!isInteractive)}
        />
      </Box>

      <Box className="under-chart">
        {!isDashboard && <LastUpdated storageKey={selectedMetric === 'mvrv' ? 'mvrvData' : `${selectedMetric}Data`} />}
      </Box>

      {!isDashboard && (
        <Box>
          <Typography sx={{ display: 'inline-block', mt: 2, fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {metricLabels[selectedMetric]} Risk Level: <b>{currentRiskLevel}</b> (${currentBtcPrice.toFixed(0)}k)
          </Typography>
          <Typography sx={{ mt: 2, color: colors.grey[100], fontSize: '0.9rem' }}>
            The On-Chain Historical Risk chart displays a selected risk metric alongside Bitcoin price (logarithmic scale). 
            MVRV Z-Score uses a weighted approach to emphasize recent data, smoothing early volatility. 
            Puell Multiple measures miner revenue relative to its 365-day average. 
            Miner Cap to Thermo Cap compares realized capitalization to all-time miner revenue. 
            Transaction Fee Risk assesses network congestion via the fee-to-reward ratio. 
            The Weighted Average combines these metrics with adjustable weights, normalized to sum to 1.
          </Typography>
        </Box>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(OnChainHistoricalRisk);