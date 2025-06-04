import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';

const MarketCapDifference = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const differenceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [differenceData, setDifferenceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const percentageFormatter = useCallback((value) => {
    return `${value.toFixed(2)}%`;
  }, []);

  const setInteractivityHandler = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  // Fetch difference data from the backend
  useEffect(() => {
    const fetchDifferenceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // const response = await fetch('http://127.0.0.1:8000/api/total/difference/');
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

  useEffect(() => {
    if (differenceData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
    });

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
      color: colors.greenAccent[500], // Match the Fair Value color from TotalMarketCap.js
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    }).setData(differenceData.map(({ time }) => ({ time, value: 100 })));

    chart.priceScale('right').applyOptions({
      mode: 0,
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
        const differenceDataPoint = param.seriesData.get(differenceSeriesRef.current);

        setTooltipData({
          date: dateStr,
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
  }, [differenceData, colors, percentageFormatter, resetChartView]);

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
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '5px 10px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
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
            {tooltipData.difference && (
              <div>Percentage Difference: {tooltipData.difference}</div>
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