import React, { useRef, useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';

const MarketCapDifference = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const differenceSeriesRef = useRef(null);
  const marketCapSeriesRef = useRef(null); // Ref for the new market cap series
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { marketCapData, fetchMarketCapData, marketCapLastUpdated } = useContext(DataContext);

  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [differenceData, setDifferenceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const percentageFormatter = useCallback((value) => {
    return `${value.toFixed(2)}%`;
  }, []);

  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
    return value.toFixed(0);
  }, []);

  const setInteractivityHandler = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  // Fetch difference data from the backend
  useEffect(() => {
    const fetchDifferenceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://vercel-dataflow.vercel.app/api/total/difference/');
        if (!response.ok) {
          throw new Error('Failed to fetch difference data');
        }
        const data = await response.json();
        setDifferenceData(data);
      } catch (err) {
        setError('Failed to fetch difference data. Please try again later.');
        console.error('Error fetching difference data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDifferenceData();
  }, []);

  // Fetch market cap data if not already present in context
  useEffect(() => {
    const fetchData = async () => {
      if (marketCapData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchMarketCapData();
      } catch (err) {
        setError('Failed to fetch market cap data. Please try again later.');
        console.error('Error fetching market cap data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchMarketCapData, marketCapData.length]);

  useEffect(() => {
    if (differenceData.length === 0 || marketCapData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
    });

    // Add market cap series in grey on the left scale
    const marketCapSeries = chart.addLineSeries({
      priceScaleId: 'left',
      lineWidth: 2,
      color: colors.primary[300],
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    marketCapSeriesRef.current = marketCapSeries;
    marketCapSeries.setData(marketCapData);

    // Add difference series on the right scale
    const differenceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      color: colors.blueAccent[500],
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: percentageFormatter },
    });
    differenceSeriesRef.current = differenceSeries;
    differenceSeries.setData(differenceData);

    // Add a horizontal line at y=100 to represent the Fair Value (100%)
    chart.addLineSeries({
      priceScaleId: 'right',
      color: colors.greenAccent[500],
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    }).setData(differenceData.map(({ time }) => ({ time, value: 100 })));

    // Configure price scales
    chart.priceScale('left').applyOptions({
      mode: 1, // Logarithmic scale for market cap
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });

    chart.priceScale('right').applyOptions({
      mode: 0, // Linear scale for percentage difference
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: { type: 'custom', formatter: percentageFormatter },
    });

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const marketCapDataPoint = param.seriesData.get(marketCapSeriesRef.current);
        const differenceDataPoint = param.seriesData.get(differenceSeriesRef.current);

        setTooltipData({
          date: dateStr,
          marketCap: marketCapDataPoint?.value ? compactNumberFormatter(marketCapDataPoint.value) : undefined,
          difference: differenceDataPoint?.value ? percentageFormatter(differenceDataPoint.value) : undefined,
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

    chartRef.current = chart;
    resetChartView();

    return () => {
      chartRef.current = null;
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [differenceData, marketCapData, colors, percentageFormatter, compactNumberFormatter, resetChartView]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div
          className="chart-top-div"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 10px',
          }}
        >
          <div className="span-container">
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: colors.primary[300], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Total Market Cap
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: colors.blueAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Fair Value Delta
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: colors.greenAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Fair Value Boundary
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={setInteractivityHandler}
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={setInteractivityHandler}
        />
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated customDate={marketCapLastUpdated} />}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -300;
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
          <b>
            {tooltipData.marketCap && (
              <div style={{ fontSize: '15px', color: colors.primary[300] }} >Market Cap: ${tooltipData.marketCap}</div>
            )}
            {tooltipData.difference && (
              <div style={{ fontSize: '15px', color: colors.blueAccent[500] }} >Percentage Difference: {tooltipData.difference}</div>
            )}
            {tooltipData.date && <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>}
          </b>
        </div>
      )}
      {!isDashboard && (
        <div className="chart-info">
          The percentage difference between the total market cap and the Fair Value of all crypto assets combined.
          The Fair Value line (at 100%) represents where the market cap equals the Fair Value, calculated using
          a logarithmic regression model fitted to historical data.
          <br />
          <br />
          The core calculation involves determining the slope (m) and intercept (b) of the best-fit
          line for the Fair Value, using the following formulas:
          <br />
          <ul>
            <li>
              <b>
                m = (n * sum(ln(x) * ln(y)) - sum(ln(x)) * sum(ln(y))) / (n * sum(ln(x)^2) -
                (sum(ln(x)))^2)
              </b>
            </li>
            <li>
              <b>b = (sum(ln(y)) - m * sum(ln(x))) / n</b>
            </li>
          </ul>
          <br />
          n = the total number of data points, <br />
          x = the time index (after taking the natural logarithm), and <br />
          y = the data value (after taking the natural logarithm) <br />
          <br />
        </div>
      )}
    </div>
  );
};

export default MarketCapDifference;