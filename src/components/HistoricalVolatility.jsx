// src/components/BitcoinHistoricalVolatility.js
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

const BitcoinHistoricalVolatility = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const volatilitySeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentVolatility, setCurrentVolatility] = useState(null);
  const [timeframe, setTimeframe] = useState('60d'); // Default to 60 days

  const timeframes = [
    { value: '30d', label: '30 Days', days: 30 },
    { value: '60d', label: '60 Days', days: 60 },
    { value: '180d', label: '180 Days', days: 180 },
    { value: '1y', label: '1 Year', days: 365 },
  ];

  // Function to calculate historical volatility
  const calculateVolatility = useCallback((data, days) => {
    if (data.length === 0) return [];

    const result = [];
    const startDate = new Date(data[0].time);

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const currentDate = new Date(item.time);
      const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);

      // Only calculate volatility if enough days have passed
      if (daysPassed < days) {
        continue;
      }

      const startIndex = Math.max(0, index - days);
      const windowData = data.slice(startIndex, index + 1).map(d => d.value);
      
      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < windowData.length; i++) {
        if (windowData[i - 1] !== 0) {
          returns.push(Math.log(windowData[i] / windowData[i - 1]));
        }
      }

      // Calculate standard deviation of returns
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      
      // Annualize the volatility and convert to percentage
      const volatility = stdDev * Math.sqrt(365) * 100;

      result.push({
        time: item.time,
        value: item.value,
        volatility: volatility,
      });
    }

    return result;
  }, []);

  // Separate volatility data (filtered) and price data (full dataset)
  const { volatilityData, maxVolatility } = useMemo(() => {
    const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
    const days = selectedTimeframe ? selectedTimeframe.days : 60;
    const filteredData = calculateVolatility(btcData, days);
    
    // Find the maximum volatility value to set the scale dynamically
    const maxVolatility = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.volatility)) : 15;
    const adjustedMax = Math.max(15, maxVolatility * 1.1); // Add 10% buffer

    return { volatilityData: filteredData, maxVolatility: adjustedMax };
  }, [btcData, timeframe, calculateVolatility]);

  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (btcData.length === 0) return;

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
        title: `Volatility (${timeframe})`,
        mode: 0, // Linear mode for volatility
        minimum: 0,
        maximum: maxVolatility,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        title: 'Price',
        mode: 1, // Logarithmic mode for price
      },
      timeScale: {
        minBarSpacing: 0.001,
      },
    });

    const volatilitySeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (value) => value.toFixed(1) + '%',
      },
    });
    volatilitySeriesRef.current = volatilitySeries;
    volatilitySeries.setData(volatilityData.map(data => ({
      time: data.time,
      value: data.volatility,
    })));

    const priceSeries = chart.addLineSeries({
      color: 'blue',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(btcData.map(data => ({ time: data.time, value: data.value })));

    chart.applyOptions({
      handleScroll: isInteractive,
      handleScale: isInteractive,
    });

    chart.priceScale('left').applyOptions({
      mode: 1, // Logarithmic for price
      borderVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
      title: 'Price',
    });

    chart.priceScale('right').applyOptions({
      mode: 0, // Linear for volatility
      title: `Volatility (${timeframe})`,
      minimum: 0,
      maximum: maxVolatility,
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const latestPriceData = btcData[btcData.length - 1];
    const latestVolatilityData = volatilityData[volatilityData.length - 1];
    setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentVolatility(latestVolatilityData && latestVolatilityData.volatility ? latestVolatilityData.volatility.toFixed(1) : null);

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
  }, [btcData, volatilityData, maxVolatility, theme.palette.mode, isDashboard, timeframe, colors]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('left').applyOptions({
        mode: 1, // Logarithmic for price
      });
      chartRef.current.priceScale('right').applyOptions({
        mode: 0, // Linear for volatility
        title: `Volatility (${timeframe})`,
        minimum: 0,
        maximum: maxVolatility,
      });
    }
  }, [isInteractive, timeframe, maxVolatility]);

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
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
                '&.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -9px) scale(0.75)',
                },
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
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
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
            if (!isInteractive && !isDashboard) {
              setInteractivity(true);
            } else {
              setInteractivity(false);
            }
          }}
        />
        {!isDashboard && (
          <div className="span-container" style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'blue', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Volatility
            </span>
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
            Current {timeframe} Volatility: <b>{currentVolatility}</b>% (${currentBtcPrice.toFixed(0)}k)
          </div>
          <p className="chart-info">
            The historical volatility is calculated as the annualized standard deviation of daily logarithmic returns over the selected timeframe, expressed as a percentage. Volatility data is only shown after the selected timeframe has passed from the start of the dataset. Select different timeframes to analyze volatility over various periods.
            The visual spikes in volatility indicate periods of significant price fluctuations, which can be useful for understanding market behavior and potential changes in price momentum after volatility peaks and changes direction.
            If the price is moving upwards and the volatility peaks, it may indicate a top and potential move downwards, while a peak in volatility during a downward price movement may indicate a potential bottom and reversal upwards.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinHistoricalVolatility);