import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, useMediaQuery } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinMvrvZScoreChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const zScoreSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const marketCapSeriesRef = useRef(null);
  const realizedCapSeriesRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState({
    zScore: true,
    price: true,
    marketCap: false,
    realizedCap: false,
  });
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { txMvrvData: contextTxMvrvData, fetchTxMvrvData, btcData, fetchBtcData, txMvrvLastUpdated } = useContext(DataContext);
  const txMvrvData = propTxMvrvData || contextTxMvrvData;
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Calculate Z-Score for a given key
  const calculateZScore = (data, key) => {
    const values = data.map(item => item[key]).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) {
      console.warn(`No valid data for ${key} in calculateZScore`);
      return [];
    }
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    const zScores = data
      .map(item => ({
        time: item.time,
        value: item[key] !== null && !isNaN(item[key]) && std !== 0 ? (item[key] - mean) / std : null,
      }))
      .filter(item => item.value !== null);
    console.debug(`Calculated Z-Scores for ${key}:`, zScores);
    return zScores;
  };

  const getIndicators = () => ({
    'z-score': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
      label: 'MVRV Z-Score',
      description: 'Z-Score of the MVRV ratio, showing standardized deviations from its historical mean.',
    },
    'price': {
      color: 'gray',
      label: 'Bitcoin Price',
      description: 'The price of Bitcoin over time.',
    },
    'marketCap': {
      color: theme.palette.mode === 'dark' ? 'rgba(0, 191, 255, 1)' : 'rgba(0, 0, 255, 1)',
      label: 'Market Cap Z-Score',
      description: 'Z-Score of the market capitalization, showing standardized deviations from its historical mean.',
    },
    'realizedCap': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 1)' : 'rgba(255, 165, 0, 1)',
      label: 'Realized Cap Z-Score',
      description: 'Z-Score of the realized capitalization, showing standardized deviations from its historical mean.',
    },
  });

  const setInteractivity = () => {
    setIsInteractive(prev => !prev);
  };

  const toggleSeries = (seriesKey) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey]
    }));
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  useEffect(() => {
    fetchTxMvrvData();
    fetchBtcData();
  }, [fetchTxMvrvData, fetchBtcData]);

  useEffect(() => {
    console.debug('txMvrvData:', txMvrvData);
    console.debug('btcData:', btcData);

    if (txMvrvData.length === 0 || btcData.length === 0) {
      console.warn('No data available: txMvrvData or btcData is empty');
      return;
    }

    const cutoffDate = new Date('2011-04-16');
    const filteredTxMvrvData = txMvrvData.filter(
      item => {
        const timeValid = new Date(item.time) >= cutoffDate;
        const mvrvValid = item.mvrv !== null && !isNaN(item.mvrv);
        return timeValid && mvrvValid;
      }
    );
    const filteredBtcData = btcData.filter(item => new Date(item.time) >= cutoffDate);

    console.debug('filteredTxMvrvData:', filteredTxMvrvData);
    console.debug('filteredBtcData:', filteredBtcData);

    if (filteredTxMvrvData.length === 0 || filteredBtcData.length === 0) {
      console.warn('No valid data after filtering');
      return;
    }

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
      leftPriceScale: {
        mode: 0,
        borderVisible: false,
      },
      rightPriceScale: {
        mode: 1,
        borderVisible: false,
      },
    });

    chart.priceScale('left').applyOptions({ mode: 0, borderVisible: false });
    chart.priceScale('right').applyOptions({ mode: 1, borderVisible: false });
    chart.timeScale().fitContent();

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
        const zScoreData = param.seriesData.get(zScoreSeriesRef.current);
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const marketCapData = param.seriesData.get(marketCapSeriesRef.current);
        const realizedCapData = param.seriesData.get(realizedCapSeriesRef.current);
        setTooltipData({
          date: dateStr,
          zScore: zScoreData?.value,
          price: priceData?.value,
          marketCap: marketCapData?.value,
          realizedCap: realizedCapData?.value,
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
      zScore: { lineColor: 'rgba(0, 128, 0, 1)' },
      price: { lineColor: 'gray' },
      marketCap: { lineColor: 'rgba(0, 0, 255, 1)' },
      realizedCap: { lineColor: 'rgba(255, 165, 0, 1)' },
    };
    const darkThemeColors = {
      zScore: { lineColor: 'rgba(255, 99, 71, 1)' },
      price: { lineColor: 'gray' },
      marketCap: { lineColor: 'rgba(0, 191, 255, 1)' },
      realizedCap: { lineColor: 'rgba(255, 215, 0, 1)' },
    };
    const { zScore: zScoreColors, price: priceColors, marketCap: marketCapColors, realizedCap: realizedCapColors } =
      theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    // Bitcoin Price Series
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: priceColors.lineColor,
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: value => (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)),
      },
      visible: visibleSeries.price,
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));

    // MVRV Z-Score Series
    const zScoreData = calculateZScore(filteredTxMvrvData, 'mvrv');
    const zScoreSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: zScoreColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: visibleSeries.zScore,
    });
    zScoreSeriesRef.current = zScoreSeries;
    zScoreSeries.setData(zScoreData);

    // Market Cap Z-Score Series
    const marketCapZScoreData = calculateZScore(filteredTxMvrvData, 'market_cap');
    const marketCapSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: marketCapColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: visibleSeries.marketCap,
    });
    marketCapSeriesRef.current = marketCapSeries;
    marketCapSeries.setData(marketCapZScoreData);

    // Realized Cap Z-Score Series
    const realizedCapZScoreData = calculateZScore(filteredTxMvrvData, 'realized_cap');
    const realizedCapSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: realizedCapColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: visibleSeries.realizedCap,
    });
    realizedCapSeriesRef.current = realizedCapSeries;
    realizedCapSeries.setData(realizedCapZScoreData);

    chartRef.current = chart;

    // Handle cursor styling
    const container = chartContainerRef.current;
    if (container) {
      const style = document.createElement('style');
      style.textContent = `
        .chart-container * {
          cursor: default !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
        chart.remove();
        window.removeEventListener('resize', resizeChart);
      };
    }
  }, [txMvrvData, btcData, isDashboard, theme.palette.mode, visibleSeries]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
      zScoreSeriesRef.current.applyOptions({ visible: visibleSeries.zScore });
      priceSeriesRef.current.applyOptions({ visible: visibleSeries.price });
      marketCapSeriesRef.current.applyOptions({ visible: visibleSeries.marketCap });
      realizedCapSeriesRef.current.applyOptions({ visible: visibleSeries.realizedCap });
    }
  }, [isInteractive, isDashboard, visibleSeries]);

  const indicators = getIndicators();

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div' style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexGrow: 1 }}></div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
          zIndex: 1,
        }}
        onDoubleClick={resetChartView}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {!isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 2,
              backgroundColor: colors.primary[900],
              padding: '5px 10px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '8px' : '12px',
            }}
          >
            {Object.entries(indicators).map(([key, { label, color }]) => (
              <div
                key={key}
                style={{ display: 'flex', alignItems: 'center', marginTop: '5px', cursor: 'pointer' }}
                onClick={() => toggleSeries(key)}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    backgroundColor: visibleSeries[key] ? color : 'grey',
                    marginRight: '5px',
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className='under-chart'>
        {!isDashboard && (
          <LastUpdated customDate={txMvrvLastUpdated} />
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {Object.entries(indicators).map(([key, { label, color, description }]) => (
            <p key={key} style={{ margin: '5px 0' }}>
              <strong style={{ color: visibleSeries[key] ? color : 'grey' }}>{label}:</strong> {description}
            </p>
          ))}
        </Box>
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 10000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              if (rightPosition + tooltipWidth <= chartWidth) return `${rightPosition}px`;
              if (leftPosition >= 0) return `${leftPosition}px`;
              return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 100}px`,
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '15px', color: 'gray' }}>
            BTC Price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
          </div>
          <div style={{ color: indicators['z-score'].color }}>
            MVRV Z-Score: {tooltipData.zScore?.toFixed(2) ?? 'N/A'}
          </div>
          <div style={{ color: indicators['marketCap'].color }}>
            Market Cap Z-Score: {tooltipData.marketCap?.toFixed(2) ?? 'N/A'}
          </div>
          <div style={{ color: indicators['realizedCap'].color }}>
            Realized Cap Z-Score: {tooltipData.realizedCap?.toFixed(2) ?? 'N/A'}
          </div>
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          The Bitcoin Price & MVRV Z-Score chart shows the Bitcoin price, MVRV Z-Score, Market Cap Z-Score, and Realized Cap Z-Score starting from April 16th, 2011, illustrating price trends and standardized valuation deviations.
          <br />
          <br />
          This chart shows the Bitcoin price and Z-Scores of MVRV, Market Cap, and Realized Cap, providing a snapshot of how Bitcoin’s value and standardized metrics interact over time.
          The MVRV (market value to realized value) Z-Score is the standardized deviation of the MVRV ratio from its historical mean, where high positive values may indicate overvaluation and negative values undervaluation.
          Similarly, Market Cap and Realized Cap Z-Scores show standardized deviations of market and realized capitalization.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinMvrvZScoreChart);