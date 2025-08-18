import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const AltcoinPrice = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({}).current;
  const fedBalanceSeriesRef = useRef(null);
  const mayerMultipleSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const rsiPriceLinesRef = useRef([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scaleMode, setScaleMode] = useState(0); // 0: linear, 1: logarithmic
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [denominator, setDenominator] = useState('USD');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [activeRsiPeriod, setActiveRsiPeriod] = useState('');
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const {
    altcoinData,
    fetchAltcoinData,
    altcoinLastUpdated,
    btcData,
    fetchBtcData,
    fedBalanceData,
    fetchFedBalanceData,
    fedLastUpdated,
  } = useContext(DataContext);

  // Define indicators
  const indicators = useMemo(() => ({
    'fed-balance': {
      color: 'purple',
      label: 'Fed Balance (Trillions)',
      description: 'The Federal Reserve\'s balance sheet size in trillions of USD, reflecting monetary policy and liquidity in the economy, which may influence altcoin prices.',
    },
    'mayer-multiple': {
      color: 'red',
      label: 'Mayer Multiple',
      description: `The ratio of the ${selectedCoin} price to its 200-day moving average. Above 2.4 often signals overbought conditions; below 1 may indicate undervaluation.`,
    },
  }), [selectedCoin]);

  // Define SMA indicators including Bull Market Support
  const smaIndicators = useMemo(() => ({
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
  }), []);

  // Define RSI periods
  const rsiPeriods = useMemo(() => ({
    'Daily': { days: 14, label: 'Daily RSI' },
    'Weekly': { days: 98, label: 'Weekly RSI' },
    // '90-day': { days: 90, label: '90 Day RSI' },
    // '180-day': { days: 180, label: '180 Day RSI' },
    // '1-year': { days: 365, label: '1 Year RSI' },
    // '2-year': { days: 730, label: '2 Year RSI' },
    // '3-year': { days: 1095, label: '3 Year RSI' },
    // '4-year': { days: 1460, label: '4 Year RSI' },
  }), []);

  // Hardcoded list of altcoins
  const altcoins = [
    { label: 'Ethereum', value: 'ETH' },
    { label: 'Solana', value: 'SOL' },
    { label: 'Cardano', value: 'ADA' },
    { label: 'Dogecoin', value: 'DOGE' },
    { label: 'Chainlink', value: 'LINK' },
    { label: 'XRP', value: 'XRP' },
    { label: 'Avalanche', value: 'AVAX' },
    { label: 'Toncoin', value: 'TON' },
    { label: 'Binance-Coin', value: 'BNB' },
    { label: 'Aave', value: 'AAVE' },
    { label: 'Cronos', value: 'CRO' },
    { label: 'Sui', value: 'SUI' },
    { label: 'Hedera', value: 'HBAR' },
    { label: 'Stellar', value: 'XLM' },
    { label: 'Aptos', value: 'APT' },
    { label: 'Polkadot', value: 'DOT' },
    { label: 'VeChain', value: 'VET' },
    { label: 'Uniswap', value: 'UNI' },
    { label: 'Litecoin', value: 'LTC' },
    { label: 'Leo Utility Token', value: 'LEO' },
    { label: 'Hyperliquid', value: 'HYPE' },
    { label: 'Near Protocol', value: 'NEAR' },
    { label: 'Fetch.ai', value: 'FET' },
    { label: 'Ondo Finance', value: 'ONDO' },
    { label: 'Internet Computer', value: 'ICP' },
    { label: 'Monero', value: 'XMR' },
    { label: 'Polygon', value: 'POL' },
    { label: 'Algorand', value: 'ALGO' },
    { label: 'Render', value: 'RENDER' },
    { label: 'Arbitrum', value: 'ARB' },
    { label: 'Raydium', value: 'RAY' },
    { label: 'Move', value: 'MOVE' },
  ];

  // Utility functions
  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);
  const handleIndicatorChange = useCallback((event) => setActiveIndicators(event.target.value), []);
  const handleSMAChange = useCallback((event) => setActiveSMAs(event.target.value), []);
  const handleRsiPeriodChange = useCallback((event) => setActiveRsiPeriod(event.target.value), []);

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

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      const promises = [];
      if (!altcoinData[selectedCoin]) {
        promises.push(fetchAltcoinData(selectedCoin));
      }
      if (denominator === 'BTC' && btcData.length === 0) {
        promises.push(fetchBtcData());
      }
      if (activeIndicators.includes('fed-balance') && fedBalanceData.length === 0) {
        promises.push(fetchFedBalanceData());
      }
      if (promises.length > 0) {
        setIsLoading(true);
        await Promise.all(promises);
      }
    };
    fetchData();
  }, [selectedCoin, altcoinData, btcData, denominator, activeIndicators, fedBalanceData, fetchAltcoinData, fetchBtcData, fetchFedBalanceData]);

  // Compute chart data and manage loading state
  useEffect(() => {
    const altData = altcoinData[selectedCoin] || [];
    const isAltcoinDataLoaded = altData.length > 0;
    const isBtcDataLoaded = denominator === 'BTC' ? btcData.length > 0 : true;
    const isFedBalanceDataLoaded = activeIndicators.includes('fed-balance') ? fedBalanceData.length > 0 : true;
    if (isAltcoinDataLoaded && isBtcDataLoaded && isFedBalanceDataLoaded) {
      let newChartData = [];
      if (denominator === 'USD') {
        newChartData = altData;
      } else if (denominator === 'BTC' && btcData.length > 0) {
        newChartData = altData
          .map(altEntry => {
            const btcEntry = btcData.find(btc => btc.time === altEntry.time);
            return btcEntry ? { ...altEntry, value: altEntry.value / btcEntry.value } : null;
          })
          .filter(Boolean);
      }
      setChartData(newChartData);
      setIsLoading(false);
    }
  }, [denominator, altcoinData, selectedCoin, btcData, activeIndicators, fedBalanceData]);

  // Initialize chart
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        mode: 0, // Initial mode, updated dynamically
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      leftPriceScale: {
        mode: 0, // Initial mode
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}T` },
      },
      additionalPriceScales: {
        'mayer-multiple-scale': { mode: 0, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 }, position: 'right', width: 50 },
        'rsi-scale': { mode: 0, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 }, position: 'right', width: 50 },
      },
    });
    const priceSeries = chart.addAreaSeries({ priceScaleId: 'right', lineWidth: 2 });
    priceSeriesRef.current = priceSeries;
    const fedBalanceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: indicators['fed-balance'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    fedBalanceSeriesRef.current = fedBalanceSeries;
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
      color: 'orange',
      lineWidth: 2,
      priceLineVisible: false,
      visible: false,
    });
    rsiSeriesRef.current = rsiSeries;
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const fedSeriesData = fedBalanceSeriesRef.current.data();
        const mayerMultipleData = mayerMultipleSeriesRef.current.data();
        const rsiSeriesData = rsiSeriesRef.current.data();
        const currentTime = new Date(param.time).getTime();
        const nearestFedData = fedSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const nearestMayerData = mayerMultipleData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        const nearestRsiData = rsiSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
        }, null);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          fedBalance: nearestFedData?.value,
          mayerMultiple: nearestMayerData?.value,
          rsi: nearestRsiData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });
    // Restore double-click interactivity
    chart.subscribeDblClick(() => setInteractivity(prev => !prev));
    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;
    return () => {
      rsiPriceLinesRef.current.forEach(priceLine => {
        try {
          rsiSeriesRef.current?.removePriceLine(priceLine);
        } catch (error) {
          console.error('Error removing RSI price line:', error);
        }
      });
      rsiPriceLinesRef.current = [];
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale('right').applyOptions({ mode: scaleMode });
      chartRef.current.priceScale('left').applyOptions({ mode: scaleMode });
    }
  }, [scaleMode]);

  // Update price series format based on denominator
  useEffect(() => {
    if (priceSeriesRef.current) {
      priceSeriesRef.current.applyOptions({
        priceFormat: {
          type: 'custom',
          formatter: (value) => {
            if (denominator === 'BTC') return `₿${value.toFixed(8)}`;
            return `$${value.toFixed(2)}`;
          },
        },
      });
    }
  }, [denominator]);

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && chartData.length > 0) {
      priceSeriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData]);

  // Update Fed balance series data
  useEffect(() => {
    if (fedBalanceSeriesRef.current && chartData.length > 0 && fedBalanceData.length > 0) {
      const altStartTime = new Date(chartData[0].time).getTime();
      const altEndTime = new Date(chartData[chartData.length - 1].time).getTime();
      const filteredFedData = fedBalanceData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= altStartTime && itemTime <= altEndTime;
      });
      fedBalanceSeriesRef.current.setData(filteredFedData);
      fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
    }
  }, [fedBalanceData, chartData, activeIndicators]);

  // Update Mayer Multiple series data
  useEffect(() => {
    if (mayerMultipleSeriesRef.current && chartData.length > 0) {
      const mayerMultipleData = calculateMayerMultiple(chartData);
      mayerMultipleSeriesRef.current.setData(mayerMultipleData);
      mayerMultipleSeriesRef.current.applyOptions({ visible: activeIndicators.includes('mayer-multiple') });
    }
  }, [chartData, activeIndicators, calculateMayerMultiple]);

  // Update RSI series data
  useEffect(() => {
    if (rsiSeriesRef.current && chartData.length > 0 && activeRsiPeriod) {
      const period = rsiPeriods[activeRsiPeriod].days;
      const rsiData = calculateRSI(chartData, period);
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
        color: 'orange',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Overbought',
      });
      const oversoldLine = rsiSeriesRef.current.createPriceLine({
        price: 30,
        color: 'orange',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Oversold',
      });
      rsiPriceLinesRef.current = [overboughtLine, oversoldLine];
      rsiSeriesRef.current.applyOptions({ visible: true });
    } else if (rsiSeriesRef.current) {
      rsiSeriesRef.current.applyOptions({ visible: false });
      rsiPriceLinesRef.current.forEach(priceLine => {
        try {
          rsiSeriesRef.current.removePriceLine(priceLine);
        } catch (error) {
          console.error('Error removing RSI price line:', error);
        }
      });
      rsiPriceLinesRef.current = [];
    }
  }, [chartData, activeRsiPeriod, calculateRSI, rsiPeriods]);

  // Update SMA indicators
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    Object.keys(smaSeriesRefs).forEach(key => {
      if (smaSeriesRefs[key]) {
        chartRef.current.removeSeries(smaSeriesRefs[key]);
        delete smaSeriesRefs[key];
      }
    });
    activeSMAs.forEach(key => {
      const indicator = smaIndicators[key];
      if (indicator.type === 'sma') {
        const series = chartRef.current.addLineSeries({
          color: indicator.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[key] = series;
        const data = calculateMovingAverage(chartData, indicator.period);
        series.setData(data);
      } else if (indicator.type === 'bull-market-support') {
        const smaSeries = chartRef.current.addLineSeries({
          color: indicator.sma.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[`${key}-sma`] = smaSeries;
        const smaData = calculateMovingAverage(chartData, indicator.sma.period);
        smaSeries.setData(smaData);
        const emaSeries = chartRef.current.addLineSeries({
          color: indicator.ema.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[`${key}-ema`] = emaSeries;
        const emaData = calculateExponentialMovingAverage(chartData, indicator.ema.period);
        emaSeries.setData(emaData);
      }
    });
  }, [activeSMAs, chartData, calculateMovingAverage, calculateExponentialMovingAverage, smaIndicators]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  // Update theme colors and price series color based on RSI
  useEffect(() => {
    if (priceSeriesRef.current) {
      const colors = activeRsiPeriod
        ? {
            topColor: 'rgba(128, 128, 128, 0.3)', // Faint grey when RSI is active
            bottomColor: 'rgba(128, 128, 128, 0.1)',
            lineColor: 'rgba(128, 128, 128, 0.5)',
          }
        : theme.palette.mode === 'dark'
        ? {
            topColor: 'rgba(38, 198, 218, 0.56)',
            bottomColor: 'rgba(38, 198, 218, 0.04)',
            lineColor: 'rgba(38, 198, 218, 1)',
          }
        : {
            topColor: 'rgba(255, 165, 0, 0.56)',
            bottomColor: 'rgba(255, 165, 0, 0.2)',
            lineColor: 'rgba(255, 140, 0, 0.8)',
          };
      priceSeriesRef.current.applyOptions({ topColor: colors.topColor, bottomColor: colors.bottomColor, lineColor: colors.lineColor });
    }
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
  }, [theme.palette.mode, colors, activeRsiPeriod]);

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
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="altcoin-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Altcoin
            </InputLabel>
            <Select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              label="Altcoin"
              labelId="altcoin-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {altcoins.map((coin) => (
                <MenuItem key={coin.value} value={coin.value}>
                  {coin.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '150px' } }}>
            <InputLabel
              id="denominator-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Denominator
            </InputLabel>
            <Select
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
              label="Denominator"
              labelId="denominator-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="BTC">BTC</MenuItem>
            </Select>
          </FormControl>
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
              label="Indicators"
              labelId="indicators-label"
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
              label="Moving Averages"
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
              label="RSI Period"
              labelId="rsi-period-label"
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
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.grey[100],
              zIndex: 2,
            }}
          >
            Loading...
          </div>
        )}
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
                backgroundColor: activeRsiPeriod
                  ? 'rgba(128, 128, 128, 0.5)'
                  : theme.palette.mode === 'dark'
                  ? 'rgba(38, 198, 218, 1)'
                  : 'rgba(255, 140, 0, 0.8)',
                marginRight: '5px',
              }}
            />
            {selectedCoin} Price
          </div>
          {activeIndicators.map((key) => (
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
          {activeRsiPeriod && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'orange',
                  marginRight: '5px',
                }}
              />
              {rsiPeriods[activeRsiPeriod].label}
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
        <div className="under-chart">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'left',
              width: '100%',
              maxWidth: '800px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <LastUpdated storageKey={`${selectedCoin.toLowerCase()}Data`} />
            {activeIndicators.includes('fed-balance') && (
              <LastUpdated storageKey="fedBalanceData" />
            )}
          </Box>
        </div>
      )}
      {!isDashboard && (activeIndicators.length > 0 || activeRsiPeriod) && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {activeIndicators.map(key => (
            <p key={key} style={{ margin: '5px 0' }}>
              <strong style={{ color: indicators[key].color }}>
                {indicators[key].label}:
              </strong>{' '}
              {indicators[key].description}
            </p>
          ))}
          {activeRsiPeriod && (
            <p style={{ margin: '5px 0' }}>
              <strong style={{ color: 'orange' }}>
                {rsiPeriods[activeRsiPeriod].label}:
              </strong> Relative Strength Index measures momentum. Values above 70 suggest overbought conditions; below 30 indicate oversold conditions.
            </p>
          )}
        </Box>
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
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
            top: `${tooltipData.y + 250}px`,
          }}
        >
          <div style={{ fontSize: '15px' }}>{selectedCoin}</div>
          {tooltipData.price !== undefined && (
            <div style={{ fontSize: '20px' }}>
              {denominator === 'BTC' ? '₿' : '$'}
              {denominator === 'BTC' ? tooltipData.price.toFixed(8) : tooltipData.price.toFixed(2)}
            </div>
          )}
          {activeIndicators.includes('fed-balance') && tooltipData.fedBalance !== undefined && (
            <div style={{ color: indicators['fed-balance'].color }}>
              Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T
            </div>
          )}
          {activeIndicators.includes('mayer-multiple') && tooltipData.mayerMultiple !== undefined && (
            <div style={{ color: indicators['mayer-multiple'].color }}>
              Mayer Multiple: {tooltipData.mayerMultiple.toFixed(2)}
            </div>
          )}
          {activeRsiPeriod && tooltipData.rsi !== undefined && (
            <div style={{ color: 'orange' }}>
              {rsiPeriods[activeRsiPeriod].label}: {tooltipData.rsi.toFixed(2)}
            </div>
          )}
          <div>{tooltipData.date ? tooltipData.date.split('-').reverse().join('-') : ''}</div>
        </div>
      )}
      {!isDashboard && (
        <p className="chart-info">
          The altcoin market is the wild-west of the crypto world. This asset class faces regulatory uncertainty, scams perpetuated by bad actors,
          extreme volatility and the tendency to lose anywhere between 70-99% of a token's value in a bear market, with no guarantee that the price will ever recover.
          There is however a core of projects that are being driven by some talented and respected developers and technologists that are implementing
          smart-contract functionality (permissionless and immutable executable code that is deployed on the blockchain) and are genuinely attempting
          to build the next generation of the internet through distributed ledger blockchain technology. These crypto assets are used to drive the
          functionality and security of their respective blockchain.
          These projects are far riskier, but during certain phases of the business cycle (severe drops in bitcoin dominance paired with looser monetary policy)
          they have historically offered far greater returns than that of traditional markets and the 2 crypto blue-chips; Bitcoin & Ethereum.
          Since Bitcoin is the lowest risk crypto asset, it makes sense to value these altcoins against not only their USD pair, but also their BTC pair.
          If the altcoin is underperforming against BTC, it makes no sense to hold the far riskier asset.
          This chart allows you to compare the performance of various altcoins against Bitcoin.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(AltcoinPrice);