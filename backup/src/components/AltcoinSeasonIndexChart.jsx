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
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

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
  }, []);

  useEffect(() => {
    if (indexSeriesRef.current && smoothedData.length > 0) {
      indexSeriesRef.current.setData(
        smoothedData.map(data => ({ time: data.time, value: data.index }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [smoothedData]);

  useEffect(() => {
    if (btcSeriesRef.current && filteredBtcData.length > 0) {
      btcSeriesRef.current.setData(
        filteredBtcData.map(data => ({ time: data.time, value: data.value }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [filteredBtcData]);

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
  const setInteractivity = () => setIsInteractive(!isInteractive);
  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  const calculateLeftPosition = () => {
    if (!tooltipData) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = isNarrowScreen ? 150 : 200; // Reduced width for narrow screens
    const offset = 10;
    const offsetRight = 100;
    const cursorX = tooltipData.x;

    // Place tooltip to the right if cursor is in the left half of the chart
    if (cursorX < chartWidth / 2) {
      return `${cursorX + offsetRight}px`;
    }
    // Place tooltip to the left if cursor is in the right half of the chart
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
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '10px',
            marginTop: '50px',
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
              {isMobile ? 'Index' : 'Altcoin Season Index'}
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
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' }, margin: '0 строительство auto' }}>
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
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
              padding: isNarrowScreen ? '6px 8px' : '8px 12px', // Reduced padding for narrow screens
              borderRadius: '4px',
              color: colors.grey[100],
              fontSize: isNarrowScreen ? '10px' : '12px', // Reduced font size for narrow screens
              pointerEvents: 'none',
              width: isNarrowScreen ? '150px' : '200px', // Reduced width for narrow screens
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
                          ? 'violet' // Altcoin Season color
                          : tooltipData.index <= 25
                          ? 'orange' // Bitcoin Season color
                          : colors.greenAccent[400], // Neutral color
                      fontWeight: 'bold',
                    }}
                  >
                    {tooltipData.index >= 75 ? 'Altcoin Season' : tooltipData.index <= 25 ? 'Bitcoin Season' : 'Neutral'}
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