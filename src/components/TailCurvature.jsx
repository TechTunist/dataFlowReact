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

// Helper: days since Bitcoin genesis block
function getDaysSinceGenesis(dateStr) {
  const genesis = new Date(GENESIS_DATE);
  const d = new Date(dateStr);
  return Math.max(1, Math.floor((d - genesis) / (1000 * 60 * 60 * 24)));
}

// Core model function: returns projected price for a given date and quantile parameters
function computeProjectedPrice(dateStr, param) {
  const t = getDaysSinceGenesis(dateStr);
  const x = Math.log(t) - MU;
  const log10P = param.c + param.a * x + param.b * x * x;
  return Math.pow(10, log10P);
}

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
  const [showProjectionTable, setShowProjectionTable] = useState(false);

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

  // Compute model quantile values for the historical data
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

  // Determine the quantile model line that Bitcoin's current price is closest to
  const currentQuantile = useMemo(() => {
    if (!btcData.length || Object.keys(modelData).length === 0) {
      return 'N/A';
    }

    const latestPoint = btcData[btcData.length - 1];
    const latestPrice = latestPoint.value || latestPoint.close;
    if (!latestPrice) return 'N/A';

    // Get the model value for each quantile at the latest historical point
    const latestModelValues = {};
    QUANTILE_PARAMS.forEach(param => {
      const arr = modelData[param.label];
      if (arr && arr.length > 0) {
        latestModelValues[param.label] = arr[arr.length - 1].value;
      }
    });

    // Find the closest quantile line by absolute price difference
    let closestLabel = null;
    let minDiff = Infinity;

    Object.keys(latestModelValues).forEach(label => {
      const modelVal = latestModelValues[label];
      if (modelVal == null) return;

      const diff = Math.abs(latestPrice - modelVal);
      if (diff < minDiff) {
        minDiff = diff;
        closestLabel = label;
      }
    });

    return closestLabel || 'N/A';
  }, [btcData, modelData]);

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showProjectionTable) setShowProjectionTable(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showProjectionTable]);

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
      lastValueVisible: false,
      priceLineVisible: false,
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

  // Dynamically manage quantile series (historical only - no forward projections on chart)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || btcData.length === 0) return;

    // Clear previous quantile series
    Object.keys(quantileSeriesRefs.current).forEach(key => {
      const series = quantileSeriesRefs.current[key];
      if (series) chart.removeSeries(series);
    });
    quantileSeriesRefs.current = {};

    if (showQuantiles && Object.keys(modelData).length > 0) {
      QUANTILE_PARAMS.forEach((param) => {
        const seriesData = modelData[param.label];
        if (!seriesData || seriesData.length === 0) return;

        const qSeries = chart.addLineSeries({
          color: param.color,
          lineWidth: 1,
          lineStyle: 0, // solid
          title: param.label,
          lastValueVisible: false,
          priceLineVisible: false,
        });

        qSeries.setData(seriesData);
        quantileSeriesRefs.current[param.label] = qSeries;
      });
    }
  }, [showQuantiles, modelData, btcData]);


  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
    return value.toFixed(0);
  }, []);

  // Generate projection table data (yearly into the 2050s)
  const projectionTableData = useMemo(() => {
    const years = [];
    const startYear = new Date().getFullYear() + 1;

    // Yearly from next year to 2035, then every 5 years to 2055
    for (let y = startYear; y <= 2035; y++) {
      years.push(y);
    }
    for (let y = 2040; y <= 2055; y += 5) {
      years.push(y);
    }

    return years.map(year => {
      const dateStr = `${year}-01-01`;
      const row = { year };

      QUANTILE_PARAMS.forEach(param => {
        row[param.label] = computeProjectedPrice(dateStr, param);
      });

      return row;
    });
  }, []);

  return (
    <>
      {/* Chart area - fills the full height allocated by the parent container (BasicChart) */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {!isDashboard && (
          <div 
            className="chart-top-div"
            style={{ flexShrink: 0 }}   // ← prevents top bar from shrinking
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Show/Hide Quantiles button */}
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
              {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowProjectionTable(!showProjectionTable)}
                className="button-reset"
                style={{
                  backgroundColor: showProjectionTable ? '#4cceac' : 'transparent',
                  color: showProjectionTable ? 'black' : '#31d6aa',
                  borderColor: showProjectionTable ? 'violet' : '#70d8bd',
                }}
              >
                {showProjectionTable ? 'Hide Table' : 'Show Projections'}
              </button>

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
            flex: '1 1 auto',           // better flex behavior
            minHeight: '660px',         // ← this is now the only minHeight (adjust to taste)
            overflow: 'hidden',
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
                <div 
                  className='under-chart' 
                  style={{
                    flexShrink: 0,                    // ← critical
                    padding: '10px 0 20px 0',
                    display: 'block',                 // overrides the CSS flex
                  }}
                >
            <div style={{ marginBottom: '6px' }}>
              <LastUpdated storageKey="btcData" />
            </div>

            {/* Current Quantile - updates live as BTC price crosses model lines */}
            <div style={{ 
              marginBottom: '10px', 
              color: colors.grey[100], 
              fontSize: '20px',
              fontWeight: 500
            }}>
              Current Quantile: <span style={{ 
                color: colors.greenAccent[400], 
                fontWeight: 600 
              }}>{currentQuantile}</span>
            </div>

            <div style={{ color: colors.grey[100], fontSize: '16px' }}>
              Benjamin Cowen’s 2026 model of Bitcoin price quantiles. The green lines show lower price paths with relatively steady structural growth.
              The upper lines (yellow to red) show a flattening of the curve, showing that diminishing returns over time is the indicated way forward.
              Throughout the history of Bitcoin's price action, the lower quantile has up to this point represented a good buying opportunity,
              while the upper quantiles have represented areas of overextension. <br/> The model's curvature suggests that as time goes on, the potential
              for extreme overextension (upper tail) grows more limited compared to the steady growth path (lower tail). This implies that while Bitcoin
              may continue to grow, the likelihood of it reaching extremely high valuations diminishes over time, reinforcing the idea of diminishing
              returns as the asset matures.
            </div>
          </div>
        )}
      </div>

{/* NEW POPUP MODAL */}
      {showProjectionTable && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowProjectionTable(false)}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}   
          >
            <div className="modal-header">
              <h3>Projected Quantile Values — Model Only (through 2050s)</h3>
              <button 
                className="close-button"
                onClick={() => setShowProjectionTable(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  color: colors.grey[100],
                  backgroundColor: 'rgba(0,0,0,0.2)'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #444' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Year</th>
                      {QUANTILE_PARAMS.map(p => (
                        <th key={p.label} style={{ padding: '6px 8px', textAlign: 'right' }}>{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectionTableData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 'bold' }}>{row.year}</td>
                        {QUANTILE_PARAMS.map(p => (
                          <td key={p.label} style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                            ${compactNumberFormatter(row[p.label])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: '11px', color: '#888', margin: '12px 0 4px', textAlign: 'center' }}>
                Values are pure model projections (no actual BTC price data).
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TailCurvature;