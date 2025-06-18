import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, Checkbox, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaid from '../scenes/RestrictToPaid';

const BitcoinMvrvChart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const mvrvZSeriesRef = useRef(null);
  const realizedPriceSeriesRef = useRef(null);
  const mvrvPriceLinesRef = useRef([]);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const {
    btcData,
    mvrvData,
    txMvrvData,
    fetchBtcData,
    fetchMvrvData,
    fetchTxMvrvData,
  } = useContext(DataContext);

  const indicators = {
    'mvrv': {
      color: 'orange',
      label: 'MVRV Ratio',
      description: 'Market Value to Realized Value ratio with projected peak based on historical decreases. Values above 3.7 suggest overvaluation; below 1 indicate undervaluation.',
    },
    'mvrv-z': {
      color: 'purple',
      label: 'MVRV Z-Score',
      description: 'Standardized MVRV score indicating deviation from mean. High positive values suggest overvaluation; negative values indicate undervaluation.',
    },
    'realized-price': {
      color: 'yellow',
      label: 'Realized Price',
      description: 'Average price at which all Bitcoins were last transacted, representing the market\'s cost basis.',
    },
  };

  const setInteractivity = () => setIsInteractive(!isInteractive);
  const toggleScaleMode = () => setScaleMode(prev => (prev === 1 ? 0 : 1));
  const resetChartView = () => chartRef.current?.timeScale().fitContent();
  const handleIndicatorChange = (event) => setActiveIndicators(event.target.value);

  const calculateMvrvPeakProjection = useCallback((mvrvData) => {
    const peaks = [];
    const window = 90;
    for (let i = window; i < mvrvData.length - window; i++) {
      const isPeak = mvrvData.slice(i - window, i + window + 1).every(
        (item, idx) => item.value <= mvrvData[i].value || idx === window
      );
      if (isPeak && mvrvData[i].value > 2) {
        peaks.push(mvrvData[i]);
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
    const latestPeak = peaks[peaks.length - 1];
    const projectedPeak = latestPeak ? latestPeak.value * (1 - avgDecrease) : null;
    return { peaks, projectedPeak };
  }, []);

  useEffect(() => {
    fetchBtcData();
    fetchTxMvrvData();
  }, [fetchBtcData, fetchTxMvrvData]);

  useEffect(() => {
    if (activeIndicators.includes('mvrv')) {
      fetchMvrvData();
    }
  }, [activeIndicators, fetchMvrvData]);

  useEffect(() => {
    if (activeIndicators.length > 0) {
      fetchTxMvrvData();
      // Log sample data for debugging
      console.log('txMvrvData sample:', txMvrvData.slice(0, 5));
    }
  }, [activeIndicators, fetchTxMvrvData, txMvrvData]);

  // Chart initialization (run once on mount)
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        mode: scaleMode,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        width: 50,
        priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}` },
      },
      additionalPriceScales: {
        'mvrv-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
        'mvrv-z-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
        'realized-price-scale': {
          mode: scaleMode, // Align with Bitcoin price scale for comparison
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
          priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}` },
        },
      },
    });

    const priceSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        minMove: 1,
        formatter: (price) => {
          if (price >= 1000) return (price / 1000).toFixed(1) + 'K';
          else if (price >= 100) return price.toFixed(0);
          return price.toFixed(1);
        },
      },
    });
    priceSeriesRef.current = priceSeries;

    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'mvrv-scale',
      color: indicators['mvrv'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    mvrvSeriesRef.current = mvrvSeries;

    const mvrvZSeries = chart.addLineSeries({
      priceScaleId: 'mvrv-z-scale',
      color: indicators['mvrv-z'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    mvrvZSeriesRef.current = mvrvZSeries;

    const realizedPriceSeries = chart.addLineSeries({
      priceScaleId: 'realized-price-scale',
      color: indicators['realized-price'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    realizedPriceSeriesRef.current = realizedPriceSeries;

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
        const dateStr = param.time;
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const currentTime = new Date(param.time).getTime();

        const mvrvSeriesData = mvrvSeriesRef.current?.data() || [];
        const nearestMvrvData = mvrvSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const mvrvValue = nearestMvrvData ? nearestMvrvData.value : null;

        const mvrvZSeriesData = mvrvZSeriesRef.current?.data() || [];
        const nearestMvrvZData = mvrvZSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const mvrvZValue = nearestMvrvZData ? nearestMvrvZData.value : null;

        const realizedPriceSeriesData = realizedPriceSeriesRef.current?.data() || [];
        const nearestRealizedPriceData = realizedPriceSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const realizedPriceValue = nearestRealizedPriceData ? nearestRealizedPriceData.value : null;

        const { projectedPeak } = mvrvSeriesData.length > 0 ? calculateMvrvPeakProjection(mvrvSeriesData) : { projectedPeak: null };

        setTooltipData({
          date: dateStr,
          price: priceData?.value,
          mvrv: mvrvValue,
          mvrvZ: mvrvZValue,
          realizedPrice: realizedPriceValue,
          mvrvPeakProjection: projectedPeak,
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
        chart.timeScale().fitContent();
      }
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      mvrvPriceLinesRef.current.forEach(priceLine => {
        try {
          mvrvSeriesRef.current?.removePriceLine(priceLine);
        } catch (error) {
          console.error('Error removing price line:', error);
        }
      });
      mvrvPriceLinesRef.current = [];
      try {
        chart.remove();
      } catch (error) {
        console.error('Error removing chart:', error);
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

  // Update chart layout and theme
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
    if (priceSeriesRef.current) {
      const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark'
        ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)' }
        : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)' };
      priceSeriesRef.current.applyOptions({ topColor, bottomColor, lineColor });
    }
  }, [colors, theme.palette.mode]);

  // Update price scale mode
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale('right').applyOptions({ mode: scaleMode, borderVisible: false });
      chartRef.current.priceScale('realized-price-scale').applyOptions({ mode: scaleMode, borderVisible: false });
    }
  }, [scaleMode]);

  // Update Bitcoin price data
  useEffect(() => {
    if (priceSeriesRef.current && btcData.length > 0) {
      try {
        priceSeriesRef.current.setData(btcData);
        chartRef.current.timeScale().fitContent();
      } catch (error) {
        console.error('Error setting Bitcoin price data:', error);
      }
    }
  }, [btcData]);

  // Update MVRV data
  useEffect(() => {
    if (mvrvSeriesRef.current && btcData.length > 0 && mvrvData.length > 0) {
      const btcStartTime = new Date(btcData[0].time).getTime();
      const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
      const cutoffDate = new Date('2010-10-08').getTime();
      const filteredMvrvData = mvrvData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= cutoffDate && itemTime >= btcStartTime && itemTime <= btcEndTime;
      });
      try {
        mvrvSeriesRef.current.setData(filteredMvrvData);
        mvrvPriceLinesRef.current.forEach(priceLine => {
          try {
            mvrvSeriesRef.current.removePriceLine(priceLine);
          } catch (error) {
            console.error('Error removing MVRV price line:', error);
          }
        });
        mvrvPriceLinesRef.current = [];
        const { projectedPeak } = calculateMvrvPeakProjection(filteredMvrvData);
        if (activeIndicators.includes('mvrv')) {
          const overvaluedLine = mvrvSeriesRef.current.createPriceLine({
            price: 3.7,
            color: indicators['mvrv'].color,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Overvalued',
          });
          const undervaluedLine = mvrvSeriesRef.current.createPriceLine({
            price: 1,
            color: indicators['mvrv'].color,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Undervalued',
          });
          const projectedPeakLine = projectedPeak ? mvrvSeriesRef.current.createPriceLine({
            price: projectedPeak,
            color: 'cyan',
            lineWidth: 2,
            lineStyle: 1,
            axisLabelVisible: true,
            title: 'Projected Peak',
          }) : null;
          mvrvPriceLinesRef.current = [overvaluedLine, undervaluedLine];
          if (projectedPeakLine) mvrvPriceLinesRef.current.push(projectedPeakLine);
          mvrvSeriesRef.current.applyOptions({ visible: true });
        } else {
          mvrvSeriesRef.current.applyOptions({ visible: false });
        }
      } catch (error) {
        console.error('Error setting MVRV data:', error);
      }
    }
  }, [mvrvData, btcData, activeIndicators, calculateMvrvPeakProjection]);

  // Update MVRV Z-Score and Realized Price data
  useEffect(() => {
    if (mvrvZSeriesRef.current && realizedPriceSeriesRef.current && btcData.length > 0 && txMvrvData.length > 0) {
      const btcStartTime = new Date(btcData[0].time).getTime();
      const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
      const cutoffDate = new Date('2010-10-08').getTime();
      const filteredTxMvrvData = txMvrvData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= cutoffDate && itemTime >= btcStartTime && itemTime <= btcEndTime &&
               typeof item.mvrv_z === 'number' && !isNaN(item.mvrv_z) &&
               typeof item.realized_price === 'number' && !isNaN(item.realized_price);
      });
      console.log('Filtered txMvrvData sample:', filteredTxMvrvData.slice(0, 5));
      try {
        mvrvZSeriesRef.current.setData(filteredTxMvrvData.map(item => ({ time: item.time, value: item.mvrv_z })));
        realizedPriceSeriesRef.current.setData(filteredTxMvrvData.map(item => ({ time: item.time, value: item.realized_price })));
        mvrvZSeriesRef.current.applyOptions({ visible: activeIndicators.includes('mvrv-z') });
        realizedPriceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('realized-price') });
      } catch (error) {
        console.error('Error setting MVRV Z-Score or Realized Price data:', error);
      }
    }
  }, [txMvrvData, btcData, activeIndicators]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
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
              id="indicators-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Indicators
            </InputLabel>
            <Select
              multiple
              value={activeIndicators}
              onChange={handleIndicatorChange}
              labelId="indicators-label"
              label="Indicators"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((key) => indicators[key].label).join(', ')
                  : 'Select Indicators'
              }
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {Object.entries(indicators).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  <Checkbox
                    checked={activeIndicators.includes(key)}
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
        <div className="chart-top-div">
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
      )}
      <div
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
          zIndex: 1,
        }}
        onDoubleClick={() => setIsInteractive(prev => !prev)}
      >
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
          {!isDashboard && <div>Active Indicators</div>}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
                marginRight: '5px',
              }}
            />
            Bitcoin Price
          </div>
          {activeIndicators.map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: indicators[key].color,
                  marginRight: '5px',
                }}
              />
              {indicators[key].label}
            </div>
          ))}
          {activeIndicators.includes('mvrv') && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'cyan',
                  marginRight: '5px',
                }}
              />
              MVRV Peak Projection
            </div>
          )}
        </div>
      </div>
      {!isDashboard && (
        <div className='under-chart' style={{ padding: '10px' }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
          }}>
            <LastUpdated storageKey="btcData" />
            <BitcoinFees />
          </Box>
        </div>
      )}
      {!isDashboard && activeIndicators.length > 0 && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {activeIndicators.map(key => (
            <p key={key} style={{ margin: '5px 0' }}>
              <strong style={{ color: indicators[key].color }}>
                {indicators[key].label}:
              </strong> {indicators[key].description}
            </p>
          ))}
        </Box>
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 1000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              if (rightPosition + tooltipWidth <= chartWidth) {
                return `${rightPosition}px`;
              }
              if (leftPosition >= 0) {
                return `${leftPosition}px`;
              }
              return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 150}px`,
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '15px' }}>Bitcoin</div>
          <div style={{ fontSize: '20px' }}>${tooltipData.price?.toFixed(2)}</div>
          {activeIndicators.includes('mvrv') && tooltipData.mvrv !== null && (
            <div style={{ color: indicators['mvrv'].color }}>
              MVRV Ratio: {tooltipData.mvrv.toFixed(2)}
            </div>
          )}
          {activeIndicators.includes('mvrv') && tooltipData.mvrvPeakProjection !== null && (
            <div style={{ color: 'cyan' }}>
              MVRV Peak Projection: {tooltipData.mvrvPeakProjection.toFixed(2)}
            </div>
          )}
          {activeIndicators.includes('mvrv-z') && tooltipData.mvrvZ !== null && (
            <div style={{ color: indicators['mvrv-z'].color }}>
              MVRV Z-Score: {tooltipData.mvrvZ.toFixed(2)}
            </div>
          )}
          {activeIndicators.includes('realized-price') && tooltipData.realizedPrice !== null && (
            <div style={{ color: indicators['realized-price'].color }}>
              Realized Price: ${tooltipData.realizedPrice.toFixed(2)}
            </div>
          )}
          <div>{tooltipData.date ? tooltipData.date.split('-').reverse().join('-') : ''}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          Bitcoin represents a significant advancement in digital finance. It operates on a globally distributed and permissionless ledger,
          secured by a network of miners. This system is designed to be transparent, secure, and resilient. Bitcoin enables the transfer of
          value without intermediaries, offering a unique digital asset that can be sent anywhere in the world almost instantly.
          As a finite digital currency, it provides a novel way to store and transfer wealth, with potential implications for global finance and value exchange.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

export default restrictToPaid(BitcoinMvrvChart);