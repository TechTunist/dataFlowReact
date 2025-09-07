import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, useMediaQuery, Typography } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
// Helper function to calculate Risk Metric
const calculateRiskMetric = (data) => {
  const movingAverage = data.map((item, index) => {
    const start = Math.max(index - 373, 0);
    const subset = data.slice(start, index + 1);
    const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });
  const movingAverageWithPreavg = movingAverage.map((item, index) => {
    const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
    return { ...item, Preavg: preavg };
  });
  const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
  const preavgMin = Math.min(...preavgValues);
  const preavgMax = Math.max(...preavgValues);
  const normalizedRisk = movingAverageWithPreavg.map(item => ({
    ...item,
    Risk: preavgMax === preavgMin ? 0 : (item.Preavg - preavgMin) / (preavgMax - preavgMin),
  }));
  return normalizedRisk;
};
// Helper function to calculate Simple Moving Average
const calculateSMA = (data, windowSize) => {
  if (!data || data.length < windowSize) return [];
  let sma = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    sma.push({ time: data[i].time, value: sum / windowSize });
  }
  return sma;
};
// Helper function to calculate PiCycle Ratio
const calculateRatioSeries = (data) => {
  if (!data || data.length < 350) return [];
  const sma111 = calculateSMA(data, 111);
  const sma350 = calculateSMA(data, 350);
  let ratioData = [];
  for (let i = 349; i < data.length; i++) {
    if (i - 110 >= 0 && sma111[i - 110] && sma350[i - 349]) {
      const sma350Value = sma350[i - 349].value;
      const ratio = sma350Value > 0.001 ? sma111[i - 110].value / (sma350Value * 2) : 0;
      ratioData.push({ time: data[i].time, value: ratio });
    }
  }
  return ratioData;
};
// Helper function to calculate MVRV Peak Projection
const calculateMvrvPeakProjection = (mvrvData) => {
  if (!mvrvData || mvrvData.length < 181) return { projectedPeak: null };
  const sortedMvrvData = [...mvrvData].sort((a, b) => new Date(a.time) - new Date(b.time));
  const peaks = [];
  const window = 90;
  for (let i = window; i < sortedMvrvData.length - window; i++) {
    const isPeak = sortedMvrvData.slice(i - window, i + window + 1).every(
      (item, idx) => item.value <= sortedMvrvData[i].value || idx === window
    );
    if (isPeak && sortedMvrvData[i].value > 2) {
      peaks.push(sortedMvrvData[i]);
    }
  }
  const decreases = [];
  for (let i = 1; i < peaks.length; i++) {
    const decrease = (peaks[i - 1].value - peaks[i].value) / peaks[i - 1].value;
    decreases.push(decrease);
  }
  const avgDecrease = decreases.length > 0
    ? decreases.reduce((sum, val) => sum + val, 0) / decreases.length
    : 0;
  const latestPeak = peaks.length > 0 ? peaks[peaks.length - 1] : null;
  const projectedPeak = latestPeak
    ? latestPeak.value * (1 - avgDecrease)
    : null;
  return { projectedPeak };
};
// Helper function to calculate Mayer Multiple
const calculateMayerMultiple = (data) => {
  if (!data || data.length < 200) return [];
  const period = 200;
  let mayerMultiples = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    const ma200 = sum / period;
    mayerMultiples.push({
      time: data[i].time,
      value: data[i].value / ma200,
    });
  }
  return mayerMultiples;
};
const MarketHeatIndexChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData, mvrvData, fearAndGreedData, fetchBtcData, fetchMvrvData, fetchFearAndGreedData } = useContext(DataContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [smaPeriod, setSmaPeriod] = useState('28d');
  const [seriesVisibility, setSeriesVisibility] = useState({ marketHeat: true, btcPrice: true });
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const smaPeriods = [
    { value: 'none', label: 'None' },
    { value: '7d', label: '7 Days', days: 7 },
    { value: '28d', label: '28 Days', days: 28 },
    { value: '90d', label: '90 Days', days: 90 },
  ];
  // Define the initial layout with useMemo
  const initialLayout = useMemo(() => ({
    title: isDashboard ? '' : 'Market Heat Index',
    margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: {
      title: !isDashboard && !isMobile ? 'Date' : '',
      autorange: true,
    },
    yaxis: {
      title: 'Market Heat Index',
      range: [0, 100],
      fixedrange: isDashboard,
    },
    yaxis2: {
      title: 'Bitcoin Price (USD)',
      overlaying: 'y',
      side: 'right',
      type: 'log',
      autorange: true,
      fixedrange: isDashboard,
    },
    showlegend: !isDashboard,
    hovermode: 'x unified',
    hoverlabel: {
      font: {
        size: isNarrowScreen ? 8 : 12,
      },
    },
    legend: !isDashboard ? {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    } : {},
    shapes: [
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: 85,
        y1: 85,
        line: {
          color: colors.redAccent[500],
          width: 2,
          dash: 'dash',
        },
      },
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        yref: 'y',
        y0: 30,
        y1: 30,
        line: {
          color: colors.blueAccent[400],
          width: 2,
          dash: 'dash',
        },
      },
    ],
  }), [colors, isDashboard, isMobile, isNarrowScreen]);
  // State to manage the current layout
  const [currentLayout, setCurrentLayout] = useState(initialLayout);
  // Update tooltip size when isNarrowScreen changes
  useEffect(() => {
    setCurrentLayout((prev) => ({
      ...prev,
      hoverlabel: {
        font: {
          size: isNarrowScreen ? 8 : 12,
        },
      },
    }));
  }, [isNarrowScreen]);
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (btcData.length > 0 && mvrvData.length > 0 && fearAndGreedData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchBtcData(),
          fetchMvrvData(),
          fetchFearAndGreedData(),
        ]);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData, fetchMvrvData, fetchFearAndGreedData, btcData.length, mvrvData.length, fearAndGreedData.length]);
  // Calculate Market Heat Index for each day
  const marketHeatData = useMemo(() => {
    if (!btcData.length || !mvrvData.length || !fearAndGreedData.length) return [];
    // Align data to the earliest common date (2018-01-01 for Fear and Greed)
    const startDate = '2018-01-01';
    const alignedData = btcData.filter(item => new Date(item.time) >= new Date(startDate));
    return alignedData.map((btcItem, index) => {
      const date = btcItem.time;
      const mvrvItem = mvrvData.find(m => m.time === date);
      const fearGreedItem = fearAndGreedData.find(f => f.time === date);
      // MVRV Heat
      let mvrvHeat = 0;
      if (mvrvItem) {
        const latestMvrv = Math.max(0, Math.min(10000, mvrvItem.value));
        const historicalMvrv = mvrvData.slice(0, mvrvData.findIndex(m => m.time === date) + 1);
        const { projectedPeak } = calculateMvrvPeakProjection(historicalMvrv);
        if (latestMvrv && projectedPeak) {
          const cappedProjectedPeak = Math.max(0, Math.min(10000, projectedPeak));
          const lower = 1.0;
          const upper = Math.max(cappedProjectedPeak, 3.7);
          if (latestMvrv > lower) {
            mvrvHeat = Math.min(100, ((latestMvrv - lower) / (upper - lower)) * 100);
          }
        }
      }
      // Mayer Heat
      let mayerHeat = 0;
      const mayerMultiples = calculateMayerMultiple(btcData.slice(0, index + 1));
      const latestMayerRaw = mayerMultiples[mayerMultiples.length - 1]?.value;
      const latestMayer = latestMayerRaw ? Math.max(0, Math.min(100, latestMayerRaw)) : 0;
      if (latestMayer) {
        const lower = 0.6;
        const upper = 2.4;
        if (latestMayer > lower) {
          mayerHeat = Math.min(100, ((latestMayer - lower) / (upper - lower)) * 100);
        }
      }
      // Risk Heat
      let riskHeat = 0;
      const riskDataArray = calculateRiskMetric(btcData.slice(0, index + 1));
      if (riskDataArray.length) {
        const calculatedRisk = riskDataArray[riskDataArray.length - 1].Risk;
        riskHeat = Math.min(100, calculatedRisk * 100);
      }
      // Fear and Greed
      const fearGreedValue = fearGreedItem ? Math.max(0, Math.min(100, fearGreedItem.value)) : 0;
      // PiCycle Heat
      let piCycleHeat = 0;
      const ratioData = calculateRatioSeries(btcData.slice(0, index + 1));
      const latestRatioRaw = ratioData[ratioData.length - 1]?.value;
      const latestRatio = latestRatioRaw ? Math.max(0, Math.min(100, latestRatioRaw)) : 0;
      if (latestRatio) {
        const buffer = 0.5;
        const minRatio = 0;
        const heatOffset = 0;
        piCycleHeat = Math.max(0, Math.min(100, (((latestRatio - minRatio) / buffer) * 100) + heatOffset));
      }
      // Weighted Average
      const scores = { mvrv: mvrvHeat, mayer: mayerHeat, risk: riskHeat, fearGreed: fearGreedValue, piCycle: piCycleHeat };
      const weights = { mvrv: 0.2, mayer: 0.2, risk: 0.2, fearGreed: 0.2, piCycle: 0.2 };
      const weightedSum = Object.keys(scores).reduce((sum, key) => sum + (scores[key] || 0) * weights[key], 0);
      const heatValue = Math.max(0, Math.min(100, weightedSum));
      return {
        date: date,
        index: heatValue,
      };
    });
  }, [btcData, mvrvData, fearAndGreedData]);
  // Apply smoothing
  const smoothedData = useMemo(() => {
    const selectedSma = smaPeriods.find(sp => sp.value === smaPeriod);
    const days = selectedSma.days || 0;
    if (smaPeriod === 'none' || days === 0) return marketHeatData;
    const result = [];
    for (let i = 0; i < marketHeatData.length; i++) {
      if (i < days - 1) {
        result.push({ ...marketHeatData[i], index: marketHeatData[i].index });
        continue;
      }
      const window = marketHeatData.slice(i - days + 1, i + 1);
      const sum = window.reduce((acc, item) => acc + item.index, 0);
      const sma = sum / days;
      result.push({ ...marketHeatData[i], index: sma });
    }
    return result;
  }, [marketHeatData, smaPeriod]);
  // Filter Bitcoin data to match Market Heat data range
  const filteredBtcData = useMemo(() => {
    if (!marketHeatData.length) return [];
    const startDate = marketHeatData[0].date;
    return btcData.filter(item => new Date(item.time) >= new Date(startDate)).map(item => ({
      date: item.time,
      price: item.value,
    }));
  }, [btcData, marketHeatData]);
  // Memoized plot data
  const plotData = useMemo(() => {
    return [
      {
        key: 'marketHeat',
        x: smoothedData.map(d => d.date),
        y: smoothedData.map(d => d.index),
        type: 'scatter',
        mode: 'lines',
        name: isMobile ? 'Heat Index' : 'Market Heat Index',
        line: {
          color: colors.greenAccent[400],
          width: 2,
        },
        yaxis: 'y',
        text: smoothedData.map(d => `<b>Heat Index: ${d.index.toFixed(1)}</b> (${new Date(d.date).toLocaleDateString()})`),
        hoverinfo: 'text',
        hovertemplate: '%{text}<extra></extra>',
        visible: seriesVisibility.marketHeat ? true : 'legendonly',
      },
      {
        key: 'btcPrice',
        x: filteredBtcData.map(d => d.date),
        y: filteredBtcData.map(d => d.price),
        type: 'scatter',
        mode: 'lines',
        name: isMobile ? 'BTC' : 'Bitcoin Price',
        line: {
          color: '#808080',
          width: 0.7,
        },
        yaxis: 'y2',
        text: filteredBtcData.map(d => `<b>BTC Price: $${d.price.toFixed(2)}</b> (${new Date(d.date).toLocaleDateString()})`),
        hoverinfo: 'text',
        hovertemplate: '%{text}<extra></extra>',
        visible: seriesVisibility.btcPrice ? true : 'legendonly',
      },
    ];
  }, [smoothedData, filteredBtcData, seriesVisibility, isMobile, colors.greenAccent]);
  // Update series visibility
  useEffect(() => {
    setSeriesVisibility((prev) => ({
      marketHeat: prev.marketHeat !== undefined ? prev.marketHeat : true,
      btcPrice: prev.btcPrice !== undefined ? prev.btcPrice : true,
    }));
  }, []);
  // Handle legend click to toggle series visibility
  const handleLegendClick = useCallback((event) => {
    const seriesKey = event.data[event.curveNumber].key;
    setSeriesVisibility((prev) => ({
      ...prev,
      [seriesKey]: !prev[seriesKey],
    }));
    return false;
  }, []);
  // Handle chart relayout (e.g., zooming)
  const handleRelayout = useCallback((event) => {
    if (event['xaxis.range[0]'] || event['yaxis.range[0]'] || event['yaxis2.range[0]']) {
      setCurrentLayout((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          range: event['xaxis.range[0]'] ? [event['xaxis.range[0]'], event['xaxis.range[1]']] : prev.xaxis.range,
          autorange: event['xaxis.range[0]'] ? false : true,
        },
        yaxis: {
          ...prev.yaxis,
          range: event['yaxis.range[0]'] ? [event['yaxis.range[0]'], event['yaxis.range[1]']] : prev.yaxis.range,
          autorange: event['yaxis.range[0]'] ? false : true,
        },
        yaxis2: {
          ...prev.yaxis2,
          range: event['yaxis2.range[0]'] ? [event['yaxis2.range[0]'], event['yaxis2.range[1]']] : prev.yaxis2.range,
          autorange: event['yaxis2.range[0]'] ? false : true,
        },
      }));
    }
  }, []);
  // Reset chart to initial view
  const resetChartView = useCallback(() => {
    setCurrentLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true, range: undefined },
      yaxis: { ...prev.yaxis, autorange: true, range: undefined },
      yaxis2: { ...prev.yaxis2, autorange: true, range: undefined },
    }));
  }, []);
  // Handle SMA period selection
  const handleSmaPeriodChange = (event) => {
    setSmaPeriod(event.target.value);
  };
  if (error) {
    return (
      <Box sx={{ color: colors.redAccent[400], textAlign: 'center', padding: '20px' }}>
        {error}
      </Box>
    );
  }
  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '10px',
              marginTop: '50px',
            }}
          >
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
              <InputLabel
                id="sma-period-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
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
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                {smaPeriods.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </>
      )}
      <div
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <Plot
          data={plotData}
          layout={currentLayout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onLegendClick={handleLegendClick}
        />
      </div>
      <div className="under-chart">
        {!isDashboard && btcData.length > 0 && <LastUpdated storageKey="btcData" />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current Index: <b>{smoothedData.length > 0 ? smoothedData[smoothedData.length - 1].index.toFixed(1) : 'N/A'}</b>
          </div>
          <p className="chart-info">
            The Market Heat Index combines multiple indicators (MVRV, Mayer Multiple, Risk, Fear and Greed, PiCycle) to assess overall market conditions. A value closer to 100 indicates an overheated market, while a value closer to 0 indicates a cold market. Data starts from January 2018 due to availability of Fear and Greed data. Select different smoothing periods to view historical trends. Bitcoin price is shown for reference on a logarithmic scale.
          </p>
        </div>
      )}
    </div>
  );
};
export default restrictToPaidSubscription(MarketHeatIndexChart);