import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';
import { useFavorites } from '../contexts/FavoritesContext';

// TODO: Return to fixing the IndexedDB / DataContext caching for authenticated requests in the future.
// Currently, after clearing apiData store, data renders from in-memory Context state
// but does not reliably repopulate the IndexedDB cache for all endpoints.
// This component (and others) depend on the central fetch path that should handle caching + JWT.

// Asymmetric Tail Curvature Quantile Model (Cowen 2026)
// Based on "Asymmetric Tail Curvature in Bitcoin Price Quantiles" working paper
// Coefficients from Table 3 (full sample, rearranged asymmetric quadratic quantile regression)
// Time: days since 2009-01-03 (genesis block), centered with μ ≈ 7.9914
// Formula (log10 price space): Qτ(log10 P(t)) = cτ + aτ·x + b(τ)·x² where x = ln(t) - μ

const GENESIS_DATE = '2009-01-03';
const MU = 7.9914; // centering constant from the paper

// Quantile parameters (τ, c, a, b)
// b is shared within tail groups per the asymmetric specification
const QUANTILE_PARAMS = [
  { tau: 0.01, label: '1%',  c: 2.837, a: 2.578, b: -0.0241, color: '#4ade80' },
  { tau: 0.10, label: '10%', c: 2.933, a: 2.552, b: -0.0241, color: '#22c55e' },
  { tau: 0.25, label: '25%', c: 3.004, a: 2.554, b: -0.0241, color: '#16a34a' },
  { tau: 0.50, label: '50% (Median)', c: 3.214, a: 2.482, b: -0.1126, color: '#eab308' },
  { tau: 0.75, label: '75%', c: 3.562, a: 2.283, b: -0.3259, color: '#f97316' },
  { tau: 0.95, label: '95%', c: 3.897, a: 1.964, b: -0.3259, color: '#ef4444' },
  { tau: 0.99, label: '99%', c: 4.028, a: 1.904, b: -0.3259, color: '#b91c1c' },
];

const TailCurvature = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const quantileSeriesRefs = useRef({});
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  const { btcData: contextBtcData, btcLastUpdated } = useContext(DataContext);

  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showQuantiles, setShowQuantiles] = useState(true);

  // Use BTC daily close data from context (already authenticated via DataContext)
  const btcData = useMemo(() => {
    const seen = new Set();
    return (contextBtcData || [])
      .filter(item => {
        const time = item.time || item.date;
        if (!time) return false;
        const key = typeof time === 'string' ? time : time.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date));
  }, [contextBtcData]);

  // Compute model quantile values for the historical data + some future extension
  const modelData = useMemo(() => {
    if (btcData.length === 0) return {};

    const genesis = new Date(GENESIS_DATE);
    const result = {};

    QUANTILE_PARAMS.forEach(param => {
      const seriesData = btcData.map(point => {
        const date = new Date(point.time || point.date);
        const t = Math.max(1, Math.floor((date - genesis) / (1000 * 60 * 60 * 24)));
        const x = Math.log(t) - MU;
        const log10P = param.c + param.a * x + param.b * x * x;
        const price = Math.pow(10, log10P);
        return {
          time: point.time || point.date,
          value: price,
        };
      });
      result[param.label] = seriesData;
    });

    return result;
  }, [btcData]);

  // Fetch is handled by parent DataContext (JWT is sent automatically)
  useEffect(() => {
    if (btcData.length > 0) return;
    setIsLoading(true);
    // The actual fetch is managed centrally in DataContext now
    // We just wait for it
    const timer = setTimeout(() => {
      if (btcData.length === 0) {
        setError('Waiting for BTC price data (requires sign-in)...');
      }
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [btcData.length]);

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  // Apply interactivity setting to the chart when it changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ 
        handleScroll: isInteractive, 
        handleScale: isInteractive 
      });
    }
  }, [isInteractive]);

  // Initialize chart (price series only - stable)
  useEffect(() => {
    if (btcData.length === 0 || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        // horzLines: { color: colors.greenAccent[700] },
        horzLines: { visible: false },
      },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        mode: 1, // Logarithmic
        borderVisible: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: false,
      handleScale: false,
    });

    // Main BTC price series
    const priceSeries = chart.addLineSeries({
      color: colors.greenAccent[500],
      lineWidth: 2,
      title: 'BTC Price',
    });
    priceSeriesRef.current = priceSeries;

    priceSeries.setData(
      btcData.map((d) => ({
        time: d.time || d.date,
        value: d.value || d.close,
      }))
    );

    // Always fit content on initial creation
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Crosshair tooltip (simplified)
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setTooltipData(null);
        return;
      }
      const priceData = param.seriesData.get(priceSeriesRef.current);
      if (priceData) {
        setTooltipData({
          date: param.time,
          price: priceData.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    return () => {
      window.removeEventListener('resize', resizeChart);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      quantileSeriesRefs.current = {};
    };
  }, [btcData, colors]);

  // Dynamically manage quantile series without destroying the main chart
  // This prevents zoom resets when toggling showQuantiles
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || btcData.length === 0) return;

    // Clear any previous quantile series
    Object.keys(quantileSeriesRefs.current).forEach(key => {
      const series = quantileSeriesRefs.current[key];
      if (series) {
        chart.removeSeries(series);
      }
    });
    quantileSeriesRefs.current = {};

    if (showQuantiles && Object.keys(modelData).length > 0) {
      // Save current visible range before adding series
      const visibleRange = chart.timeScale().getVisibleRange();

      QUANTILE_PARAMS.forEach((param) => {
        const seriesData = modelData[param.label];
        if (!seriesData || seriesData.length === 0) return;

        const qSeries = chart.addLineSeries({
          color: param.color,
          lineWidth: 1,           // Thinner to reduce clutter
          lineStyle: 2,
          title: param.label,
        });

        qSeries.setData(seriesData);
        quantileSeriesRefs.current[param.label] = qSeries;
      });

      // Restore previous visible range to avoid unwanted zoom
      if (visibleRange) {
        chart.timeScale().setVisibleRange(visibleRange);
      } else {
        chart.timeScale().fitContent();
      }
    }
  }, [showQuantiles, modelData, btcData, colors]);

  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
    return value.toFixed(0);
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isDashboard && (
        <div className="chart-top-div">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Show/Hide Quantiles button - restored */}
            <button
              onClick={() => setShowQuantiles(!showQuantiles)}
              className="button-reset"
              style={{
                backgroundColor: showQuantiles ? '#4cceac' : 'transparent',
                color: showQuantiles ? 'black' : '#31d6aa',
                borderColor: showQuantiles ? 'violet' : '#70d8bd',
              }}
            >
              {showQuantiles ? 'Hide Quantiles' : 'Show Quantiles'}
            </button>

            <span style={{ color: colors.grey[100], fontSize: '13px' }}>
              Asymmetric Tail Curvature (Cowen 2026)
            </span>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)', 
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
          zIndex: 1,
        }}
        onDoubleClick={() => setInteractivity(!isInteractive)}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>

      {!isDashboard && (
      <div className='under-chart' style={{ padding: '10px 0', display: 'block' }}>
          {/* Last Updated on its own row on the left */}
          <div style={{ marginBottom: '6px' }}>
            <LastUpdated storageKey="btcData" />
          </div>
          <div style={{ color: colors.grey[100], fontSize: '14px' }}>
            Visualization of the asymmetric quadratic quantile regression model from{' '}
            <a href="https://benjamincowen.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.greenAccent[500] }}>
              Benjamin Cowen (2026)
            </a>
            . Lower tail near-linear (structural), upper tail has significant negative curvature (speculative).{' '}
            <strong>Note:</strong> Full caching improvements in DataContext still pending.
          </div>
        </div>
      )}
    </div>
  );
};

export default TailCurvature;