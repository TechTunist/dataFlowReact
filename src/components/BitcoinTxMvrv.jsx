import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';

const BitcoinTxMvrvChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const txCountSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const [scaleMode, setScaleMode] = useState(1); // 1 = logarithmic, 0 = linear
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const { txMvrvData: contextTxMvrvData, fetchTxMvrvData } = useContext(DataContext);
  const txMvrvData = propTxMvrvData || contextTxMvrvData;
  const { txMvrvLastUpdated } = useContext(DataContext);

  const setInteractivity = () => {
    setIsInteractive(prev => !prev);
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
    fetchTxMvrvData();
  }, [fetchTxMvrvData]);

  useEffect(() => {
    if (txMvrvData.length === 0) return;

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
      handleScroll: isInteractive && !isDashboard,
      handleScale: isInteractive && !isDashboard,
    });

    chart.priceScale('left').applyOptions({
      mode: scaleMode,
      borderVisible: false,
    });

    chart.priceScale('right').applyOptions({
      mode: 0, // Linear for MVRV
      borderVisible: false,
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
        const dateStr = param.time;
        const txCountData = param.seriesData.get(txCountSeriesRef.current);
        const mvrvData = param.seriesData.get(mvrvSeriesRef.current);
        setTooltipData({
          date: dateStr,
          txCount: txCountData?.value,
          mvrv: mvrvData?.value,
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
      }
    };

    window.addEventListener('resize', resizeChart);

    const lightThemeColors = {
      txCount: {
        topColor: 'rgba(255, 165, 0, 0.56)',
        bottomColor: 'rgba(255, 165, 0, 0.2)',
        lineColor: 'rgba(255, 140, 0, 0.8)',
      },
      mvrv: {
        lineColor: 'rgba(0, 128, 0, 1)',
      },
    };

    const darkThemeColors = {
      txCount: {
        topColor: 'rgba(38, 198, 218, 0.56)',
        bottomColor: 'rgba(38, 198, 218, 0.04)',
        lineColor: 'rgba(38, 198, 218, 1)',
      },
      mvrv: {
        lineColor: 'rgba(255, 99, 71, 1)',
      },
    };

    const { txCount: txCountColors, mvrv: mvrvColors } = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    // Full tx_count data
    const txCountSeries = chart.addAreaSeries({
      priceScaleId: 'left',
      topColor: txCountColors.topColor,
      bottomColor: txCountColors.bottomColor,
      lineColor: txCountColors.lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        minMove: 1,
        formatter: value => value.toFixed(0),
      },
    });
    txCountSeriesRef.current = txCountSeries;
    txCountSeries.setData(txMvrvData.map(item => ({ time: item.time, value: item.tx_count })));

    // MVRV data filtered to start from 2011-04-14
    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: mvrvColors.lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    mvrvSeriesRef.current = mvrvSeries;
    const cutoffDate = new Date('2011-04-14');
    mvrvSeries.setData(
      txMvrvData
        .filter(item => new Date(item.time) >= cutoffDate)
        .map(item => ({ time: item.time, value: item.mvrv }))
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [txMvrvData, scaleMode, isDashboard, theme.palette.mode]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
    }
  }, [isInteractive, isDashboard]);

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
          height: 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={() => setInteractivity(prev => !prev)}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>

      <div className='under-chart'>
      <span style={{ color: colors.greenAccent[500] }}>Last Updated: {txMvrvLastUpdated}</span>
        {!isDashboard && <BitcoinFees />}
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
          <div style={{ fontSize: '15px' }}>Bitcoin Tx Count & MVRV</div>
          <div style={{ fontSize: '20px' }}>
            Tx: {tooltipData.txCount?.toFixed(0)} | MVRV: {tooltipData.mvrv?.toFixed(2) ?? 'N/A'}
          </div>
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}

      {!isDashboard && (
        <p className='chart-info'>
          The Bitcoin Tx Count & MVRV chart shows the daily transaction count (left axis) and the Market Value to Realized Value ratio (right axis, starting April 14, 2011) over time, illustrating network activity and valuation trends.
        </p>
      )}
    </div>
  );
};

export default BitcoinTxMvrvChart;