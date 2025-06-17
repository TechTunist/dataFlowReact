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
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Access DataContext
  const {
    btcData,
    mvrvRiskData,
    puellRiskData,
    minerCapThermoCapRiskData,
    mvrvRiskLastUpdated,
    puellRiskLastUpdated,
    minerCapThermoCapRiskLastUpdated,
    isMvrvRiskDataFetched,
    isPuellRiskDataFetched,
    isMinerCapThermoCapRiskDataFetched,
    fetchRiskMetricsData,
    fetchBtcData,
  } = useContext(DataContext);

  // Metric labels for UI
  const metricLabels = {
    mvrv: 'MVRV Z-Score',
    puell: 'Puell Multiple',
    minerCapThermoCap: 'Miner Cap to Thermo Cap',
  };

  // Map selected metric to last updated time and fetch status
  const lastUpdatedMap = {
    mvrv: mvrvRiskLastUpdated,
    puell: puellRiskLastUpdated,
    minerCapThermoCap: minerCapThermoCapRiskLastUpdated,
  };
  const isFetchedMap = {
    mvrv: isMvrvRiskDataFetched,
    puell: isPuellRiskDataFetched,
    minerCapThermoCap: isMinerCapThermoCapRiskDataFetched,
  };
  const lastUpdatedTime = lastUpdatedMap[selectedMetric];
  const isMetricFetched = isFetchedMap[selectedMetric];

  // Calculate chart data based on selected metric
  const chartData = (() => {
    const metricDataMap = {
      mvrv: mvrvRiskData,
      puell: puellRiskData,
      minerCapThermoCap: minerCapThermoCapRiskData,
    };
    return metricDataMap[selectedMetric] || [];
  })();

  // Format numbers for price scale
  const compactNumberFormatter = value => {
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

  // Fetch data on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchBtcData(), fetchRiskMetricsData()])
      .catch(error => {
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
      color: '#ff0062', // Pink, matching Puell Multiple
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(2) },
    });
    riskSeriesRef.current = riskSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray', // Grey for Bitcoin price, matching Puell Multiple
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

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
      const priceSeriesData = btcData.map(d => ({ time: d.time, value: d.value }));
      priceSeriesRef.current.setData(priceSeriesData);
      if (chartData.length > 0) chartRef.current?.timeScale().fitContent();
    }
  }, [btcData, chartData]);

  // Update risk series data
  useEffect(() => {
    if (riskSeriesRef.current && chartData.length > 0) {
      const riskSeriesData = chartData.map(d => ({ time: d.time, value: d.Risk }));
      riskSeriesRef.current.setData(riskSeriesData);
      if (btcData.length > 0) chartRef.current?.timeScale().fitContent();
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
              onChange={e => setSelectedMetric(e.target.value)}
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
        </div>
      )}
      {dataError && <Typography color="error">{dataError}</Typography>}
      {isLoading && <Typography>Loading...</Typography>}
    </div>
  );
};

export default restrictToPaidSubscription(OnChainHistoricalRisk);