import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, useMediaQuery } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const AltcoinSeasonIndexChart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const indexSeriesRef = useRef(null);
  const btcSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { altcoinSeasonTimeseriesData, fetchAltcoinSeasonTimeseriesData, btcData, fetchBtcData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [smaPeriod, setSmaPeriod] = useState('28d');
  const [tooltipData, setTooltipData] = useState(null);
  const [error, setError] = useState(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const isInteractiveRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  const smaPeriods = [
    { value: 'none', label: 'None' },
    { value: '7d', label: '7 Days', days: 7 },
    { value: '28d', label: '28 Days', days: 28 },
    { value: '90d', label: '90 Days', days: 90 },
  ];

  const smoothedData = useMemo(() => {
    const selectedSma = smaPeriods.find(sp => sp.value === smaPeriod);
    const days = selectedSma.days || 0;
    if (smaPeriod === 'none' || days === 0) return altcoinSeasonTimeseriesData;
    const result = [];
    for (let i = 0; i < altcoinSeasonTimeseriesData.length; i++) {
      if (i < days - 1) {
        result.push({ ...altcoinSeasonTimeseriesData[i], index: altcoinSeasonTimeseriesData[i].index });
        continue;
      }
      const window = altcoinSeasonTimeseriesData.slice(i - days + 1, i + 1);
      const sum = window.reduce((acc, item) => acc + item.index, 0);
      const sma = sum / days;
      result.push({ ...altcoinSeasonTimeseriesData[i], index: sma });
    }
    return result;
  }, [altcoinSeasonTimeseriesData, smaPeriod]);

  const filteredBtcData = useMemo(() => {
    if (!altcoinSeasonTimeseriesData.length) return [];
    const startDate = altcoinSeasonTimeseriesData[0].time;
    return btcData.filter(item => new Date(item.time) >= new Date(startDate));
  }, [btcData, altcoinSeasonTimeseriesData]);

  useEffect(() => {
    Promise.all([
      fetchAltcoinSeasonTimeseriesData(),
      fetchBtcData(),
    ]).catch(err => {
      setError('Failed to load data');
      console.error('Error fetching data:', err);
    });
  }, [fetchAltcoinSeasonTimeseriesData, fetchBtcData]);

  // Update refs
  useEffect(() => {
    isInteractiveRef.current = isInteractive;
  }, [isInteractive]);

  useEffect(() => {
    hasUserInteractedRef.current = hasUserInteracted;
  }, [hasUserInteracted]);

  // Initialize chart (runs only once)
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.1)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.1)' },
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

    const indexSeries = chart.addLineSeries({
      color: colors.greenAccent[400],
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: value => value.toFixed(1) },
    });
    indexSeriesRef.current = indexSeries;

    indexSeries.createPriceLine({
      price: 75,
      color: 'violet',
      lineWidth: 2,
      lineStyle: 2,
      title: 'Altcoin Season',
      axisLabelColor: 'violet',
    });
    indexSeries.createPriceLine({
      price: 25,
      color: 'orange',
      lineWidth: 2,
      lineStyle: 2,
      title: 'Bitcoin Season',
      axisLabelColor: 'orange',
    });

    // Track user interactions
    const handleChartClick = () => {
      if (isInteractiveRef.current) {
        setHasUserInteracted(true);
      }
    };

    const handleCrosshairMove = (param) => {
      if (isInteractiveRef.current && !hasUserInteractedRef.current && param.point) {
        // User is interacting with the chart for the first time
        setHasUserInteracted(true);
      }
     
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
        const indexData = param.seriesData.get(indexSeriesRef.current);
        const btcData = param.seriesData.get(btcSeriesRef.current);
        setTooltipData({
          date: param.time,
          index: indexData?.value,
          btcPrice: btcData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleChartClick);

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    };

    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;
   
    return () => {
      window.removeEventListener('resize', resizeChart);
      chart.remove();
    };
  }, []);

  // Update chart colors on theme change
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: 'rgba(70, 70, 70, 0.1)' },
          horzLines: { color: 'rgba(70, 70, 70, 0.1)' },
        },
      });
    }
  }, [colors.primary[700], colors.primary[100]]);

  // Update series color on theme change
  useEffect(() => {
    if (indexSeriesRef.current) {
      indexSeriesRef.current.applyOptions({
        color: colors.greenAccent[400],
      });
    }
  }, [colors.greenAccent[400]]);

  // Update smoothed data with conditional fitContent
  useEffect(() => {
    if (indexSeriesRef.current && smoothedData.length > 0) {
      indexSeriesRef.current.setData(
        smoothedData.map(data => ({ time: data.time, value: data.index }))
      );
      
      // Only fit content if user hasn't interacted
      const shouldFitContent = !hasUserInteracted;
      if (shouldFitContent) {
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [smoothedData]);

  // Update filtered BTC data with conditional fitContent
  useEffect(() => {
    if (btcSeriesRef.current && filteredBtcData.length > 0) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
      
      // Only fit content if user hasn't interacted
      const shouldFitContent = !hasUserInteracted;
      if (shouldFitContent) {
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [filteredBtcData]);

  // Update chart interactivity and price scale titles
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('right').applyOptions({
        title: `Altcoin Season Index${smaPeriod !== 'none' ? ` (${smaPeriod} SMA)` : ''}`,
        minimum: 0,
        maximum: 100,
      });
      chartRef.current.priceScale('left').applyOptions({
        title: 'Bitcoin Price (USD)',
        mode: 1,
      });
    }
  }, [isInteractive, smaPeriod]);

  useEffect(() => {
    const latestData = smoothedData[smoothedData.length - 1];
    setCurrentIndex(latestData ? latestData.index.toFixed(1) : null);
  }, [smoothedData]);

  const handleSmaPeriodChange = e => setSmaPeriod(e.target.value);

  const setInteractivity = () => {
    const newInteractiveState = !isInteractive;
    setIsInteractive(newInteractiveState);
    
    // Only reset interaction state when enabling interactivity for the first time
    // Don't reset if user has already interacted (to preserve zoom)
    if (newInteractiveState && !hasUserInteracted) {
      setHasUserInteracted(false);
    }
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setHasUserInteracted(false);
    }
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
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '10px',
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="sma-period-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
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
        </Box>
      )}
      
      {!isDashboard && (
        <div className='chart-top-div' style={{ marginBottom: '10px' }}>
          <div className="span-container" style={{ position: 'relative', top: 10, left: 0, zIndex: 2 }}>
            <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
              <span
                style={{
                  backgroundColor: colors.greenAccent[400],
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              {isMobile ? 'Index' : 'Altcoin Season Index'}
            </span>
            <span style={{ display: 'inline-block', color: colors.primary[100] }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={setInteractivity} 
              className="button-reset" 
              style={{ 
                backgroundColor: isInteractive ? '#4cceac' : 'transparent', 
                color: isInteractive ? 'black' : '#31d6aa', 
                borderColor: isInteractive ? 'violet' : '#70d8bd' 
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
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) {
              setInteractivity();
            } else {
              setIsInteractive(false);
              // When disabling interactivity, don't reset interaction state
            }
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
              color: colors.primary[100],
              fontSize: isNarrowScreen ? '10px' : '12px',
              pointerEvents: 'none',
              width: isNarrowScreen ? '150px' : '200px',
            }}
          >
            <div style={{ fontSize: isNarrowScreen ? '14px' : '16px', fontWeight: 'bold' }}>
              Altcoin Season Index
            </div>
            {tooltipData.index && (
              <div style={{ fontSize: isNarrowScreen ? '18px' : '22px', margin: '4px 0' }}>
                {tooltipData.index.toFixed(1)}
              </div>
            )}
            {tooltipData.btcPrice && <div>BTC Price: ${tooltipData.btcPrice.toFixed(2)}</div>}
            {tooltipData.date && (
              <>
                <div style={{ fontSize: isNarrowScreen ? '16px' : '18px', fontWeight: 'bold', marginTop: '4px' }}>
                  Season:{' '}
                  <span
                    style={{
                      color:
                        tooltipData.index >= 75
                          ? 'violet'
                          : tooltipData.index <= 25
                          ? 'orange'
                          : colors.greenAccent[400],
                      fontWeight: 'bold',
                    }}
                  >
                    {tooltipData.index >= 75 ? 'Altcoin' : tooltipData.index <= 25 ? 'Bitcoin' : 'Neutral'}
                  </span>
                </div>
                {smoothedData.find(d => d.time === tooltipData.date) && (
                  <div>
                    Outperforming: {smoothedData.find(d => d.time === tooltipData.date).altcoins_outperforming}/
                    {smoothedData.find(d => d.time === tooltipData.date).altcoin_count}
                  </div>
                )}
              </>
            )}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="btcData" />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current Index: <b>{currentIndex}</b>
          </div>
          <p className="chart-info">
            The Altcoin Season Index measures the performance of altcoins relative to Bitcoin over 90-day periods. A value closer to 100 indicates an altcoin season, where most available altcoins outperform Bitcoin, while a value closer to 0 indicates a Bitcoin season. The index is calculated as the percentage of altcoins with data (varies by date, starting from January 2018) outperforming Bitcoin in price change. Select different smoothing periods to view historical trends. Bitcoin price is shown for reference, starting from January 2018.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(AltcoinSeasonIndexChart);