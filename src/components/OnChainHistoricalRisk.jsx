import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
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
  const [tooltipData, setTooltipData] = useState(null);

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

  const metricLabels = {
    mvrv: 'MVRV Z-Score',
    puell: 'Puell Multiple',
    minerCapThermoCap: 'Miner Cap to Thermo Cap',
    fee: 'Fee Risk',
    sopl: 'SOPL Risk',
    average: 'Average Risk', // New metric
  };

  const metricDescriptions = {
    mvrv: 'The MVRV Z-Score measures the market value to realized value ratio, indicating overvaluation (high Z-Score) or undervaluation (low Z-Score) of Bitcoin. A value above 7 suggests a market top, while below -1 indicates a potential bottom.',
    puell: 'The Puell Multiple compares daily issuance value to a 365-day moving average, reflecting miner profitability. High values (>3) suggest a market top, while low values (<0.5) may indicate a bottom.',
    minerCapThermoCap: 'The Miner Cap to Thermo Cap ratio assesses miner revenue relative to market cap. High ratios signal miner selling pressure, while low ratios suggest accumulation.',
    fee: 'Fee Risk tracks transaction fee levels relative to Bitcoin price, indicating network congestion or speculative activity. High values suggest increased risk, while low values indicate reduced demand.',
    sopl: 'The SOPL (Spent Output Profit/Loss) Risk measures the profit or loss of spent outputs. High positive values indicate profit-taking (high risk), while negative values suggest capitulation (low risk).',
    average: 'The Average Risk metric combines MVRV, Puell, Miner Cap to Thermo Cap, Fee, and SOPL risk metrics by averaging their values, providing a composite view of market risk.', // New description
  };

  const lastUpdatedMap = {
    mvrv: mvrvRiskLastUpdated,
    puell: puellRiskLastUpdated,
    minerCapThermoCap: minerCapThermoCapRiskLastUpdated,
    fee: feeRiskLastUpdated,
    sopl: soplRiskLastUpdated,
    average: mvrvRiskLastUpdated,
  };

  const isFetchedMap = {
    mvrv: isMvrvRiskDataFetched,
    puell: isPuellRiskDataFetched,
    minerCapThermoCap: isMinerCapThermoCapRiskDataFetched,
    fee: isFeeRiskDataFetched,
    sopl: isSoplRiskDataFetched,
    average: isMvrvRiskDataFetched && isPuellRiskDataFetched && isMinerCapThermoCapRiskDataFetched && isFeeRiskDataFetched && isSoplRiskDataFetched, // All metrics must be fetched
  };

  const lastUpdatedTime = lastUpdatedMap[selectedMetric];
  const isMetricFetched = isFetchedMap[selectedMetric];

  // Normalize time to 'YYYY-MM-DD'
  const normalizeTime = (time) => new Date(time).toISOString().split('T')[0];

  // Prepare price and risk data with alignment
  const prepareData = useMemo(() => {
    const metricDataMap = {
      mvrv: mvrvRiskData,
      puell: puellRiskData,
      minerCapThermoCap: minerCapThermoCapRiskData,
      fee: feeRiskData,
      sopl: soplRiskData,
      average: [], // Will compute below
    };

    // Normalize and sort price data
    const priceData = btcData
      .map((d) => ({
        time: normalizeTime(d.time),
        value: parseFloat(d.value) || 0,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // Normalize individual risk metrics
    const allRiskData = {
      mvrv: mvrvRiskData.map((d) => ({ time: normalizeTime(d.time), value: parseFloat(d.Risk) || 0 })),
      puell: puellRiskData.map((d) => ({ time: normalizeTime(d.time), value: parseFloat(d.Risk) || 0 })),
      minerCapThermoCap: minerCapThermoCapRiskData.map((d) => ({ time: normalizeTime(d.time), value: parseFloat(d.Risk) || 0 })),
      fee: feeRiskData.map((d) => ({ time: normalizeTime(d.time), value: parseFloat(d.Risk) || 0 })),
      sopl: soplRiskData.map((d) => ({ time: normalizeTime(d.time), value: parseFloat(d.Risk) || 0 })),
    };

    let riskData;
    if (selectedMetric === 'average') {
      // Collect all unique timestamps
      const allTimes = new Set();
      Object.values(allRiskData).forEach((data) => data.forEach((d) => allTimes.add(d.time)));
      const sortedTimes = Array.from(allTimes).sort((a, b) => a.localeCompare(b));

      // Calculate average risk for each timestamp
      riskData = sortedTimes.map((time) => {
        const values = Object.values(allRiskData)
          .map((data) => {
            const point = data.find((d) => d.time === time);
            return point ? point.value : null;
          })
          .filter((value) => value !== null);

        const avgValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null;
        return { time, value: avgValue !== null ? parseFloat(avgValue.toFixed(2)) : null };
      }).filter((d) => d.value !== null);
    } else {
      riskData = (metricDataMap[selectedMetric] || [])
        .map((d) => ({
          time: normalizeTime(d.time),
          value: parseFloat(d.Risk) || 0,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    // Align priceData to riskData timestamps
    const riskTimes = new Set(riskData.map((d) => d.time));
    const alignedPriceData = priceData.filter((d) => riskTimes.has(d.time));

    return { priceData: alignedPriceData, riskData };
  }, [btcData, mvrvRiskData, puellRiskData, minerCapThermoCapRiskData, feeRiskData, soplRiskData, selectedMetric]);

  // Calculate smoothed risk data
  const chartData = useMemo(() => {
    const { riskData } = prepareData;
    if (selectedSmoothing === 'none') {
      return riskData.map((d) => ({ time: d.time, value: parseFloat(d.value.toFixed(2)) }));
    }

    const windowSize = selectedSmoothing === '7day' ? 7 : 28;
    const smoothedData = [];

    for (let i = 0; i < riskData.length; i++) {
      const startIndex = Math.max(0, i - windowSize + 1);
      const window = riskData.slice(startIndex, i + 1).filter((d) => d.value !== null);
      const smoothedValue = window.length > 0
        ? window.reduce((sum, d) => sum + d.value, 0) / window.length
        : null;
      smoothedData.push({
        time: riskData[i].time,
        value: smoothedValue !== null ? parseFloat(smoothedValue.toFixed(2)) : null,
      });
    }

    return smoothedData.filter((d) => d.value !== null);
  }, [prepareData, selectedSmoothing]);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

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
        mode: 1,
      },
      timeScale: { minBarSpacing: 0.001 },
      crosshair: { mode: 0 },
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
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);
    resizeChart();

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && prepareData.priceData.length > 0) {
      priceSeriesRef.current.setData(prepareData.priceData);
      if (chartData.length > 0) chartRef.current?.timeScale().fitContent();
    }
  }, [prepareData.priceData, chartData]);

  // Update risk series data
  useEffect(() => {
    if (riskSeriesRef.current && chartData.length > 0) {
      const riskSeriesData = chartData.map((d) => ({ time: d.time, value: d.value }));
      riskSeriesRef.current.setData(riskSeriesData);
    }
  }, [chartData]);

  // Update interactivity and price scale title
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        rightPriceScale: {
          title: `${metricLabels[selectedMetric]}${selectedSmoothing !== 'none' ? ` (${selectedSmoothing} SMA)` : ''}`,
        },
      });
    }
  }, [isInteractive, selectedMetric, selectedSmoothing]);

  // Update current price and risk level
  useEffect(() => {
    if (prepareData.priceData.length > 0) {
      const latestPrice = prepareData.priceData[prepareData.priceData.length - 1];
      setCurrentBtcPrice(Math.floor(latestPrice.value / 1000));
    }
    if (chartData.length > 0) {
      const latestRisk = chartData[chartData.length - 1];
      setCurrentRiskLevel(latestRisk.value.toFixed(2));
    }
  }, [prepareData.priceData, chartData]);

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
            {tooltipData.risk && (
              <div style={{ color: '#ff0062', fontSize: '20px' }}>
                {metricLabels[selectedMetric]}: {tooltipData.risk.toFixed(2)}
              </div>
            )}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>
      {!isDashboard && (
        <div className="under-chart">
          <LastUpdated customDate={lastUpdatedTime} />
        </div>
      )}
      {!isDashboard && (
        <div style={{ paddingBottom: '20px' }}>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {metricLabels[selectedMetric]}: <b>{currentRiskLevel}</b> (${currentBtcPrice}k)
          </div>
          <p
            className="chart-info"
            style={{
              marginTop: '20px',
              paddingBottom: '20px',
              fontSize: '1.2rem',
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



























// import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
// import { createChart } from 'lightweight-charts';
// import { tokens } from '../theme';
// import { useTheme, Select, MenuItem, FormControl, InputLabel, Box, Typography, Slider, Collapse, Button } from '@mui/material';
// import '../styling/bitcoinChart.css';
// import useIsMobile from '../hooks/useIsMobile';
// import LastUpdated from '../hooks/LastUpdated';
// import { DataContext } from '../DataContext';
// import restrictToPaidSubscription from '../scenes/RestrictToPaid';

// const OnChainHistoricalRisk = ({ isDashboard = false }) => {
//   const chartContainerRef = useRef();
//   const chartRef = useRef(null);
//   const riskSeriesRef = useRef(null);
//   const priceSeriesRef = useRef(null);
//   const theme = useTheme();
//   const colors = tokens(theme.palette.mode);
//   const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
//   const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
//   const [isInteractive, setIsInteractive] = useState(false);
//   const isMobile = useIsMobile();
//   const [selectedMetric, setSelectedMetric] = useState('mvrv');
//   const [selectedSmoothing, setSelectedSmoothing] = useState('none');
//   const [dataError, setDataError] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [tooltipData, setTooltipData] = useState(null);
//   const [showWeightControls, setShowWeightControls] = useState(false);
//   const [weights, setWeights] = useState({
//     mvrv: 0.2,
//     puell: 0.2,
//     minerCapThermoCap: 0.2,
//     fee: 0.2,
//     sopl: 0.2,
//   });

//   const {
//     btcData,
//     mvrvRiskData,
//     puellRiskData,
//     minerCapThermoCapRiskData,
//     feeRiskData,
//     soplRiskData,
//     mvrvRiskLastUpdated,
//     puellRiskLastUpdated,
//     minerCapThermoCapRiskLastUpdated,
//     feeRiskLastUpdated,
//     soplRiskLastUpdated,
//     isMvrvRiskDataFetched,
//     isPuellRiskDataFetched,
//     isMinerCapThermoCapRiskDataFetched,
//     isFeeRiskDataFetched,
//     isSoplRiskDataFetched,
//     fetchRiskMetricsData,
//     fetchBtcData,
//   } = useContext(DataContext);

//   const metricLabels = {
//     mvrv: 'MVRV Z-Score',
//     puell: 'Puell Multiple',
//     minerCapThermoCap: 'Miner Cap to Thermo Cap',
//     fee: 'Fee Risk',
//     sopl: 'SOPL Risk',
//     // weightedAvg: 'Weighted Average Risk', // Disabled until stabilized
//   };

//   const metricDescriptions = {
//     mvrv: 'The MVRV Z-Score measures the market value to realized value ratio, indicating overvaluation (high Z-Score) or undervaluation (low Z-Score) of Bitcoin. A value above 7 suggests a market top, while below -1 indicates a potential bottom.',
//     puell: 'The Puell Multiple compares daily issuance value to a 365-day moving average, reflecting miner profitability. High values (>3) suggest a market top, while low values (<0.5) may indicate a bottom.',
//     minerCapThermoCap: 'The Miner Cap to Thermo Cap ratio assesses miner revenue relative to market cap. High ratios signal miner selling pressure, while low ratios suggest accumulation.',
//     fee: 'Fee Risk tracks transaction fee levels relative to Bitcoin price, indicating network congestion or speculative activity. High values suggest increased risk, while low values indicate reduced demand.',
//     sopl: 'The SOPL (Spent Output Profit/Loss) Risk measures the profit or loss of spent outputs. High positive values indicate profit-taking (high risk), while negative values suggest capitulation (low risk).',
//     weightedAvg: 'The Weighted Average Risk combines multiple risk metrics based on user-defined weights, providing a composite view of market risk.',
//   };

//   const lastUpdatedMap = {
//     mvrv: mvrvRiskLastUpdated,
//     puell: puellRiskLastUpdated,
//     minerCapThermoCap: minerCapThermoCapRiskLastUpdated,
//     fee: feeRiskLastUpdated,
//     sopl: soplRiskLastUpdated,
//   };

//   const isFetchedMap = {
//     mvrv: isMvrvRiskDataFetched,
//     puell: isPuellRiskDataFetched,
//     minerCapThermoCap: isMinerCapThermoCapRiskDataFetched,
//     fee: isFeeRiskDataFetched,
//     sopl: isSoplRiskDataFetched,
//   };

//   const lastUpdatedTime = lastUpdatedMap[selectedMetric];
//   const isMetricFetched = isFetchedMap[selectedMetric];

//   // Normalize time to 'YYYY-MM-DD'
//   const normalizeTime = useCallback((time) => new Date(time).toISOString().split('T')[0], []);

//   // Prepare price and risk data with alignment
//   const prepareData = useMemo(() => {
//     if (!isMetricFetched || !btcData.length) {
//       console.log('Data not ready:', { isMetricFetched, btcDataLength: btcData.length });
//       return { priceData: [], riskData: [] };
//     }

//     const metricDataMap = {
//       mvrv: mvrvRiskData,
//       puell: puellRiskData,
//       minerCapThermoCap: minerCapThermoCapRiskData,
//       fee: feeRiskData,
//       sopl: soplRiskData,
//     };
//     const rawRiskData = metricDataMap[selectedMetric] || [];

//     // Normalize and sort price and risk data
//     const priceData = btcData
//       .map((d) => ({
//         time: normalizeTime(d.time),
//         value: parseFloat(d.value) || 0,
//       }))
//       .sort((a, b) => a.time.localeCompare(b.time));

//     let riskData = rawRiskData
//       .map((d) => ({
//         time: normalizeTime(d.time),
//         value: parseFloat(d.Risk) || 0,
//       }))
//       .sort((a, b) => a.time.localeCompare(b.time));

//     // Align priceData to riskData timestamps
//     const riskTimes = new Set(riskData.map((d) => d.time));
//     const alignedPriceData = priceData.filter((d) => riskTimes.has(d.time));

//     console.log('Prepared Data:', {
//       priceDataLength: alignedPriceData.length,
//       riskDataLength: riskData.length,
//     });

//     return { priceData: alignedPriceData, riskData };
//   }, [
//     btcData,
//     mvrvRiskData,
//     puellRiskData,
//     minerCapThermoCapRiskData,
//     feeRiskData,
//     soplRiskData,
//     selectedMetric,
//     isMetricFetched,
//     normalizeTime,
//   ]);

//   // Calculate smoothed risk data
//   const chartData = useMemo(() => {
//     const { riskData } = prepareData;
//     if (selectedSmoothing === 'none') {
//       return riskData.map((d) => ({ time: d.time, value: parseFloat(d.value.toFixed(2)) }));
//     }

//     const windowSize = selectedSmoothing === '7day' ? 7 : 28;
//     const smoothedData = [];

//     for (let i = 0; i < riskData.length; i++) {
//       const startIndex = Math.max(0, i - windowSize + 1);
//       const window = riskData.slice(startIndex, i + 1).filter((d) => d.value !== null);
//       const smoothedValue = window.length > 0
//         ? window.reduce((sum, d) => sum + d.value, 0) / window.length
//         : null;
//       smoothedData.push({
//         time: riskData[i].time,
//         value: smoothedValue !== null ? parseFloat(smoothedValue.toFixed(2)) : null,
//       });
//     }

//     const filteredData = smoothedData.filter((d) => d.value !== null);
//     console.log('Chart Data Length:', filteredData.length);
//     return filteredData;
//   }, [prepareData, selectedSmoothing]);

//   const compactNumberFormatter = (value) => {
//     if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
//     if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
//     return value.toFixed(0);
//   };

//   const setInteractivity = () => setIsInteractive(!isInteractive);

//   const resetChartView = () => {
//     if (chartRef.current) chartRef.current.timeScale().fitContent();
//   };

//   const calculateLeftPosition = () => {
//     if (!tooltipData || !chartContainerRef.current) return '0px';
//     const chartWidth = chartContainerRef.current.clientWidth;
//     const tooltipWidth = 200;
//     const offset = 10;
//     const cursorX = tooltipData.x;
//     if (cursorX + offset + tooltipWidth <= chartWidth) {
//       return `${cursorX + offset}px`;
//     } else if (cursorX - offset - tooltipWidth >= 0) {
//       return `${cursorX - offset - tooltipWidth}px`;
//     } else {
//       return `${Math.max(0, Math.min(cursorX, chartWidth - tooltipWidth))}px`;
//     }
//   };

//   // Handle weight changes and normalize to sum to 1
//   const handleWeightChange = (metric) => (event, newValue) => {
//     setWeights((prev) => {
//       const newWeights = { ...prev, [metric]: newValue / 100 };
//       const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
//       if (total > 0) {
//         Object.keys(newWeights).forEach((key) => {
//           newWeights[key] = parseFloat((newWeights[key] / total).toFixed(2));
//         });
//       }
//       return newWeights;
//     });
//   };

//   // Fetch data on mount
//   useEffect(() => {
//     setIsLoading(true);
//     Promise.all([fetchBtcData(), fetchRiskMetricsData()])
//       .then(([btc, riskMetrics]) => {
//         console.log('Fetched data:', {
//           btcDataLength: btcData.length,
//           mvrvRiskDataLength: mvrvRiskData.length,
//           puellRiskDataLength: puellRiskData.length,
//           minerCapThermoCapRiskDataLength: minerCapThermoCapRiskData.length,
//           feeRiskDataLength: feeRiskData.length,
//           soplRiskDataLength: soplRiskData.length,
//         });
//       })
//       .catch((error) => {
//         console.error('Failed to fetch data:', error);
//         setDataError('Failed to load data');
//       })
//       .finally(() => setIsLoading(false));
//   }, [fetchBtcData, fetchRiskMetricsData, btcData, mvrvRiskData, puellRiskData, minerCapThermoCapRiskData, feeRiskData, soplRiskData]);

//   // Initialize chart once
//   useEffect(() => {
//     if (chartRef.current) return; // Prevent reinitialization

//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       layout: {
//         background: { type: 'solid', color: colors.primary[700] },
//         textColor: colors.primary[100],
//       },
//       grid: {
//         vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
//         horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
//       },
//       rightPriceScale: {
//         scaleMargins: { top: 0.01, bottom: 0.01 },
//         borderVisible: false,
//         mode: 0,
//       },
//       leftPriceScale: {
//         visible: true,
//         borderColor: 'rgba(197, 203, 206, 1)',
//         scaleMargins: { top: 0.1, bottom: 0.1 },
//         mode: 1,
//       },
//       timeScale: { minBarSpacing: 0.001 },
//       crosshair: { mode: 0 },
//     });

//     const riskSeries = chart.addLineSeries({
//       color: '#ff0062',
//       lastValueVisible: true,
//       priceScaleId: 'right',
//       lineWidth: 2,
//       priceFormat: { type: 'custom', formatter: (value) => value.toFixed(2) },
//     });
//     riskSeriesRef.current = riskSeries;

//     const priceSeries = chart.addLineSeries({
//       color: 'gray',
//       priceScaleId: 'left',
//       lineWidth: 0.7,
//       priceFormat: { type: 'custom', formatter: compactNumberFormatter },
//     });
//     priceSeriesRef.current = priceSeries;

//     chart.subscribeCrosshairMove((param) => {
//       if (
//         !param.point ||
//         !param.time ||
//         param.point.x < 0 ||
//         param.point.x > chartContainerRef.current.clientWidth ||
//         param.point.y < 0 ||
//         param.point.y > chartContainerRef.current.clientHeight
//       ) {
//         setTooltipData(null);
//         return;
//       }

//       const priceData = param.seriesData.get(priceSeriesRef.current);
//       const riskData = param.seriesData.get(riskSeriesRef.current);

//       if (!priceData && !riskData) {
//         setTooltipData(null);
//         return;
//       }

//       setTooltipData({
//         date: param.time,
//         price: priceData?.value,
//         risk: riskData?.value,
//         x: param.point.x,
//         y: param.point.y,
//       });
//     });

//     chart.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });

//     const resizeChart = () => {
//       chart.applyOptions({
//         width: chartContainerRef.current.clientWidth,
//         height: chartContainerRef.current.clientHeight,
//       });
//       chart.timeScale().fitContent();
//     };
//     window.addEventListener('resize', resizeChart);
//     resizeChart();

//     chartRef.current = chart;

//     return () => {
//       chart.remove();
//       window.removeEventListener('resize', resizeChart);
//     };
//   }, []);

//   // Update colors when theme changes
//   useEffect(() => {
//     if (chartRef.current) {
//       chartRef.current.applyOptions({
//         layout: {
//           background: { type: 'solid', color: colors.primary[700] },
//           textColor: colors.primary[100],
//         },
//         grid: {
//           vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
//           horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
//         },
//       });
//     }
//   }, [colors]);

//   // Update price series data
//   useEffect(() => {
//     if (priceSeriesRef.current && prepareData.priceData.length > 0) {
//       priceSeriesRef.current.setData(prepareData.priceData);
//       if (chartData.length > 0) chartRef.current?.timeScale().fitContent();
//     }
//   }, [prepareData.priceData, chartData]);

//   // Update risk series data
//   useEffect(() => {
//     if (riskSeriesRef.current && chartData.length > 0) {
//       const riskSeriesData = chartData.map((d) => ({ time: d.time, value: d.value }));
//       riskSeriesRef.current.setData(riskSeriesData);
//     }
//   }, [chartData]);

//   // Update interactivity and price scale title
//   useEffect(() => {
//     if (chartRef.current) {
//       chartRef.current.applyOptions({
//         handleScroll: isInteractive,
//         handleScale: isInteractive,
//         rightPriceScale: {
//           title: `${metricLabels[selectedMetric]}${selectedSmoothing !== 'none' ? ` (${selectedSmoothing} SMA)` : ''}`,
//         },
//       });
//     }
//   }, [isInteractive, selectedMetric, selectedSmoothing]);

//   // Update current price and risk level
//   useEffect(() => {
//     if (prepareData.priceData.length > 0) {
//       const latestPrice = prepareData.priceData[prepareData.priceData.length - 1];
//       setCurrentBtcPrice(Math.floor(latestPrice.value / 1000));
//     }
//     if (chartData.length > 0) {
//       const latestRisk = chartData[chartData.length - 1];
//       setCurrentRiskLevel(latestRisk.value.toFixed(2));
//     }
//   }, [prepareData.priceData, chartData]);

//   return (
//     <div style={{ height: '100%' }}>
//       {!isDashboard && (
//         <Box
//           sx={{
//             display: 'flex',
//             flexDirection: { xs: 'column', sm: 'row' },
//             alignItems: 'center',
//             justifyContent: 'center',
//             gap: '20px',
//             marginBottom: '20px',
//             marginTop: '50px',
//           }}
//         >
//           <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
//             <InputLabel
//               id="metric-label"
//               shrink
//               sx={{
//                 color: colors.grey[100],
//                 '&.Mui-focused': { color: colors.greenAccent[500] },
//                 top: 0,
//                 '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
//               }}
//             >
//               Risk Metric
//             </InputLabel>
//             <Select
//               value={selectedMetric}
//               onChange={(e) => setSelectedMetric(e.target.value)}
//               label="Risk Metric"
//               labelId="metric-label"
//               sx={{
//                 color: colors.grey[100],
//                 backgroundColor: colors.primary[500],
//                 borderRadius: '8px',
//                 '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
//                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '& .MuiSelect-select': { py: 1.5, pl: 2 },
//               }}
//             >
//               {Object.entries(metricLabels).map(([key, label]) => (
//                 <MenuItem key={key} value={key}>{label}</MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//           <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
//             <InputLabel
//               id="smoothing-label"
//               shrink
//               sx={{
//                 color: colors.grey[100],
//                 '&.Mui-focused': { color: colors.greenAccent[500] },
//                 top: 0,
//                 '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
//               }}
//             >
//               Smoothing
//             </InputLabel>
//             <Select
//               value={selectedSmoothing}
//               onChange={(e) => setSelectedSmoothing(e.target.value)}
//               label="Smoothing"
//               labelId="smoothing-label"
//               sx={{
//                 color: colors.grey[100],
//                 backgroundColor: colors.primary[500],
//                 borderRadius: '8px',
//                 '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
//                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '& .MuiSelect-select': { py: 1.5, pl: 2 },
//               }}
//             >
//               <MenuItem value="none">None</MenuItem>
//               <MenuItem value="7day">7-Day</MenuItem>
//               <MenuItem value="28day">28-Day</MenuItem>
//             </Select>
//           </FormControl>
//           <Button
//             onClick={() => setShowWeightControls(!showWeightControls)}
//             sx={{
//               backgroundColor: showWeightControls ? colors.greenAccent[500] : colors.primary[500],
//               color: showWeightControls ? colors.primary[900] : colors.grey[100],
//               borderRadius: '8px',
//               padding: '10px 20px',
//               textTransform: 'none',
//               '&:hover': { backgroundColor: colors.greenAccent[400] },
//             }}
//           >
//             {showWeightControls ? 'Hide Weights' : 'Adjust Weights'}
//           </Button>
//         </Box>
//       )}
//       {!isDashboard && (
//         <Collapse in={showWeightControls}>
//           <Box
//             sx={{
//               backgroundColor: colors.primary[600],
//               borderRadius: '8px',
//               padding: '15px',
//               marginBottom: '20px',
//               display: 'flex',
//               flexDirection: { xs: 'column', sm: 'row' },
//               gap: '20px',
//               justifyContent: 'center',
//             }}
//           >
//             {Object.keys(weights).map((metric) => (
//               <Box key={metric} sx={{ width: { xs: '100%', sm: '180px' } }}>
//                 <Typography sx={{ color: colors.grey[100], marginBottom: '5px' }}>
//                   {metricLabels[metric]}: {(weights[metric] * 100).toFixed(0)}%
//                 </Typography>
//                 <Slider
//                   value={weights[metric] * 100}
//                   onChange={handleWeightChange(metric)}
//                   min={0}
//                   max={100}
//                   step={1}
//                   sx={{
//                     color: colors.greenAccent[500],
//                     '& .MuiSlider-thumb': {
//                       backgroundColor: colors.grey[100],
//                       '&:hover, &.Mui-focusVisible': { boxShadow: `0px 0px 0px 8px ${colors.greenAccent[700]}33` },
//                     },
//                     '& .MuiSlider-rail': { backgroundColor: colors.grey[700] },
//                   }}
//                 />
//               </Box>
//             ))}
//           </Box>
//         </Collapse>
//       )}
//       {!isDashboard && (
//         <div className="chart-top-div">
//           <div className="span-container">
//             <span style={{ marginRight: '20px', display: 'inline-block' }}>
//               <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
//               Bitcoin Price
//             </span>
//             <span style={{ display: 'inline-block' }}>
//               <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
//               {metricLabels[selectedMetric]}
//             </span>
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//             <button
//               onClick={setInteractivity}
//               className="button-reset"
//               style={{
//                 backgroundColor: isInteractive ? '#4cceac' : 'transparent',
//                 color: isInteractive ? 'black' : '#31d6aa',
//                 borderColor: isInteractive ? 'violet' : '#70d8bd',
//               }}
//             >
//               {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
//             </button>
//             <button onClick={resetChartView} className="button-reset extra-margin">
//               Reset Chart
//             </button>
//           </div>
//         </div>
//       )}
//       <div
//         className="chart-container"
//         style={{
//           position: 'relative',
//           height: isDashboard ? '100%' : 'calc(100% - 100px)',
//           width: '100%',
//           border: '2px solid #a9a9a9',
//         }}
//         onDoubleClick={() => {
//           if (!isInteractive && !isDashboard) setInteractivity(true);
//           else setInteractivity(false);
//         }}
//       >
//         <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
//         {tooltipData && (
//           <div
//             className="tooltip"
//             style={{
//               position: 'absolute',
//               left: calculateLeftPosition(),
//               top: `${tooltipData.y + 10}px`,
//               zIndex: 1000,
//               backgroundColor: colors.primary[900],
//               padding: '5px 10px',
//               borderRadius: '4px',
//               color: colors.grey[100],
//               fontSize: '12px',
//               pointerEvents: 'none',
//             }}
//           >
//             <div style={{ fontSize: '15px' }}>Bitcoin</div>
//             {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
//             {tooltipData.risk && (
//               <div style={{ color: '#ff0062', fontSize: '20px' }}>
//                 {metricLabels[selectedMetric]}: {tooltipData.risk.toFixed(2)}
//               </div>
//             )}
//             {tooltipData.date && <div>{tooltipData.date}</div>}
//           </div>
//         )}
//       </div>
//       {!isDashboard && (
//         <div className="under-chart">
//           <LastUpdated storageKey="btcData" />
//         </div>
//       )}
//       {!isDashboard && (
//         <div style={{ paddingBottom: '20px' }}>
//           <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
//             Current {metricLabels[selectedMetric]}: <b>{currentRiskLevel || 'N/A'}</b> (${currentBtcPrice}k)
//           </div>
//           <p
//             className="chart-info"
//             style={{
//               marginTop: '20px',
//               paddingBottom: '20px',
//               fontSize: '1.2rem',
//               color: colors.primary[100],
//               maxWidth: '800px',
//             }}
//           >
//             {metricDescriptions[selectedMetric]}
//           </p>
//         </div>
//       )}
//       {dataError && <Typography color="error">{dataError}</Typography>}
//       {isLoading && <Typography>Loading...</Typography>}
//     </div>
//   );
// };

// export default restrictToPaidSubscription(OnChainHistoricalRisk);