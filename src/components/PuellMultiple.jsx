// src/components/PuellMultiple.js
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
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { btcData, onchainMetricsData, fetchBtcData, fetchOnchainMetricsData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentPuellMultiple, setCurrentPuellMultiple] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [smoothingPeriod, setSmoothingPeriod] = useState(7); // Default to 7-day smoothing

  // Smoothing period options
  const smoothingOptions = [
    { value: 7, label: '7 Days' },
    { value: 28, label: '28 Days' },
    { value: 90, label: '90 Days' },
    { value: 180, label: '180 Days' },
    { value: 365, label: '1 Year' },
  ];

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

  const maxPuell = useMemo(() => {
    if (puellDataAll.length > 0) {
      return Math.max(...puellDataAll.map(d => d.value || 0).filter(v => v !== null)) * 1.1;
    }
    return 5; // Default maximum if no data
  }, [puellDataAll]);

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
      color: '#ff0062',
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

    chart.applyOptions({ handleScroll: false, handleScale: false });

    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const puellData = param.seriesData.get(puellSeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          puell: puellData?.value,
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

  // Update chart options dynamically
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        title: `Puell Multiple (${smoothingPeriod}-Day SMA)`,
        minimum: 0,
        maximum: maxPuell,
        mode: 1,
      });
    }
  }, [isInteractive, maxPuell, smoothingPeriod]);

  // Update current price and Puell Multiple
  useEffect(() => {
    const latestPriceData = prepareData.priceData[prepareData.priceData.length - 1];
    const latestPuellData = puellDataAll[puellDataAll.length - 1];
    setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentPuellMultiple(latestPuellData && latestPuellData.value ? latestPuellData.value.toFixed(2) : null);
  }, [prepareData.priceData, puellDataAll]);

  // Calculate tooltip position
  const calculateLeftPosition = () => {
    if (!tooltipData) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 200; // Estimated tooltip width
    const offset = 10; // Distance from cursor
    const cursorX = tooltipData.x;

    if (cursorX + offset + tooltipWidth <= chartWidth) {
      return `${cursorX + offset}px`;
    } else if (cursorX - offset - tooltipWidth >= 0) {
      return `${cursorX - offset - tooltipWidth}px`;
    } else {
      return `${Math.max(0, Math.min(cursorX, chartWidth - tooltipWidth))}px`;
    }
  };

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
          </Box>
          {!isDashboard && (
        <div className='chart-top-div'>
          <div className='span-container'>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Puell Multiple
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
            <button onClick={resetChart} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </div>
      )}
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
              color: colors.grey[100],
              fontSize: '12px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: '15px' }}>Bitcoin</div>
            {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
            {tooltipData.puell && <div style={{ color: '#ff0062' }}>Puell Multiple: {tooltipData.puell.toFixed(2)}</div>}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current Puell Multiple: <b>{currentPuellMultiple}</b> (${currentBtcPrice.toFixed(0)}k)
          </div>
          <p className="chart-info">
            The Puell Multiple is calculated as the ratio of daily Bitcoin issuance (in USD) to its 365-day moving average. A high Puell Multiple (e.g., above 4) may indicate that miners are earning significantly more than their historical average, often signaling overvaluation or potential price tops. A low Puell Multiple (e.g., below 0.5) suggests miners are earning less, which may indicate undervaluation or potential price bottoms.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(PuellMultiple);