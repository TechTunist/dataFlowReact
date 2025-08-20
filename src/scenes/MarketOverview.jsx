// src/scenes/MarketOverview.js
import React, { useState, useEffect, useContext, memo, useMemo } from 'react';
import FearAndGreed3D from '../components/FearAndGreed3D';
import ProgressBar3D from '../components/ProgressBar3D';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Box, Typography, useTheme, LinearProgress, CircularProgress } from '@mui/material';
import { tokens } from '../theme';
import { DataContext } from '../DataContext';
import useIsMobile from '../hooks/useIsMobile';
import { getBitcoinRisk, saveRoiData, getRoiData, clearRoiData, saveBitcoinRisk } from '../utility/idbUtils';
import InfoIcon from '@mui/icons-material/Info'; 
import ShowChartIcon from '@mui/icons-material/ShowChart';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import { saveCycleDaysData, getCycleDaysData } from '../utility/idbUtils';

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
    Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin),
  }));
  return normalizedRisk;
};


// Wrap GridLayout with WidthProvider for responsiveness
const ResponsiveGridLayout = WidthProvider(Responsive);

const InfoOverlay = ({ explanation, isVisible }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', // Slightly darker for better contrast
      opacity: isVisible ? 1 : 0, // Explicit opacity
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.3s ease', // Smooth transition
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
      zIndex: 1000, // High z-index to ensure overlay is on top
      pointerEvents: isVisible ? 'auto' : 'none', // Prevent interaction when hidden
    }}
  >
    <Typography
      variant="body2"
      color="white"
      sx={{
        fontSize: '14px',
        opacity: isVisible ? 1 : 0, // Ensure text is fully opaque when visible
        transition: 'opacity 0.3s ease', // Sync text transition with overlay
      }}
    >
      {explanation}
    </Typography>
  </Box>
);

// Define MarketOverview component
const MarketOverview = memo(() => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const {
    btcData,
    fetchBtcData,
    ethData,
    fetchEthData,
    fearAndGreedData,
    fetchFearAndGreedData,
    inflationData,
    fetchInflationData,
    marketCapData,
    fetchMarketCapData,
    mvrvData,
    fetchMvrvData,
    altcoinSeasonData,
    fetchAltcoinSeasonData,
  } = useContext(DataContext);
  // State for loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Fetch all data and manage loading state
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchBtcData(),
          fetchEthData(),
          fetchFearAndGreedData(),
          fetchInflationData(),
          fetchMarketCapData(),
          fetchMvrvData(),
          fetchAltcoinSeasonData(),
        ]);
        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setError('Failed to load market data. Please try again later.');
          setIsLoading(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isMounted = false;
    };
  }, [
    fetchBtcData,
    fetchEthData,
    fetchFearAndGreedData,
    fetchInflationData,
    fetchMarketCapData,
    fetchMvrvData,
    fetchAltcoinSeasonData,
  ]);

  // Define breakpoints and columns for different screen sizes
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
  const cols = { lg: 12, md: 8, sm: 6, xs: 4 };

  // Responsive layouts for each section
  const priceLayouts = {
    lg: [
      { i: 'bitcoin', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'inflation', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 }, // Moved to second row (y: 2)
      { i: 'marketCap', x: 6, y: 2, w: 6, h: 2, minW: 2, minH: 2 }, // Moved to second row (y: 2)
    ],
    md: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'inflation', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 }, // Moved to second row (y: 2)
      { i: 'marketCap', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 }, // Moved to second row (y: 2)
    ],
    sm: [
      { i: 'bitcoin', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'inflation', x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2 }, // Moved to third row (y: 4)
      { i: 'marketCap', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2 }, // Moved to fourth row (y: 6)
    ],
    xs: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'inflation', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 }, // Moved to third row (y: 4)
      { i: 'marketCap', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 }, // Moved to fourth row (y: 6)
    ],
  };

  const indicatorsLayouts = {
    lg: [
      { i: 'inflation', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    md: [
      { i: 'inflation', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    sm: [
      { i: 'inflation', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'inflation', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    ],
  };

  const sentimentLayouts = {
    lg: [{ i: 'fearAndGreed', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 }],
    md: [{ i: 'fearAndGreed', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 }],
    sm: [{ i: 'fearAndGreed', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 }],
    xs: [{ i: 'fearAndGreed', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 }],
  };

  const sentimentIndexesLayouts = {
    lg: [
      { i: 'fearAndGreed', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'marketHeat', x: 4, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'altcoinSeason', x: 8, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
    ],
    md: [
      { i: 'fearAndGreed', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'marketHeat', x: 4, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'altcoinSeason', x: 0, y: 2, w: 4, h: 2, minW: 4, minH: 2 },
    ],
    sm: [
      { i: 'fearAndGreed', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 },
      { i: 'marketHeat', x: 0, y: 2, w: 6, h: 2, minW: 4, minH: 2 },
      { i: 'altcoinSeason', x: 0, y: 4, w: 6, h: 2, minW: 4, minH: 2 },
    ],
    xs: [
      { i: 'fearAndGreed', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'marketHeat', x: 0, y: 2, w: 4, h: 2, minW: 4, minH: 2 },
      { i: 'altcoinSeason', x: 0, y: 4, w: 4, h: 2, minW: 4, minH: 2 },
    ],
  };

  const onChainLayouts = {
    lg: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'mvrv', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'piCycleTop', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'roiCycleComparison', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftLow', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftHalving', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftPeak', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    ],
    md: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mvrv', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'piCycleTop', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'roiCycleComparison', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftLow', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftHalving', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftPeak', x: 4, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    sm: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'mvrv', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'piCycleTop', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'roiCycleComparison', x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftLow', x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftHalving', x: 0, y: 12, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftPeak', x: 0, y: 14, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mvrv', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'piCycleTop', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'roiCycleComparison', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftLow', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftHalving', x: 0, y: 12, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'daysLeftPeak', x: 0, y: 14, w: 4, h: 2, minW: 2, minH: 2 },
    ],
  };

  const overallConditionsLayouts = {
    lg: [{ i: 'marketHeat', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 }],
    md: [{ i: 'marketHeat', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 }],
    sm: [{ i: 'marketHeat', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 }],
    xs: [{ i: 'marketHeat', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 }],
  };

  const altcoinSeasonLayouts = {
    lg: [{ i: 'altcoinSeason', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 }],
    md: [{ i: 'altcoinSeason', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 }],
    sm: [{ i: 'altcoinSeason', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 }],
    xs: [{ i: 'altcoinSeason', x: 0, y: 0, w: 4, h: 2, minW: 4, minH: 2 }],
  };

  // State for grid layouts
  const [priceLayout, setPriceLayout] = useState(priceLayouts);
  const [indicatorsLayout, setIndicatorsLayout] = useState(indicatorsLayouts);
  const [sentimentLayout, setSentimentLayout] = useState(sentimentLayouts);
  const [onChainLayout, setOnChainLayout] = useState(onChainLayouts);
  const [overallConditionsLayout, setOverallConditionsLayout] = useState(overallConditionsLayouts);
  const [altcoinSeasonLayout, setAltcoinSeasonLayout] = useState(altcoinSeasonLayouts);
  const [sentimentIndexesLayout, setSentimentIndexesLayout] = useState(sentimentIndexesLayouts);

  // useEffect(() => {
  //   console.log('MarketOverview mounted');
  //   return () => console.log('MarketOverview unmounted');
  // }, []);

  // Fetch data on mount
  // useEffect(() => {
  //   fetchBtcData();
  //   fetchEthData();
  //   fetchFearAndGreedData();
  //   fetchInflationData();
  //   fetchMarketCapData();
  //   fetchMvrvData();
  //   fetchAltcoinSeasonData();
  // }, [
  //   fetchBtcData,
  //   fetchEthData,
  //   fetchFearAndGreedData,
  //   fetchInflationData,
  //   fetchMarketCapData,
  //   fetchMvrvData,
  //   fetchAltcoinSeasonData,
  // ]);

  // Responsive row height and margin
  const rowHeight = isMobile ? 100 : 120;
  const margin = isMobile ? [8, 8] : [16, 16];

  // Calculate SMA
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

  // Calculate PiCycle Ratio
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

  // Calculate MVRV peak projection
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

  // Calculate Mayer Multiple
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

  

  // Gauge colors
  const gaugeColors = [
    '#4BC0C8', '#33D1FF', '#66A3FF', '#9996FF', '#CC89FF',
    '#FF7DFF', '#FF61C3', '#FF4590', '#FF295D', '#FF0033', '#FF0033',
  ];

  // Color and description mapping
  const getBackgroundColor = (value) => {
    const index = Math.min(Math.floor((value / 100) * gaugeColors.length), gaugeColors.length - 1);
    return gaugeColors[index];
  };

  const getHeatDescription = (value) => {
    if (value <= 30) return 'Cold';
    if (value <= 50) return 'Cool';
    if (value <= 70) return 'Neutral';
    if (value <= 85) return 'Warm';
    return 'Hot';
  };

  // Text color based on background luminance
  const getTextColor = (bgColor) => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.5
      ? (theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100])
      : (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]);
  };

  // Altcoin Season Widget
  const AltcoinSeasonWidget = memo(() => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [heatScore, setHeatScore] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(null);
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const { altcoinSeasonData } = useContext(DataContext);
    useEffect(() => {
      if (altcoinSeasonData && altcoinSeasonData.index !== undefined) {
        const indexValue = Math.max(0, Math.min(100, altcoinSeasonData.index));
        setCurrentIndex(indexValue);
        const heat = indexValue;
        setHeatScore(heat);
      }
    }, [altcoinSeasonData]);
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 85;
    const getGaugeColor = (value) => {
      const startColor = { r: 255, g: 255, b: 255 };
      const endColor = { r: 128, g: 0, b: 128 };
      const ratio = (value || 0) / 100;
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    };
    const gaugeColor = getGaugeColor(heatScore);
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/altcoin-season-index';
    };
    return (
      <Box
        sx={{
          ...chartBoxStyle(colors, theme),
          backgroundColor: backgroundColor,
          transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
          border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
          padding: '24px',
          textAlign: 'center',
          position: 'relative',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            pointerEvents: 'auto',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
          Altcoin Season Index
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Box sx={{ width: '80%', maxWidth: 600 }}>
            <ProgressBar3D
              value={currentIndex || 0}
              fillColor={gaugeColor}
              markerBorderColor={theme.palette.common.white}
              leftEndLabel="0 (Bitcoin Season)"
              rightEndLabel="100 (Altcoin Season)"
              bottomLabel={heatDescription}
              heatStatusLabel={`Heat: ${heatDescription}`}
              labelColor={theme.palette.common.white}
            />
          </Box>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}
          >
            Warning: Strong Altcoin Season detected.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Altcoin Season Index measures the performance of altcoins relative to Bitcoin. A higher value (closer to 100) indicates an altcoin season, where altcoins outperform Bitcoin. It’s calculated based on the percentage of altcoins outperforming Bitcoin over a specific period."
        />
      </Box>
    );
  });

  // Loading UI
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: colors.primary[500],
        }}
      >
        <CircularProgress size={60} sx={{ color: colors.blueAccent[400] }} />
        <Typography variant="h5" color={colors.grey[100]} sx={{ mt: 2 }}>
          Loading Market Overview...
        </Typography>
      </Box>
    );
  }

  // Error UI
  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: colors.primary[500],
        }}
      >
        <Typography variant="h5" color={colors.redAccent[400]}>
          {error}
        </Typography>
      </Box>
    );
  }

// New RoiCycleComparisonWidget
const RoiCycleComparisonWidget = memo(() => {
  const [currentRoi, setCurrentRoi] = useState(null);
  const [avgRoi, setAvgRoi] = useState(null);
  const [zScore, setZScore] = useState(null);
  const [heatScore, setHeatScore] = useState(null);
  const [currentDays, setCurrentDays] = useState(null);
  const { btcData } = useContext(DataContext);

  useEffect(() => {
    const calculateRoiData = async () => {
      if (!btcData || btcData.length === 0) return;

      const cycleStarts = {
        'Cycle 2': '2015-01-15',
        'Cycle 3': '2018-12-15',
        'Cycle 4': '2022-11-21',
      };
      const cycleEnds = {
        'Cycle 2': '2017-12-17',
        'Cycle 3': '2021-11-08',
        'Cycle 4': btcData[btcData.length - 1].time,
      };

      const processCycle = (start, end, cycleName) => {
        const filteredData = btcData.filter(
          d => new Date(d.time) >= new Date(start) && new Date(d.time) <= new Date(end)
        );
        if (filteredData.length === 0) return null;
        const basePrice = filteredData[0].value;
        return filteredData.map((item, index) => ({
          day: index,
          roi: Math.log10(item.value / basePrice) + 1, // Updated ROI calculation
          date: item.time,
          cycle: cycleName,
        }));
      };

      const cycle2 = processCycle(cycleStarts['Cycle 2'], cycleEnds['Cycle 2'], 'Cycle 2');
      const cycle3 = processCycle(cycleStarts['Cycle 3'], cycleEnds['Cycle 3'], 'Cycle 3');
      const cycle4 = processCycle(cycleStarts['Cycle 4'], cycleEnds['Cycle 4'], 'Cycle 4');

      if (!cycle2 || !cycle3 || !cycle4) return;

      try {
        await saveRoiData({ cycle2, cycle3, cycle4 });
      } catch (error) {
        console.error('Failed to cache ROI data:', error);
      }

      const days = cycle4.length;
      const currentRoiValue = cycle4[cycle4.length - 1].roi;

      const maxDays = Math.min(cycle2.length, cycle3.length, days);
      const avgRois = [];
      for (let day = 0; day < maxDays; day++) {
        const rois = [cycle2[day]?.roi, cycle3[day]?.roi].filter(roi => roi !== undefined);
        if (rois.length > 0) {
          avgRois.push(rois.reduce((sum, roi) => sum + roi, 0) / rois.length);
        }
      }

      if (avgRois.length > 0) {
        const latestAvgRoi = avgRois[avgRois.length - 1];
        setCurrentRoi(currentRoiValue);
        setAvgRoi(latestAvgRoi);
        setCurrentDays(days);

        const mean = avgRois.reduce((sum, val) => sum + val, 0) / avgRois.length;
        const variance = avgRois.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgRois.length;
        const stdDev = Math.sqrt(variance);
        const z = stdDev > 0 ? (currentRoiValue - latestAvgRoi) / stdDev : 0;
        setZScore(z);

        let heat = stdDev === 0 ? 60 : Math.max(0, Math.min(100, 60 + (z * 20)));
        setHeatScore(heat);
      }
    };

    const loadCachedData = async () => {
      try {
        const cachedRoiData = await getRoiData();
        if (cachedRoiData && cachedRoiData.cycle4 && btcData && btcData.length > 0) {
          const lastCachedDate = cachedRoiData.cycle4[cachedRoiData.cycle4.length - 1].date;
          const lastBtcDate = btcData[btcData.length - 1].time;
          if (lastCachedDate === lastBtcDate) {
            const currentRoiValue = cachedRoiData.cycle4[cachedRoiData.cycle4.length - 1].roi;
            const days = cachedRoiData.cycle4.length;
            const avgRois = [];
            const maxDays = Math.min(cachedRoiData.cycle2.length, cachedRoiData.cycle3.length, days);
            for (let day = 0; day < maxDays; day++) {
              const rois = [
                cachedRoiData.cycle2[day]?.roi,
                cachedRoiData.cycle3[day]?.roi,
              ].filter(roi => roi !== undefined);
              if (rois.length > 0) {
                avgRois.push(rois.reduce((sum, roi) => sum + roi, 0) / rois.length);
              }
            }
            if (avgRois.length > 0) {
              const latestAvgRoi = avgRois[avgRois.length - 1];
              setCurrentRoi(currentRoiValue);
              setAvgRoi(latestAvgRoi);
              setCurrentDays(days);
              const mean = avgRois.reduce((sum, val) => sum + val, 0) / avgRois.length;
              const variance = avgRois.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgRois.length;
              const stdDev = Math.sqrt(variance);
              const z = stdDev > 0 ? (currentRoiValue - latestAvgRoi) / stdDev : 0;
              setZScore(z);
              let heat = stdDev === 0 ? 60 : Math.max(0, Math.min(100, 60 + (z * 20)));
              setHeatScore(heat);
              return true;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load cached ROI data:', error);
      }
      return false;
    };

    // const initialize = async () => {
    //   const usedCache = await loadCachedData();
    //   if (!usedCache) {
    //     await calculateRoiData();
    //   }
    // };

    const initialize = async () => {
      await clearRoiData(); // Add this line temporarily
      const usedCache = await loadCachedData();
      if (!usedCache) {
        await calculateRoiData();
      }
    };

    initialize();
  }, [btcData]);

  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const isSignificant = heatScore !== null && heatScore >= 85;
  const roiDifference = currentRoi !== null && avgRoi !== null ? currentRoi - avgRoi : null;

  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    window.location.href = 'https://www.cryptological.app/market-cycles';
  };

  return (
    <Box
      sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <InfoIcon
        sx={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          color: textColor,
          cursor: 'pointer',
          fontSize: '35px',
          zIndex: 1001,
          padding: '4px',
          borderRadius: '50%',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        onMouseEnter={() => setIsInfoVisible(true)}
        onMouseLeave={() => setIsInfoVisible(false)}
        aria-label="Information"
      />
      <ShowChartIcon
        sx={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          color: textColor,
          cursor: 'pointer',
          fontSize: '35px',
          zIndex: 1001,
          padding: '4px',
          borderRadius: '50%',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        onMouseDown={handleChartRedirect}
        aria-label="View chart"
      />
      <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
        ROI Cycle Comparison
      </Typography>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Typography variant="h3" color={textColor} sx={{ fontWeight: 'bold', mt: 1 }}>
          Difference: {roiDifference !== null ? (roiDifference >= 0 ? '+' : '') + roiDifference.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
          Current: {currentRoi !== null ? currentRoi.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
          Avg (Cycles 2 & 3): {avgRoi !== null ? avgRoi.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="body1" color={textColor}>
          Days in Cycle: {currentDays !== null ? currentDays : 'N/A'}
        </Typography>
      </Box>
      {isSignificant && (
        <Typography
          variant="body1"
          color={colors.redAccent[500]}
          sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
        >
          Warning: Market significantly above historical ROI.
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="The ROI Cycle Comparison widget shows the current ROI of Bitcoin compared to the average ROI of previous cycles (Cycle 2 and Cycle 3). ROI is calculated as a shifted logarithmic scale (log10(price / basePrice) + 1), where 1 indicates no change, above 1 indicates positive returns, and below 1 indicates negative returns. This helps identify how the current market performance compares to historical trends."
      />
    </Box>
  );
});

  // MVRV Ratio Widget
  const MvrvRatioWidget = memo(() => {
    const [currentMvrv, setCurrentMvrv] = useState(null);
    const [projectedPeak, setProjectedPeak] = useState(null);
    const [heatScore, setHeatScore] = useState(null);
    const [zScore, setZScore] = useState(null);
  
    useEffect(() => {
      if (mvrvData && mvrvData.length > 0) {
        const latestMvrvRaw = mvrvData[mvrvData.length - 1].value;
        const latestMvrv = Math.max(0, Math.min(10000, latestMvrvRaw));
        const { projectedPeak } = calculateMvrvPeakProjection(mvrvData);
  
        if (latestMvrv && projectedPeak) {
          const cappedProjectedPeak = Math.max(0, Math.min(10000, projectedPeak));
          setCurrentMvrv(latestMvrv);
          setProjectedPeak(cappedProjectedPeak);
  
          const thresholds = [cappedProjectedPeak, 3.7];
          const distances = thresholds.map(t => ((latestMvrv - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          const heat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
          setHeatScore(heat);
  
          const values = mvrvData.map(item => Math.max(0, Math.min(10000, item.value)));
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          const z = stdDev > 0 ? (latestMvrv - cappedProjectedPeak) / stdDev : 0;
          setZScore(z);
        }
      }
    }, [mvrvData]);
  
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 85 && zScore !== null && Math.abs(zScore) <= 1;
  
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/tx-mvrv';
    };
  
    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          MVRV Ratio
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
            Current: {currentMvrv !== null ? currentMvrv.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
            Predicted Peak: {projectedPeak !== null ? projectedPeak.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="body1" color={textColor}>
            Heat: {heatDescription}
          </Typography>
          <Typography variant="body1" color={textColor}>
            Z-Score: {zScore !== null ? zScore.toFixed(2) : 'N/A'}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market is overheated.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The MVRV Ratio (Market Value to Realized Value) compares the market value of Bitcoin to its realized value. A high MVRV indicates that the market is overvalued, while a low MVRV suggests it is undervalued. This widget helps identify potential market overheating or undervaluation."
        />
      </Box>
    );
  });

  // Mayer Multiple Widget
  const MayerMultipleWidget = memo(() => {
    const [currentMayer, setCurrentMayer] = useState(null);
    const [heatScore, setHeatScore] = useState(null);
    const [zScore, setZScore] = useState(null);
  
    useEffect(() => {
      if (btcData && btcData.length > 200) {
        const mayerMultiples = calculateMayerMultiple(btcData);
        const latestMayerRaw = mayerMultiples[mayerMultiples.length - 1]?.value;
        const latestMayer = latestMayerRaw ? Math.max(0, Math.min(100, latestMayerRaw)) : 0;
  
        if (latestMayer) {
          setCurrentMayer(latestMayer);
  
          const thresholds = [2.4, 0.6];
          const distances = thresholds.map(t => ((latestMayer - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          const heat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
          setHeatScore(heat);
  
          const values = mayerMultiples.map(item => Math.max(0, Math.min(100, item.value)));
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          const z = (latestMayer - thresholds[0]) / stdDev;
          setZScore(z);
        }
      }
    }, [btcData]);
  
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 85 && (currentMayer >= 2.4 || currentMayer <= 0.6);
  
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/bitcoin';
    };
  
    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Mayer Multiple
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
            Current: {currentMayer !== null ? currentMayer.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="body1" color={textColor}>
            Heat: {heatDescription}
          </Typography>
          <Typography variant="body1" color={textColor}>
            Z-Score: {zScore !== null ? zScore.toFixed(2) : 'N/A'}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market is overheating or severely undervalued.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Mayer Multiple is a ratio of Bitcoin's current price to its 200-day moving average. It helps identify whether Bitcoin is overbought or oversold. A high Mayer Multiple indicates that Bitcoin is significantly above its historical average, suggesting potential overvaluation, while a low value indicates undervaluation."
        />
      </Box>
    );
  });

  // Bitcoin Risk Widget
  const BitcoinRiskWidget = memo(() => {
    const [riskLevel, setRiskLevel] = useState(null);
    const { btcData } = useContext(DataContext);
  
    useEffect(() => {
      const fetchRiskLevel = async () => {
        try {
          const riskData = await getBitcoinRisk();
          if (riskData && riskData.riskLevel !== undefined) {
            setRiskLevel(riskData.riskLevel);
          } else {
            // No valid cached data, calculate locally
            if (btcData && btcData.length > 0) {
              const riskDataArray = calculateRiskMetric(btcData);
              if (riskDataArray && riskDataArray.length > 0) {
                const calculatedRisk = riskDataArray[riskDataArray.length - 1].Risk;
                await saveBitcoinRisk(calculatedRisk);
                setRiskLevel(calculatedRisk);
              } else {
                console.error('Failed to calculate risk level: Invalid risk data');
                setRiskLevel(0);
              }
            } else {
              console.error('No btcData available for risk calculation');
              setRiskLevel(0);
            }
          }
        } catch (error) {
          console.error('Error handling Bitcoin risk level:', error);
          // Fallback to local calculation
          if (btcData && btcData.length > 0) {
            const riskDataArray = calculateRiskMetric(btcData);
            if (riskDataArray && riskDataArray.length > 0) {
              const calculatedRisk = riskDataArray[riskDataArray.length - 1].Risk;
              await saveBitcoinRisk(calculatedRisk);
              setRiskLevel(calculatedRisk);
            } else {
              console.error('Failed to calculate risk level: Invalid risk data');
              setRiskLevel(0);
            }
          } else {
            console.error('No btcData available for risk calculation');
            setRiskLevel(0);
          }
        }
      };
      fetchRiskLevel();
    }, [btcData]);
  
    const displayRisk = riskLevel !== null ? Math.max(0, Math.min(100, riskLevel * 100)).toFixed(2) : 0;
    const backgroundColor = getBackgroundColor(displayRisk);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(displayRisk);
    const isSignificant = parseFloat(displayRisk) >= 85;
  
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/risk';
    };
  
    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Bitcoin Risk Level
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h1" color={textColor} sx={{ fontWeight: 'bold' }}>
            {displayRisk}
          </Typography>
        </Box>
        <Typography variant="body1" color={textColor} sx={{ textAlign: 'center', mt: 1 }}>
          Heat: {heatDescription}
        </Typography>
        <Typography variant="body1" color={textColor} sx={{ textAlign: 'center', mt: 1 }}>
          {parseFloat(displayRisk) <= 30 ? 'Low Risk' : parseFloat(displayRisk) <= 70 ? 'Medium Risk' : 'High Risk'}
        </Typography>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: High market risk.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Bitcoin Risk Level assesses the risk of investing in Bitcoin based on historical price patterns and volatility. A higher value indicates higher risk, derived from proprietary risk models."
        />
      </Box>
    );
  });

  // Fear and Greed Gauge
  const FearAndGreedGauge = memo(() => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { fearAndGreedData, fetchFearAndGreedData } = useContext(DataContext);
    const [isInfoVisible, setIsInfoVisible] = useState(false);

    const latestValue = fearAndGreedData && fearAndGreedData.length > 0 ? Math.max(0, Math.min(100, fearAndGreedData[fearAndGreedData.length - 1].value)) : 0;
    const backgroundColor = getBackgroundColor(latestValue);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(latestValue);
    const isSignificant = latestValue >= 85;

    const getLabelAndColor = (value) => {
      if (value <= 25) return { label: 'Extreme Fear' };
      if (value <= 50) return { label: 'Fear' };
      if (value <= 75) return { label: 'Greed' };
      return { label: 'Extreme Greed' };
    };

    const getGaugeColor = (value) => {
      const startColor = { r: 255, g: 255, b: 255 }; // White
      const endColor = { r: 128, g: 0, b: 128 }; // Purple
      const ratio = (value || 0) / 100;
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const { label } = getLabelAndColor(latestValue);
    const gaugeColor = getGaugeColor(latestValue);

    useEffect(() => {
      if (!fearAndGreedData) {
        fetchFearAndGreedData();
      }
    }, [fearAndGreedData, fetchFearAndGreedData]);

    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/fear-and-greed-chart';
    };

    return (
      <Box
        sx={{
          ...chartBoxStyle(colors, theme),
          backgroundColor: backgroundColor,
          transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
          border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
          padding: '24px',
          textAlign: 'center',
          position: 'relative',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
          Fear and Greed Index
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%', // Ensure the container spans the full width
          }}
        >
          <Box sx={{ width: '80%', maxWidth: 600 }}> {/* Match ProgressBar3D's internal width */}
            <ProgressBar3D
              value={latestValue}
              fillColor={gaugeColor}
              markerBorderColor={theme.palette.common.white}
              leftEndLabel="Extreme Fear"
              rightEndLabel="Extreme Greed"
              bottomLabel={label}
              heatStatusLabel={`Heat: ${heatDescription}`}
              labelColor={theme.palette.common.white}
            />
          </Box>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}
          >
            Warning: Extreme market greed.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Fear and Greed Index gauges market sentiment, ranging from 0 (Extreme Fear) to 100 (Extreme Greed). It’s calculated using factors like volatility, market momentum, and social media sentiment."
        />
      </Box>
    );
  });

  // PiCycle Top Widget
  const PiCycleTopWidget = memo(() => {
    const [currentRatio, setCurrentRatio] = useState(null);
    const [predictedPeak, setPredictedPeak] = useState(null);
    const [heatScore, setHeatScore] = useState(null);
  
    useEffect(() => {
      if (btcData && btcData.length > 350) {
        const ratioData = calculateRatioSeries(btcData);
        const latestRatioRaw = ratioData[ratioData.length - 1]?.value;
        const latestRatio = latestRatioRaw ? Math.max(0, Math.min(100, latestRatioRaw)) : 0;
        setCurrentRatio(latestRatio);
  
        const historicalPeaks = [
          { date: '2017-12-17', ratio: 1.05, timestamp: Date.parse('2017-12-17') },
          { date: '2021-04-12', ratio: 1.00, timestamp: Date.parse('2021-04-12') },
        ];
        const targetDate = Date.parse('2025-10-13');
        const t1 = historicalPeaks[0].timestamp;
        const t2 = historicalPeaks[1].timestamp;
        const y1 = historicalPeaks[0].ratio;
        const y2 = historicalPeaks[1].ratio;
        const m = (y2 - y1) / (t2 - t1);
        const b = y1 - m * t1;
        const predictedRatio = m * targetDate + b;
        setPredictedPeak(predictedRatio);
  
        if (latestRatio && predictedRatio) {
          const buffer = 1.0;
          const minRatio = 0;
          const heatOffset = 0.28;
          const heat = Math.max(0, Math.min(100, (((latestRatio - minRatio) / buffer) * 100) + heatOffset));
          setHeatScore(heat);
        }
      }
    }, [btcData]);
  
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 85;
  
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/pi-cycle';
    };
  
    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          PiCycle Top Indicator
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
            Current Ratio: {currentRatio !== null ? currentRatio.toFixed(4) : 'N/A'}
          </Typography>
          <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
            Predicted Peak: {predictedPeak !== null ? predictedPeak.toFixed(4) : 'N/A'}
          </Typography>
          <Typography variant="body1" color={textColor}>
            Heat: {heatDescription}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market approaching cycle top.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The PiCycle Top Indicator (created by Phillip Swift) uses the 111-day and 350-day moving averages to predict potential market tops. The ratio of these moving averages shows decreasing peaks, suggesting a cycle top of under 1.0."
        />
      </Box>
    );
  });

  const DaysLeftWidget = memo(({ type }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { btcData } = useContext(DataContext);
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const [heatScore, setHeatScore] = useState(null);
  
    // Define cycle dates (same as CycleDaysLeft)
    const cycleDates = useMemo(() => ({
      bottom: {
        'Cycle 2': { start: '2015-01-15', end: '2017-12-17' },
        'Cycle 3': { start: '2018-12-15', end: '2021-11-08' },
        'Cycle 4': { start: '2022-11-21', end: null },
      },
      halving: {
        'Cycle 2': { start: '2016-07-09', end: '2017-12-17' },
        'Cycle 3': { start: '2020-05-11', end: '2021-11-08' },
        'Cycle 4': { start: '2024-04-19', end: null },
      },
      peak: {
        'Cycle 1': { start: '2013-11-30', end: '2017-12-17' },
        'Cycle 2': { start: '2017-12-17', end: '2021-11-10' },
        'Cycle 3': { start: '2021-11-10', end: null },
      },
    }), []);
  
    // Calculate days between two dates
    const calculateDays = (start, end) => {
      if (!start || !end) return 0;
      const startDate = new Date(start);
      const endDate = new Date(end);
      return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    };
  
    // Calculate average cycle lengths
    const averageCycleLengths = useMemo(() => {
      const averages = {
        bottom: 0,
        halving: 0,
        peak: 0,
      };
      const bottomDays = [
        calculateDays(cycleDates.bottom['Cycle 2'].start, cycleDates.bottom['Cycle 2'].end),
        calculateDays(cycleDates.bottom['Cycle 3'].start, cycleDates.bottom['Cycle 3'].end),
      ].filter(days => days !== 0);
      averages.bottom = bottomDays.length > 0 ? Math.round(bottomDays.reduce((sum, days) => sum + days, 0) / bottomDays.length) : 0;
      const halvingDays = [
        calculateDays(cycleDates.halving['Cycle 2'].start, cycleDates.halving['Cycle 2'].end),
        calculateDays(cycleDates.halving['Cycle 3'].start, cycleDates.halving['Cycle 3'].end),
      ].filter(days => days !== 0);
      averages.halving = halvingDays.length > 0 ? Math.round(halvingDays.reduce((sum, days) => sum + days, 0) / halvingDays.length) : 0;
      const peakDays = [
        calculateDays(cycleDates.peak['Cycle 1'].start, cycleDates.peak['Cycle 1'].end),
        calculateDays(cycleDates.peak['Cycle 2'].start, cycleDates.peak['Cycle 2'].end),
      ].filter(days => days !== 0);
      averages.peak = peakDays.length > 0 ? Math.round(peakDays.reduce((sum, days) => sum + days, 0) / peakDays.length) : 0;
      return averages;
    }, [cycleDates]);
  
    // Calculate days elapsed and days left for current cycle
    const daysLeftData = useMemo(() => {
      if (btcData.length === 0) return { bottom: { elapsed: 0, left: 0 }, halving: { elapsed: 0, left: 0 }, peak: { elapsed: 0, left: 0 } };
      const currentDate = btcData[btcData.length - 1]?.time || new Date().toISOString().split('T')[0];
      const data = {
        bottom: { elapsed: 0, left: 0 },
        halving: { elapsed: 0, left: 0 },
        peak: { elapsed: 0, left: 0 },
      };
      data.bottom.elapsed = calculateDays(cycleDates.bottom['Cycle 4'].start, currentDate) || 0;
      data.bottom.left = Math.max(0, averageCycleLengths.bottom - data.bottom.elapsed);
      data.halving.elapsed = calculateDays(cycleDates.halving['Cycle 4'].start, currentDate) || 0;
      data.halving.left = Math.max(0, averageCycleLengths.halving - data.halving.elapsed);
      data.peak.elapsed = calculateDays(cycleDates.peak['Cycle 3'].start, currentDate) || 0;
      data.peak.left = Math.max(0, averageCycleLengths.peak - data.peak.elapsed);
      return data;
    }, [averageCycleLengths, btcData, cycleDates]);
  
    useEffect(() => {
      if (btcData.length === 0) return;
      const cycleData = daysLeftData[type];
      if (cycleData && cycleData.averages !== 0) {
        setHeatScore(Math.min(100, (cycleData.elapsed / cycleData.averages) * 100));
      } else {
        setHeatScore(0);
      }
    }, [daysLeftData, type]);
  
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore >= 85;
  
    const titleMap = {
      low: 'Cycle Low',
      halving: 'Halving',
      peak: 'Cycle Peak',
    };
  
    const explanationMap = {
      low: 'Estimates days left in the current Bitcoin cycle based on historical averages from cycle lows (Cycles 2 and 3).',
      halving: 'Estimates days left in the current Bitcoin cycle based on historical averages from halvings (Cycles 2 and 3).',
      peak: 'Estimates days left in the current Bitcoin cycle based on historical averages from cycle peaks (Cycles 1 and 2).',
    };
  
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      window.location.href = 'https://www.cryptological.app/market-cycles';
    };
  
    return (
      <Box
        sx={{
          ...chartBoxStyle(colors, theme),
          backgroundColor,
          transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
          border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
          padding: '24px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <InfoIcon
          sx={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseEnter={() => setIsInfoVisible(true)}
          onMouseLeave={() => setIsInfoVisible(false)}
          aria-label="Information"
        />
        <ShowChartIcon
          sx={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '35px',
            zIndex: 1001,
            padding: '4px',
            borderRadius: '50%',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
          onMouseDown={handleChartRedirect}
          aria-label="View chart"
        />
        <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Days Left (From {titleMap[type]})
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Typography variant="h3" color={textColor} sx={{ fontWeight: 'bold' }}>
            {daysLeftData[type]?.left ?? 'N/A'}
          </Typography>
          <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
            Avg: {daysLeftData[type]?.averages ?? 'N/A'} days
          </Typography>
          <Typography variant="body1" color={textColor}>
            Elapsed: {daysLeftData[type]?.elapsed ?? 'N/A'} days
          </Typography>
          <Typography variant="body1" color={textColor}>
            Heat: {heatDescription}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body1"
            color={colors.redAccent[500]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation={explanationMap[type]}
        />
      </Box>
    );
  });

// Market Heat Gauge Widget
const MarketHeatGaugeWidget = memo(() => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [heatScore, setHeatScore] = useState(null);
  const [debugScores, setDebugScores] = useState({});
  const [debugInputs, setDebugInputs] = useState({});
  const { mvrvData, btcData, fearAndGreedData } = useContext(DataContext);
  useEffect(() => {
    if (mvrvData?.length > 0 && btcData?.length > 350 && fearAndGreedData?.length > 0) {
      const latestMvrvRaw = mvrvData[mvrvData.length - 1].value;
      const latestMvrv = Math.max(0, Math.min(10000, latestMvrvRaw));
      const { projectedPeak } = calculateMvrvPeakProjection(mvrvData);
      let mvrvHeat = 0;
      if (latestMvrv && projectedPeak) {
        const cappedProjectedPeak = Math.max(0, Math.min(10000, projectedPeak));
        const thresholds = [cappedProjectedPeak, 3.7];
        const distances = thresholds.map(t => ((latestMvrv - t) / t) * 100);
        const minDistance = Math.min(...distances.map(Math.abs));
        mvrvHeat = Math.max(0, Math.min(100, 100 - (minDistance / 10) * 100));
      }
      const mayerMultiples = calculateMayerMultiple(btcData);
      const latestMayerRaw = mayerMultiples[mayerMultiples.length - 1]?.value;
      const latestMayer = latestMayerRaw ? Math.max(0, Math.min(100, latestMayerRaw)) : 0;
      let mayerHeat = 0;
      if (latestMayer) {
        const thresholds = [2.4, 0.6];
        const distances = thresholds.map(t => ((latestMayer - t) / t) * 100);
        const minDistance = Math.min(...distances.map(Math.abs));
        mayerHeat = Math.max(0, Math.min(100, 100 - (minDistance / 10) * 100));
      }
      let riskHeat = 0;
      let riskData = null;
      const fetchRisk = async () => {
        try {
          riskData = await getBitcoinRisk();
          riskHeat = riskData && riskData.riskLevel !== undefined ? Math.min(100, riskData.riskLevel * 100) : 0;
        } catch (error) {
          console.error('Error fetching risk:', error);
          riskHeat = 0;
        }
        const fearGreedValueRaw = fearAndGreedData[fearAndGreedData.length - 1].value;
        const fearGreedValue = Math.max(0, Math.min(100, fearGreedValueRaw));
        const ratioData = calculateRatioSeries(btcData);
        const latestRatioRaw = ratioData[ratioData.length - 1]?.value;
        const latestRatio = latestRatioRaw ? Math.max(0, Math.min(100, latestRatioRaw)) : 0;
        let piCycleHeat = 0;
        if (latestRatio) {
          const buffer = 0.5;
          const minRatio = 0;
          const heatOffset = 0.28;
          piCycleHeat = Math.max(0, Math.min(100, (((latestRatio - minRatio) / buffer) * 100) + heatOffset));
        }
        const inputs = {
          latestMvrv: latestMvrvRaw,
          projectedPeak: projectedPeak,
          latestMayer: latestMayerRaw,
          riskLevel: riskData?.riskLevel,
          fearGreedValue: fearGreedValueRaw,
          latestRatio: latestRatioRaw,
        };
        setDebugInputs(inputs);
        const scores = {
          mvrv: mvrvHeat,
          mayer: mayerHeat,
          risk: riskHeat,
          fearGreed: fearGreedValue,
          piCycle: piCycleHeat,
        };
        const weights = {
          mvrv: 0.25,
          mayer: 0.25,
          risk: 0.15,
          fearGreed: 0.20,
          piCycle: 0.15,
        };
        const weightedSum = Object.keys(scores).reduce((sum, key) => {
          const score = scores[key] || 0;
          return sum + score * weights[key];
        }, 0);
        const avgHeat = Math.max(0, Math.min(100, weightedSum));
        setDebugScores(scores);
        setHeatScore(avgHeat);
      };
      fetchRisk();
    }
  }, [mvrvData, btcData, fearAndGreedData]);
  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(heatScore || 0);
  const isSignificant = heatScore !== null && heatScore >= 85;
  const getGaugeColor = (value) => {
    const startColor = { r: 255, g: 255, b: 255 };
    const endColor = { r: 128, g: 0, b: 128 };
    const ratio = (value || 0) / 100;
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };
  const gaugeColor = getGaugeColor(heatScore);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    window.location.href = '#';
  };
  return (
    <Box
      sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
        padding: '24px',
        textAlign: 'center',
        position: 'relative',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <InfoIcon
        sx={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          color: textColor,
          cursor: 'pointer',
          fontSize: '35px',
          zIndex: 1001,
          padding: '4px',
          borderRadius: '50%',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        onMouseEnter={() => setIsInfoVisible(true)}
        onMouseLeave={() => setIsInfoVisible(false)}
        aria-label="Information"
      />
      <ShowChartIcon
        sx={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          color: textColor,
          cursor: 'pointer',
          fontSize: '35px',
          zIndex: 1001,
          padding: '4px',
          borderRadius: '50%',
          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
        }}
        onMouseDown={handleChartRedirect}
        aria-label="View chart"
      />
      <Typography variant="h4" color={textColor} sx={{ fontWeight: 'bold' }}>
        Market Heat Index
      </Typography>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Box sx={{ width: '80%', maxWidth: 600 }}>
          <ProgressBar3D
            value={heatScore || 0}
            fillColor={gaugeColor}
            markerBorderColor={theme.palette.common.white}
            leftEndLabel="0 (Cold)"
            rightEndLabel="100 (Hot)"
            bottomLabel={heatDescription}
            heatStatusLabel={`Heat: ${heatDescription}`}
            labelColor={theme.palette.common.white}
          />
        </Box>
      </Box>
      {isSignificant && (
        <Typography
          variant="body1"
          color={colors.redAccent[500]}
          sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}
        >
          Warning: Market is significantly overheated.
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="The Market Heat Index combines multiple indicators (MVRV, Mayer Multiple, Fear and Greed, etc.) to assess overall market conditions. A higher score indicates an overheated market, calculated as a weighted average of individual indicator scores."
      />
    </Box>
  );
});

  // Chart components
  const BitcoinPriceChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h4" color={colors.grey[100]} gutterBottom>
        Bitcoin Price
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={btcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis
          scale="log"
          domain={['auto', 'auto']} // Adjust domain to ensure positive values
          stroke={colors.grey[100]}
          tick={{ fontSize: 12 }}
        />
          <Tooltip
            contentStyle={{ backgroundColor: colors.primary[500], border: `1px solid ${colors.grey[500]}` }}
            labelStyle={{ color: colors.grey[100] }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.grey[100] }} />
          <Line type="monotone" dataKey="value" name="Price (USD)" stroke={colors.blueAccent[400]} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  ));

  const EthereumPriceChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h4" color={colors.grey[100]} gutterBottom>
        Ethereum Price
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={ethData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis
          scale="log"
          domain={['auto', 'auto']} // Adjust domain to ensure positive values
          stroke={colors.grey[100]}
          tick={{ fontSize: 12 }}
        />
          <Tooltip
            contentStyle={{ backgroundColor: colors.primary[500], border: `1px solid ${colors.grey[500]}` }}
            labelStyle={{ color: colors.grey[100] }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.grey[100] }} />
          <Line type="monotone" dataKey="value" name="Price (USD)" stroke={colors.redAccent[400]} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  ));

  const InflationChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h4" color={colors.grey[100]} gutterBottom>
        US Inflation
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={inflationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInflation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.blueAccent[400]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.blueAccent[400]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: colors.primary[500], border: `1px solid ${colors.grey[500]}` }}
            labelStyle={{ color: colors.grey[100] }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.grey[100] }} />
          <Area
            type="monotone"
            dataKey="value"
            name="Inflation Rate (%)"
            stroke={colors.blueAccent[400]}
            fill="url(#colorInflation)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  ));

  const MarketCapChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h4" color={colors.grey[100]} gutterBottom>
        Total Market Cap
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={marketCapData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMarketCap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.blueAccent[400]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.blueAccent[400]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis
          scale="log"
          domain={['auto', 'auto']} // Adjust domain to ensure positive values
          stroke={colors.grey[100]}
          tick={{ fontSize: 12 }}
        />
          <Tooltip
            contentStyle={{ backgroundColor: colors.primary[500], border: `1px solid ${colors.grey[500]}` }}
            labelStyle={{ color: colors.grey[100] }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.grey[100] }} />
          <Area
            type="monotone"
            dataKey="value"
            name="Market Cap (USD)"
            stroke={colors.blueAccent[400]}
            fill="url(#colorMarketCap)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  ));

  // Common chart box style
  const chartBoxStyle = (colors, theme) => ({
    backgroundColor: colors.primary[400],
    borderRadius: '12px',
    padding: '20px',
    height: '100%',
    width: '100%',
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
  });

  // Loading UI
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: colors.primary[500],
        }}
      >
        <CircularProgress size={60} sx={{ color: colors.blueAccent[400] }} />
        <Typography variant="h5" color={colors.grey[100]} sx={{ mt: 2 }}>
          Loading Market Overview...
        </Typography>
      </Box>
    );
  }

  // Error UI
  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: colors.primary[500],
        }}
      >
        <Typography variant="h5" color={colors.redAccent[400]}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: isMobile ? '16px' : '32px',
        backgroundColor: colors.primary[500],
        minHeight: '100vh',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <Box 
          sx={{
            borderBottom: '1px solid #4cceac',
            marginbottom: '10px'
          }}
        >
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.common.white, 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '8px',
          }}
        >
          Heat Scale
        </Typography>
        <Box
          sx={{
            top: 0,
            left: 0,
            height: '20px',
            background: `linear-gradient(to right, ${gaugeColors[0]}, ${gaugeColors[gaugeColors.length - 1]})`,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px',
            // boxShadow: `0 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(255, 250, 250, 0.9)' : 'rgba(250, 250, 250, 0.9)'}`,
            border: '2px solid rgb(0, 0, 0)', // Added border
            marginBottom: '20px',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: theme.palette.common.black, fontSize: '12px', fontWeight: '600' }}
          >
            Cold (0)
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.common.black, fontSize: '12px', fontWeight: '600' }}
          >
            Hot (100)
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ width: '100%', maxWidth: 1440, margin: '0 auto', paddingTop: '28px' }}>
        <Typography
          variant="h4"
          color={colors.grey[100]}
          gutterBottom
          sx={{ fontWeight: 'bold', marginBottom: '24px' }}
        >
          Market Sentiment
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={sentimentIndexesLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setSentimentIndexesLayout(allLayouts)}
          isDraggable={false}
          isResizable={false}
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="fearAndGreed">
            <FearAndGreedGauge />
          </div>
          <div key="marketHeat">
            <MarketHeatGaugeWidget />
          </div>
          <div key="altcoinSeason">
            <AltcoinSeasonWidget />
          </div>
        </ResponsiveGridLayout>
        <Typography
          variant="h4"
          color={colors.grey[100]}
          gutterBottom
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          Indicators
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={onChainLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setOnChainLayout(allLayouts)}
          isDraggable={false}
          isResizable={false}
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="bitcoinRisk"><BitcoinRiskWidget /></div>
          <div key="mvrv"><MvrvRatioWidget /></div>
          <div key="mayerMultiple"><MayerMultipleWidget /></div>
          <div key="piCycleTop"><PiCycleTopWidget /></div>
          <div key="roiCycleComparison"><RoiCycleComparisonWidget /></div>

          <div key="daysLeftLow">
            <DaysLeftWidget type="low" />
          </div>
          <div key="daysLeftHalving">
            <DaysLeftWidget type="halving" />
          </div>
          <div key="daysLeftPeak">
            <DaysLeftWidget type="peak" />
          </div>
          
        </ResponsiveGridLayout>
      </Box>
    </Box>
  );
});

// Export MarketOverview wrapped with React.memo
export default restrictToPaidSubscription(memo(MarketOverview));