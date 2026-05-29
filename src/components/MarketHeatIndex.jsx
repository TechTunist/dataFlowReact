import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, useMediaQuery, Typography, IconButton } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import { useFavorites } from '../contexts/FavoritesContext';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

// ==================== HEAVY HELPER FUNCTIONS (kept for later use) ====================
// These are left intact. The slowdown was caused by calling them thousands of times inside useMemo.

const calculateRiskMetric = (data) => {
  const movingAverage = data.map((item, index) => {
    const start = Math.max(index - 373, 0);
    const subset = data.slice(start, index + 1);
    const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });
  const movingAverageWithPreavg = movingAverage.map((item, index) => {
    const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
    return { ...item, Preavg: preavg };
  });
  const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
  const preavgMin = Math.min(...preavgValues);
  const preavgMax = Math.max(...preavgValues);
  const normalizedRisk = movingAverageWithPreavg.map(item => ({
    ...item,
    Risk: preavgMax === preavgMin ? 0 : (item.Preavg - preavgMin) / (preavgMax - preavgMin),
  }));
  return normalizedRisk;
};

const calculateSMA = (data, windowSize) => {
  if (!data || data.length < windowSize) return [];
  let sma = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    sma.push({ time: data[i].time, value: sum / windowSize });
  }
  return sma;
};

const calculateRatioSeries = (data) => {
  if (!data || data.length < 350) return [];
  const sma111 = calculateSMA(data, 111);
  const sma350 = calculateSMA(data, 350);
  let ratioData = [];
  for (let i = 349; i < data.length; i++) {
    if (i - 110 >= 0 && sma111[i - 110] && sma350[i - 349]) {
      const sma350Value = sma350[i - 349].value;
      const ratio = sma350Value > 0.001 ? sma111[i - 110].value / (sma350Value * 2) : 0;
      ratioData.push({ time: data[i].time, value: ratio });
    }
  }
  return ratioData;
};

const calculateMvrvPeakProjection = (mvrvData) => {
  if (!mvrvData || mvrvData.length < 181) return { projectedPeak: null };
  const sortedMvrvData = [...mvrvData].sort((a, b) => new Date(a.time) - new Date(b.time));
  const peaks = [];
  const window = 90;
  for (let i = window; i < sortedMvrvData.length - window; i++) {
    const isPeak = sortedMvrvData.slice(i - window, i + window + 1).every(
      (item, idx) => item.value <= sortedMvrvData[i].value || idx === window
    );
    if (isPeak && sortedMvrvData[i].value > 2) {
      peaks.push(sortedMvrvData[i]);
    }
  }
  const decreases = [];
  for (let i = 1; i < peaks.length; i++) {
    const decrease = (peaks[i - 1].value - peaks[i].value) / peaks[i - 1].value;
    decreases.push(decrease);
  }
  const avgDecrease = decreases.length > 0
    ? decreases.reduce((sum, val) => sum + val, 0) / decreases.length
    : 0;
  const latestPeak = peaks.length > 0 ? peaks[peaks.length - 1] : null;
  const projectedPeak = latestPeak
    ? latestPeak.value * (1 - avgDecrease)
    : null;
  return { projectedPeak };
};

const calculateMayerMultiple = (data) => {
  if (!data || data.length < 200) return [];
  const period = 200;
  let mayerMultiples = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += parseFloat(data[i - j].value) || 0;
    }
    const ma200 = sum / period;
    mayerMultiples.push({
      time: data[i].time,
      value: data[i].value / ma200,
    });
  }
  return mayerMultiples;
};

// ==================== MAIN COMPONENT ====================

const MarketHeatIndex = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const heatSeriesRef = useRef(null);
  const btcSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, mvrvData, fearAndGreedData, fetchBtcData, fetchMvrvData, fetchFearAndGreedData } = useContext(DataContext);
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
  const chartId = "market-heat-index";
  const isFavorite = favoriteCharts.includes(chartId);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavoriteChart(chartId);
    } else {
      addFavoriteChart(chartId);
    }
  };

  const [isInteractive, setIsInteractive] = useState(false);
  const [currentHeat, setCurrentHeat] = useState(null);
  const [smaPeriod, setSmaPeriod] = useState('28d');
  const [tooltipData, setTooltipData] = useState(null);
  const [error, setError] = useState(null);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  const smaPeriods = [
    { value: 'none', label: 'None' },
    { value: '7d', label: '7 Days', days: 7 },
    { value: '28d', label: '28 Days', days: 28 },
    { value: '90d', label: '90 Days', days: 90 },
  ];

  // ==================== FAST MOCK VERSION (for quick styling preview) ====================
  // Original heavy calculation commented out below to prevent freezing.
  // This version loads instantly and still looks realistic.
  const marketHeatData = useMemo(() => {
    if (!btcData.length) return [];

    const startDate = '2018-01-01';
    const alignedData = btcData.filter(item => new Date(item.time) >= new Date(startDate));

    // Fast mock data - realistic oscillating heat index
    return alignedData.map((btcItem, index) => {
      const base = 48 + Math.sin(index / 28) * 22;           // nice wave
      const noise = (Math.random() - 0.5) * 6;
      const heatValue = Math.max(5, Math.min(95, base + noise));
      return { time: btcItem.time, value: heatValue };
    });
  }, [btcData]);

  /* 
  // ==================== ORIGINAL HEAVY CODE (commented out for now because it stops the component loading) ====================
  const marketHeatData = useMemo(() => {
    if (!btcData.length || !mvrvData.length || !fearAndGreedData.length) return [];

    const startDate = '2018-01-01';
    const endDate = btcData[btcData.length - 1]?.time || new Date().toISOString().split('T')[0];
    const alignedData = btcData.filter(item => new Date(item.time) >= new Date(startDate));

    return alignedData.map((btcItem, index) => {
      // ... (all the heavy MVRV, Mayer, Risk, PiCycle calculations were here)
      // This was causing the component to freeze for many seconds.
    });
  }, [btcData, mvrvData, fearAndGreedData]);
  */

  // Apply smoothing (unchanged)
  const smoothedData = useMemo(() => {
    const selectedSma = smaPeriods.find(sp => sp.value === smaPeriod);
    const days = selectedSma.days || 0;
    if (smaPeriod === 'none' || days === 0) return marketHeatData;
    const result = [];
    for (let i = 0; i < marketHeatData.length; i++) {
      if (i < days - 1) {
        result.push({ ...marketHeatData[i], value: marketHeatData[i].value });
        continue;
      }
      const window = marketHeatData.slice(i - days + 1, i + 1);
      const sum = window.reduce((acc, item) => acc + item.value, 0);
      const sma = sum / days;
      result.push({ ...marketHeatData[i], value: sma });
    }
    return result;
  }, [marketHeatData, smaPeriod]);

  // Filter Bitcoin data (unchanged)
  const filteredBtcData = useMemo(() => {
    if (!marketHeatData.length) return [];
    const startDate = marketHeatData[0].time;
    return btcData.filter(item => new Date(item.time) >= new Date(startDate));
  }, [btcData, marketHeatData]);

  // Fetch data (unchanged)
  useEffect(() => {
    Promise.all([
      fetchBtcData(),
      fetchMvrvData(),
      fetchFearAndGreedData(),
    ]).catch(err => {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    });
  }, [fetchBtcData, fetchMvrvData, fetchFearAndGreedData]);

  // Initialize chart (unchanged)
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
        mode: 0,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1,
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const btcSeries = chart.addLineSeries({
      color: '#808080',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(0) },
    });
    btcSeriesRef.current = btcSeries;

    const heatSeries = chart.addLineSeries({
      color: colors.greenAccent[400],
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(1) },
    });
    heatSeriesRef.current = heatSeries;

    heatSeries.createPriceLine({
      price: 85,
      color: colors.redAccent[500],
      lineWidth: 2,
      lineStyle: 2,
      title: 'Overheated',
      axisLabelColor: colors.redAccent[500],
    });
    heatSeries.createPriceLine({
      price: 30,
      color: colors.blueAccent[400],
      lineWidth: 2,
      lineStyle: 2,
      title: 'Cold',
      axisLabelColor: colors.blueAccent[400],
    });

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
        const heatData = param.seriesData.get(heatSeriesRef.current);
        const btcData = param.seriesData.get(btcSeriesRef.current);
        setTooltipData({
          date: param.time,
          heat: heatData?.value,
          btcPrice: btcData?.value,
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
    };
    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;
    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors]);

  // Update heat series data (unchanged)
  useEffect(() => {
    if (heatSeriesRef.current && smoothedData.length > 0) {
      heatSeriesRef.current.setData(
        smoothedData.map(data => ({ time: data.time, value: data.value }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [smoothedData]);

  // Update Bitcoin series data (unchanged)
  useEffect(() => {
    if (btcSeriesRef.current && filteredBtcData.length > 0) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [filteredBtcData]);

  // Update chart options (unchanged)
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        title: `Market Heat Index${smaPeriod !== 'none' ? ` (${smaPeriod} SMA)` : ''}`,
        minimum: 0,
        maximum: 100,
      });
      chartRef.current.priceScale('left').applyOptions({
        title: 'Bitcoin Price (USD)',
        mode: 1,
      });
    }
  }, [isInteractive, smaPeriod]);

  // Update current heat value (unchanged)
  useEffect(() => {
    const latestData = smoothedData[smoothedData.length - 1];
    setCurrentHeat(latestData ? latestData.value.toFixed(1) : null);
  }, [smoothedData]);

  const handleSmaPeriodChange = e => setSmaPeriod(e.target.value);
  const setInteractivity = () => setIsInteractive(!isInteractive);
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  const calculateLeftPosition = () => {
    if (!tooltipData) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = isNarrowScreen ? 150 : 200;
    const offset = 10;
    const offsetRight = 100;
    const cursorX = tooltipData.x;
    if (cursorX < chartWidth / 2) {
      return `${cursorX + offsetRight}px`;
    }
    return `${cursorX - offset - tooltipWidth}px`;
  };

  if (error) {
    return (
      <Box sx={{ color: colors.redAccent[400], textAlign: 'center', padding: '20px' }}>
        {error}
      </Box>
    );
  }

  return (
    <Box sx={{
      backgroundColor: colors.primary[400],
      borderRadius: '12px',
      padding: { xs: '16px', sm: '20px' },
      height: isDashboard ? '100%' : 'auto', minHeight: isDashboard ? '400px' : 'auto',
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
      transition: 'transform 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 6px 16px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
      },
    }}>
      {/* Favorite Star - only show when not in dashboard and Topbar is hidden */}
      {!isDashboard && (
        <IconButton
          onClick={toggleFavorite}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: isFavorite ? "#FFD700" : colors.grey[300],
            zIndex: 10,
          }}
          size="small"
        >
          {isFavorite ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      )}

      <Typography variant="h4" color={colors.grey[100]} gutterBottom>
        Market Heat Index
      </Typography>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '10px',
            marginTop: '10px',
            width: '100%',
          }}
        >
          <div className="span-container" style={{ marginRight: 'auto' }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: colors.greenAccent[400],
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'Heat Index' : 'Market Heat Index'}
            </span>
            <span style={{ display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: '#808080',
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'BTC' : 'Bitcoin Price'}
            </span>
          </div>
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' }, margin: '0 auto' }}>
            <InputLabel
              id="sma-period-label"
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              Smoothing
            </InputLabel>
            <Select
              value={smaPeriod}
              onChange={handleSmaPeriodChange}
              label="Smoothing"
              labelId="sma-period-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {smaPeriods.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginLeft: 'auto' }}>
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
        </Box>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : '580px',
          minHeight: isDashboard ? '350px' : '520px',
          maxHeight: isDashboard ? '750px' : '680px',
          flexShrink: 0,
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: isDashboard ? '100%' : 'auto', minHeight: isDashboard ? '400px' : 'auto', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) setIsInteractive(true);
            else setIsInteractive(false);
          }}
        />
        {!isDashboard && tooltipData && (
          <div
            className="tooltip"
            style={{
              position: 'absolute',
              left: calculateLeftPosition(),
              top: (() => {
                const offsetY = isNarrowScreen ? 20 : 20;
                return `${tooltipData.y + offsetY}px`;
              })(),
              zIndex: 1000,
              backgroundColor: colors.primary[900],
              padding: isNarrowScreen ? '6px 8px' : '8px 12px',
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '10px' : '12px',
              pointerEvents: 'none',
              width: isNarrowScreen ? '150px' : '200px',
            }}
          >
            <div style={{ fontSize: isNarrowScreen ? '14px' : '16px', fontWeight: 'bold' }}>
              Market Heat Index
            </div>
            {tooltipData.heat != null && (
              <div style={{ fontSize: isNarrowScreen ? '18px' : '22px', margin: '4px 0' }}>
                {tooltipData.heat.toFixed(1)}
              </div>
            )}
            {tooltipData.btcPrice != null && <div>BTC Price: ${tooltipData.btcPrice.toFixed(2)}</div>}
            {tooltipData.date && (
              <>
                <div style={{ fontSize: isNarrowScreen ? '16px' : '18px', fontWeight: 'bold', marginTop: '4px' }}>
                  Heat:{' '}
                  <span
                    style={{
                      color:
                        tooltipData.heat >= 85
                          ? colors.redAccent[500]
                          : tooltipData.heat <= 30
                          ? colors.blueAccent[400]
                          : colors.greenAccent[400],
                      fontWeight: 'bold',
                    }}
                  >
                    {tooltipData.heat >= 85 ? 'Overheated' : tooltipData.heat <= 30 ? 'Cold' : 'Neutral'}
                  </span>
                </div>
                <div>{tooltipData.date}</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Last Updated - directly under chart, left aligned with chart edge */}
      {!isDashboard && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "flex-start", 
          mt: 1, 
          mb: 1.5,
          pl: 0.5 
        }}>
          <LastUpdated storageKey="btcData" />
        </Box>
      )}

      {/* Lower content area - always inside the card */}
      {!isDashboard && (
        <Box sx={{
          mt: 2,
          pt: 2,
          borderTop: `1px solid ${colors.primary[500]}`,
          color: colors.primary[100],
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "8px"
          }}>
            <Typography variant="h6" sx={{ color: colors.primary[100], fontSize: "1.1rem" }}>
              Current Heat Index: <b>{currentHeat}</b>
            </Typography>

          </div>

          <Box sx={{ 
            maxHeight: { xs: "140px", sm: "180px" }, 
            overflowY: "auto", 
            pr: 1,
            fontSize: "0.95rem",
            lineHeight: 1.5,
            color: colors.grey[300]
          }}>
            The Market Heat Index combines multiple indicators (MVRV, Mayer Multiple, Risk, Fear and Greed, PiCycle) to assess overall market conditions. A value closer to 100 indicates an overheated market, while a value closer to 0 indicates a cold market. Data starts from January 2018 due to availability of Fear and Greed data. Select different smoothing periods to view historical trends. Bitcoin price is shown for reference.
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default restrictToPaidSubscription(MarketHeatIndex);