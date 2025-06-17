// src/components/OnChainHistoricalRisk.js
import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Select, MenuItem, FormControl, InputLabel, Box, Typography } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const OnChainHistoricalRisk = ({ isDashboard = false }) => {
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
  const [selectedSmoothing, setSelectedSmoothing] = useState('none');
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltipData, setTooltipData] = useState(null); // New state for tooltip

  // Access DataContext
  const {
    btcData,
    mvrvRiskData,
    puellRiskData,
    minerCapThermoCapRiskData,
    feeRiskData,
    soplRiskData,
    mvrvRiskLastUpdated,
    puellRiskLastUpdated,
    minerCapThermoCapRiskLastUpdated,
    feeRiskLastUpdated,
    soplRiskLastUpdated,
    isMvrvRiskDataFetched,
    isPuellRiskDataFetched,
    isMinerCapThermoCapRiskDataFetched,
    isFeeRiskDataFetched,
    isSoplRiskDataFetched,
    fetchRiskMetricsData,
    fetchBtcData,
  } = useContext(DataContext);

  // Metric labels and descriptions for UI
  const metricLabels = {
    mvrv: 'MVRV Z-Score',
    puell: 'Puell Multiple',
    minerCapThermoCap: 'Miner Cap to Thermo Cap',
    fee: 'Fee Risk',
    sopl: 'SOPL Risk',
  };

  const metricDescriptions = {
    mvrv: 'The MVRV Z-Score measures the market value to realized value ratio, indicating overvaluation (high Z-Score) or undervaluation (low Z-Score) of Bitcoin. A value above 7 suggests a market top, while below -1 indicates a potential bottom.',
    puell: 'The Puell Multiple compares daily issuance value to a 365-day moving average, reflecting miner profitability. High values (>3) suggest a market top, while low values (<0.5) may indicate a bottom.',
    minerCapThermoCap: 'The Miner Cap to Thermo Cap ratio assesses miner revenue relative to market cap. High ratios signal miner selling pressure, while low ratios suggest accumulation.',
    fee: 'Fee Risk tracks transaction fee levels relative to Bitcoin price, indicating network congestion or speculative activity. High values suggest increased risk, while low values indicate reduced demand.',
    sopl: 'The SOPL (Spent Output Profit/Loss) Risk measures the profit or loss of spent outputs. High positive values indicate profit-taking (high risk), while negative values suggest capitulation (low risk).',
  };

  // Map selected metric to last updated time and fetch status
  const lastUpdatedMap = {
    mvrv: mvrvRiskLastUpdated,
    puell: puellRiskLastUpdated,
    minerCapThermoCap: minerCapThermoCapRiskLastUpdated,
    fee: feeRiskLastUpdated,
    sopl: soplRiskLastUpdated,
  };
  const isFetchedMap = {
    mvrv: isMvrvRiskDataFetched,
    puell: isPuellRiskDataFetched,
    minerCapThermoCap: isMinerCapThermoCapRiskDataFetched,
    fee: isFeeRiskDataFetched,
    sopl: isSoplRiskDataFetched,
  };
  const lastUpdatedTime = lastUpdatedMap[selectedMetric];
  const isMetricFetched = isFetchedMap[selectedMetric];

  // Calculate chart data with optional smoothing
  const chartData = (() => {
    const metricDataMap = {
      mvrv: mvrvRiskData,
      puell: puellRiskData,
      minerCapThermoCap: minerCapThermoCapRiskData,
      fee: feeRiskData,
      sopl: soplRiskData,
    };
    let rawData = metricDataMap[selectedMetric] || [];

    // Apply moving average based on selected smoothing
    if (selectedSmoothing !== 'none' && rawData.length > 0) {
      const windowSize = selectedSmoothing === '7day' ? 7 : 28;
      const smoothedData = [];
      let window = [];

      rawData.forEach((item, index) => {
        window.push(item.Risk);
        if (index >= windowSize - 1 && window.length === windowSize) {
          const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
          smoothedData.push({ time: item.time, Risk: avg });
          window.shift(); // Remove the oldest value
        } else if (index < windowSize - 1) {
          // For initial points, use available data
          if (index === rawData.length - 1) {
            const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
            smoothedData.push({ time: item.time, Risk: avg });
          }
        }
      });

      // Handle remaining data if less than window size at the end
      if (window.length > 0 && rawData.length > smoothedData.length) {
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        const lastTime = rawData[rawData.length - 1].time;
        if (!smoothedData.some(d => d.time === lastTime)) {
          smoothedData.push({ time: lastTime, Risk: avg });
        }
      }

      // Sort and remove duplicates by time
      return smoothedData
        .sort((a, b) => new Date(a.time) - new Date(b.time))
        .filter((item, index, self) => index === 0 || item.time !== self[index - 1].time);
    }

    return rawData;
  })();

  // Format numbers for price scale
  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  // Toggle interactivity
  const setInteractivity = () => setIsInteractive(!isInteractive);

  // Reset chart view
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Calculate left position for tooltip
  const calculateLeftPosition = () => {
    if (!tooltipData || !chartContainerRef.current) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 200;
    const offset = 10;
    const cursorX = tooltipData.x;

    if (cursorX + offset + tooltipWidth <= chartWidth) {
      return `${cursorX + offset}px`;
    } else if (cursorX - offset - tooltipWidth >= 0) {
      return `${cursorX - offset - tooltipWidth}px`;
    } else {
      return `${Math.max(0, Math.min(cursorX, chartWidth - tooltipWidth))}px`;
    }
  };

  // Fetch data on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchBtcData(), fetchRiskMetricsData()])
      .catch((error) => {
        console.error('Failed to fetch data:', error);
        setDataError('Failed to load data');
      })
      .finally(() => setIsLoading(false));
  }, [fetchBtcData, fetchRiskMetricsData]);

  // Initialize chart once
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.01, bottom: 0.01 },
        borderVisible: false,
        mode: 0,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for price
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const riskSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (value) => value.toFixed(2) },
    });
    riskSeriesRef.current = riskSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

    // Subscribe to crosshair move for tooltip
    chart.subscribeCrosshairMove((param) => {
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
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const riskData = param.seriesData.get(riskSeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          risk: riskData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    chart.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    };
    window.addEventListener('resize', resizeChart);
    resizeChart();
    chart.timeScale().fitContent();

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Empty dependency array for single initialization

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && btcData.length > 0) {
      const priceSeriesData = btcData.map((d) => ({ time: d.time, value: d.value }));
      priceSeriesRef.current.setData(priceSeriesData);
      if (chartData.length > 0) chartRef.current?.timeScale().fitContent();
    }
  }, [btcData, chartData]);

  // Update risk series data
  useEffect(() => {
    if (riskSeriesRef.current && chartData.length > 0) {
      const riskSeriesData = chartData.map((d) => ({ time: d.time, value: d.Risk }));
      console.log('Risk Series Data:', riskSeriesData); // Debug log
      riskSeriesRef.current.setData(riskSeriesData);
    }
  }, [chartData, btcData]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  // Update current price and risk level
  useEffect(() => {
    if (btcData.length > 0) {
      const latestBtc = btcData[btcData.length - 1];
      setCurrentBtcPrice(Math.floor(latestBtc.value / 1000));
    }
    if (chartData.length > 0) {
      const latestRisk = chartData[chartData.length - 1];
      setCurrentRiskLevel(latestRisk.Risk.toFixed(2));
    }
  }, [btcData, chartData]);

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
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="metric-label"
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
              onChange={(e) => setSelectedMetric(e.target.value)}
              label="Risk Metric"
              labelId="metric-label"
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
              {Object.entries(metricLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
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
              Smoothing
            </InputLabel>
            <Select
              value={selectedSmoothing}
              onChange={(e) => setSelectedSmoothing(e.target.value)}
              label="Smoothing"
              labelId="smoothing-label"
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
              <MenuItem value="7day">7-Day</MenuItem>
              <MenuItem value="28day">28-Day</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className="chart-top-div">
          <div className="span-container">
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {metricLabels[selectedMetric]} 
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 100px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={() => {
          if (!isInteractive && !isDashboard) setInteractivity(true);
          else setInteractivity(false);
        }}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {tooltipData && (
          <div
            className="tooltip"
            style={{
              position: 'absolute',
              left: calculateLeftPosition(),
              top: `${tooltipData.y + 10}px`,
              zIndex: 1000,
              backgroundColor: colors.primary[900],
              padding: '5px 10px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: '12px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '15px' }}>Bitcoin</div>
            {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
            {tooltipData.risk && <div style={{ color: '#ff0062', fontSize: '20px' }}>Risk: {tooltipData.risk.toFixed(2)}</div>}
            {tooltipData.date && <div>{tooltipData.date ? tooltipData.date.split('-').reverse().join('-') : ''}</div>}
          </div>
        )}
      </div>
      {!isDashboard && (
        <div className="under-chart">
          <LastUpdated storageKey="btcData" />
        </div>
      )}
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {metricLabels[selectedMetric]}: <b>{currentRiskLevel}</b> (${currentBtcPrice}k)
          </div>
          <p
            className="chart-info"
            style={{
              marginTop: '20px',
              fontSize: '1.1rem',
              color: colors.primary[100],
              maxWidth: '800px',
            }}
          >
            {metricDescriptions[selectedMetric]}
          </p>
        </div>
      )}
      {dataError && <Typography color="error">{dataError}</Typography>}
      {isLoading && <Typography>Loading...</Typography>}
    </div>
  );
};

export default restrictToPaidSubscription(OnChainHistoricalRisk);