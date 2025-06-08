// src/components/BitcoinRunningROI.js
import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinRunningROI = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const roiSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentRoi, setCurrentRoi] = useState(null);
  const [timeframe, setTimeframe] = useState('1y'); // Default to 1 year
  const [tooltipData, setTooltipData] = useState(null);

  const timeframes = [
    { value: '30d', label: '30 Days', days: 30 },
    { value: '90d', label: '90 Days', days: 90 },
    { value: '180d', label: '180 Days', days: 180 },
    { value: '1y', label: '1 Year', days: 365 },
    { value: '2y', label: '2 Years', days: 730 },
    { value: '3y', label: '3 Years', days: 1095 },
    { value: '4y', label: '4 Years', days: 1460 },
  ];

  // Calculate running ROI
  const calculateRunningROI = useCallback((data, days) => {
    if (data.length === 0) return [];

    const result = [];
    const startDate = new Date(data[0].time);

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const currentDate = new Date(item.time);
      const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);

      if (daysPassed < days) continue;

      const startIndex = Math.max(0, index - days);
      const startPrice = data[startIndex]?.value || item.value;
      const rawRoiMultiplier = startPrice !== 0 ? item.value / startPrice : 1;

      result.push({
        time: item.time,
        value: item.value,
        roi: rawRoiMultiplier,
      });
    }

    return result;
  }, []);

  // Compute ROI data and max ROI
  const { roiData, maxRoi } = useMemo(() => {
    const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
    const days = selectedTimeframe ? selectedTimeframe.days : 365;
    const filteredData = calculateRunningROI(btcData, days);
    const maxRoi = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.roi)) : 200;
    const adjustedMax = Math.max(200, maxRoi * 1.1);

    return { roiData: filteredData, maxRoi: adjustedMax };
  }, [btcData, timeframe, calculateRunningROI]);

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Fetch initial data
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  // Initialize chart once on mount
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
        mode: 1, // Logarithmic for ROI
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for price
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const roiSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
    });
    roiSeriesRef.current = roiSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

    // Subscribe to crosshair movement for tooltip
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const roiData = param.seriesData.get(roiSeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          roi: roiData?.value,
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
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Empty dependencies: run once on mount

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && btcData.length > 0) {
      priceSeriesRef.current.setData(btcData.map(data => ({ time: data.time, value: data.value })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [btcData]);

  // Update ROI series data
  useEffect(() => {
    if (roiSeriesRef.current && roiData.length > 0) {
      roiSeriesRef.current.setData(roiData.map(data => ({ time: data.time, value: data.roi })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [roiData]);

  // Update chart options dynamically
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('left').applyOptions({ mode: 1 }); // Logarithmic for price
      chartRef.current.priceScale('right').applyOptions({
        title: `ROI (${timeframe})`,
        mode: 1,
        minimum: 0.1,
        maximum: maxRoi,
      });
    }
  }, [isInteractive, timeframe, maxRoi]);

  // Update current price and ROI for display
  useEffect(() => {
    const latestPriceData = btcData[btcData.length - 1];
    const latestRoiData = roiData[roiData.length - 1];
    setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentRoi(latestRoiData && latestRoiData.roi ? latestRoiData.roi.toFixed(2) : null);
  }, [btcData, roiData]);

  const handleTimeframeChange = (e) => setTimeframe(e.target.value);

  // Calculate tooltip left position
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
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="timeframe-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Timeframe
            </InputLabel>
            <Select
              value={timeframe}
              onChange={handleTimeframeChange}
              label="Timeframe"
              labelId="timeframe-label"
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
              {timeframes.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
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
              onClick={resetChartView}
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
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) setInteractivity(true);
            else setInteractivity(false);
          }}
        />
        {!isDashboard && (
          <div className="span-container" style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Running ROI
            </span>
          </div>
        )}
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
            {tooltipData.roi && <div style={{ color: '#ff0062' }}>ROI: {tooltipData.roi.toFixed(2)}x</div>}
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
            Current {timeframe} ROI: <b>{currentRoi}</b>x (${currentBtcPrice.toFixed(0)}k)
          </div>
          <p className="chart-info">
            The running ROI is calculated as the return on investment over the selected timeframe, showing the multiplicative change in Bitcoin price from the start of the period to each day (e.g., 1x for no change, 2x for 100% increase, 0.5x for 50% decrease). ROI data is only shown after the selected timeframe has passed from the start of the dataset. Select different timeframes to analyze ROI over various periods.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinRunningROI);