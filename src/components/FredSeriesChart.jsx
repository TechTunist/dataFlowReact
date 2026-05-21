import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Box,
} from '@mui/material';

const FredSeriesChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => (value != null ? value.toLocaleString() : ''),
  explanation = '',
  scaleMode = 'linear',
  showSP500Overlay = false,
  enableTechnicalIndicators = false,
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const primarySeriesRef = useRef(null);
  const sp500SeriesRef = useRef(null);
  const prevSeriesIdRef = useRef(null);
  const smaSeriesRefs = useRef({});
  const rsiSeriesRef = useRef(null);

  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);

  const smaIndicators = useMemo(() => ({
    '8w-sma': { period: 8 * 7, color: '#00FF00', label: '8 Week SMA' },
    '20w-sma': { period: 20 * 7, color: '#FF00FF', label: '20 Week SMA' },
    '50w-sma': { period: 50 * 7, color: '#FFD700', label: '50 Week SMA' },
  }), []);

  const rsiPeriods = useMemo(() => ({
    'Daily': { days: 14, label: 'Daily RSI (14)' },
    'Weekly': { days: 98, label: 'Weekly RSI (14)' },
  }), []);

  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [activeRsiPeriod, setActiveRsiPeriod] = useState('');
  const [showRsi, setShowRsi] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(!isMobile);

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  const primarySeriesData = fredSeriesData[seriesId] || [];
  const sp500SeriesData = fredSeriesData['SP500'] || [];
  const primaryDataRef = useRef([]);
  const sp500DataRef = useRef([]);

  // === CALLBACKS ===
  const handleSMAChange = useCallback((event) => setActiveSMAs(event.target.value), []);
  const handleRsiPeriodChange = useCallback((event) => {
    setActiveRsiPeriod(event.target.value);
    setShowRsi(!!event.target.value);
  }, []);

  const calculateMovingAverage = useCallback((data, period) => {
    if (!data || data.length < period) return [];
    const movingAverages = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].value;
      movingAverages.push({ time: data[i].time, value: sum / period });
    }
    return movingAverages;
  }, []);

  const calculateRSI = useCallback((data, period) => {
    if (!data || data.length <= period) return [];
    const rsiData = [];
    const gains = [];
    const losses = [];
    for (let i = 1; i < data.length; i++) {
      const change = data[i].value - data[i - 1].value;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    for (let i = period; i < data.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiData.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
    }
    return rsiData;
  }, []);

  const findNearestData = useCallback((data, targetTime) => {
    if (data.length === 0) return null;
    const target = new Date(targetTime).getTime();
    let left = 0, right = data.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = new Date(data[mid].time).getTime();
      if (midTime === target) return data[mid];
      else if (midTime < target) left = mid + 1;
      else right = mid - 1;
    }
    const prev = right >= 0 ? data[right] : null;
    const next = left < data.length ? data[left] : null;
    if (!prev) return next;
    if (!next) return prev;
    return Math.abs(new Date(prev.time).getTime() - target) <= Math.abs(new Date(next.time).getTime() - target) ? prev : next;
  }, []);

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (primarySeriesData.length === 0) await fetchFredSeriesData(seriesId);
        if (showSP500Overlay && sp500SeriesData.length === 0) await fetchFredSeriesData('SP500');
      } catch (err) {
        setError(`Failed to fetch data for ${seriesId}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFredSeriesData, seriesId, showSP500Overlay]);

  // === CREATE CHART ONCE (like BitcoinPrice) ===
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
      rightPriceScale: { visible: true, borderVisible: false },
      leftPriceScale: { visible: showSP500Overlay, borderVisible: false },
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
        try { chartRef.current.remove(); } catch (e) {}
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // ← EMPTY DEPENDENCY ARRAY — CREATE ONCE

  // === UPDATE COLORS/THEME (like BitcoinPrice) ===
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
  }, [colors]);

  // === UPDATE SCALE MODE & SP500 OVERLAY VISIBILITY ===
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.priceScale('right').applyOptions({ mode: scaleModeState, borderVisible: false });
    chartRef.current.priceScale('left').applyOptions({
      visible: showSP500Overlay,
      borderVisible: false,
    });
  }, [scaleModeState, showSP500Overlay]);

  // === UPDATE SERIES + DATA (cleaned up) ===
  useEffect(() => {
    if (!chartRef.current || primarySeriesData.length === 0) return;

    const isNewSeries = seriesId !== prevSeriesIdRef.current;
    prevSeriesIdRef.current = seriesId;

    // Clean primary data
    const cleanedPrimaryData = primarySeriesData
      .filter(item => {
        if (item.value == null || isNaN(item.value)) return false;
        if (scaleModeState === 1 && item.value <= 0) return false;
        const t = item.time;
        if (!t || (typeof t === 'string' && t.length <= 4)) return false;
        return true;
      })
      .map(item => ({
        ...item,
        time: item.time.includes('-') ? item.time : `${item.time}-01-01`
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    if (cleanedPrimaryData.length === 0) {
      setError(`No valid data for ${seriesId}`);
      return;
    }
    primaryDataRef.current = cleanedPrimaryData;

    // Remove old primary series
    if (primarySeriesRef.current) {
      try { chartRef.current.removeSeries(primarySeriesRef.current); } catch (e) {}
      primarySeriesRef.current = null;
    }

    const { topColor, bottomColor, lineColor, color } = theme.palette.mode === 'dark'
      ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)', color: 'rgba(38, 198, 218, 1)' }
      : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)', color: 'rgba(255, 140, 0, 0.8)' };

    let primarySeries;
    if (chartType === 'area') {
      primarySeries = chartRef.current.addAreaSeries({
        priceScaleId: 'right', lineWidth: 2, topColor, bottomColor, lineColor,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    } else if (chartType === 'line') {
      primarySeries = chartRef.current.addLineSeries({
        priceScaleId: 'right', lineWidth: 2, color: lineColor,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    } else {
      primarySeries = chartRef.current.addHistogramSeries({
        priceScaleId: 'right', color,
        priceFormat: { type: 'custom', minMove: 0.01, formatter: valueFormatter },
      });
    }
    primarySeriesRef.current = primarySeries;
    primarySeries.setData(cleanedPrimaryData);

    // S&P 500 overlay
    if (showSP500Overlay && sp500SeriesData.length > 0) {
      const minTime = new Date(cleanedPrimaryData[0].time).getTime();
      const cleanedSP500 = sp500SeriesData
        .filter(item => new Date(item.time).getTime() >= minTime && item.value > 0)
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      if (cleanedSP500.length > 0) {
        if (sp500SeriesRef.current) {
          try { chartRef.current.removeSeries(sp500SeriesRef.current); } catch (e) {}
        }
        const sp500Color = theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)';
        const sp500Series = chartRef.current.addLineSeries({
          priceScaleId: 'left', lineWidth: 2, color: sp500Color,
          priceFormat: { type: 'custom', minMove: 0.01, formatter: v => v?.toLocaleString() || '' },
        });
        sp500SeriesRef.current = sp500Series;
        sp500Series.setData(cleanedSP500);
      }
    }

    if (isNewSeries || !zoomRange) {
      chartRef.current.timeScale().fitContent();
    }
  }, [primarySeriesData, sp500SeriesData, chartType, scaleModeState, valueFormatter, theme.palette.mode, seriesId, showSP500Overlay]);

  // === TOOLTIP (separate effect like BitcoinPrice) ===
  useEffect(() => {
    if (!chartRef.current) return;

    let tooltipTimeout = null;
    const handleCrosshair = (param) => {
      if (!param.point || !param.time) {
        setTooltipData(null);
        return;
      }
      let primaryNearest = param.seriesData.get(primarySeriesRef.current);
      if (!primaryNearest) primaryNearest = findNearestData(primaryDataRef.current, param.time);

      let sp500Nearest = null;
      if (showSP500Overlay && sp500SeriesRef.current) {
        sp500Nearest = param.seriesData.get(sp500SeriesRef.current) || findNearestData(sp500DataRef.current, param.time);
      }

      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        setTooltipData({
          date: param.time,
          primaryValue: primaryNearest?.value,
          sp500Value: sp500Nearest?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }, 1);
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshair);
    return () => {
      clearTimeout(tooltipTimeout);
      if (chartRef.current) chartRef.current.unsubscribeCrosshairMove(handleCrosshair);
    };
  }, [findNearestData, showSP500Overlay]);

  // === INTERACTIVITY ===
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true },
      });
    }
  }, [isInteractive]);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => prev === 1 ? 0 : 1), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);
  const toggleLegend = useCallback(() => setIsLegendVisible(prev => !prev), []);

  const primaryColor = theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)';
  const sp500Color = theme.palette.mode === 'dark' ? 'rgb(223, 175, 185)' : 'rgba(112, 153, 112, 0.8)';

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Top controls */}
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
            <button onClick={setInteractivity} className="button-reset" style={{
              backgroundColor: isInteractive ? '#4cceac' : 'transparent',
              color: isInteractive ? 'black' : '#31d6aa',
              borderColor: isInteractive ? 'violet' : '#70d8bd',
            }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}

      {/* Technical Indicators */}
      {enableTechnicalIndicators && (
        <Box sx={{ display: 'flex', gap: '20px', justifyContent: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Weekly Moving Averages</InputLabel>
            <Select multiple value={activeSMAs} onChange={handleSMAChange}
              renderValue={(selected) => selected.length > 0 ? selected.map(k => smaIndicators[k].label).join(', ') : 'Select SMAs'}>
              {Object.keys(smaIndicators).map(key => (
                <MenuItem key={key} value={key}>
                  <Checkbox checked={activeSMAs.includes(key)} /> {smaIndicators[key].label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>RSI</InputLabel>
            <Select value={activeRsiPeriod} onChange={handleRsiPeriodChange}>
              <MenuItem value="">None</MenuItem>
              {Object.keys(rsiPeriods).map(key => (
                <MenuItem key={key} value={key}>{rsiPeriods[key].label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* CHART CONTAINER — now matches BitcoinPrice structure */}
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

        {/* Legend */}
        {!isDashboard && isLegendVisible && (
          <div className="chart-legend" style={{
            position: 'absolute', top: '10px', left: '10px',
            background: colors.primary[900], color: colors.primary[100],
            padding: '25px 10px 10px 10px', borderRadius: '5px', zIndex: 1000, fontSize: '14px'
          }}>
            <button onClick={toggleLegend} className="legend-minimize-button" style={{ position: 'absolute', top: '5px', left: '5px', background: 'transparent', border: 'none', color: colors.primary[100], fontSize: '16px', cursor: 'pointer' }}>−</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: primaryColor, borderRadius: '2px' }}></div>
              <span>{seriesId}</span>
            </div>
            {showSP500Overlay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: sp500Color, borderRadius: '2px' }}></div>
                <span>S&P 500</span>
              </div>
            )}
          </div>
        )}

        {!isDashboard && !isLegendVisible && (
          <button onClick={toggleLegend} className="legend-minimize-button" style={{
            position: 'absolute', top: '10px', left: '10px', background: colors.primary[900], border: 'none',
            color: colors.primary[100], fontSize: '16px', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px', zIndex: 1000
          }}>+</button>
        )}
      </div>

      {/* Under chart */}
      <div className="under-chart">
        {!isDashboard && primarySeriesData.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated customDate={primarySeriesData[primarySeriesData.length - 1].time} />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {!isDashboard && tooltipData && (
        <div className="tooltip" style={{
          left: (() => {
            const sidebarWidth = isMobile ? -70 : -100;
            const cursorX = tooltipData.x - sidebarWidth;
            const chartWidth = chartContainerRef.current?.clientWidth - sidebarWidth || 800;
            const tooltipWidth = 200;
            const offset = 1000 / (chartWidth + 100);
            const rightPosition = cursorX + offset;
            const leftPosition = cursorX - tooltipWidth - offset;
            return rightPosition + tooltipWidth <= chartWidth ? `${rightPosition}px` : leftPosition >= 0 ? `${leftPosition}px` : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
          })(),
          top: `${tooltipData.y + 50}px`,
        }}>
          <div style={{ fontSize: '15px' }}>{seriesId}</div>
          <div style={{ fontSize: '20px' }}>{tooltipData.primaryValue ? valueFormatter(tooltipData.primaryValue) : 'N/A'}</div>
          {showSP500Overlay && (
            <>
              <div style={{ fontSize: '15px', color: sp500Color }}>S&P 500</div>
              <div style={{ fontSize: '20px', color: sp500Color }}>{tooltipData.sp500Value ? tooltipData.sp500Value.toLocaleString() : 'N/A'}</div>
            </>
          )}
          <div>{tooltipData.date}</div>
        </div>
      )}

      {!isDashboard && explanation && <p className="chart-info">{explanation}</p>}
    </div>
  );
};

export default restrictToPaidSubscription(FredSeriesChart);