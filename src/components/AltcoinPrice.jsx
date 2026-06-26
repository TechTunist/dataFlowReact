import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox, useMediaQuery, ListSubheader } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartTooltip from './ChartTooltip';
import { 
  getAllMovingAverageOptions, 
  getDailyMAs, 
  getWeeklyMAs, 
  BULL_MARKET_SUPPORT_BAND,
  calculateMovingAverage 
} from '../utils/technicalIndicators';
import { getCurrentPrice } from '../utils/currentPrice';
import ChartInfoSections from './ChartInfoSections';

const AltcoinPrice = ({ isDashboard = false, defaultSelectedCoin }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({}).current;
  const fedBalanceSeriesRef = useRef(null);
  const mayerMultipleSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const rsiPriceLinesRef = useRef([]);
  const currentPriceFetched = useRef(false);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scaleMode, setScaleMode] = useState(0); // 0: linear, 1: logarithmic
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(defaultSelectedCoin || 'SOL');
  const [denominator, setDenominator] = useState('USD');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [activeSMAs, setActiveSMAs] = useState([]);
  const [maFilter, setMaFilter] = useState('daily'); // 'daily' | 'weekly'
  const [activeRsiPeriod, setActiveRsiPeriod] = useState('');
  const [currentAltPrice, setCurrentAltPrice] = useState(null);
  const clearMovingAverages = useCallback(() => {
    setActiveSMAs([]);
  }, []);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
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
  // Full power from the shared master list
  const maIndicators = useMemo(() => getAllMovingAverageOptions(), []);

  // Define RSI periods
  const rsiPeriods = useMemo(() => ({
    'Daily': { days: 14, label: 'Daily RSI' },
    'Weekly': { days: 98, label: 'Weekly RSI' },
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

  // Fetch current price for the selected altcoin from CoinGecko ONCE after its data is loaded.
  // Only once per coin load to avoid interference with chart zoom.
  useEffect(() => {
    currentPriceFetched.current = false; // reset on coin change
  }, [selectedCoin]);

  useEffect(() => {
    const altDataForCoin = altcoinData[selectedCoin] || [];
    if (altDataForCoin.length > 0 && !currentPriceFetched.current) {
      currentPriceFetched.current = true;
      getCurrentPrice(selectedCoin).then(price => {
        if (price != null) setCurrentAltPrice(price);
      }).catch(() => {});
    }
  }, [selectedCoin, altcoinData]);

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
  }, []);

  // Update chart colors on theme change
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
  }, [colors.primary[700], colors.primary[100]]);

  // Update price series colors based on RSI and theme
  useEffect(() => {
    if (priceSeriesRef.current) {
      const seriesColors = activeRsiPeriod
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
      priceSeriesRef.current.applyOptions({ topColor: seriesColors.topColor, bottomColor: seriesColors.bottomColor, lineColor: seriesColors.lineColor });
    }
  }, [activeRsiPeriod, theme.palette.mode]);

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

  // Update price series with live current price (from CoinGecko, fetched once per coin load).
  // Use update() ONLY - never fitContent here, to avoid resetting user zoom/pan.
  // Only update series point when in USD denominator (to keep units consistent); USD current always shown in legend.
  useEffect(() => {
    if (priceSeriesRef.current && currentAltPrice != null && chartData.length > 0 && denominator === 'USD') {
      const today = new Date().toISOString().split('T')[0];
      try {
        priceSeriesRef.current.update({ time: today, value: currentAltPrice });
      } catch (error) {
        console.error('Error updating current alt price on chart:', error);
      }
    }
  }, [currentAltPrice, denominator]);

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
      const indicator = maIndicators[key];
      if (!indicator) return;
      if (indicator.type === 'sma' || indicator.type === 'ema') {
        const series = chartRef.current.addLineSeries({
          color: indicator.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[key] = series;
        const data = calculateMovingAverage(chartData, indicator); // pass full config
        series.setData(data);
      } else if (indicator.type === 'bull-market-support' || indicator.type === 'composite') {
        const smaSeries = chartRef.current.addLineSeries({
          color: indicator.sma.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[`${key}-sma`] = smaSeries;
        const smaData = calculateMovingAverage(chartData, indicator.sma);
        smaSeries.setData(smaData);
        const emaSeries = chartRef.current.addLineSeries({
          color: indicator.ema.color,
          lineWidth: 2,
          priceLineVisible: false,
          priceScaleId: 'right',
        });
        smaSeriesRefs[`${key}-ema`] = emaSeries;
        const emaData = calculateMovingAverage(chartData, indicator.ema);
        emaSeries.setData(emaData);
      }
    });
  }, [activeSMAs, chartData, calculateMovingAverage, maIndicators]);

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
            marginTop: '8px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="altcoin-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
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
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return 'Select Indicators';
                return selected
                  .map((key) => indicators[key]?.label || key)
                  .join(', ');
              }}
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
              renderValue={(selected) => {
                if (!selected || selected.length === 0) return 'Select Moving Averages';
                return selected
                  .map((key) => maIndicators[key]?.label || key)
                  .join(', ');
              }}
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
              {/* Daily / Weekly filter tabs + Clear button at the top of the dropdown */}
              <Box
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid',
                  borderColor: 'rgba(255,255,255,0.15)',
                  mx: 0.5,
                  mt: 0.5,
                  mb: 0.5,
                  alignItems: 'center',
                }}
              >
                <Box
                  onClick={() => setMaFilter('daily')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 0.6,
                    fontSize: '0.78rem',
                    fontWeight: maFilter === 'daily' ? 600 : 400,
                    color: maFilter === 'daily' ? colors.greenAccent[400] : colors.grey[300],
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: maFilter === 'daily' ? `2px solid ${colors.greenAccent[400]}` : '2px solid transparent',
                  }}
                >
                  Daily
                </Box>
                <Box
                  onClick={() => setMaFilter('weekly')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 0.6,
                    fontSize: '0.78rem',
                    fontWeight: maFilter === 'weekly' ? 600 : 400,
                    color: maFilter === 'weekly' ? colors.greenAccent[400] : colors.grey[300],
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: maFilter === 'weekly' ? `2px solid ${colors.greenAccent[400]}` : '2px solid transparent',
                  }}
                >
                  Weekly / Cycle
                </Box>
                <Box
                  onClick={clearMovingAverages}
                  sx={{
                    fontSize: '0.72rem',
                    color: colors.grey[400],
                    cursor: 'pointer',
                    px: 1,
                    '&:hover': { color: colors.redAccent ? colors.redAccent[400] : '#ff6b6b' },
                  }}
                  title="Clear all selected moving averages"
                >
                  ✕ Clear
                </Box>
              </Box>

              {/* Filtered list */}
              {(maFilter === 'daily' ? getDailyMAs() : getWeeklyMAs())
                .filter(item => maIndicators[item.key])
                .map(({ key, label }) => (
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
              color: colors.primary[100],
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
            color: colors.primary[100],
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
            const indicator = maIndicators[key];
            if (!indicator) return null;
            if (indicator.type === 'bull-market-support' || indicator.type === 'composite') {
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
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} isNarrowScreen={isNarrowScreen} render={(tooltipData) => (
<>
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
</>
)} />
        )}
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
      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'What it is',
              content:
                'The altcoin market faces regulatory uncertainty, scams, extreme volatility, and the tendency to lose 70-99% of a token\'s value in a bear market, with no guarantee of recovery. A core of projects driven by respected developers implements smart-contract functionality (permissionless, immutable code on the blockchain) and distributed ledger technology to power the next generation of the internet.',
            },
            {
              title: 'What this chart shows',
              content: 'Performance of various altcoins against Bitcoin, with optional USD denomination.',
            },
            {
              title: 'How to interpret',
              content:
                'Bitcoin is the lowest-risk crypto asset, so altcoins should be valued against their BTC pair as well as USD. If an altcoin underperforms BTC, holding the far riskier asset makes little sense. During certain business-cycle phases (sharp drops in Bitcoin dominance paired with looser monetary policy), altcoins have historically offered greater returns than traditional markets and the two blue-chips, Bitcoin and Ethereum.',
            },
          ]}
        />
      )}
    </div>
  );
};

export default restrictToPaidSubscription(AltcoinPrice);