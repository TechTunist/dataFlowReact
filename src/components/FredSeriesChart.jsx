import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';

const FredSeriesChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => value.toLocaleString(),
  explanation = '',
  scaleMode = 'linear',
  showSP500Overlay = false, // Prop to enable S&P 500 overlay
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const primarySeriesRef = useRef(null);
  const sp500SeriesRef = useRef(null);
  const prevSeriesIdRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);
  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [isLegendVisible, setIsLegendVisible] = useState(!isMobile); // Default: hidden on mobile, shown on desktop
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  const primarySeriesData = fredSeriesData[seriesId] || [];
  const sp500SeriesData = fredSeriesData['SP500'] || [];

  // Fetch data for primary series and S&P 500 if overlay is enabled
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (primarySeriesData.length === 0) {
          await fetchFredSeriesData(seriesId);
        }
        if (showSP500Overlay && sp500SeriesData.length === 0) {
          await fetchFredSeriesData('SP500');
        }
      } catch (err) {
        setError(`Failed to fetch data for ${seriesId}${showSP500Overlay ? ' or S&P 500' : ''}.`);
        console.error(`Error fetching data:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFredSeriesData, seriesId, primarySeriesData.length, showSP500Overlay, sp500SeriesData.length]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
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
        timeVisible: true,
        secondsVisible: false,
        smoothScroll: true,
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      leftPriceScale: {
        visible: showSP500Overlay,
        borderVisible: false,
      },
    });
    chartRef.current = chart;
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
      if (chartRef.current) {
        chartRef.current.remove();
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors, showSP500Overlay]);

  // Update series
  useEffect(() => {
    if (!chartRef.current || primarySeriesData.length === 0) return;
    const isNewSeries = seriesId !== prevSeriesIdRef.current;
    prevSeriesIdRef.current = seriesId;
    // Clean and validate primary series data
    const cleanedPrimaryData = primarySeriesData
      .filter((item) => item.value != null && !isNaN(item.value) && (scaleModeState === 1 ? item.value > 0 : true))
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    if (cleanedPrimaryData.length === 0) {
      console.warn(`No valid data points for series ${seriesId}`);
      setError(`No valid data available for ${seriesId}.`);
      return;
    }
    // Remove existing primary series
    if (primarySeriesRef.current) {
      try {
        chartRef.current.removeSeries(primarySeriesRef.current);
      } catch (err) {
        console.error(`Error removing primary series for ${seriesId}:`, err);
      }
      primarySeriesRef.current = null;
    }
    // Colors for primary series
    const { topColor, bottomColor, lineColor, color } = theme.palette.mode === 'dark'
      ? {
          topColor: 'rgba(38, 198, 218, 0.56)',
          bottomColor: 'rgba(38, 198, 218, 0.04)',
          lineColor: 'rgba(38, 198, 218, 1)',
          color: 'rgba(38, 198, 218, 1)',
        }
      : {
          topColor: 'rgba(255, 165, 0, 0.56)',
          bottomColor: 'rgba(255, 165, 0, 0.2)',
          lineColor: 'rgba(255, 140, 0, 0.8)',
          color: 'rgba(255, 140, 0, 0.8)',
        };
    // Create primary series
    let primarySeries;
    if (chartType === 'area') {
      primarySeries = chartRef.current.addAreaSeries({
        priceScaleId: 'right',
        lineWidth: 2,
        topColor,
        bottomColor,
        lineColor,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: valueFormatter,
        },
      });
    } else if (chartType === 'line') {
      primarySeries = chartRef.current.addLineSeries({
        priceScaleId: 'right',
        lineWidth: 2,
        color: lineColor,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: valueFormatter,
        },
      });
    } else if (chartType === 'histogram') {
      primarySeries = chartRef.current.addHistogramSeries({
        priceScaleId: 'right',
        color,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: valueFormatter,
        },
      });
    }
    primarySeriesRef.current = primarySeries;
    primarySeries.setData(cleanedPrimaryData);

    // Update right price scale for primary series
    chartRef.current.priceScale('right').applyOptions({
      mode: scaleModeState,
      borderVisible: false,
    });

    // Handle S&P 500 overlay
    if (showSP500Overlay && sp500SeriesData.length > 0) {
      const minPrimaryTime = new Date(cleanedPrimaryData[0].time).getTime();
      const cleanedSP500Data = sp500SeriesData
        .filter((item) => new Date(item.time).getTime() >= minPrimaryTime && item.value != null && !isNaN(item.value) && item.value > 0) // Log scale requires positive values, and start from primary min time
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      if (cleanedSP500Data.length === 0) {
        console.warn('No valid data points for S&P 500');
        return;
      }
      // Remove existing S&P 500 series
      if (sp500SeriesRef.current) {
        try {
          chartRef.current.removeSeries(sp500SeriesRef.current);
        } catch (err) {
          console.error('Error removing S&P 500 series:', err);
        }
        sp500SeriesRef.current = null;
      }
      // Colors for S&P 500
      const sp500Color = theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)';
      // Create S&P 500 series as a line
      const sp500Series = chartRef.current.addLineSeries({
        priceScaleId: 'left',
        lineWidth: 2,
        color: sp500Color,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: (value) => value.toLocaleString(),
        },
      });
      sp500SeriesRef.current = sp500Series;
      sp500Series.setData(cleanedSP500Data);
      // Update left price scale to logarithmic
      chartRef.current.priceScale('left').applyOptions({
        mode: 1, // Always logarithmic for S&P 500
        borderVisible: false,
      });
    }

    // Fit content for new series or initial load
    if (isNewSeries || zoomRange === null) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }

    // Tooltip subscription
    let tooltipTimeout = null;
    chartRef.current.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        clearTimeout(tooltipTimeout);
        setTooltipData(null);
        return;
      }
      const primaryData = param.seriesData.get(primarySeriesRef.current);
      const sp500Data = showSP500Overlay ? param.seriesData.get(sp500SeriesRef.current) : null;
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        setTooltipData({
          date: param.time,
          primaryValue: primaryData ? primaryData.value : null,
          sp500Value: sp500Data ? sp500Data.value : null,
          x: param.point.x,
          y: param.point.y,
        });
      }, 1);
    });

    return () => {
      clearTimeout(tooltipTimeout);
    };
  }, [primarySeriesData, sp500SeriesData, chartType, scaleModeState, valueFormatter, theme.palette.mode, seriesId, showSP500Overlay]);

  // Restore zoom
  useEffect(() => {
    if (!chartRef.current || !zoomRange) return;
    chartRef.current.timeScale().setVisibleLogicalRange(zoomRange);
  }, [zoomRange]);

  // Save zoom state
  useEffect(() => {
    if (!chartRef.current) return;
    let zoomTimeout = null;
    const handler = () => {
      const range = chartRef.current.timeScale().getVisibleLogicalRange();
      if (range) {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          setZoomRange((prev) => {
            if (prev && prev.from === range.from && prev.to === range.to) {
              return prev;
            }
            return range;
          });
        }, 100);
      }
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      clearTimeout(zoomTimeout);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      }
    };
  }, []);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true },
      });
    }
  }, [isInteractive]);

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState((prev) => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);
  const toggleLegend = useCallback(() => setIsLegendVisible((prev) => !prev), []);

  // Define colors for use in chart, tooltip, and legend
  const primaryColor = theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)';
  const sp500Color = theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)';

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && (
        <div className="chart-top-div">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: colors.primary[100] }}>{scaleModeState === 1 ? 'Logarithmic' : 'Linear'}</span>
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
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {!isDashboard && isLegendVisible && (
          <div
            className="chart-legend"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: colors.primary[100],
              padding: '25px 10px 10px 10px', // Increased top padding to accommodate button
              borderRadius: '5px',
              zIndex: 1000,
              fontSize: '14px',
            }}
          >
            <button
              onClick={toggleLegend}
              className="legend-minimize-button"
              style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                background: 'transparent',
                border: 'none',
                color: colors.primary[100],
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1',
              }}
              title="Minimize Legend"
            >
              −
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: primaryColor,
                  borderRadius: '2px',
                }}
              ></div>
              <span>{seriesId}</span>
            </div>
            {showSP500Overlay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: sp500Color,
                    borderRadius: '2px',
                  }}
                ></div>
                <span>S&P 500</span>
              </div>
            )}
          </div>
        )}
        {!isDashboard && !isLegendVisible && (
          <button
            onClick={toggleLegend}
            className="legend-minimize-button"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              color: colors.primary[100],
              fontSize: '16px',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '5px',
              zIndex: 1000,
            }}
            title="Show Legend"
          >
            +
          </button>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && primarySeriesData.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated customDate={primarySeriesData[primarySeriesData.length - 1].time} />
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -70 : -100;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 1000 / (chartWidth + 100);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              return rightPosition + tooltipWidth <= chartWidth
                ? `${rightPosition}px`
                : leftPosition >= 0
                ? `${leftPosition}px`
                : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 50}px`,
          }}
        >
          <div style={{ fontSize: '15px' }}>{seriesId}</div>
          <div style={{ fontSize: '20px' }}>
            {tooltipData.primaryValue ? valueFormatter(tooltipData.primaryValue) : 'N/A'}
          </div>
          {showSP500Overlay && (
            <>
              <div style={{ fontSize: '15px', color: sp500Color }}>S&P 500</div>
              <div style={{ fontSize: '20px', color: sp500Color }}>
                {tooltipData.sp500Value ? tooltipData.sp500Value.toLocaleString() : 'N/A'}
              </div>
            </>
          )}
          <div>
            {tooltipData.date.toString().substring(0, 4) === currentYear
              ? `${tooltipData.date} - latest`
              : tooltipData.date}
          </div>
        </div>
      )}
      {!isDashboard && explanation && <p className="chart-info">{explanation}</p>}
    </div>
  );
};

export default restrictToPaidSubscription(FredSeriesChart);