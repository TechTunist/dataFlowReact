import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees'; // Replace or remove if not needed

const SP500DivUnrateChart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const [data, setData] = useState([]);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  // Fetch data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://vercel-dataflow.vercel.app/api/sp500-div-unrate-squared/');
        const jsonData = await response.json();
        const sortedData = jsonData
          .map(item => ({
            time: item.time,
            value: parseFloat(item.value)
          }))
          .sort((a, b) => new Date(a.time) - new Date(b.time));
        setData(sortedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Function to format numbers to match BitcoinLogRegression
  const compactNumberFormatter = (value) => {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(0) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  // Toggle interactivity
  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  // Toggle scale mode
  const toggleScaleMode = () => {
    setScaleMode(prevMode => (prevMode === 1 ? 2 : 1));
  };

  // Reset chart view
  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Initialize chart
  useEffect(() => {
    if (data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      timeScale: {
        minBarSpacing: 0.001,
      },
    });

    chart.subscribeCrosshairMove(param => {
      if (
        !param.time ||
        !param.point ||
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
        setTooltipData({
          date: dateStr,
          price: price ? compactNumberFormatter(price) : undefined,
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
      topColor,
      bottomColor,
      lineColor,
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(data);

    chart.applyOptions({
      handleScroll: isInteractive || !isDashboard,
      handleScale: isInteractive || process.env.NODE_ENV !== 'production' || !isDashboard, // Match exact logic
    });

    resizeChart();
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
      window.removeEventListener('resize', resetChartView);
    };
  }, [data, scaleMode, isDashboard, theme.palette.mode, colors]);

  // Update interactivity options
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive || !isDashboard,
        handleScale: isInteractive || process.env.NODE_ENV !== 'production' || !isDashboard,
      });
    }
  }, [isInteractive, isDashboard]);

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
            <button
              onClick={toggleScaleMode}
              className="button-reset"
              style={{
                backgroundColor: scaleMode === 2 ? '#4cceac' : 'transparent',
                color: scaleMode === 2 ? 'black' : '#31d6aa',
                borderColor: scaleMode === 2 ? 'violet' : '#70d8bd',
                marginLeft: '10px',
              }}
            >
              {scaleMode === 1 ? 'Log Scale' : 'Linear Scale'}
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
          onDoubleClick={() => {
            setInteractivity();
          }}
        />
      </div>

      <div className='under-chart'>
        {!isDashboard && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated storageKey="sp500DivUnrateData" />
          </div>
        )}
        {!isDashboard && (
          <BitcoinFees /> // Replace with relevant component or remove
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
            {tooltipData.price && <div>Actual Price: {tooltipData.price}</div>}
            {tooltipData.date && <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>}
          </b>
        </div>
      )}

      {!isDashboard && (
        <p className='chart-info'>
          The S&P 500 Dividend Yield divided by Unemployment Rate Squared chart visualizes the relationship between
          dividend yields and labor market conditions over time. This metric provides insight into economic cycles,
          where higher values may indicate undervaluation of equities relative to unemployment trends, and lower
          values may suggest overvaluation or strong economic conditions. The chart tracks historical data to highlight
          long-term trends and potential investment signals based on this unique economic indicator.
          <br />
          <br />
        </p>
      )}
    </div>
  );
};

export default SP500DivUnrateChart;