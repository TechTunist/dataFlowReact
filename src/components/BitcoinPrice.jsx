import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme, Button, Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const PuellMultiple = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const puellSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const normalizedPuellSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { btcData, onchainMetricsData, fetchBtcData, fetchOnchainMetricsData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [showNormalizedPuell, setShowNormalizedPuell] = useState(false);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentPuellMultiple, setCurrentPuellMultiple] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [smoothingPeriod, setSmoothingPeriod] = useState(7); // Default to 7-day smoothing
  const [lastUpdatedDate, setLastUpdatedDate] = useState(null);

  // Smoothing period options
  const smoothingOptions = [
    { value: 7, label: '7 Days' },
    { value: 28, label: '28 Days' },
    { value: 90, label: '90 Days' },
    { value: 180, label: '180 Days' },
    { value: 365, label: '1 Year' },
  ];

  // Halving schedule (blocks and dates for reference; rewards auto-calculated)
  const halvingSchedule = [
    { blocks: 0, date: '2009-01-03', reward: 50 },
    { blocks: 210000, date: '2012-11-28', reward: 25 },
    { blocks: 420000, date: '2016-07-09', reward: 12.5 },
    { blocks: 630000, date: '2020-05-11', reward: 6.25 },
    { blocks: 840000, date: '2024-04-19', reward: 3.125 }, // Approximate; adjust if needed
  ];

  // Target max for normalization (e.g., first cycle's peak ~10; adjust based on your data)
  const TARGET_MAX_PUELL = 10;

  // Indicators configuration (like MVRV/Mayer Multiple)
  const indicators = useMemo(() => ({
    'puell-multiple': {
      color: '#ff0062',
      label: 'Puell Multiple',
      description: 'The ratio of daily Bitcoin issuance (in USD) to its 365-day moving average. A high Puell Multiple (e.g., above 4) may indicate that miners are earning significantly more than their historical average, often signaling overvaluation or potential price tops. A low Puell Multiple (e.g., below 0.5) suggests miners are earning less, which may indicate undervaluation or potential price bottoms.'
    },
    'normalized-puell': {
      color: '#00ff88',
      label: 'Normalized Puell Ratio',
      description: 'Puell ratio accounting for diminishing returns. Each cycle\'s values are weighted to align peaks with the first cycle\'s reference level, making it easier to compare relative over/undervaluation across Bitcoin\'s halving eras.'
    }
  }), []);

  // Calculate daily issuance based on block reward schedule
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

  // Get reward for a given date (used for cycle scaling)
  const getCurrentReward = (date) => {
    const genesisDate = new Date('2009-01-03');
    const daysSinceGenesis = Math.floor((new Date(date) - genesisDate) / (1000 * 60 * 60 * 24));
    const blocksPerDay = 144;
    const blocksMined = daysSinceGenesis * blocksPerDay;
    const halvingInterval = 210000;
    const halvingCount = Math.floor(blocksMined / halvingInterval);
    return 50 / Math.pow(2, Math.min(halvingCount, halvingSchedule.length - 1)); // Cap at last known
  };

  // Get scaling factor for normalization (current reward / initial reward)
  const getScalingFactor = (date) => {
    const currentReward = getCurrentReward(date);
    return currentReward / 50; // Normalizes to first cycle's issuance level
  };

  // Normalize time to 'YYYY-MM-DD'
  const normalizeTime = (time) => new Date(time).toISOString().split('T')[0];

  const prepareData = useMemo(() => {
    if (!btcData || !onchainMetricsData || !Array.isArray(onchainMetricsData)) {
      console.warn('Invalid input data', { btcData, onchainMetricsData });
      return { priceData: [], issuanceData: [] };
    }

    const rawPriceData = btcData
      .map(d => ({
        time: normalizeTime(d.time) || '',
        value: parseFloat(d.value) || 0,
      }))
      .filter(d => d.time) // Remove invalid time entries
      .sort((a, b) => a.time.localeCompare(b.time));

    let issuanceData = onchainMetricsData
      .filter(d => d && d.metric && typeof d.metric === 'string' && d.metric.toLowerCase() === 'isscontusd')
      .map(d => ({
        time: normalizeTime(d.time) || '',
        value: parseFloat(d.value) || 0,
      }))
      .filter(d => d.time) // Remove invalid time entries
      .sort((a, b) => a.time.localeCompare(b.time));

    if (issuanceData.length === 0 && rawPriceData.length > 0) {
      console.warn('IssContUSD data missing, calculating issuance using block reward');
      issuanceData = rawPriceData.map(d => ({
        time: d.time,
        value: calculateDailyIssuance(d.time) * d.value,
      }));
    }

    const issuanceTimes = new Set(issuanceData.map(d => d.time));
    const priceData = rawPriceData.filter(d => issuanceTimes.has(d.time));
    return { priceData, issuanceData };
  }, [btcData, onchainMetricsData]);

  // Calculate Puell Multiple with smoothing
  const puellDataAll = useMemo(() => {
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

    // Apply smoothing based on selected period
    const smoothedPuellData = [];
    for (let i = 0; i < puellData.length; i++) {
      const startIndex = Math.max(0, i - smoothingPeriod + 1);
      const window = puellData.slice(startIndex, i + 1).filter(d => d.value !== null);
      const smoothedValue = window.length > 0
        ? window.reduce((sum, d) => sum + d.value, 0) / window.length
        : null;
      smoothedPuellData.push({
        time: puellData[i].time,
        value: smoothedValue !== null ? parseFloat(smoothedValue.toFixed(2)) : null,
      });
    }
    return smoothedPuellData;
  }, [prepareData, smoothingPeriod]);

  // Manual weight adjustment per cycle
  const normalizedPuellDataAll = useMemo(() => {
    const { issuanceData } = prepareData;
    // Manual scaling factors for each cycle (adjust these values)
    const cycleWeights = [
      { start: '2009-01-01', end: '2012-11-27', weight: 1.0 }, // Cycle 1
      { start: '2012-11-28', end: '2016-07-08', weight: 1.4 }, // Cycle 2
      { start: '2016-07-09', end: '2020-05-10', weight: 1.9 }, // Cycle 3
      { start: '2020-05-11', end: '2024-04-18', weight: 2.9 }, // Cycle 4
      { start: '2024-04-19', end: '2028-01-01', weight: 3.6 }, // Cycle 5
    ];

    // Compute raw Puell first
    const rawPuellData = [];
    for (let i = 0; i < issuanceData.length; i++) {
      const startIndex = Math.max(0, i - 365);
      const windowData = issuanceData.slice(startIndex, i + 1);
      const movingAverage = windowData.length > 0
        ? windowData.reduce((sum, d) => sum + d.value, 0) / windowData.length
        : 0;
      const puellMultiple = movingAverage !== 0 ? issuanceData[i].value / movingAverage : null;
      rawPuellData.push({
        time: issuanceData[i].time,
        value: puellMultiple !== null ? puellMultiple : null,
      });
    }

    // Apply manual weights based on cycle
    const weightedRaw = rawPuellData.map(d => {
      const date = new Date(d.time);
      let weight = 1.0;
      for (const cycle of cycleWeights) {
        if (date >= new Date(cycle.start) && date <= new Date(cycle.end)) {
          weight = cycle.weight;
          break;
        }
      }
      return {
        time: d.time,
        value: d.value !== null ? parseFloat((d.value * weight).toFixed(2)) : null,
      };
    });

    // Apply smoothing
    const smoothedWeighted = [];
    for (let i = 0; i < weightedRaw.length; i++) {
      const startIndex = Math.max(0, i - smoothingPeriod + 1);
      const window = weightedRaw.slice(startIndex, i + 1).filter(d => d.value !== null);
      const smoothedValue = window.length > 0
        ? window.reduce((sum, d) => sum + d.value, 0) / window.length
        : null;
      smoothedWeighted.push({
        time: weightedRaw[i].time,
        value: smoothedValue !== null ? parseFloat(smoothedValue.toFixed(2)) : null,
      });
    }
    return smoothedWeighted;
  }, [prepareData, smoothingPeriod]);

  const maxPuell = useMemo(() => {
    if (puellDataAll.length > 0) {
      return Math.max(...puellDataAll.map(d => d.value || 0).filter(v => v !== null)) * 1.1;
    }
    return 5; // Default maximum if no data
  }, [puellDataAll]);

  const maxNormalizedPuell = useMemo(() => {
    if (normalizedPuellDataAll.length > 0) {
      return Math.max(...normalizedPuellDataAll.map(d => d.value || 0).filter(v => v !== null)) * 1.1;
    }
    return TARGET_MAX_PUELL * 1.1;
  }, [normalizedPuellDataAll]);

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChart = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Fetch initial data
  useEffect(() => {
    fetchBtcData();
    fetchOnchainMetricsData();
  }, [fetchBtcData, fetchOnchainMetricsData]);

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
        mode: 1, // Logarithmic scale for Puell Multiple
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for price
      },
      timeScale: { minBarSpacing: 0.001 },
      crosshair: { mode: 0 }, // Normal crosshair mode
    });

    const puellSeries = chart.addLineSeries({
      color: indicators['puell-multiple'].color,
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (value) => value.toFixed(2) },
    });
    puellSeriesRef.current = puellSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

    const normalizedPuellSeries = chart.addLineSeries({
      color: indicators['normalized-puell'].color,
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (value) => value.toFixed(2) },
      visible: false, // Start hidden
    });
    normalizedPuellSeriesRef.current = normalizedPuellSeries;

    chart.applyOptions({ handleScroll: false, handleScale: false });

    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const puellData = param.seriesData.get(puellSeriesRef.current);
        const normalizedData = param.seriesData.get(normalizedPuellSeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          puell: puellData?.value,
          normalizedPuell: showNormalizedPuell ? normalizedData?.value : null,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

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
  }, []); // Empty dependency array for single initialization

  // Update chart colors on theme change
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
      });
    }
  }, [colors.primary[700], colors.primary[100]]);

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && prepareData.priceData.length > 0) {
      priceSeriesRef.current.setData(prepareData.priceData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [prepareData.priceData]);

  // Update Puell Multiple series data
  useEffect(() => {
    if (puellSeriesRef.current && puellDataAll.length > 0) {
      puellSeriesRef.current.setData(puellDataAll);
      chartRef.current?.timeScale().fitContent();
    }
  }, [puellDataAll]);

  // Update normalized Puell series data and visibility
  useEffect(() => {
    if (normalizedPuellSeriesRef.current && normalizedPuellDataAll.length > 0) {
      normalizedPuellSeriesRef.current.setData(normalizedPuellDataAll);
      normalizedPuellSeriesRef.current.applyOptions({ visible: showNormalizedPuell });
      if (showNormalizedPuell) {
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [normalizedPuellDataAll, showNormalizedPuell]);

  // Update chart options dynamically
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });

      const rightScaleTitle = `Puell Multiple (${smoothingPeriod}-Day SMA)${showNormalizedPuell ? ' | Normalized' : ''}`;
      const maxValue = showNormalizedPuell ? maxNormalizedPuell : maxPuell;

      chartRef.current.priceScale('right').applyOptions({
        title: rightScaleTitle,
        minimum: 0,
        maximum: maxValue,
        mode: 1,
      });
    }
  }, [isInteractive, maxPuell, maxNormalizedPuell, smoothingPeriod, showNormalizedPuell]);

  // Update current price, Puell Multiple, and last updated date
  useEffect(() => {
    const latestPriceData = prepareData.priceData[prepareData.priceData.length - 1];
    const latestPuellData = puellDataAll[puellDataAll.length - 1];
    setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentPuellMultiple(latestPuellData && latestPuellData.value ? latestPuellData.value.toFixed(2) : null);
    setLastUpdatedDate(latestPuellData ? latestPuellData.time : null);
  }, [prepareData.priceData, puellDataAll]);

  // Calculate tooltip position
  const calculateLeftPosition = () => {
    if (!tooltipData) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 200; // Estimated tooltip width
    const desiredOffset = 100; // 100px offset from cursor
    const cursorX = tooltipData.x;
    // Calculate positions for both left and right placement
    const rightPosition = cursorX + desiredOffset;
    const leftPosition = cursorX - desiredOffset - tooltipWidth + 200;
    // Try right placement first (preferred)
    if (rightPosition + tooltipWidth <= chartWidth) {
      return `${rightPosition}px`;
    }
    // If right placement doesn't fit, try left placement
    else if (leftPosition >= 0) {
      return `${leftPosition}px`;
    }
    // If neither fits, center it or position it as close as possible to the cursor
    else {
      // Position it as close as possible to the cursor while staying in bounds
      const centeredPosition = Math.max(0, Math.min(cursorX, chartWidth - tooltipWidth));
      // If cursor is in the right half, bias toward right edge
      if (cursorX > chartWidth / 2) {
        return `${Math.max(centeredPosition, chartWidth - tooltipWidth)}px`;
      } else {
        return `${centeredPosition}px`;
      }
    }
  };

  // Active indicators for descriptions
  const activeIndicators = useMemo(() => {
    const active = [];
    if (true) active.push('puell-multiple'); // Always active
    if (showNormalizedPuell) active.push('normalized-puell');
    return active;
  }, [showNormalizedPuell]);

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
              marginBottom: '30px',
              marginTop: '50px',
            }}
          >
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
              <InputLabel
                id="smoothing-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
                }}
              >
                Smoothing Period
              </InputLabel>
              <Select
                value={smoothingPeriod}
                onChange={(e) => setSmoothingPeriod(e.target.value)}
                label="Smoothing Period"
                labelId="smoothing-label"
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: "8px",
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1.5, pl: 2 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                {smoothingOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              <Button
                onClick={() => setShowNormalizedPuell(!showNormalizedPuell)}
                sx={{
                  backgroundColor: showNormalizedPuell ? '#00ff88' : 'transparent',
                  color: showNormalizedPuell ? 'black' : '#00ff88',
                  border: `1px solid ${showNormalizedPuell ? 'violet' : '#00ff88'}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#00cc66',
                    color: 'black',
                  },
                }}
              >
                {showNormalizedPuell ? 'Hide Normalized Puell' : 'Show Normalized Puell'}
              </Button>
              <Button
                onClick={setInteractivity}
                sx={{
                  backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                  color: isInteractive ? 'black' : '#31d6aa',
                  border: `1px solid ${isInteractive ? 'violet' : '#70d8bd'}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: colors.greenAccent[400],
                    color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                  },
                }}
              >
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </Button>
              <Button
                onClick={resetChart}
                sx={{
                  backgroundColor: 'transparent',
                  color: '#31d6aa',
                  border: `1px solid ${colors.greenAccent[400]}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: colors.greenAccent[400],
                    color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                  },
                }}
              >
                Reset Chart
              </Button>
            </Box>
          </Box>

          <div className='chart-top-div'>
            <div className='span-container'>
              <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                Bitcoin Price
              </span>
              <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ backgroundColor: indicators['puell-multiple'].color, height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                {indicators['puell-multiple'].label}
              </span>
              {showNormalizedPuell && (
                <span style={{ display: 'inline-block', color: colors.primary[100] }}>
                  <span style={{ backgroundColor: indicators['normalized-puell'].color, height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                  {indicators['normalized-puell'].label}
                </span>
              )}
            </div>
          </div>
        </>
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
        {!isDashboard && tooltipData && (
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
              color: colors.primary[100],
              fontSize: '12px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '15px' }}>Bitcoin</div>
            {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
            {tooltipData.puell && <div style={{ color: indicators['puell-multiple'].color }}>Puell Multiple: {tooltipData.puell.toFixed(2)}</div>}
            {tooltipData.normalizedPuell && (
              <div style={{ color: indicators['normalized-puell'].color }}>Normalized Puell: {tooltipData.normalizedPuell.toFixed(2)}</div>
            )}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>

      <div className="under-chart">
        {!isDashboard && <LastUpdated customDate={lastUpdatedDate} />}
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current Puell Multiple: <b>{currentPuellMultiple}</b> (${currentBtcPrice.toFixed(0)}k)
          </div>
          
          {/* Active indicators descriptions - styled like MVRV/Mayer Multiple */}
          {(activeIndicators.length > 0) && (
            <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
              {activeIndicators.map(key => (
                <p key={key} style={{ margin: '5px 0' }}>
                  <strong style={{ color: indicators[key].color }}>
                    {indicators[key].label}:
                  </strong> {indicators[key].description}
                </p>
              ))}
            </Box>
          )}
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(PuellMultiple);