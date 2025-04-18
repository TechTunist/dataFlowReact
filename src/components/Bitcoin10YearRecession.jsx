// src/scenes/Charts/BitcoinYieldRecessionChart.js
import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

const Bitcoin10YearChart = ({ indicatorId = 'btc-yield-recession', explanation, isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const btcSeriesRef = useRef(null);
  const t10y2ySeriesRef = useRef(null);
  const recessionSeriesRef = useRef(null);
  const halvingSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { indicatorData, fetchIndicatorData } = useContext(DataContext);

  const [scaleMode, setScaleMode] = useState(1); // 1 for logarithmic (BTC), 0 for linear
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showT10Y2Y, setShowT10Y2Y] = useState(true);
  const [showUSRECD, setShowUSRECD] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (indicatorData[indicatorId]?.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchIndicatorData(indicatorId);
      } catch (err) {
        setError('Failed to fetch indicator data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchIndicatorData, indicatorData, indicatorId]);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);
  const toggleT10Y2Y = useCallback(() => setShowT10Y2Y(prev => !prev), []);
  const toggleUSRECD = useCallback(() => setShowUSRECD(prev => !prev), []);

  // Initialize chart
  useEffect(() => {
    if (!indicatorData[indicatorId] || indicatorData[indicatorId].length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      leftPriceScale: { visible: true, mode: scaleMode },
      rightPriceScale: { visible: true },
      timeScale: { timeVisible: true, secondsVisible: false, minBarSpacing: 0.001 },
    });

    // Bitcoin price series (left axis)
    const btcSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: '#f7931a', // Orange
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    btcSeriesRef.current = btcSeries;

    // T10Y2Y series (right axis)
    const t10y2ySeries = chart.addLineSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    t10y2ySeriesRef.current = t10y2ySeries;

    // USRECD series (background shading)
    const recessionSeries = chart.addHistogramSeries({
      priceScaleId: '',
      base: 0,
      color: 'rgba(128, 128, 128, 0.3)', // Gray
    });
    recessionSeriesRef.current = recessionSeries;

    // Halving series (vertical shading)
    const halvingSeries = chart.addHistogramSeries({
      priceScaleId: '',
      base: 0,
      color: 'rgba(255, 255, 0, 0.5)', // Yellow, more noticeable
    });
    halvingSeriesRef.current = halvingSeries;

    // Filter data by date range
    const filteredData = dateRange === 'all'
      ? indicatorData[indicatorId]
      : indicatorData[indicatorId].filter(d => {
          const date = new Date(d.date);
          const cutoff = new Date();
          cutoff.setFullYear(cutoff.getFullYear() - parseInt(dateRange));
          return date >= cutoff;
        });

    // Update series data
    btcSeries.setData(filteredData.map(d => ({ time: d.date, value: d.btc })));
    t10y2ySeries.setData(
      filteredData.map(d => ({
        time: d.date,
        value: d.t10y2y,
        color: d.t10y2y < 0 ? '#ff0000' : '#00b7eb',
      }))
    );
    recessionSeries.setData(filteredData.map(d => ({ time: d.date, value: d.usrecd === 1 ? 1 : 0 })));

    // Halving data (±1 day for wider bands)
    const halvings = [
      { time: '2012-11-28', label: '1st Halving' },
      { time: '2016-07-09', label: '2nd Halving' },
      { time: '2020-05-11', label: '3rd Halving' },
      { time: '2024-04-19', label: '4th Halving' },
    ];
    const halvingData = filteredData.map(d => {
      const date = new Date(d.date);
      const isHalving = halvings.some(h => {
        const hDate = new Date(h.time);
        const diff = Math.abs(date - hDate) / (1000 * 60 * 60 * 24);
        return diff <= 1; // ±1 day
      });
      return { time: d.date, value: isHalving ? 1 : 0 };
    });
    console.log('Halving data:', halvingData.filter(d => d.value === 1)); // Debug 2016
    halvingSeries.setData(halvingData);

    // Tooltip with trading signals
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const btcData = param.seriesData.get(btcSeries);
        const t10y2yData = param.seriesData.get(t10y2ySeries);
        const recessionData = param.seriesData.get(recessionSeries);
        const halvingData = param.seriesData.get(halvingSeries);
        const signal = t10y2yData?.value < 0 && recessionData?.value === 0
          ? 'Yield curve inverted: BTC may rally.'
          : recessionData?.value === 1
            ? 'Recession: Consider reducing exposure.'
            : 'Normal conditions.';
        const halvingLabel = halvings.find(h => {
          const hDate = new Date(h.time);
          const pDate = new Date(param.time);
          const diff = Math.abs(pDate - hDate) / (1000 * 60 * 60 * 24);
          return diff <= 1;
        })?.label || null;
        setTooltipData({
          date: param.time,
          btcPrice: btcData?.value,
          t10y2y: t10y2yData?.value,
          recession: recessionData?.value,
          halving: halvingLabel,
          signal,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    // Resize handler
    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;
    resetChartView();

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [indicatorData, indicatorId, colors, scaleMode, dateRange]);

  // Update series visibility
  useEffect(() => {
    if (t10y2ySeriesRef.current) {
      t10y2ySeriesRef.current.applyOptions({ visible: showT10Y2Y });
    }
    if (recessionSeriesRef.current) {
      recessionSeriesRef.current.applyOptions({ visible: showUSRECD });
    }
    if (halvingSeriesRef.current) {
      halvingSeriesRef.current.applyOptions({ visible: true });
    }
  }, [showT10Y2Y, showUSRECD]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

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
            marginBottom: '20px',
            marginTop: '20px',
            padding: '0 20px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: colors.primary[100] }}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
              <InputLabel
                id="date-range-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Time Period
              </InputLabel>
              <Select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                labelId="date-range-label"
                label="Time Period"
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
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="5">5 Years</MenuItem>
                <MenuItem value="1">1 Year</MenuItem>
              </Select>
            </FormControl>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </Box>
          <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={toggleT10Y2Y}
              className="button-reset"
              style={{
                backgroundColor: showT10Y2Y ? '#4cceac' : 'transparent',
                color: showT10Y2Y ? 'black' : '#31d6aa',
                borderColor: showT10Y2Y ? 'violet' : '#70d8bd',
              }}
            >
              {showT10Y2Y ? 'Hide' : 'Show'} Yield Curve
            </button>
            <button
              onClick={toggleUSRECD}
              className="button-reset"
              style={{
                backgroundColor: showUSRECD ? '#4cceac' : 'transparent',
                color: showUSRECD ? 'black' : '#31d6aa',
                borderColor: showUSRECD ? 'violet' : '#70d8bd',
              }}
            >
              {showUSRECD ? 'Hide' : 'Show'} Recessions
            </button>
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
          </Box>
        </Box>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 80px)',
          width: '100%',
          border: `2px solid ${colors.grey[500]}`,
        }}
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>
      <div className="under-chart">
        {!isDashboard && indicatorData[indicatorId]?.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated: {indicatorData[indicatorId][indicatorData[indicatorId].length - 1].date}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 10000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              return rightPosition + tooltipWidth <= chartWidth
                ? `${rightPosition}px`
                : leftPosition >= 0
                  ? `${leftPosition}px`
                  : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 100}px`,
          }}
        >
          <div style={{ fontSize: '15px' }}>BTC vs. Yield Curve</div>
          <div style={{ fontSize: '20px' }}>${tooltipData.btcPrice?.toFixed(2)}</div>
          <div>T10Y2Y: {tooltipData.t10y2y?.toFixed(2)}%</div>
          {tooltipData.halving && <div style={{ color: 'yellow' }}>{tooltipData.halving}</div>}
          <div>{tooltipData.signal}</div>
          <div>
            {tooltipData.date.toString().substring(0, 4) === currentYear
              ? `${tooltipData.date.toString().substring(0, 4)} - latest`
              : tooltipData.date.toString().substring(0, 4)}
          </div>
        </div>
      )}
      {!isDashboard && (
        <p className="chart-info">
          This chart helps you understand how Bitcoin’s price (orange line) moves alongside big economic signals. The yield curve (red/blue line) shows the difference between long-term and short-term U.S. Treasury rates—when it turns red (negative), it often predicts an economic slowdown, and Bitcoin may rise in anticipation. Gray shaded areas mark U.S. recessions, when Bitcoin’s price can be volatile or drop. Yellow bands highlight Bitcoin halvings, events every ~4 years (2012, 2016, 2020, 2024) that cut the supply of new Bitcoin, often leading to price increases months later. <br /><br />
          <strong>How to use it:</strong> Watch for the yield curve turning red as a possible time to buy Bitcoin, as prices may climb before a recession hits. Be cautious during gray recession periods, as Bitcoin might fall. Zoom in using the time period selector (All Time, 5 Years, 1 Year) to focus on specific events, and hover over the chart to see details like halving dates or trading signals (e.g., “BTC may rally”).
        </p>
      )}
    </div>
  );
};

export default Bitcoin10YearChart;