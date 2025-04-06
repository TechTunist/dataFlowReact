import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';

const BitcoinLogRegression = ({ isDashboard = false, priceData: propPriceData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null); // Store price series for crosshair
  const logRegressionBaseSeriesRef = useRef(null); // Store regression series for crosshair
  const logRegressionBase2SeriesRef = useRef(null);
  const logRegressionMidSeriesRef = useRef(null);
  const logRegressionTopSeriesRef = useRef(null);
  const logRegression2TopSeriesRef = useRef(null);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  // Access DataContext
  const { btcData: contextPriceData, fetchBtcData } = useContext(DataContext);

  // Use prop data if provided, otherwise fall back to context data
  const priceData = propPriceData || contextPriceData;

  // Function to set chart interactivity
  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  // Function to format numbers to 'k', 'M', 'B', 'T', etc.
  function compactNumberFormatter(value) {
    if (value >= 1e12) {
      return (value / 1e12).toFixed(2) + 'T'; // Trillions with 2 decimal places
    } else if (value >= 1e9) {
      return (value / 1e9).toFixed(0) + 'B'; // Billions without decimal places
    } else if (value >= 1e6) {
      return (value / 1e6).toFixed(0) + 'M'; // Millions without decimal places
    } else if (value >= 1e3) {
      return (value / 1e3).toFixed(0) + 'k'; // Thousands without decimal places
    } else {
      return value.toFixed(0); // For values less than 1000, show the full number
    }
  }

  // Function to toggle scale mode
  const toggleScaleMode = () => {
    setScaleMode(prevMode => (prevMode === 1 ? 2 : 1));
  };

  // Function to reset the chart view
  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  const calculateLogarithmicRegression = (data) => {
    const n = data.length;
    const sumLogX = data.reduce((sum, point, index) => sum + Math.log(index + 1), 0);
    const sumY = data.reduce((sum, point) => sum + Math.log(point.value), 0);
    const sumLogXSquared = data.reduce((sum, point, index) => sum + Math.log(index + 1) ** 2, 0);
    const sumLogXLogY = data.reduce((sum, point, index) => sum + Math.log(index + 1) * Math.log(point.value), 0);

    const slope = (n * sumLogXLogY - sumLogX * sumY) / (n * sumLogXSquared - sumLogX ** 2);
    const intercept = (sumY - slope * sumLogX) / n;

    return { slope, intercept };
  };

  const extendRegressionPoints = (data, days) => {
    const lastDate = new Date(data[data.length - 1].time);
    const extendedData = [...data];
    for (let i = 1; i <= days; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);
      extendedData.push({ time: nextDate.toISOString().split('T')[0], value: null });
    }

    // Ensure the data is sorted and unique
    return removeDuplicates(
      extendedData.sort((a, b) => new Date(a.time) - new Date(b.time))
    );
  };

  const removeDuplicates = (data) => {
    return data.filter((item, index, self) =>
      index === self.findIndex((t) => t.time === item.time)
    );
  };

  useEffect(() => {
    if (priceData.length === 0) return;

    const extendedData = extendRegressionPoints(priceData, 730); // Extend by 2 years
    const { slope, intercept } = calculateLogarithmicRegression(priceData);

    const calculateRegressionPoints = (scale, color, shiftDays = 0, curveAdjustment = 1) => {
      const points = extendedData.map(({ time }, index) => {
        const x = Math.log(index + 1 - shiftDays + 1);
        const adjustedX = Math.pow(x, curveAdjustment);
        const delta = intercept - 11.5;
        const adjustedSlope = slope + 2;
        const y = Math.exp(adjustedSlope * adjustedX + delta) * scale;
        return { time, value: y };
      });
      const regressionSeries = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        lineStyle: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      regressionSeries.setData(points);
      return regressionSeries;
    };

    // Initialize the chart only once
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: {
          color: colors.greenAccent[700],
        },
        horzLines: {
          color: colors.greenAccent[700],
        },
      },
      timeScale: {
        minBarSpacing: 0.001,
      },
    });

    chart.subscribeCrosshairMove(param => {
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
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const price = priceData?.value;

        const logBaseData = param.seriesData.get(logRegressionBaseSeriesRef.current);
        const logBase2Data = param.seriesData.get(logRegressionBase2SeriesRef.current);
        const logMidData = param.seriesData.get(logRegressionMidSeriesRef.current);
        const logTopData = param.seriesData.get(logRegressionTopSeriesRef.current);
        const logTop2Data = param.seriesData.get(logRegression2TopSeriesRef.current);

        setTooltipData({
          date: dateStr,
          price: price ? compactNumberFormatter(price) : undefined,
          logBase: logBaseData?.value ? compactNumberFormatter(logBaseData.value) : undefined,
          logBase2: logBase2Data?.value ? compactNumberFormatter(logBase2Data.value) : undefined,
          logMid: logMidData?.value ? compactNumberFormatter(logMidData.value) : undefined,
          logTop: logTopData?.value ? compactNumberFormatter(logTopData.value) : undefined,
          logTop2: logTop2Data?.value ? compactNumberFormatter(logTop2Data.value) : undefined,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    chart.priceScale('right').applyOptions({
      mode: scaleMode,
      borderVisible: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        chart.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', resizeChart);
    window.addEventListener('resize', resetChartView);

    const lightThemeColors = {
      topColor: 'rgba(255, 165, 0, 0.56)',
      bottomColor: 'rgba(255, 165, 0, 0.2)',
      lineColor: 'rgba(255, 140, 0, 0.8)',
    };

    const darkThemeColors = {
      topColor: 'rgba(38, 198, 218, 0.56)',
      bottomColor: 'rgba(38, 198, 218, 0.04)',
      lineColor: 'rgba(38, 198, 218, 1)',
    };

    const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      topColor: topColor,
      bottomColor: bottomColor,
      lineColor: lineColor,
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(priceData);

    const logRegression2TopSeries = calculateRegressionPoints(0.9, 'lime', -500, 0.96);
    logRegression2TopSeriesRef.current = logRegression2TopSeries;
    const logRegressionTopSeries = calculateRegressionPoints(0.041, 'green', -410, 0.99);
    logRegressionTopSeriesRef.current = logRegressionTopSeries;
    const logRegressionMidSeries = calculateRegressionPoints(0.033, 'violet', -350, 0.986);
    logRegressionMidSeriesRef.current = logRegressionMidSeries;
    const logRegressionBaseSeries = calculateRegressionPoints(0.015, 'red', -320, 0.985);
    logRegressionBaseSeriesRef.current = logRegressionBaseSeries;
    const logRegressionBase2Series = calculateRegressionPoints(0.01, 'maroon', -300, 0.985);
    logRegressionBase2SeriesRef.current = logRegressionBase2Series;

    chart.applyOptions({
      handleScroll: !isDashboard,
      handleScale: !isDashboard,
      handleScroll: isInteractive,
      handleScale: isInteractive,
    });

    resizeChart();
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
      window.removeEventListener('resize', resetChartView);
    };
  }, [priceData, scaleMode, isDashboard, theme.palette.mode]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div />
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
          height: 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) {
              setInteractivity();
            } else {
              setInteractivity();
            }
          }}
        />
      </div>

      <div className='under-chart'>
        {!isDashboard && (
          <LastUpdated storageKey="btcData" />
        )}
        {!isDashboard && (
          <BitcoinFees />
        )}
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
              const K = 10000;
              const C = 300;
              const offset = K / (chartWidth + C);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              if (rightPosition + tooltipWidth <= chartWidth) {
                return `${rightPosition}px`;
              } else if (leftPosition >= 0) {
                return `${leftPosition}px`;
              } else {
                return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
              }
            })(),
            top: `${tooltipData.y + 100}px`,
          }}
        >
          <b>
            {tooltipData.price && <div>Actual Price: ${tooltipData.price}</div>}
            {tooltipData.logTop2 && <div style={{ color: 'lime' }}>Upper Band 2: ${tooltipData.logTop2}</div>}
            {tooltipData.logTop && <div style={{ color: 'green' }}>Upper Band: ${tooltipData.logTop}</div>}
            {tooltipData.logMid && <div style={{ color: 'violet' }}>Mid Band: ${tooltipData.logMid}</div>}
            {tooltipData.logBase && <div style={{ color: 'red' }}>Lower Band: ${tooltipData.logBase}</div>}
            {tooltipData.logBase2 && <div style={{ color: 'maroon' }}>Lower Band 2: ${tooltipData.logBase2}</div>}
            {tooltipData.date && <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>}
          </b>
        </div>
      )}

      {!isDashboard && (
        <p className='chart-info'>
          The logarithmic regression of Bitcoin's price history captures the essence of its volatile yet upward-trending journey through upper,
          mid, and lower range trendlines. These trendlines illustrate the expansive growth potential, the average trajectory,
          and the foundational support levels of Bitcoin's price action over time.
          The upper range highlights periods of exuberant market optimism and speculative peaks, while the lower range marks significant buying
          opportunities during market corrections. The mid-range trendline serves as a more stable reference point, indicating the long-term growth
          path of Bitcoin amidst its cyclical price movements. Together, these logarithmic regression lines offer a comprehensive view of Bitcoin's
          historical and potential future price behavior, emphasizing its resilience and the increasing adoption curve.
          <br />
          <br />
        </p>
      )}
    </div>
  );
};

export default BitcoinLogRegression;