import React, { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, useMediaQuery } from '@mui/material';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartInfoSections from './ChartInfoSections';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartTooltip from './ChartTooltip';
import { calculateSMA } from '../utils/technicalIndicators';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

const REALIZED_PRICE_SMA_PERIOD = 28;

const BitcoinMvrvZScoreChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const zScoreSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const realizedPriceSeriesRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { txMvrvData: contextTxMvrvData, btcData, txMvrvLastUpdated } = useChartData();
  const { fetchTxMvrvData, fetchBtcData } = useChartDataActions();
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
      let rc = item.realized_cap;
      if (
        (rc === null || isNaN(rc)) &&
        mc !== null && !isNaN(mc) &&
        item.mvrv !== null && !isNaN(item.mvrv) && item.mvrv !== 0
      ) {
        rc = mc / item.mvrv;
      }
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
  const { filteredTxMvrvData, filteredBtcData, zScoreData, realizedPriceData } = useMemo(() => {
    const cutoffDate = new Date('2011-04-16');
    const fTx = txMvrvData.filter(item => {
      const timeValid = new Date(item.time) >= cutoffDate;
      const mvrvValid = item.mvrv !== null && !isNaN(item.mvrv);
      return timeValid && mvrvValid;
    });
    const fBtc = btcDataForChart.filter(item => new Date(item.time) >= cutoffDate);

    const zScores = (fTx.length > 0) ? calculateMvrvZScore(fTx) : [];
    const mvrvByTime = new Map(fTx.map((item) => [item.time, item.mvrv]));
    const realizedPricesRaw = fBtc
      .map((item) => {
        const mvrv = mvrvByTime.get(item.time);
        if (!mvrv || mvrv === 0) return null;
        return { time: item.time, value: item.value / mvrv };
      })
      .filter(Boolean);
    const realizedPrices = calculateSMA(realizedPricesRaw, REALIZED_PRICE_SMA_PERIOD);

    return {
      filteredTxMvrvData: fTx,
      filteredBtcData: fBtc,
      zScoreData: zScores,
      realizedPriceData: realizedPrices,
    };
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
    'realized-price': {
      color: theme.palette.mode === 'dark' ? 'rgba(100, 149, 237, 1)' : 'rgba(30, 144, 255, 1)',
      label: 'Realized Price',
      description: `28-day SMA of average on-chain cost basis per BTC (price ÷ MVRV), plotted on the same scale as spot price.`,
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
    // Use memoized derived data, prevents expensive chart recreation when DataContext
    // causes new array references for unrelated data updates elsewhere in the app.
    if (filteredTxMvrvData.length === 0 || filteredBtcData.length === 0) {
      return;
    }
    // Dual scales (same pattern as Floor Echo / dual-axis risk charts):
    // left = BTC spot + realized price (log), right = MVRV Z-Score (linear).
    // Left scale must set visible: true — lightweight-charts hides it by default.
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
        visible: true,
        mode: 1, // logarithmic for price
        borderVisible: true,
        borderColor: 'rgba(197, 203, 206, 0.35)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
        entireTextOnly: false,
      },
      rightPriceScale: {
        visible: true,
        mode: 0, // linear for Z-score
        borderVisible: true,
        borderColor: 'rgba(197, 203, 206, 0.35)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
    });
    chart.priceScale('left').applyOptions({
      visible: true,
      mode: 1,
      borderVisible: true,
      scaleMargins: { top: 0.08, bottom: 0.08 },
    });
    chart.priceScale('right').applyOptions({
      visible: true,
      mode: 0,
      borderVisible: true,
      scaleMargins: { top: 0.08, bottom: 0.08 },
    });
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
        const realizedPriceDataPoint = param.seriesData.get(realizedPriceSeriesRef.current);
        setTooltipData({
          date: dateStr,
          zScore: zScoreData?.value,
          price: priceData?.value,
          realizedPrice: realizedPriceDataPoint?.value,
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
      realizedPrice: { lineColor: 'rgba(30, 144, 255, 1)' },
    };
    const darkThemeColors = {
      zScore: { lineColor: 'rgba(255, 99, 71, 1)' },
      price: { lineColor: 'gray' },
      realizedPrice: { lineColor: 'rgba(100, 149, 237, 1)' },
    };
    const { zScore: zScoreColors, price: priceColors, realizedPrice: realizedPriceColors } =
      theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;
    const priceAxisFormatter = (value) =>
      value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toFixed(0);

    // Bitcoin price — left Y-axis (log), last value label so the scale is readable
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: priceColors.lineColor,
      lineWidth: 0.7,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: 'custom',
        formatter: priceAxisFormatter,
      },
      visible: true,
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));

    // Realized price — same left scale; blue last-value label on the price axis (non-intrusive)
    const realizedPriceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: realizedPriceColors.lineColor,
      lineWidth: 1.2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: priceAxisFormatter,
      },
      visible: true,
    });
    realizedPriceSeriesRef.current = realizedPriceSeries;
    realizedPriceSeries.setData(realizedPriceData);

    // MVRV Z-Score — right Y-axis
    const zScoreSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: zScoreColors.lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
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
  }, [filteredTxMvrvData, filteredBtcData, zScoreData, realizedPriceData, isDashboard, theme.palette.mode]);

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
        <>
          <div className="chart-top-div" style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flexGrow: 1 }} />
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
          {/* Series key outside the chart (same pattern as Floor Echo / risk pages) so left-axis labels stay visible */}
          <div className="chart-top-div">
            <div className="span-container">
              {Object.entries(indicators).map(([key, { label, color }]) => (
                <span
                  key={key}
                  style={{
                    marginRight: '20px',
                    display: 'inline-block',
                    color: colors.primary[100],
                    fontSize: isNarrowScreen ? '11px' : '13px',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: color,
                      height: '10px',
                      width: '10px',
                      display: 'inline-block',
                      marginRight: '5px',
                      borderRadius: key === 'realized-price' ? 0 : 1,
                      // dashed-line cue for realized price
                      ...(key === 'realized-price'
                        ? {
                            backgroundColor: 'transparent',
                            borderBottom: `2px dashed ${color}`,
                            height: 0,
                            width: '16px',
                            verticalAlign: 'middle',
                          }
                        : {}),
                    }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
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
          <ChartTooltip
            tooltipData={tooltipData}
            chartContainerRef={chartContainerRef}
            isNarrowScreen={isNarrowScreen}
            render={(td) => (
              <>
                <div style={{ fontSize: '15px', color: 'gray' }}>
                  BTC Price: ${td.price ? (td.price / 1000).toFixed(1) + 'k' : 'N/A'}
                </div>
                <div style={{ color: indicators['realized-price'].color }}>
                  Realized Price: ${td.realizedPrice ? (td.realizedPrice / 1000).toFixed(1) + 'k' : 'N/A'}
                </div>
                <div style={{ color: indicators['z-score'].color }}>
                  MVRV Z-Score: {td.zScore?.toFixed(2) ?? 'N/A'}
                </div>
                <div>{td.date?.toString()}</div>
              </>
            )}
          />
        )}
      </div>
      <UnderChartRow>
        {!isDashboard && (
          <LastUpdated customDate={txMvrvLastUpdated} />
        )}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>
      {!isDashboard && (
        <>
          <UnderChartValue>
            <Box sx={{ color: colors.primary[100], fontSize: { xs: '0.9rem', sm: '1rem' }, lineHeight: 1.5 }}>
              {Object.entries(indicators).map(([key, { label, color, description }]) => (
                <p key={key} style={{ margin: '4px 0' }}>
                  <strong style={{ color }}>{label}:</strong> {description}
                </p>
              ))}
            </Box>
          </UnderChartValue>
          <ChartInfoSections
            sections={[
              {
                title: 'What this chart shows',
                content: 'The Bitcoin Price & MVRV Z-Score chart shows Bitcoin spot price and smoothed realized price (28-day SMA of spot ÷ MVRV) on the left Y-axis (log scale), and the MVRV Z-Score on the right Y-axis. The blue label on the left axis is the latest realized price. The Z-Score is only calculated after at least 365 data points to avoid early-sample instability.',
              },
              {
                title: 'How it is built',
                content: 'The MVRV Z-Score is the relative indicator, which is the circulating market value of Bitcoin minus the realized market value, standardized by the running standard deviation of the circulating market value up to that point.',
              },
              {
                title: 'How to interpret',
                content: 'When this indicator is too high, it means that the market value of Bitcoin is overvalued relative to its actual value; otherwise, it means undervaluation.',
              },
            ]}
          />
        </>
      )}

    </div>
  );
};

const MemoizedBitcoinMvrvZScoreChart = memo(BitcoinMvrvZScoreChart);
export default restrictToPaidSubscription(MemoizedBitcoinMvrvZScoreChart);