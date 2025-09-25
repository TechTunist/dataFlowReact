import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Box,
  Switch,
  FormControlLabel,
  useMediaQuery
} from '@mui/material';
import { DataContext } from '../DataContext';

const BitcoinDominanceChart = ({ isDashboard = false, dominanceData: propDominanceData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const ethSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({});
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [smoothedDominanceData, setSmoothedDominanceData] = useState([]);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [showEthDominance, setShowEthDominance] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { dominanceData: contextDominanceData, fetchDominanceData } = useContext(DataContext);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Get raw data source (prioritize props over context)
  const rawDominanceData = useMemo(() => {
    return propDominanceData || contextDominanceData || [];
  }, [propDominanceData, contextDominanceData]);

  // Define weekly SMA indicators for Bitcoin Dominance with distinct colors
  const smaIndicators = useMemo(() => ({
    '8w-sma': { period: 8 * 7, color: '#00FF00', label: '8 Week SMA' },
    '20w-sma': { period: 20 * 7, color: '#FF00FF', label: '20 Week SMA' },
    '50w-sma': { period: 50 * 7, color: '#FFD700', label: '50 Week SMA' },
  }), []);

  // Filter data to only show from 2013-04-28 onwards and apply 7-day smoothing
  useEffect(() => {
    const startDate = new Date('2013-04-28').getTime();
    const filteredData = rawDominanceData.filter(item => {
      if (item.time && typeof item.time === 'number') {
        return item.time >= startDate;
      }
      if (item.time && typeof item.time === 'string') {
        const itemDate = new Date(item.time).getTime();
        return itemDate >= startDate;
      }
      if (item.date) {
        const itemDate = new Date(item.date).getTime();
        return itemDate >= startDate;
      }
      return false;
    });

    // Apply 7-day smoothing to filtered data
    const dataForSmoothing = filteredData.map(item => ({
      time: item.time || item.date,
      value: item.btc
    }));
    const smoothedData = calculateMovingAverage(dataForSmoothing, 7);
    setSmoothedDominanceData(smoothedData);
  }, [rawDominanceData]);

  const currentDominance = useMemo(() => {
    if (smoothedDominanceData.length === 0) return null;
    const latestValue = smoothedDominanceData[smoothedDominanceData.length - 1]?.value;
    return latestValue ? latestValue.toFixed(2) : null;
  }, [smoothedDominanceData]);

  // Utility functions
  const setInteractivity = useCallback(() => {
    setIsInteractive(prev => !prev);
  }, []);

  const toggleScaleMode = useCallback(() => {
    setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
  }, []);

  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  const handleSMAChange = useCallback((event) => {
    setActiveSMAs(event.target.value);
  }, []);

  const toggleEthDominance = useCallback(() => {
    setShowEthDominance(prev => !prev);
  }, []);

  // Calculate simple moving average
  const calculateMovingAverage = useCallback((data, period) => {
    if (data.length < period) return [];
    let movingAverages = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].value;
      }
      movingAverages.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return movingAverages;
  }, []);

  useEffect(() => {
    fetchDominanceData();
  }, [fetchDominanceData]);

  // Chart initialization (run once on mount)
  useEffect(() => {
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
      rightPriceScale: {
        mode: scaleMode,
        borderVisible: true,
        borderColor: colors.greenAccent[500],
        scaleMargins: { top: 0.05, bottom: 0.05 },
        width: 70,
        ticksVisible: true,
      },
      leftPriceScale: {
        mode: scaleMode,
        borderVisible: true,
        borderColor: colors.redAccent[500],
        scaleMargins: { top: 0.05, bottom: 0.05 },
        width: 70,
        ticksVisible: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
    });

    const areaSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      topColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.3)' : 'rgba(76, 175, 80, 0.3)',
      bottomColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.05)' : 'rgba(76, 175, 80, 0.1)',
      lineColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(76, 175, 80, 1)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    areaSeriesRef.current = areaSeries;

    const ethSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757',
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    ethSeriesRef.current = ethSeries;

    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const btcData = param.seriesData.get(areaSeries);
        const ethData = param.seriesData.get(ethSeries);
        setTooltipData({
          date: dateStr,
          btcPrice: btcData?.value,
          ethPrice: ethData?.value,
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

    chartRef.current = chart;
    return () => {
      window.removeEventListener('resize', resizeChart);
      chart.remove();
    };
  }, []);

  // Update smoothed dominance data (main plot)
  useEffect(() => {
    if (areaSeriesRef.current && smoothedDominanceData.length > 0) {
      areaSeriesRef.current.setData(smoothedDominanceData);
      if (chartRef.current) {
        resetChartView();
      }
    }
  }, [smoothedDominanceData, resetChartView]);

  // Update ETH dominance data and scale visibility
  useEffect(() => {
    if (!chartRef.current || !ethSeriesRef.current || rawDominanceData.length === 0) return;
    const ethStartDate = new Date('2015-08-07').getTime();
    const ethData = rawDominanceData
      .filter(item => {
        const itemTime = item.time ? new Date(item.time).getTime() : new Date(item.date).getTime();
        return itemTime >= ethStartDate && item.eth > 0;
      })
      .map(item => ({
        time: item.time || item.date,
        value: item.eth
      }));
    const ethSmoothedData = calculateMovingAverage(ethData, 7);
    ethSeriesRef.current.setData(ethSmoothedData);
    ethSeriesRef.current.applyOptions({ visible: showEthDominance });

    setTimeout(() => {
      if (chartRef.current) {
        if (showEthDominance) {
          chartRef.current.priceScale('left').applyOptions({
            visible: true,
            borderColor: colors.redAccent[500],
            width: 70,
          });
        } else {
          chartRef.current.priceScale('left').applyOptions({
            visible: false,
            width: 0,
          });
        }
      }
    }, 10);
  }, [rawDominanceData, showEthDominance, calculateMovingAverage, colors]);

  // Update SMA indicators
  useEffect(() => {
    if (!chartRef.current || smoothedDominanceData.length === 0) return;

    // Remove existing SMA series safely
    Object.keys(smaSeriesRefs.current).forEach(key => {
      if (smaSeriesRefs.current[key] && chartRef.current) {
        try {
          chartRef.current.removeSeries(smaSeriesRefs.current[key]);
        } catch (error) {
          console.warn(`Failed to remove series for key ${key}:`, error);
        }
        delete smaSeriesRefs.current[key];
      }
    });

    // Add new SMA series for active indicators
    activeSMAs.forEach(key => {
      const indicator = smaIndicators[key];
      if (!indicator) return; // Skip if indicator is not defined
      const series = chartRef.current.addLineSeries({
        priceScaleId: 'right',
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
      });
      smaSeriesRefs.current[key] = series;
      const data = calculateMovingAverage(smoothedDominanceData, indicator.period);
      series.setData(data);
    });
  }, [activeSMAs, smoothedDominanceData, calculateMovingAverage, smaIndicators]);

  // Update chart layout and colors when theme changes
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
        rightPriceScale: {
          ...chartRef.current.priceScale('right').options(),
          borderColor: colors.greenAccent[500],
          mode: scaleMode,
        },
        leftPriceScale: {
          ...chartRef.current.priceScale('left').options(),
          borderColor: showEthDominance ? colors.redAccent[500] : colors.greenAccent[700],
          mode: scaleMode,
        },
      });
    }

    if (areaSeriesRef.current) {
      const lightThemeColors = {
        topColor: 'rgba(76, 175, 80, 0.3)',
        bottomColor: 'rgba(76, 175, 80, 0.1)',
        lineColor: 'rgba(76, 175, 80, 1)',
      };
      const darkThemeColors = {
        topColor: 'rgba(38, 198, 218, 0.3)',
        bottomColor: 'rgba(38, 198, 218, 0.05)',
        lineColor: 'rgba(38, 198, 218, 1)',
      };
      const areaColors = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;
      areaSeriesRef.current.applyOptions({
        topColor: areaColors.topColor,
        bottomColor: areaColors.bottomColor,
        lineColor: areaColors.lineColor,
      });
    }

    if (ethSeriesRef.current) {
      ethSeriesRef.current.applyOptions({
        color: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757',
      });
    }
  }, [colors, theme.palette.mode, showEthDominance, scaleMode]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: {
          mouseWheel: isInteractive,
          pressedMouseMove: isInteractive,
          horzTouchDrag: isInteractive,
          vertTouchDrag: isInteractive,
        },
        handleScale: {
          mouseWheel: isInteractive,
          pinch: isInteractive,
          axisPressedMouseMove: isInteractive,
          axisDoubleClickReset: isInteractive,
        },
      });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <>
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
            <FormControlLabel
              control={
                <Switch
                  checked={showEthDominance}
                  onChange={toggleEthDominance}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757',
                    },
                  }}
                />
              }
              label={
                <span style={{ color: colors.primary[100] }}>
                  Show ETH Dominance (Left Scale)
                </span>
              }
              sx={{
                color: colors.primary[100],
                '& .MuiFormControlLabel-label': {
                  color: colors.primary[100],
                  fontSize: '0.9rem'
                }
              }}
            />
            <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
              <InputLabel
                id="sma-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Weekly Moving Averages
              </InputLabel>
              <Select
                multiple
                value={activeSMAs}
                onChange={handleSMAChange}
                label="Weekly Moving Averages"
                labelId="sma-label"
                displayEmpty
                renderValue={(selected) =>
                  selected.length > 0
                    ? selected.map((key) => smaIndicators[key].label).join(', ')
                    : 'Select Moving Averages'
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
                {Object.entries(smaIndicators).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>
                    <Checkbox
                      checked={activeSMAs.includes(key)}
                      sx={{
                        color: colors.grey[100],
                        '&.Mui-checked': { color: colors.greenAccent[500] }
                      }}
                    />
                    <span>{label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <div className='chart-top-div'>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label className="switch">
                <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                <span className="slider round"></span>
              </label>
              <span style={{ color: colors.primary[100] }}>
                {scaleMode === 1 ? 'Logarithmic' : 'Linear'}
              </span>
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
        </>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={() => setInteractivity(!isInteractive)}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>
      <div className='under-chart'>
        {!isDashboard && smoothedDominanceData.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <LastUpdated storageKey="dominanceData" />
            {currentDominance && (
              <span
                style={{
                  fontSize: '1.3rem',
                  color: colors.blueAccent[500],
                  display: 'block',
                  marginTop: '1.1rem',
                }}
              >
                Bitcoin Dominance: {currentDominance}%
              </span>
            )}
            {showEthDominance && rawDominanceData.length > 0 && (
              (() => {
                const latestEthData = rawDominanceData
                  .filter(item => item.eth > 0)
                  .sort((a, b) => new Date(b.date || b.time) - new Date(a.date || a.time))[0];
                const recentEthData = rawDominanceData
                  .filter(item => item.eth > 0)
                  .slice(-7)
                  .reduce((sum, item) => sum + item.eth, 0) / 7;
                return (
                  <span
                    style={{
                      fontSize: '1.2rem',
                      color: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757',
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Ethereum Dominance: {recentEthData.toFixed(2)}%
                  </span>
                );
              })()
            )}
          </div>
        )}
        {!isDashboard && (
          <BitcoinFees />
        )}
      </div>
      {!isDashboard && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px',
            height: 'auto',
            flexWrap: 'wrap',
            gap: '10px 20px',
            padding: '10px',
          }}
        />
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -380;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 1000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              if (rightPosition + tooltipWidth <= chartWidth) return `${rightPosition}px`;
              if (leftPosition >= 0) return `${leftPosition}px`;
              return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: (() => {
              const offsetY = isNarrowScreen ? 300 : 150;
              return `${tooltipData.y + offsetY}px`
            })(),
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '15px' }}>Market Dominance</div>
          {tooltipData.btcPrice && (
            <div style={{ fontSize: '20px', color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(76, 175, 80, 1)' }}>
              BTC: {tooltipData.btcPrice.toFixed(2)}%
            </div>
          )}
          {showEthDominance && tooltipData.ethPrice && (
            <div style={{ fontSize: '18px', color: theme.palette.mode === 'dark' ? '#FF6B6B' : '#FF4757' }}>
              ETH: {tooltipData.ethPrice.toFixed(2)}%
            </div>
          )}
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          This chart shows Bitcoin dominance, which is the percentage of the total cryptocurrency market value that Bitcoin represents. For example, if Bitcoin's market value is $500 billion and the total market value of all cryptocurrencies is $1 trillion, Bitcoin dominance is 50%. This number helps you understand Bitcoin's influence compared to other cryptocurrencies like Ethereum or smaller altcoins.
          <br/><br/>The main plot shows a 7-day smoothed Bitcoin dominance line for better trend visibility (right scale - green border). Toggle "Show ETH Dominance" to compare Ethereum's market share on the left scale (red border). The weekly moving averages provide long-term trend analysis.
          <br/><br/>A rising dominance means Bitcoin is growing stronger relative to others, often during market downturns when investors prefer Bitcoin's stability. A falling dominance suggests other cryptocurrencies are gaining ground, which can happen during market booms when altcoins attract more interest.
          The chart uses historical data to show how Bitcoin dominance has changed over time. You can hover over the chart to see the dominance percentage for specific dates.
        </p>
      )}
    </div>
  );
};

export default BitcoinDominanceChart;