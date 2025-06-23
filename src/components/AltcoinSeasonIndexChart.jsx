// src/components/AltcoinSeasonIndexChart.js
import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';

const AltcoinSeasonIndexChart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const indexSeriesRef = useRef(null);
  const btcSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { altcoinSeasonTimeseriesData, fetchAltcoinSeasonTimeseriesData, btcData, fetchBtcData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [smaPeriod, setSmaPeriod] = useState('none');
  const [tooltipData, setTooltipData] = useState(null);
  const [error, setError] = useState(null);

  const smaPeriods = [
    { value: 'none', label: 'None' },
    { value: '7d', label: '7 Days', days: 7 },
    { value: '28d', label: '28 Days', days: 28 },
    { value: '90d', label: '90 Days', days: 90 },
  ];

  // Calculate SMA for index data
  const smoothedData = useMemo(() => {
    const selectedSma = smaPeriods.find(sp => sp.value === smaPeriod);
    const days = selectedSma.days || 0;
    if (smaPeriod === 'none' || days === 0) return altcoinSeasonTimeseriesData;

    const result = [];
    for (let i = 0; i < altcoinSeasonTimeseriesData.length; i++) {
      if (i < days - 1) {
        result.push({ ...altcoinSeasonTimeseriesData[i], index: altcoinSeasonTimeseriesData[i].index });
        continue;
      }
      const window = altcoinSeasonTimeseriesData.slice(i - days + 1, i + 1);
      const sum = window.reduce((acc, item) => acc + item.index, 0);
      const sma = sum / days;
      result.push({ ...altcoinSeasonTimeseriesData[i], index: sma });
    }
    return result;
  }, [altcoinSeasonTimeseriesData, smaPeriod]);

  // Filter Bitcoin data to start from first Altcoin Season Index date
  const filteredBtcData = useMemo(() => {
    if (!altcoinSeasonTimeseriesData.length) return [];
    const startDate = altcoinSeasonTimeseriesData[0].time; // January 1, 2018
    return btcData.filter(item => new Date(item.time) >= new Date(startDate));
  }, [btcData, altcoinSeasonTimeseriesData]);

  // Fetch data with error handling
  useEffect(() => {
    Promise.all([
      fetchAltcoinSeasonTimeseriesData(),
      fetchBtcData(),
    ]).catch(err => {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    });
  }, [fetchAltcoinSeasonTimeseriesData, fetchBtcData]);

  // Initialize chart
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
        mode: 0, // Linear for index
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for BTC price
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const btcSeries = chart.addLineSeries({
      color: '#808080', // Grey
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(0) },
    });
    btcSeriesRef.current = btcSeries;

    const indexSeries = chart.addLineSeries({
      color: colors.greenAccent[400], // Placeholder; gradient not supported
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(1) },
    });
    indexSeriesRef.current = indexSeries;

    indexSeries.createPriceLine({
      price: 75,
      color: '#FF0000', // Vibrant red
      lineWidth: 1,
      lineStyle: 2,
      title: 'Altcoin Season',
      axisLabelColor: '#FF0000', // Match label to line
    });
    indexSeries.createPriceLine({
      price: 25,
      color: '#0000FF', // Blue
      lineWidth: 1,
      lineStyle: 2,
      title: 'Bitcoin Season',
      axisLabelColor: '#0000FF', // Match label to line
    });

    chart.subscribeCrosshairMove(param => {
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
        const indexData = param.seriesData.get(indexSeriesRef.current);
        const btcData = param.seriesData.get(btcSeriesRef.current);
        setTooltipData({
          date: param.time,
          index: indexData?.value,
          btcPrice: btcData?.value,
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
  }, []); // Stable initialization

  // Update index series data
  useEffect(() => {
    if (indexSeriesRef.current && smoothedData.length > 0) {
      indexSeriesRef.current.setData(
        smoothedData.map(data => ({ time: data.time, value: data.index }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [smoothedData]);

  // Update Bitcoin series data
  useEffect(() => {
    if (btcSeriesRef.current && filteredBtcData.length > 0) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [filteredBtcData]);

  // Update chart options
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        title: `Altcoin Season Index${smaPeriod !== 'none' ? ` (${smaPeriod} SMA)` : ''}`,
        minimum: 0,
        maximum: 100,
      });
      chartRef.current.priceScale('left').applyOptions({
        title: 'Bitcoin Price (USD)',
        mode: 1, // Logarithmic
      });
    }
  }, [isInteractive, smaPeriod]);

  // Update current index
  useEffect(() => {
    const latestData = smoothedData[smoothedData.length - 1];
    setCurrentIndex(latestData ? latestData.index.toFixed(1) : null);
  }, [smoothedData]);

  // Handle SMA period change
  const handleSmaPeriodChange = e => setSmaPeriod(e.target.value);

  // Toggle interactivity
  const setInteractivity = () => setIsInteractive(!isInteractive);

  // Reset chart view
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Calculate tooltip position
  const calculateLeftPosition = () => {
    if (!tooltipData) return '0px';
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '10px',
            marginTop: '50px',
            width: '100%',
          }}
        >
          <div className="span-container" style={{ marginRight: 'auto' }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: colors.greenAccent[400],
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'Index' : 'Altcoin Season Index'}
            </span>
            <span style={{ display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: '#808080',
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'BTC': 'Bitcoin Price'}
            </span>
          </div>
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' }, margin: '0 auto' }}>
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
              }}
            >
              {smaPeriods.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginLeft: 'auto' }}>
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
            if (!isInteractive && !isDashboard) setIsInteractive(true);
            else setIsInteractive(false);
          }}
        />
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
            <div style={{ fontSize: '15px' }}>Altcoin Season Index</div>
            {tooltipData.index && <div style={{ fontSize: '20px' }}>{tooltipData.index.toFixed(1)}</div>}
            {tooltipData.btcPrice && <div>BTC Price: ${tooltipData.btcPrice.toFixed(2)}</div>}
            {tooltipData.date && smoothedData.find(d => d.time === tooltipData.date) && (
              <>
                <div>Season: {smoothedData.find(d => d.time === tooltipData.date).season}</div>
                <div>Outperforming: {smoothedData.find(d => d.time === tooltipData.date).altcoins_outperforming}/{smoothedData.find(d => d.time === tooltipData.date).altcoin_count}</div>
              </>
            )}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="altcoinSeasonTimeseriesData" />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current Index: <b>{currentIndex}</b> (Based on {smoothedData[0]?.altcoin_count || 'N/A'} altcoins)
          </div>
          <p className="chart-info">
            The Altcoin Season Index measures the performance of altcoins relative to Bitcoin over 90-day periods. A value closer to 100 indicates an altcoin season, where most available altcoins outperform Bitcoin, while a value closer to 0 indicates a Bitcoin season. The index is calculated as the percentage of altcoins with data (varies by date, starting from January 2018) outperforming Bitcoin in price change. Select different smoothing periods to view historical trends. Bitcoin price is shown for reference, starting from January 2018.
          </p>
        </div>
      )}
    </div>
  );
};

export default AltcoinSeasonIndexChart;