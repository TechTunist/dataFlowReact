import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'; // Reuse existing styles
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const FredSeriesChart = ({
    seriesId,
    isDashboard = false,
    chartType = 'area',
    valueFormatter = value => value.toLocaleString(),
    explanation = '',
    scaleMode = 'linear', // New prop: 'linear' or 'logarithmic'
  }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);
  
    // Map scaleMode prop to lightweight-charts mode (0 = linear, 1 = logarithmic)
    const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  
    const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  
    const seriesData = fredSeriesData[seriesId] || [];
  
    // Fetch data
    useEffect(() => {
      const fetchData = async () => {
        if (seriesData.length > 0) return;
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
    }, [fetchFredSeriesData, seriesId, seriesData.length]);
  
    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);
  
    // Initialize chart
    useEffect(() => {
      if (seriesData.length === 0) return;
  
      // Validate and clean seriesData
      const cleanedData = seriesData
        .filter((item) => item.value != null && !isNaN(item.value))
        .sort((a, b) => new Date(a.time) - new Date(b.time));
  
      if (cleanedData.length === 0) {
        console.warn(`No valid data points for series ${seriesId}`);
        setError(`No valid data available for ${seriesId}.`);
        return;
      }
  
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
        timeScale: { minBarSpacing: 0.001 },
      });
  
      let series;
      if (chartType === 'area') {
        series = chart.addAreaSeries({
          priceScaleId: 'right',
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
        });
      } else if (chartType === 'line') {
        series = chart.addLineSeries({
          priceScaleId: 'right',
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
        });
      } else if (chartType === 'histogram') {
        series = chart.addHistogramSeries({
          priceScaleId: 'right',
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
        });
      }
      seriesRef.current = series;
  
      chart.priceScale('right').applyOptions({
        mode: scaleModeState, // Use state (initialized from prop)
        borderVisible: false,
      });
  
      chart.subscribeCrosshairMove(param => {
        if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
          setTooltipData(null);
        } else {
          const data = param.seriesData.get(series);
          setTooltipData({
            date: param.time,
            value: data?.value,
            x: param.point.x,
            y: param.point.y,
          });
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
  
      const { topColor, bottomColor, lineColor, color } = theme.palette.mode === 'dark'
        ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)', color: 'rgba(38, 198, 218, 1)' }
        : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)', color: 'rgba(255, 140, 0, 0.8)' };
  
      if (chartType === 'area') {
        series.applyOptions({ topColor, bottomColor, lineColor });
      } else if (chartType === 'line') {
        series.applyOptions({ color: lineColor });
      } else if (chartType === 'histogram') {
        series.applyOptions({ color });
      }
      series.setData(cleanedData);
  
      chartRef.current = chart;
      resetChartView();
  
      return () => {
        chart.remove();
        window.removeEventListener('resize', resizeChart);
      };
    }, [seriesData, colors, scaleModeState, chartType, valueFormatter, theme.palette.mode, seriesId]);
  
    // Update interactivity
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
      }
    }, [isInteractive]);
  
    return (
      <div style={{ height: '100%' }}>
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
        </div>
        <div className='under-chart'>
          {!isDashboard && seriesData.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: colors.greenAccent[500] }}>Last Updated: {seriesData[seriesData.length - 1].time}</span>
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
            <div style={{ fontSize: '15px' }}>{seriesId}</div>
            <div style={{ fontSize: '20px' }}>{tooltipData.value ? valueFormatter(tooltipData.value) : 'N/A'}</div>
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
  
  // export default FredSeriesChart;
  export default restrictToPaidSubscription(FredSeriesChart);