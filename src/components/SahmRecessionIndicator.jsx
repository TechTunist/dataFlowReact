// src/components/SahmRecessionIndicator.jsx
import React, { useRef, useEffect, useState, useMemo, useContext, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme, Box, Button } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { useFavorites } from '../contexts/FavoritesContext';

const SahmRecessionIndicator = ({ isDashboard = false, explanation = '' }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRefs = useRef({});
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData } = useContext(DataContext);
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [zoomRange, setZoomRange] = useState(null);

  const chartId = 'sahm-recession-indicator';
  const isFavorite = favoriteCharts.includes(chartId);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteChart(chartId);
    } else {
      addFavoriteChart(chartId);
    }
  };

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);

  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);

  // Calculate Sahm Recession Indicator and determine earliest date
  const calculateSahmIndicator = useCallback(() => {
    const unrateData = fredSeriesData['UNRATE'] || [];
    if (unrateData.length === 0) return { data: [], earliestDate: null };

    const sortedData = [...unrateData]
      .filter((item) => item.value != null && !isNaN(parseFloat(item.value)))
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Ensure data starts from at least 1948-12-01
    const earliestAllowedDate = new Date('1948-12-01');
    const filteredData = sortedData.filter((item) => new Date(item.time) >= earliestAllowedDate);
    
    if (filteredData.length === 0) return { data: [], earliestDate: null };
    
    const earliestDate = filteredData[0].time;
    const sahmValues = [];
    const months = 12;

    for (let i = months - 1; i < filteredData.length; i++) {
      const threeMonthData = filteredData.slice(i - 2, i + 1);
      if (threeMonthData.length < 3) continue;
      const threeMonthAvg = threeMonthData.reduce((sum, item) => sum + parseFloat(item.value), 0) / 3;
      const lookbackData = filteredData.slice(Math.max(0, i - months + 1), i + 1);
      const minUnrate = Math.min(...lookbackData.map((item) => parseFloat(item.value)));
      const sahmValue = threeMonthAvg - minUnrate;

      sahmValues.push({
        time: filteredData[i].time,
        value: sahmValue,
      });
    }

    return { data: sahmValues, earliestDate };
  }, [fredSeriesData]);

  // Fetch UNRATE, SP500, and USRECD data
  useEffect(() => {
    const fetchData = async () => {
      const seriesToFetch = ['UNRATE', 'SP500', 'USRECD'];
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all(
          seriesToFetch.map((seriesId) =>
            fredSeriesData[seriesId]?.length > 0
              ? Promise.resolve()
              : fetchFredSeriesData(seriesId)
          )
        );
      } catch (err) {
        setError('Error fetching data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFredSeriesData, fredSeriesData]);

  // Get latest value for tooltip
  const getLatestValue = (data, time) => {
    if (!data || data.length === 0) return null;
    const targetTime = new Date(time).getTime();
    let left = 0, right = data.length - 1;
    let latestPoint = null;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const pointTime = new Date(data[mid].time).getTime();
      if (pointTime <= targetTime) {
        latestPoint = data[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return latestPoint ? latestPoint.value : null;
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart container is not available');
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: {
        minBarSpacing: 0.001,
        timeVisible: true,
        secondsVisible: false,
        smoothScroll: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        visible: true,
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
  }, [colors]);

  // Update chart with series
  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    // Clear existing series safely
    Object.keys(seriesRefs.current).forEach((id) => {
      const series = seriesRefs.current[id];
      if (chartRef.current && series) {
        try {
          chartRef.current.removeSeries(series);
        } catch (err) {
          console.error(`Error removing series ${id}:`, err);
        }
      }
      delete seriesRefs.current[id];
    });

    // Get Sahm Indicator data and earliest date
    const { data: sahmData, earliestDate } = calculateSahmIndicator();
    if (!earliestDate) {
      console.warn('No valid Sahm Indicator data available');
      return;
    }
    const earliestDateObj = new Date(earliestDate);

    // Define series configurations
    const seriesConfig = [
      {
        id: 'SAHM',
        label: 'Sahm Indicator',
        data: sahmData,
        chartType: 'area',
        scaleId: 'sahm-scale',
        color: colors.greenAccent[500] || '#4cceac',
      },
      {
        id: 'SP500',
        label: 'S&P 500',
        data: (fredSeriesData['SP500'] || [])
          .filter((item) => item.value != null && !isNaN(parseFloat(item.value)) && parseFloat(item.value) > 0 && new Date(item.time) >= earliestDateObj)
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
        chartType: 'line',
        scaleId: 'sp500-scale',
        color: colors.blueAccent[500] || '#0000FF',
      },
      {
        id: 'USRECD',
        label: 'Recession Periods',
        data: (fredSeriesData['USRECD'] || [])
          .filter((item) => item.value != null && new Date(item.time) >= earliestDateObj)
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
        chartType: 'histogram',
        scaleId: 'usrecd-scale',
        color: 'rgba(218, 203, 203, 0.02)',
      },
    ];

    // Add series to chart only if data is available
    seriesConfig.forEach(({ id, data, chartType, scaleId, color }) => {
      if (data.length === 0) {
        console.warn(`No data available for series ${id}`);
        return;
      }

      let series;
      try {
        if (chartType === 'area') {
          series = chartRef.current.addAreaSeries({
            priceScaleId: scaleId,
            lineWidth: 2,
            topColor: `${color}80`,
            bottomColor: `${color}10`,
            lineColor: color,
            priceFormat: {
              type: 'custom',
              minMove: 0.01,
              formatter: (value) => value.toFixed(2),
            },
          });
          // Add recession signal line at 0.5 for Sahm Indicator
          if (id === 'SAHM') {
            series.createPriceLine({
              price: 0.5,
              color: colors.redAccent[500] || '#FF0000',
              lineWidth: 1,
              lineStyle: 2, // Dashed
              title: '',
              axisLabelVisible: true,
            });
            // console.log('Added recession signal line at 0.5 for SAHM series (no label)');
          }
        } else if (chartType === 'line') {
          series = chartRef.current.addLineSeries({
            priceScaleId: scaleId,
            lineWidth: 2,
            color: color,
            priceFormat: {
              type: 'custom',
              minMove: 0.01,
              formatter: (value) => value.toFixed(2),
            },
          });
        } else if (chartType === 'histogram') {
          series = chartRef.current.addHistogramSeries({
            priceScaleId: scaleId,
            color: color,
            title: '',
            priceFormat: {
              type: 'custom',
              minMove: 0.01,
              formatter: (value) => (value === 1 ? '' : ''),
            },
          });
          // console.log('Added USRECD histogram series without tooltip labels');
        }
        if (series) {
          seriesRefs.current[id] = series;
          series.setData(data);
          // console.log(`Series ${id} added with ${data.length} data points`);
        } else {
          console.error(`Failed to create series ${id}`);
        }
      } catch (err) {
        console.error(`Error creating series ${id}:`, err);
        setError(`Failed to display ${id}.`);
      }
    });

    // Define and apply price scales
    const priceScales = {
      'sahm-scale': {
        mode: 0, // Linear scale
        borderVisible: true,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'left',
        width: 50,
        visible: false,
      },
      'sp500-scale': {
        mode: 1, // Logarithmic scale
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'right',
        width: 50,
        visible: true,
      },
      'usrecd-scale': {
        mode: 0, // Linear scale
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'left',
        width: 50,
        visible: false,
      },
    };

    try {
      // Apply price scale options individually
      Object.keys(priceScales).forEach((scaleId) => {
        chartRef.current.priceScale(scaleId).applyOptions(priceScales[scaleId]);
        if (scaleId === 'sp500-scale') {
          // console.log('Applied sp500-scale with mode:', priceScales[scaleId].mode);
        }
      });
    } catch (err) {
      console.error('Error applying price scales:', err);
      setError('Failed to apply chart scales.');
    }

    // Fit content only if series were added
    if (Object.keys(seriesRefs.current).length > 0) {
      chartRef.current.timeScale().fitContent();
    }

    // Tooltip subscription
    chartRef.current.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
        return;
      }

      const tooltip = {
        date: param.time,
        values: {},
        x: param.point.x,
        y: param.point.y,
      };

      seriesConfig.forEach(({ id, data }) => {
        const series = seriesRefs.current[id];
        if (!series) return;
        const value = param.seriesData.get(series)?.value ?? getLatestValue(data, param.time);
        tooltip.values[id] = value;
      });

      setTooltipData(tooltip);
      // console.log('Tooltip updated:', tooltip);
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove();
      }
    };
  }, [fredSeriesData, isLoading, colors, calculateSahmIndicator]);

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

  // Restore zoom
  useEffect(() => {
    if (!chartRef.current || !zoomRange) return;
    chartRef.current.timeScale().setVisibleLogicalRange(zoomRange);
  }, [zoomRange]);

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

  const latestTimestamp = fredSeriesData['UNRATE']?.length > 0
    ? fredSeriesData['UNRATE'][fredSeriesData['UNRATE'].length - 1].time
    : null;

  // Get current Sahm Indicator value
  const { data: sahmData } = calculateSahmIndicator();
  const currentSahmValue = sahmData.length > 0 ? sahmData[sahmData.length - 1].value : null;
  const sahmColor = currentSahmValue != null && currentSahmValue >= 0.5 
    ? (colors.redAccent[500] || '#FF0000') 
    : (colors.greenAccent[500] || '#4cceac');
  // console.log('Current Sahm Indicator value:', currentSahmValue, 'Color:', sahmColor);

  if (error) {
    return (
      <div style={{ color: colors.redAccent[500], padding: '20px' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              marginBottom: '10px',
              marginTop: '50px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                gap: '20px',
              }}
            >
              {/* Placeholder for potential future controls */}
            </Box>
            <div
              className="chart-top-div"
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}
            >
              {isLoading && (
                <span style={{ color: colors.grey[100], marginRight: '10px' }}>
                  Loading...
                </span>
              )}
              <Button
                onClick={setInteractivity}
                sx={{
                  backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                  color: isInteractive ? 'black' : '#31d6aa',
                  border: `1px solid ${isInteractive ? 'violet' : colors.greenAccent[400]}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: colors.greenAccent[400],
                    color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                  },
                }}
              >
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </Button>
              <Button
                onClick={resetChartView}
                className="button-reset extra-margin"
                sx={{
                  backgroundColor: 'transparent',
                  color: '#31d6aa',
                  border: `1px solid ${colors.greenAccent[400]}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: colors.greenAccent[400],
                    color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                  },
                }}
              >
                Reset Chart
              </Button>
            </div>
          </Box>
        </>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}`,
        }}
        onDoubleClick={setInteractivity}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {Object.keys(seriesRefs.current).length === 0 && !isLoading && !isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              fontSize: '16px',
              zIndex: 2,
            }}
          >
            No data available
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
            padding: '5px 10px',
            borderRadius: '4px',
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Series</div>}
          {[
            { id: 'SAHM', label: 'Sahm Indicator', color: colors.greenAccent[500] || '#4cceac' },
            { id: 'SP500', label: 'S&P 500', color: colors.blueAccent[500] || '#0000FF' },
            { id: 'USRECD', label: 'Recession Periods', color: 'rgba(218, 203, 203, 0.52)' },
          ].map(({ id, label, color }) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
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
        {tooltipData && Object.keys(seriesRefs.current).length > 0 && (
          <div
            className="tooltip"
            style={{
              position: 'absolute',
              left: (() => {
                const chartWidth = chartContainerRef.current?.clientWidth || 100;
                const tooltipWidth = 200;
                const offsetX = 10;
                let left = tooltipData.x + offsetX;
                if (left + tooltipWidth > chartWidth) {
                  left = tooltipData.x - tooltipWidth - offsetX;
                }
                return `${Math.max(10, Math.min(left, chartWidth - tooltipWidth - 10))}px`;
              })(),
              top: (() => {
                const chartHeight = chartContainerRef.current?.clientHeight || 100;
                const tooltipHeight = 100;
                const offsetY = 10;
                let top = tooltipData.y + offsetY;
                if (top + tooltipHeight > chartHeight) {
                  top = tooltipData.y - tooltipHeight - offsetY;
                }
                return `${Math.max(10, Math.min(top, chartHeight - tooltipHeight - 10))}px`;
              })(),
              backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              padding: '5px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              zIndex: 3,
            }}
          >
            {[
              { id: 'SAHM', label: 'Sahm Indicator', color: colors.greenAccent[500] || '#4cceac' },
              { id: 'SP500', label: 'S&P 500', color: colors.blueAccent[500] || '#0000FF' },
              { id: 'USRECD', label: 'Recession Periods', color: 'rgba(218, 203, 203, 0.52)' },
            ].map(({ id, label, color }) => (
              <div key={id}>
                <div style={{ fontSize: '15px' }}>
                  <span style={{ color }}>
                    {label}: {tooltipData.values[id] != null ? (id === 'USRECD' ? (tooltipData.values[id] === 1 ? 'Recession' : 'No Recession') : tooltipData.values[id].toFixed(2)) : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
            <div>{tooltipData.date}</div>
          </div>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && latestTimestamp && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated customDate={latestTimestamp} />
          </div>
        )}
      </div>
      <div>
        {latestTimestamp && (
          <div
            style={{
              marginTop: '10px',
              marginBottom: '10px',
              fontSize: '20px',
            }}
          >
            <span style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : 'black' }}>
              Current Sahm Indicator:
            </span>
            <span style={{ color: sahmColor }}>
              {' '}{currentSahmValue != null ? currentSahmValue.toFixed(2) : 'N/A'}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && (
        <p className="chart-info">
          The Sahm Recession Indicator, developed by economist Claudia Sahm, is a real-time economic metric that signals a U.S. recession when the three-month moving average of the unemployment rate rises 0.5 percentage points or more above its 12-month low.
          This simple yet effective rule, based on data from the Bureau of Labor Statistics, helps identify deteriorating labor market conditions. The chart visualizes the Sahm Indicator as an area series with a red dashed line at 0.5, alongside S&P 500 trends (logarithmic scale) and recession periods (histogram).
          It demonstrates the indicator’s accuracy by aligning spikes above 0.5 with historical recessions, while the S&P 500 provides market context, showing declines during these periods.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(SahmRecessionIndicator);