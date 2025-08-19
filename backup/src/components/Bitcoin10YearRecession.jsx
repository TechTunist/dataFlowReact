// src/scenes/Charts/Bitcoin10YearChart.js
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
  const fedFundsSeriesRef = useRef(null); // New: Federal Funds Rate
  const m2GrowthSeriesRef = useRef(null); // New: M2 Money Supply Growth
  const recessionSeriesRef = useRef(null);
  const halvingSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { indicatorData, fetchIndicatorData } = useContext(DataContext);

  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showT10Y2Y, setShowT10Y2Y] = useState(true);
  const [showUSRECD, setShowUSRECD] = useState(true);
  const [showFedFunds, setShowFedFunds] = useState(true); // New: Toggle for Fed Funds
  const [showM2Growth, setShowM2Growth] = useState(true); // New: Toggle for M2 Growth
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

  const toggleT10Y2Y = useCallback(() => setShowT10Y2Y(prev => !prev), []);
  const toggleUSRECD = useCallback(() => setShowUSRECD(prev => !prev), []);
  const toggleFedFunds = useCallback(() => setShowFedFunds(prev => !prev), []); // New
  const toggleM2Growth = useCallback(() => setShowM2Growth(prev => !prev), []); // New

  // Initialize chart
  useEffect(() => {
    if (!indicatorData[indicatorId] || indicatorData[indicatorId].length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      leftPriceScale: { visible: true, mode: 1 }, // Fixed to logarithmic
      rightPriceScale: { visible: true },
      timeScale: { timeVisible: true, secondsVisible: false, minBarSpacing: 0.001 },
    });

    // Bitcoin price series (left axis, log scale)
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

    // Federal Funds Rate series (right axis, new)
    const fedFundsSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: '#ffffff', // White
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    fedFundsSeriesRef.current = fedFundsSeries;

    // M2 Money Supply Growth series (right axis, new)
    const m2GrowthSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: '#00ff00', // Green
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    m2GrowthSeriesRef.current = m2GrowthSeries;

    // USRECD series (background shading)
    const recessionSeries = chart.addHistogramSeries({
      priceScaleId: '', // No price scale
      base: 0,
      color: 'rgba(128, 128, 128, 0.3)', // Gray
      priceFormat: { type: 'custom', formatter: () => '' }, // Suppress labels
    });
    recessionSeriesRef.current = recessionSeries;
    chart.priceScale('').applyOptions({ visible: false });

    // Halving series (vertical shading)
    const halvingSeries = chart.addHistogramSeries({
      priceScaleId: '', // No price scale
      base: 0,
      color: 'rgba(255, 255, 0, 0.5)', // Yellow
      priceFormat: { type: 'custom', formatter: () => '' }, // Suppress labels
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
    fedFundsSeries.setData(filteredData.map(d => ({ time: d.date, value: d.fedFunds })));
    m2GrowthSeries.setData(filteredData.map(d => ({ time: d.date, value: d.m2Growth })));
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
    
    halvingSeries.setData(halvingData);

    // Add markers for key events
    const keyEvents = [
      { time: '2014-02-24', label: 'Mt. Gox Hack', position: 'aboveBar', color: 'red', shape: 'circle' },
      { time: '2017-12-04', label: '2017 Bull Run Peak', position: 'aboveBar', color: 'green', shape: 'circle' },
    ];
    btcSeries.setMarkers(keyEvents);

    // Add markers for yield curve inversions
    const inversionMarkers = [];
    filteredData.forEach((d, i) => {
      if (d.t10y2y < 0 && (i === 0 || filteredData[i - 1].t10y2y >= 0)) {
        inversionMarkers.push({
          time: d.date,
          position: 'aboveBar',
          color: 'yellow',
          shape: 'circle',
          text: 'Inversion',
        });
      }
    });
    t10y2ySeries.setMarkers(inversionMarkers);

    // Tooltip with trading signals
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const btcData = param.seriesData.get(btcSeries);
        const t10y2yData = param.seriesData.get(t10y2ySeries);
        const fedFundsData = param.seriesData.get(fedFundsSeries);
        const m2GrowthData = param.seriesData.get(m2GrowthSeries);
        const recessionData = param.seriesData.get(recessionSeries);
        const halvingData = param.seriesData.get(halvingSeries);
        const signal = t10y2yData?.value < 0 && recessionData?.value === 0
          ? 'Yield curve inverted: BTC may rally.'
          : recessionData?.value === 1
            ? 'Recession: Consider reducing exposure.'
            : fedFundsData?.value > 2 && m2GrowthData?.value < 5
              ? 'Tightening policy: BTC may dip.'
              : 'Normal conditions.';
        const halvingLabel = halvings.find(h => {
          const hDate = new Date(h.time);
          const pDate = new Date(param.time);
          const diff = Math.abs(pDate - hDate) / (1000 * 60 * 60 * 24);
          return diff <= 1;
        })?.label || null;
        const eventLabel = keyEvents.find(e => e.time === param.time)?.label || null;
        setTooltipData({
          date: param.time,
          btcPrice: btcData?.value,
          t10y2y: t10y2yData?.value,
          fedFunds: fedFundsData?.value,
          m2Growth: m2GrowthData?.value,
          recession: recessionData?.value,
          halving: halvingLabel,
          event: eventLabel,
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
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [indicatorData, indicatorId, colors, dateRange]);

  // Update series visibility
  useEffect(() => {
    if (t10y2ySeriesRef.current) {
      t10y2ySeriesRef.current.applyOptions({ visible: showT10Y2Y });
    }
    if (fedFundsSeriesRef.current) {
      fedFundsSeriesRef.current.applyOptions({ visible: showFedFunds });
    }
    if (m2GrowthSeriesRef.current) {
      m2GrowthSeriesRef.current.applyOptions({ visible: showM2Growth });
    }
    if (recessionSeriesRef.current) {
      recessionSeriesRef.current.applyOptions({ visible: showUSRECD });
    }
    if (halvingSeriesRef.current) {
      halvingSeriesRef.current.applyOptions({ visible: true });
    }
  }, [showT10Y2Y, showFedFunds, showM2Growth, showUSRECD]);

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
              onClick={toggleFedFunds}
              className="button-reset"
              style={{
                backgroundColor: showFedFunds ? '#4cceac' : 'transparent',
                color: showFedFunds ? 'black' : '#31d6aa',
                borderColor: showFedFunds ? 'violet' : '#70d8bd',
              }}
            >
              {showFedFunds ? 'Hide' : 'Show'} Fed Funds Rate
            </button>
            <button
              onClick={toggleM2Growth}
              className="button-reset"
              style={{
                backgroundColor: showM2Growth ? '#4cceac' : 'transparent',
                color: showM2Growth ? 'black' : '#31d6aa',
                borderColor: showM2Growth ? 'violet' : '#70d8bd',
              }}
            >
              {showM2Growth ? 'Hide' : 'Show'} M2 Growth
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
      >
        {/* Legend */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: colors.primary[900], padding: '5px 10px', borderRadius: '4px', color: colors.grey[100], fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#f7931a', marginRight: '5px' }} />
            Bitcoin Price
          </div>
          {showT10Y2Y && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#ff0000', marginRight: '5px' }} />
                Yield Curve (Negative)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#00b7eb', marginRight: '5px' }} />
                Yield Curve (Positive)
              </div>
            </>
          )}
          {showFedFunds && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#ffffff', marginRight: '5px' }} />
              Fed Funds Rate
            </div>
          )}
          {showM2Growth && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#00ff00', marginRight: '5px' }} />
              M2 Growth
            </div>
          )}
          {showUSRECD && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: 'rgba(128, 128, 128, 0.3)', marginRight: '5px' }} />
              Recessions
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'rgba(255, 255, 0, 0.5)', marginRight: '5px' }} />
            Halvings
          </div>
        </div>
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
          <div style={{ fontSize: '15px' }}>BTC vs. Economic Indicators</div>
          <div style={{ fontSize: '20px' }}>${tooltipData.btcPrice?.toFixed(2)}</div>
          {showT10Y2Y && <div>T10Y2Y: {tooltipData.t10y2y?.toFixed(2)}%</div>}
          {showFedFunds && <div>Fed Funds Rate: {tooltipData.fedFunds?.toFixed(2)}%</div>}
          {showM2Growth && <div>M2 Growth: {tooltipData.m2Growth?.toFixed(2)}%</div>}
          {tooltipData.halving && <div style={{ color: 'yellow' }}>{tooltipData.halving}</div>}
          {tooltipData.event && <div style={{ color: 'cyan' }}>{tooltipData.event}</div>}
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
          This chart shows Bitcoin’s price (orange line) alongside key economic indicators to help you spot trends and make trading decisions. The yield curve (red/blue line) compares long-term and short-term U.S. Treasury rates. When it turns red (negative), it often signals an upcoming economic slowdown, and Bitcoin may rise as a hedge (e.g., the 2019 inversion before the 2020 crash). The white line tracks the Federal Funds Rate, showing U.S. interest rates. Rising rates can pressure Bitcoin prices down. The green line shows M2 money supply growth. When it’s high, more money in the economy often boosts Bitcoin. <br /><br />
          Gray shaded areas mark U.S. recessions, periods of economic downturn. In Bitcoin’s history, the 2020 recession (March to April 2020) saw a sharp price drop followed by a recovery as stimulus increased liquidity. Yellow bands highlight Bitcoin halvings (2012, 2016, 2020, 2024), events every ~4 years that cut the supply of new Bitcoin in half. Historically, prices often rise 6 - 18 months after a halving due to reduced supply (e.g., post-2016 halving, Bitcoin surged in 2017). Markers show key events like the 2014 Mt. Gox hack and the 2017 bull run peak. <br /><br />
          <strong>How to use it:</strong> Consider buying when the yield curve turns red or after a halving, as Bitcoin often rallies in these periods. Be cautious during recessions (gray areas) or when the Fed Funds Rate rises sharply, as Bitcoin may dip. Watch M2 growth. High values can signal bullish conditions. Use the time period selector to zoom in on specific periods, and hover over the chart for details like halving dates, events, or trading signals (e.g., “BTC may rally”).
        </p>
      )}
    </div>
  );
};

export default Bitcoin10YearChart;