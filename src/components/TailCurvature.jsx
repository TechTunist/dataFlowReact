import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';
import { useChartData, useChartDataActions, useEnsureSeries } from '../hooks/useChartData';
import {
  QUANTILE_PARAMS,
  buildRearrangedModelSeries,
  computeRearrangedQuantilePrices,
} from '../utils/tailCurvatureModel';

// NOTE: IndexedDB caching + auth attachment for central path (and migrated bypasses) has been
// hardened (auth helper, fetchAllPages, unified directs, inflight, TTL-primary freshness).
// The previous "renders from memory but does not repopulate IDB" and "always hit API" issues are fixed.

// Asymmetric Tail Curvature Quantile Model (Cowen 2026)
// Table 3 coefficients + Chernozhukov rearrangement (see utils/tailCurvatureModel.js).
// Without per-date rearrangement, unconstrained 50%/75% fits cross above 95%/99% after ~2029.

function formatCompactLogAxisPrice(price) {
  if (!Number.isFinite(price)) return '';
  const abs = Math.abs(price);
  if (abs >= 1e6) return `${(price / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(price / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  if (abs >= 100) return price.toFixed(0);
  if (abs >= 10) return price.toFixed(1);
  return price.toFixed(2);
}

const TailCurvature = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const quantileSeriesRefs = useRef({});
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  const { btcData: contextBtcData, btcLastUpdated } = useChartData();
  const { fetchBtcData } = useChartDataActions();

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

  // Ensure BTC series is loaded (preload may still be in flight on first paint).
  useEnsureSeries({
    ready: btcData.length > 0,
    load: fetchBtcData,
  });

  // Clear stale waiting/error banners once data is present; show loading only while empty.
  useEffect(() => {
    if (btcData.length > 0) {
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      // Still empty after a generous wait — network / cache issue, not auth.
      // (Previous copy said "requires sign-in" and was never cleared when data arrived late.)
      setError('Still loading BTC price data…');
      setIsLoading(false);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [btcData.length]);

  // Compute rearranged (non-crossing) model quantile series for the historical data
  const modelData = useMemo(() => {
    if (btcData.length === 0) return {};
    return buildRearrangedModelSeries(btcData);
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
        ...(isDashboard ? {
          minimumWidth: 42,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: formatCompactLogAxisPrice,
          },
        } : {}),
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
      ...(isDashboard ? {
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: formatCompactLogAxisPrice,
        },
      } : {}),
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
  }, [btcData, colors, isDashboard]);

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

        const isGolden = param.label.includes('Golden');
        const qSeries = chart.addLineSeries({
          color: param.color,
          lineWidth: isGolden ? 1.5 : 1,
          lineStyle: isGolden ? 1 : 0, // dashed for golden pocket dislocation lines
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
      // Joint rearrangement at each projection date keeps τ-ordering (50% ≤ 75% ≤ 95% ≤ 99%, …)
      const rearranged = computeRearrangedQuantilePrices(dateStr);
      return { year, ...rearranged };
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
              {error && btcData.length === 0 && (
                <span style={{ color: colors.redAccent[500] }}>{error}</span>
              )}
              {isLoading && btcData.length === 0 && !error && (
                <span style={{ color: colors.grey[300] }}>Loading BTC price data…</span>
              )}
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
            minHeight: isDashboard ? '400px' : '660px',
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
              Throughout the history of Bitcoin's price action, the lower quantiles have represented good buying opportunities,
              while the upper quantiles have represented areas of overextension. <br/> The model's curvature suggests that as time goes on, the potential
              for extreme overextension (upper tail) grows more limited compared to the steady growth path (lower tail). This implies that while Bitcoin
              may continue to grow, the likelihood of it reaching extremely high valuations diminishes over time, reinforcing the idea of diminishing
              returns as the asset matures.
              <br/><br/>
              <strong>Golden Pocket (below 1%):</strong> The four additional quantiles below the 1% line (shown in gold/lime with dashed for the deepest) model Ben Cowen's "golden pocket" / dislocation zones.
              These are rare zones (historically visited &lt;&lt;1% of the time) that have marked exceptional accumulation opportunities when price has briefly traded there.
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
              <h3>Projected Quantile Values, Model Only (through 2050s)</h3>
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
                Values are pure model projections (no actual BTC price data). Quantiles are
                Chernozhukov-rearranged at each date so bands stay ordered (higher % ≥ lower %).
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TailCurvature;