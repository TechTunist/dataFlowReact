import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinPrice = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({}).current;
  const fedBalanceSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const mayerMultipleSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const mayerPriceLinesRef = useRef([]);
  const mvrvPriceLinesRef = useRef([]);
  const rsiPriceLinesRef = useRef([]);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [activeRsiPeriod, setActiveRsiPeriod] = useState('');
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const {
    btcData,
    fedBalanceData,
    mvrvData,
    fetchBtcData,
    fetchFedBalanceData,
    fetchMvrvData,
  } = useContext(DataContext);

  const indicators = {
    'fed-balance': {
      color: 'purple',
      label: 'Fed Balance (Trillions)',
      description: 'The Federal Reserve\'s balance sheet size in trillions of USD, reflecting monetary policy and liquidity in the economy, which may influence Bitcoin\'s price.',
    },
    'mvrv': {
      color: 'orange',
      label: 'MVRV Ratio',
      description: 'Market Value to Realized Value ratio with projected peak based on historical decreases. Values above 3.7 suggest overvaluation; below 1 indicate undervaluation.',
    },
    'mayer-multiple': {
      color: 'red',
      label: 'Mayer Multiple',
      description: 'The ratio of Bitcoin\'s current price to its 200-day moving average. Above 2.4 often signals overbought conditions; below 1 may indicate undervaluation.',
    },
    'rsi': {
      color: 'green', // Changed to green to avoid conflict with MVRV
      label: 'RSI',
      description: 'Relative Strength Index measures momentum. Values above 70 suggest overbought conditions; below 30 indicate oversold conditions.',
    },
  };

  const smaIndicators = {
    '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA', type: 'sma' },
    '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA', type: 'sma' },
    '50w-sma': { period: 50 * 7, color: 'magenta', label: '50 Week SMA', type: 'sma' },
    '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA', type: 'sma' },
    '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA', type: 'sma' },
    'bull-market-support': {
      sma: { period: 20 * 7, color: 'red', label: '20 Week SMA (Bull Market Support)' },
      ema: { period: 21 * 7, color: 'limegreen', label: '21 Week EMA (Bull Market Support)' },
      label: 'Bull Market Support Band',
      type: 'bull-market-support',
    },
  };

  const rsiPeriods = {
    '14-day': { days: 14, label: '14 Day RSI' },
    '28-day': { days: 28, label: '28 Day RSI' },
    '90-day': { days: 90, label: '90 Day RSI' },
    '180-day': { days: 180, label: '180 Day RSI' },
    '1-year': { days: 365, label: '1 Year RSI' },
    '2-year': { days: 730, label: '2 Year RSI' },
    '3-year': { days: 1095, label: '3 Year RSI' },
    '4-year': { days: 1460, label: '4 Year RSI' },
  };

  // Simplified functions without useCallback for clarity, as they are lightweight
  const setInteractivity = () => setIsInteractive(!isInteractive);
  const toggleScaleMode = () => setScaleMode(prev => (prev === 1 ? 0 : 1));
  const resetChartView = () => chartRef.current?.timeScale().fitContent();
  const handleIndicatorChange = (event) => setActiveIndicators(event.target.value);
  const handleSMAChange = (event) => setActiveSMAs(event.target.value);
  const handleRsiPeriodChange = (event) => setActiveRsiPeriod(event.target.value);

  const calculateMovingAverage = useCallback((data, period) => {
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

  const calculateExponentialMovingAverage = useCallback((data, period) => {
    const k = 2 / (period + 1);
    let emaData = [];
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].value;
    }
    let ema = sum / period;
    emaData.push({ time: data[period - 1].time, value: ema });
    for (let i = period; i < data.length; i++) {
      ema = (data[i].value * k) + (ema * (1 - k));
      emaData.push({ time: data[i].time, value: ema });
    }
    return emaData;
  }, []);

  const calculateMayerMultiple = useCallback((data) => {
    const period = 200;
    let mayerMultiples = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].value;
      }
      const ma200 = sum / period;
      mayerMultiples.push({
        time: data[i].time,
        value: data[i].value / ma200,
      });
    }
    return mayerMultiples;
  }, []);

  const calculateRSI = useCallback((data, period) => {
    let rsiData = [];
    for (let i = period; i < data.length; i++) {
      let gains = 0;
      let losses = 0;
      for (let j = 1; j <= period; j++) {
        const diff = data[i - j + 1].value - data[i - j].value;
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      rsiData.push({
        time: data[i].time,
        value: rsi,
      });
    }
    return rsiData;
  }, []);

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
  }, [fetchBtcData]);

  useEffect(() => {
    if (activeIndicators.includes('fed-balance')) {
      fetchFedBalanceData();
    }
  }, [activeIndicators, fetchFedBalanceData]);

  useEffect(() => {
    if (activeIndicators.includes('mvrv')) {
      fetchMvrvData();
    }
  }, [activeIndicators, fetchMvrvData]);

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
      leftPriceScale: {
        mode: scaleMode,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}T` },
      },
      additionalPriceScales: {
        'mvrv-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
        'mayer-multiple-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
        'rsi-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
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

    const fedBalanceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: indicators['fed-balance'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    fedBalanceSeriesRef.current = fedBalanceSeries;

    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'mvrv-scale',
      color: indicators['mvrv'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    mvrvSeriesRef.current = mvrvSeries;

    const mayerMultipleSeries = chart.addLineSeries({
      priceScaleId: 'mayer-multiple-scale',
      color: indicators['mayer-multiple'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    mayerMultipleSeriesRef.current = mayerMultipleSeries;

    const rsiSeries = chart.addLineSeries({
      priceScaleId: 'rsi-scale',
      color: indicators['rsi'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    rsiSeriesRef.current = rsiSeries;

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

        const fedSeriesData = fedBalanceSeriesRef.current?.data() || [];
        const nearestFedData = fedSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const fedBalanceValue = nearestFedData ? nearestFedData.value : null;

        const mvrvSeriesData = mvrvSeriesRef.current?.data() || [];
        const nearestMvrvData = mvrvSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const mvrvValue = nearestMvrvData ? nearestMvrvData.value : null;

        const mayerMultipleData = mayerMultipleSeriesRef.current?.data() || [];
        const nearestMayerData = mayerMultipleData.length > 0
          ? mayerMultipleData.reduce((prev, curr) => {
              const currTime = new Date(curr.time).getTime();
              return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
            }, null)
          : null;
        const mayerMultipleValue = nearestMayerData ? nearestMayerData.value : null;

        const rsiSeriesData = rsiSeriesRef.current?.data() || [];
        const nearestRsiData = rsiSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const rsiValue = nearestRsiData ? nearestRsiData.value : null;

        const { projectedPeak } = mvrvSeriesData.length > 0 ? calculateMvrvPeakProjection(mvrvSeriesData) : { projectedPeak: null };

        setTooltipData({
          date: dateStr,
          price: priceData?.value,
          fedBalance: fedBalanceValue,
          mvrv: mvrvValue,
          mayerMultiple: mayerMultipleValue,
          rsi: rsiValue,
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
      // Clear all series references
      Object.keys(smaSeriesRefs).forEach(key => delete smaSeriesRefs[key]);
      [mayerPriceLinesRef, mvrvPriceLinesRef, rsiPriceLinesRef].forEach(ref => {
        ref.current.forEach(priceLine => {
          try {
            const series = ref === mayerPriceLinesRef ? mayerMultipleSeriesRef.current :
                          ref === mvrvPriceLinesRef ? mvrvSeriesRef.current :
                          rsiSeriesRef.current;
            series?.removePriceLine(priceLine);
          } catch (error) {
            console.error('Error removing price line:', error);
          }
        });
        ref.current = [];
      });
      try {
        chart.remove();
      } catch (error) {
        console.error('Error removing chart:', error);
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // No dependencies to prevent reinitialization

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
      chartRef.current.priceScale('left').applyOptions({ mode: scaleMode, borderVisible: false });
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

  // Update Fed Balance data
  useEffect(() => {
    if (fedBalanceSeriesRef.current && btcData.length > 0 && fedBalanceData.length > 0) {
      const btcStartTime = new Date(btcData[0].time).getTime();
      const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
      const filteredFedData = fedBalanceData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= btcStartTime && itemTime <= btcEndTime;
      });
      try {
        fedBalanceSeriesRef.current.setData(filteredFedData);
        fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
      } catch (error) {
        console.error('Error setting Fed Balance data:', error);
      }
    }
  }, [fedBalanceData, btcData, activeIndicators]);

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

  // Update Mayer Multiple data
  useEffect(() => {
    if (mayerMultipleSeriesRef.current && btcData.length > 0) {
      try {
        const mayerMultipleData = calculateMayerMultiple(btcData);
        mayerMultipleSeriesRef.current.setData(mayerMultipleData);
        mayerPriceLinesRef.current.forEach(priceLine => {
          try {
            mayerMultipleSeriesRef.current.removePriceLine(priceLine);
          } catch (error) {
            console.error('Error removing Mayer Multiple price line:', error);
          }
        });
        mayerPriceLinesRef.current = [];
        if (activeIndicators.includes('mayer-multiple')) {
          const overboughtLine = mayerMultipleSeriesRef.current.createPriceLine({
            price: 2.4,
            color: 'darkred',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Overbought',
          });
          const undervaluedLine = mayerMultipleSeriesRef.current.createPriceLine({
            price: 1,
            color: 'darkred',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Undervalued',
          });
          const severelyUndervaluedLine = mayerMultipleSeriesRef.current.createPriceLine({
            price: 0.6,
            color: 'darkred',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Severely Undervalued',
          });
          mayerPriceLinesRef.current = [overboughtLine, undervaluedLine, severelyUndervaluedLine];
          mayerMultipleSeriesRef.current.applyOptions({ visible: true });
        } else {
          mayerMultipleSeriesRef.current.applyOptions({ visible: false });
        }
      } catch (error) {
        console.error('Error setting Mayer Multiple data:', error);
      }
    }
  }, [btcData, activeIndicators, calculateMayerMultiple]);

  // Update RSI data
  useEffect(() => {
    if (rsiSeriesRef.current && btcData.length > 0 && activeIndicators.includes('rsi') && activeRsiPeriod) {
      try {
        const period = rsiPeriods[activeRsiPeriod].days;
        const rsiData = calculateRSI(btcData, period);
        rsiSeriesRef.current.setData(rsiData);
        rsiPriceLinesRef.current.forEach(priceLine => {
          try {
            rsiSeriesRef.current.removePriceLine(priceLine);
          } catch (error) {
            console.error('Error removing RSI price line:', error);
          }
        });
        rsiPriceLinesRef.current = [];
        const overboughtLine = rsiSeriesRef.current.createPriceLine({
          price: 70,
          color: indicators['rsi'].color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'Overbought',
        });
        const oversoldLine = rsiSeriesRef.current.createPriceLine({
          price: 30,
          color: indicators['rsi'].color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'Oversold',
        });
        rsiPriceLinesRef.current = [overboughtLine, oversoldLine];
        rsiSeriesRef.current.applyOptions({ visible: true });
      } catch (error) {
        console.error('Error setting RSI data:', error);
      }
    } else if (rsiSeriesRef.current) {
      try {
        rsiSeriesRef.current.applyOptions({ visible: false });
        rsiPriceLinesRef.current.forEach(priceLine => {
          try {
            rsiSeriesRef.current.removePriceLine(priceLine);
          } catch (error) {
            console.error('Error removing RSI price line:', error);
          }
        });
        rsiPriceLinesRef.current = [];
      } catch (error) {
        console.error('Error hiding RSI series:', error);
      }
    }
  }, [btcData, activeIndicators, activeRsiPeriod, calculateRSI, rsiPeriods]);

  // Update SMA data
  useEffect(() => {
    if (!chartRef.current || btcData.length === 0) return;
    // Remove existing SMA series safely
    Object.keys(smaSeriesRefs).forEach(key => {
      if (smaSeriesRefs[key]) {
        try {
          chartRef.current.removeSeries(smaSeriesRefs[key]);
        } catch (error) {
          console.error('Error removing SMA series:', error);
        }
        delete smaSeriesRefs[key];
      }
    });
    // Add new SMA series
    activeSMAs.forEach(key => {
      const indicator = smaIndicators[key];
      try {
        if (indicator.type === 'sma') {
          const series = chartRef.current.addLineSeries({
            color: indicator.color,
            lineWidth: 2,
            priceLineVisible: false,
            priceScaleId: 'right',
          });
          smaSeriesRefs[key] = series;
          const data = calculateMovingAverage(btcData, indicator.period);
          series.setData(data);
        } else if (indicator.type === 'bull-market-support') {
          const smaSeries = chartRef.current.addLineSeries({
            color: indicator.sma.color,
            lineWidth: 2,
            priceLineVisible: false,
            priceScaleId: 'right',
          });
          smaSeriesRefs[`${key}-sma`] = smaSeries;
          const smaData = calculateMovingAverage(btcData, indicator.sma.period);
          smaSeries.setData(smaData);
          const emaSeries = chartRef.current.addLineSeries({
            color: indicator.ema.color,
            lineWidth: 2,
            priceLineVisible: false,
            priceScaleId: 'right',
          });
          smaSeriesRefs[`${key}-ema`] = emaSeries;
          const emaData = calculateExponentialMovingAverage(btcData, indicator.ema.period);
          emaSeries.setData(emaData);
        }
      } catch (error) {
        console.error('Error adding SMA series:', error);
      }
    });
  }, [activeSMAs, btcData, calculateMovingAverage, calculateExponentialMovingAverage, smaIndicators]);

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
                borderRadius: "8px",
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
              Moving Averages
            </InputLabel>
            <Select
              multiple
              value={activeSMAs}
              onChange={handleSMAChange}
              labelId="sma-label"
              label="Moving Averages"
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
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="rsi-period-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              RSI Period
            </InputLabel>
            <Select
              value={activeRsiPeriod}
              onChange={handleRsiPeriodChange}
              labelId="rsi-period-label"
              label="RSI Period"
              displayEmpty
              renderValue={(selected) =>
                selected ? rsiPeriods[selected].label : 'Select RSI Period'
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
              <MenuItem value="">
                <span>None</span>
              </MenuItem>
              {Object.entries(rsiPeriods).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
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
        onDoubleClick={() => setInteractivity(!isInteractive)}
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
              {key === 'rsi' && activeRsiPeriod ? rsiPeriods[activeRsiPeriod].label : indicators[key].label}
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
          {activeSMAs.map(key => {
            const indicator = smaIndicators[key];
            if (indicator.type === 'bull-market-support') {
              return (
                <React.Fragment key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        backgroundColor: indicator.sma.color,
                        marginRight: '5px',
                      }}
                    />
                    {indicator.sma.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        backgroundColor: indicator.ema.color,
                        marginRight: '5px',
                      }}
                    />
                    {indicator.ema.label}
                  </div>
                </React.Fragment>
              );
            }
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    backgroundColor: indicator.color,
                    marginRight: '5px',
                  }}
                />
                {indicator.label}
              </div>
            );
          })}
        </div>
      </div>
      {!isDashboard && (
        <div className='under-chart' style={{ padding: '10px 0' }}>
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
                {key === 'rsi' && activeRsiPeriod ? rsiPeriods[activeRsiPeriod].label : indicators[key].label}:
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
              if (rightPosition + tooltipWidth <= chartWidth) return `${rightPosition}px`;
              if (leftPosition >= 0) return `${leftPosition}px`;
              return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 150}px`,
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '15px' }}>Bitcoin</div>
          <div style={{ fontSize: '20px' }}>${tooltipData.price?.toFixed(2)}</div>
          {activeIndicators.includes('fed-balance') && tooltipData.fedBalance !== null && (
            <div style={{ color: indicators['fed-balance'].color }}>
              Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T
            </div>
          )}
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
          {activeIndicators.includes('mayer-multiple') && tooltipData.mayerMultiple !== null && (
            <div style={{ color: indicators['mayer-multiple'].color }}>
              Mayer Multiple: {tooltipData.mayerMultiple.toFixed(2)}
            </div>
          )}
          {activeIndicators.includes('rsi') && tooltipData.rsi !== null && activeRsiPeriod && (
            <div style={{ color: indicators['rsi'].color }}>
              {rsiPeriods[activeRsiPeriod].label}: {tooltipData.rsi.toFixed(2)}
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

export default restrictToPaidSubscription(BitcoinPrice);