import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';

const BitcoinDominanceChart = ({ isDashboard = false, dominanceData: propDominanceData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(true);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { dominanceData: contextDominanceData, fetchDominanceData } = useContext(DataContext);
  const dominanceData = propDominanceData || contextDominanceData;

  const currentDominance = useMemo(() => {
    if (dominanceData.length === 0) return null;
    const latestValue = dominanceData[dominanceData.length - 1]?.value;
    return latestValue ? latestValue.toFixed(2) : null;
  }, [dominanceData]);

  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  const toggleScaleMode = () => {
    setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  useEffect(() => {
    fetchDominanceData();
  }, [fetchDominanceData]);

  // Chart initialization (run once on mount)
  useEffect(() => {
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
      rightPriceScale: {
        mode: scaleMode,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    });

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

    const areaColors = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    const areaSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      topColor: areaColors.topColor,
      bottomColor: areaColors.bottomColor,
      lineColor: areaColors.lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    areaSeriesRef.current = areaSeries;

    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const data = param.seriesData.get(areaSeries);
        setTooltipData({
          date: dateStr,
          price: data?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
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

    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', resizeChart);
      chart.remove();
    };
  }, []); // Empty dependencies to run only once

  // Update dominance data
  useEffect(() => {
    if (areaSeriesRef.current && dominanceData.length > 0) {
      areaSeriesRef.current.setData(dominanceData);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [dominanceData]);

  // Update chart layout and colors when theme changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: colors.greenAccent[700] },
          horzLines: { color: colors.greenAccent[700] },
        },
      });
    }

    if (areaSeriesRef.current) {
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

      const areaColors = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

      areaSeriesRef.current.applyOptions({
        topColor: areaColors.topColor,
        bottomColor: areaColors.bottomColor,
        lineColor: areaColors.lineColor,
      });
    }
  }, [colors, theme.palette.mode]);

  // Update scale mode and interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        mode: scaleMode,
      });
    }
  }, [scaleMode, isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div>
            <label className="switch">
              <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span className="scale-mode-label" style={{ color: colors.primary[100] }}>
              {scaleMode === 1 ? 'Logarithmic' : 'Linear'}
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
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>
      <div className='under-chart'>
        {!isDashboard && dominanceData.length > 0 && (
          <div style={{ }}>
            <LastUpdated storageKey="dominanceData" />
            {currentDominance && (
              <span
                style={{
                  fontSize: '1.3rem',
                  color: colors.blueAccent[500],
                  display: 'block',
                  marginTop: '1.1rem',
                }}
              >
                Bitcoin Dominance: {currentDominance}%
              </span>
            )}
          </div>
        )}
        {!isDashboard && (
          <BitcoinFees />
        )}
      </div>
      {!isDashboard && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px',
            height: 'auto',
            flexWrap: 'wrap',
            gap: '10px 20px',
            padding: '10px',
          }}
        />
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
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
          <div style={{ fontSize: '15px' }}>Bitcoin Dominance</div>
          <div style={{ fontSize: '20px' }}>{tooltipData.price?.toFixed(2)}%</div>
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          This chart shows Bitcoin dominance, which is the percentage of the total cryptocurrency market value that Bitcoin represents. For example, if Bitcoin’s market value is $500 billion and the total market value of all cryptocurrencies is $1 trillion, Bitcoin dominance is 50%. This number helps you understand Bitcoin’s influence compared to other cryptocurrencies like Ethereum or smaller altcoins.
          <br/><br/>A rising dominance means Bitcoin is growing stronger relative to others, often during market downturns when investors prefer Bitcoin’s stability. A falling dominance suggests other cryptocurrencies are gaining ground, which can happen during market booms when altcoins attract more interest.
          The chart uses historical data to show how Bitcoin dominance has changed over time. You can hover over the chart to see the dominance percentage for specific dates.
        </p>
      )}
    </div>
  );
};

export default BitcoinDominanceChart;