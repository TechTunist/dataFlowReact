import React, { useRef, useEffect, useState, useContext, useMemo, useCallback, memo } from 'react';
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
import ChartTooltip from './ChartTooltip';

const BitcoinMvrvZScoreChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const zScoreSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { txMvrvData: contextTxMvrvData, fetchTxMvrvData, btcData, fetchBtcData, txMvrvLastUpdated } = useContext(DataContext);
  const rawTxMvrvData = propTxMvrvData || contextTxMvrvData;
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Memoize raw data selection for stable references
  const txMvrvData = useMemo(() => rawTxMvrvData || [], [rawTxMvrvData]);
  const btcDataForChart = useMemo(() => btcData || [], [btcData]);

  // Memoized expensive Z-Score calculation (pure function, no mutation of input)
  const calculateMvrvZScore = useCallback((data) => {
    const minWindow = 365;
    // Sort a copy to avoid mutating source data (original code mutated input)
    const sorted = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const zScores = [];
    const pastMarkets = [];
    for (const item of sorted) {
      const mc = item.market_cap;
      const rc = item.realized_cap;
      if (mc === null || isNaN(mc) || rc === null || isNaN(rc)) continue;
      pastMarkets.push(mc);
      if (pastMarkets.length < 2) continue;
      const mean = pastMarkets.reduce((sum, v) => sum + v, 0) / pastMarkets.length;
      const variance = pastMarkets.reduce((sum, v) => sum + (v - mean) ** 2, 0) / pastMarkets.length;
      const std = Math.sqrt(variance);
      if (std === 0) continue;
      const diff = mc - rc;
      const z = diff / std;
      if (pastMarkets.length >= minWindow) {
        zScores.push({ time: item.time, value: z });
      }
    }
    return zScores;
  }, []);

  // Memoize filtered data + z-score derivation so downstream effects only re-run on actual content change
  const { filteredTxMvrvData, filteredBtcData, zScoreData } = useMemo(() => {
    const cutoffDate = new Date('2011-04-16');
    const fTx = txMvrvData.filter(item => {
      const timeValid = new Date(item.time) >= cutoffDate;
      const mvrvValid = item.mvrv !== null && !isNaN(item.mvrv);
      return timeValid && mvrvValid;
    });
    const fBtc = btcDataForChart.filter(item => new Date(item.time) >= cutoffDate);

    const zScores = (fTx.length > 0) ? calculateMvrvZScore(fTx) : [];
    return { filteredTxMvrvData: fTx, filteredBtcData: fBtc, zScoreData: zScores };
  }, [txMvrvData, btcDataForChart, calculateMvrvZScore]);

  const getIndicators = useMemo(() => ({
    'z-score': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
      label: 'MVRV Z-Score',
      description: 'Calculated as (Market Cap - Realized Cap) / running Std Dev of Market Cap, identifying extremes in valuation.',
    },
    'price': {
      color: 'gray',
      label: 'Bitcoin Price',
      description: 'The price of Bitcoin over time.',
    },
  }), [theme.palette.mode]);

  const setInteractivity = () => {
    setIsInteractive(prev => !prev);
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
    // Use memoized derived data — prevents expensive chart recreation when DataContext
    // causes new array references for unrelated data updates elsewhere in the app.
    if (filteredTxMvrvData.length === 0 || filteredBtcData.length === 0) {
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
        mode: 1,
        borderVisible: false,
      },
      rightPriceScale: {
        mode: 0,
        borderVisible: false,
      },
    });
    chart.priceScale('left').applyOptions({ mode: 1, borderVisible: false });
    chart.priceScale('right').applyOptions({ mode: 0, borderVisible: false });
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
        setTooltipData({
          date: dateStr,
          zScore: zScoreData?.value,
          price: priceData?.value,
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
    };
    const darkThemeColors = {
      zScore: { lineColor: 'rgba(255, 99, 71, 1)' },
      price: { lineColor: 'gray' },
    };
    const { zScore: zScoreColors, price: priceColors } =
      theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;
    // Bitcoin Price Series
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: priceColors.lineColor,
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: value => (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)),
      },
      visible: true,
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));
    // MVRV Z-Score Series — use pre-computed memoized zScoreData
    const zScoreSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: zScoreColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: true,
    });
    zScoreSeriesRef.current = zScoreSeries;
    zScoreSeries.setData(zScoreData);
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
  }, [filteredTxMvrvData, filteredBtcData, zScoreData, isDashboard, theme.palette.mode]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
    }
  }, [isInteractive, isDashboard]);

  const indicators = getIndicators;

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
        onDoubleClick={setInteractivity}
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
                style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    backgroundColor: color,
                    marginRight: '5px',
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        )}
      
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} isNarrowScreen={isNarrowScreen} render={(tooltipData) => (
<>
<div style={{ fontSize: '15px', color: 'gray' }}>
            BTC Price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
          </div>
          <div style={{ color: indicators['z-score'].color }}>
            MVRV Z-Score: {tooltipData.zScore?.toFixed(2) ?? 'N/A'}
          </div>
          <div>{tooltipData.date?.toString()}</div>
</>
)} />
        )}</div>
      <div className='under-chart'>
        {!isDashboard && (
          <LastUpdated customDate={txMvrvLastUpdated} />
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {Object.entries(indicators).filter(([key]) => key === 'z-score').map(([key, { label, color, description }]) => (
            <p key={key} style={{ margin: '5px 0' }}>
              <strong style={{ color: color }}>{label}:</strong> {description}
            </p>
          ))}
        </Box>
      )}
      
      {!isDashboard && (
        <p className='chart-info'>
          The Bitcoin Price & MVRV Z-Score chart shows the Bitcoin price and MVRV Z-Score starting from April 16th, 2011, illustrating price trends and standardized valuation deviations. The MVRV Z-Score is only calculated and displayed after at least 365 data points to avoid initial instability due to small sample size.
          <br />
          <br />
          This chart shows the Bitcoin price and MVRV Z-Score, providing a snapshot of how Bitcoin’s value and standardized metrics interact over time.
          The MVRV Z-Score is the relative indicator, which is the circulating market value of Bitcoin minus the realized market value, standardized by the running standard deviation of the circulating market value up to that point.
          When this indicator is too high, it means that the market value of Bitcoin is overvalued relative to its actual value; otherwise, it means undervaluation.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

const MemoizedBitcoinMvrvZScoreChart = memo(BitcoinMvrvZScoreChart);
export default restrictToPaidSubscription(MemoizedBitcoinMvrvZScoreChart);