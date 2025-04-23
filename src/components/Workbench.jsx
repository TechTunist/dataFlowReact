import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart, version } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox } from '@mui/material';

// Color mapping for named colors to RGB
const colorMap = {
  orange: '255, 165, 0',
  blue: '0, 0, 255',
  purple: '128, 0, 128',
  green: '0, 128, 0',
  red: '255, 0, 0',
  cyan: '0, 255, 255',
};

// Available FRED series for selection
const availableSeries = {
    UMCSENT: { label: 'Consumer Sentiment (UMCSI)', color: 'orange', chartType: 'area', scaleId: 'umcsent-scale' },
    SP500: { label: 'S&P 500 Index', color: 'blue', chartType: 'area', scaleId: 'sp500-scale' },
    DFF: { label: 'Federal Funds Rate', color: 'purple', chartType: 'line', scaleId: 'dff-scale' },
    CPIAUCSL: { label: 'Consumer Price Index (CPI)', color: 'green', chartType: 'area', scaleId: 'cpi-scale' },
    UNRATE: { label: 'Unemployment Rate', color: 'red', chartType: 'area', scaleId: 'unrate-scale' },
    DGS10: { label: '10-Year Treasury Yield', color: 'cyan', chartType: 'line', scaleId: 'dgs10-scale' },
    T10Y2Y: { label: '10Y-2Y Treasury Spread', color: 'magenta', chartType: 'line', scaleId: 't10y2y-scale' },
    USRECD: { label: 'U.S. Recession Indicator', color: 'gray', chartType: 'histogram', scaleId: 'usrecd-scale' },
    M2SL: { label: 'M2 Money Supply', color: 'green', chartType: 'area', scaleId: 'm2sl-scale' },
    GDP: { label: 'U.S. GDP', color: 'purple', chartType: 'area', scaleId: 'gdp-scale' },
    ICSA: { label: 'Initial Jobless Claims', color: 'red', chartType: 'area', scaleId: 'icsa-scale' },
    T10Y3M: { label: '10Y-3M Treasury Spread', color: 'lime', chartType: 'line', scaleId: 't10y3m-scale' },
    DGS2: { label: '2-Year Treasury Yield', color: 'red', chartType: 'line', scaleId: 'dgs2-scale' },
    INDPRO: { label: 'Industrial Production Index', color: 'red', chartType: 'area', scaleId: 'indpro-scale' },
    PAYEMS: { label: 'Nonfarm Payrolls', color: 'orange', chartType: 'area', scaleId: 'payems-scale' },
    // PCE: { label: 'Personal Consumption Expenditures', color: 'orange', chartType: 'area', scaleId: 'pce-scale' },
    HOUST: { label: 'Housing Starts', color: 'green', chartType: 'area', scaleId: 'houst-scale' },
    RRSFS: { label: 'Retail Sales', color: 'green', chartType: 'area', scaleId: 'rrsfs-scale' },
    VIXCLS: { label: 'VIX Volatility Index', color: 'green', chartType: 'line', scaleId: 'vixcls-scale' },
  };

const WorkbenchChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => value.toLocaleString(),
  explanation = '',
  scaleMode = 'linear',
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRefs = useRef({}); // Store references to all series
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
  const [activeSeries, setActiveSeries] = useState([seriesId]); // Track active series
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  // Handle series selection change
  const handleSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveSeries(selected);
    // Fetch data for newly selected series
    selected.forEach(id => {
      if (!fredSeriesData[id]) {
        fetchFredSeriesData(id);
      }
    });
  };

  // Fetch initial series data
  useEffect(() => {
    const fetchData = async () => {
      if (fredSeriesData[seriesId]?.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchFredSeriesData(seriesId);
      } catch (err) {
        setError(`Failed to fetch data for ${seriesId}. Please try again later.`);
        console.error(`Error fetching ${seriesId}:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFredSeriesData, seriesId, fredSeriesData]);

  // Initialize chart
  useEffect(() => {
    if (!fredSeriesData[seriesId]?.length) return;

    // Ensure chart container exists
    if (!chartContainerRef.current) {
      console.error('Chart container is not available');
      return;
    }

    // Define price scales for all possible series
    const priceScales = Object.keys(availableSeries).reduce((acc, id) => ({
      ...acc,
      [availableSeries[id].scaleId]: {
        mode: scaleModeState,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'right',
        width: 50,
      },
    }), {});

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        mode: scaleModeState,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        visible: false, // Hide default scale if unused
      },
      additionalPriceScales: priceScales, // Predefine all scales
    });
    chartRef.current = chart;

    // Debug: Log chart object and version
    // console.log('Lightweight Charts Version:', version);
    // console.log('Chart object:', chart);
    // console.log('addPriceScale exists:', typeof chart.addPriceScale === 'function');

    // Add series for each active series
    activeSeries.forEach(id => {
      const seriesInfo = availableSeries[id] || { color: 'cyan', chartType: chartType, scaleId: 'right' };
      const rgbColor = colorMap[seriesInfo.color] || seriesInfo.color;
      let series;
      if (seriesInfo.chartType === 'area') {
        series = chart.addAreaSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          topColor: `rgba(${rgbColor}, 0.56)`,
          bottomColor: `rgba(${rgbColor}, 0.04)`,
          lineColor: seriesInfo.color,
        });
      } else if (seriesInfo.chartType === 'line') {
        series = chart.addLineSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesInfo.color,
        });
      } else if (seriesInfo.chartType === 'histogram') {
        series = chart.addHistogramSeries({
          priceScaleId: seriesInfo.scaleId,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesInfo.color,
        });
      }
      seriesRefs.current[id] = series;

      // Set data if available
      if (fredSeriesData[id]?.length > 0) {
        const cleanedData = fredSeriesData[id]
          .filter((item) => item.value != null && !isNaN(item.value))
          .sort((a, b) => new Date(a.time) - new Date(b.time));
        series.setData(cleanedData);
      }
    });

    // Update tooltip with all series data
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const tooltip = {
          date: param.time,
          values: {},
          x: param.point.x,
          y: param.point.y,
        };
        activeSeries.forEach(id => {
          const series = seriesRefs.current[id];
          const data = param.seriesData.get(series);
          tooltip.values[id] = data?.value;
        });
        setTooltipData(tooltip);
      }
    });

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);

    resetChartView();

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [fredSeriesData, activeSeries, colors, scaleModeState, chartType, valueFormatter, theme.palette.mode, seriesId]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  // Update price scale modes
  useEffect(() => {
    if (chartRef.current) {
      activeSeries.forEach(id => {
        const scaleId = availableSeries[id]?.scaleId || 'right';
        chartRef.current.priceScale(scaleId).applyOptions({ mode: scaleModeState });
      });
    }
  }, [scaleModeState]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="series-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Series
            </InputLabel>
            <Select
              multiple
              value={activeSeries}
              onChange={handleSeriesChange}
              labelId="series-label"
              label="Series"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((id) => availableSeries[id]?.label || id).join(', ')
                  : 'Select Series'
              }
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {Object.entries(availableSeries).map(([id, { label }]) => (
                <MenuItem key={id} value={id}>
                  <Checkbox
                    checked={activeSeries.includes(id)}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className='chart-top-div'>
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
            <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
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
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Series</div>}
          {activeSeries.map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: availableSeries[id]?.color || 'cyan',
                  marginRight: '5px',
                }}
              />
              {availableSeries[id]?.label || id}
            </div>
          ))}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && activeSeries.some(id => fredSeriesData[id]?.length > 0) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...activeSeries.map(id =>
                    fredSeriesData[id]?.length > 0
                      ? new Date(fredSeriesData[id][fredSeriesData[id].length - 1].time).getTime()
                      : 0
                  )
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (
        <div className="tooltip" style={{
          left: (() => {
            const sidebarWidth = isMobile ? -80 : -320;
            const cursorX = tooltipData.x - sidebarWidth;
            const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
            const tooltipWidth = 200;
            const offset = 10000 / (chartWidth + 300);
            const rightPosition = cursorX + offset;
            const leftPosition = cursorX - tooltipWidth - offset;
            return rightPosition + tooltipWidth <= chartWidth ? `${rightPosition}px` : (leftPosition >= 0 ? `${leftPosition}px` : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`);
          })(),
          top: `${tooltipData.y + 100}px`,
        }}>
          {activeSeries.map(id => (
            <div key={id}>
              <div style={{ fontSize: '15px' }}>{availableSeries[id]?.label || id}</div>
              <div style={{ fontSize: '20px' }}>{tooltipData.values[id] ? valueFormatter(tooltipData.values[id]) : 'N/A'}</div>
            </div>
          ))}
          <div>{tooltipData.date.toString().substring(0, 4) === currentYear ? `${tooltipData.date} - latest` : tooltipData.date}</div>
        </div>
      )}
      {!isDashboard && explanation && (
        <p className='chart-info'>
          {explanation}
        </p>
      )}
    </div>
  );
};

export default WorkbenchChart;