// src/scenes/MarketOverview.js
import React, { useState, useEffect, useContext, memo, useMemo, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { calculateRiskMetric } from '../utility/riskMetric';
import logger from '../utils/logger';


// Wrap GridLayout with WidthProvider for responsiveness
const ResponsiveGridLayout = WidthProvider(Responsive);
const InfoOverlay = ({ explanation, isVisible, borderColor }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      opacity: isVisible ? 1 : 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.3s ease',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
      zIndex: 1000,
      pointerEvents: isVisible ? 'auto' : 'none',
      border: `2px solid ${borderColor || 'transparent'}`, // Add dynamic border
    }}
  >
    <Typography
      variant="body2"
      color="white"
      sx={{
        fontSize: '14px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
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
    { i: 'dailyRsi', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'weeklyRsi', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  ],
  md: [
    { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'mvrv', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'mayerMultiple', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'piCycleTop', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'roiCycleComparison', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'dailyRsi', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'weeklyRsi', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
  ],
  sm: [
    { i: 'bitcoinRisk', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'mvrv', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'mayerMultiple', x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'piCycleTop', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'roiCycleComparison', x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'dailyRsi', x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2 },
    { i: 'weeklyRsi', x: 0, y: 12, w: 6, h: 2, minW: 2, minH: 2 },
  ],
  xs: [
    { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'mvrv', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'mayerMultiple', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'piCycleTop', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'roiCycleComparison', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'dailyRsi', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'weeklyRsi', x: 0, y: 12, w: 4, h: 2, minW: 2, minH: 2 },
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
  const cycleLengthLayouts = {
    lg: [
      { i: 'daysSinceTop', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
    ],
    md: [
      { i: 'daysSinceTop', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
    ],
    sm: [
      { i: 'daysSinceTop', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'daysSinceTop', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    ],
  };
  // State for grid layouts
  const [priceLayout, setPriceLayout] = useState(priceLayouts);
  const [indicatorsLayout, setIndicatorsLayout] = useState(indicatorsLayouts);
  const [sentimentLayout, setSentimentLayout] = useState(sentimentLayouts);
  const [onChainLayout, setOnChainLayout] = useState(onChainLayouts);
  const [overallConditionsLayout, setOverallConditionsLayout] = useState(overallConditionsLayouts);
  const [altcoinSeasonLayout, setAltcoinSeasonLayout] = useState(altcoinSeasonLayouts);
  const [sentimentIndexesLayout, setSentimentIndexesLayout] = useState(sentimentIndexesLayouts);
  const [cycleLengthLayout, setCycleLengthLayout] = useState(cycleLengthLayouts);
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
  const calculateMvrvPeakProjection = useCallback((mvrvData) => {
    // Smooth MVRV data with a 30-day SMA to reduce noise for better peak detection
    const smoothPeriod = 30;
    const smoothedMvrv = [];
    for (let i = smoothPeriod - 1; i < mvrvData.length; i++) {
      let sum = 0;
      for (let j = 0; j < smoothPeriod; j++) {
        sum += mvrvData[i - j].value;
      }
      smoothedMvrv.push({
        time: mvrvData[i].time,
        value: sum / smoothPeriod,
      });
    }
 
    const peaks = [];
    const window = 365; // 1-year window for cycle-level peak detection
    for (let i = window; i < smoothedMvrv.length - window; i++) {
      const isPeak = smoothedMvrv.slice(i - window, i + window + 1).every(
        (item, idx) => item.value <= smoothedMvrv[i].value || idx === window
      );
      if (isPeak && smoothedMvrv[i].value > 3) { // Filter for significant peaks above 3
        peaks.push(smoothedMvrv[i]);
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

    const navigate = useNavigate();
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      navigate('/altcoin-season-index');
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
            sx={{
              color: colors.redAccent[500],
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px 8px',
              marginTop: '8px',
              display: 'inline-block', // Ensures the background wraps tightly around the text
            }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Altcoin Season Index measures the performance of altcoins relative to Bitcoin. A higher value (closer to 100) indicates an altcoin season, where altcoins outperform Bitcoin over a specific period."
          borderColor={backgroundColor}
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
  const { btcData } = useContext(DataContext);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  useEffect(() => {
    const calculateRoiFromPeak = async () => {
      if (!btcData || btcData.length === 0) return;

      const peakStarts = {
        'Cycle 2': '2017-12-17',
        'Cycle 3': '2021-11-10',
        'Cycle 5': '2025-10-07',
      };

      const processCycleFromPeak = (start, cycleName) => {
        const filteredData = btcData.filter(d => new Date(d.time) >= new Date(start));
        if (filteredData.length === 0) return null;

        const basePrice = filteredData[0].value;
        return filteredData.map((item, index) => ({
          day: index,
          roi: Math.log10(item.value / basePrice) + 1,
          date: item.time,
          cycle: cycleName,
        }));
      };

      const cycle2 = processCycleFromPeak(peakStarts['Cycle 2'], 'Cycle 2');
      const cycle3 = processCycleFromPeak(peakStarts['Cycle 3'], 'Cycle 3');
      const cycle5 = processCycleFromPeak(peakStarts['Cycle 5'], 'Cycle 5');

      if (!cycle2 || !cycle3 || !cycle5) return;

      const days = cycle5.length;
      const currentRoiValue = cycle5[cycle5.length - 1].roi;

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

        // Z-score
        const mean = avgRois.reduce((sum, val) => sum + val, 0) / avgRois.length;
        const variance = avgRois.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgRois.length;
        const stdDev = Math.sqrt(variance);
        const z = stdDev > 0 ? (currentRoiValue - latestAvgRoi) / stdDev : 0;
        setZScore(z);

        // Heat calculation (skewed toward lower values)
        const avgPostPeakDays = 370;
        const timeProgress = Math.min(1, days / avgPostPeakDays);
        const performancePenalty = z < 0 ? Math.abs(z) : 0;

        let heat = (timeProgress * 35) + (performancePenalty * 30);

        if (timeProgress > 0.75 && z < -0.5) {
          heat += 20;
        }

        heat = Math.max(0, Math.min(100, heat));
        setHeatScore(heat);
      }
    };

    calculateRoiFromPeak();
  }, [btcData]);

  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(heatScore || 0);
  const isSignificant = heatScore !== null && heatScore >= 85;
  const roiDifference = currentRoi !== null && avgRoi !== null ? currentRoi - avgRoi : null;

  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/market-cycles');
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
        ROI Cycle Comparison (from Peak)
      </Typography>

      <Box sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        <Typography variant="h3" color={textColor} sx={{ fontWeight: 'bold', mt: 1 }}>
          Difference: {roiDifference !== null ? (roiDifference >= 0 ? '+' : '') + roiDifference.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
          Current: {currentRoi !== null ? currentRoi.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
          Avg (Cycles 2 & 3 from Peak): {avgRoi !== null ? avgRoi.toFixed(2) : 'N/A'}
        </Typography>

        {/* Heat Score - Now Displayed */}
        <Typography variant="body1" color={textColor}>
          Heat: {heatDescription}
        </Typography>
      </Box>

      {isSignificant && (
        <Typography
          variant="body1"
          sx={{
            color: colors.redAccent[500],
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px 8px',
            marginTop: '8px',
            display: 'inline-block',
          }}
        >
          Warning: Cycle nearing end.
        </Typography>
      )}

      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="ROI is now calculated from each cycle's peak. This shows how the current post-peak bear market compares to previous cycles after their tops. Heat stays low unless we are both deep into the bear market phase and performing significantly worse than historical averages."
        borderColor={backgroundColor}
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

    const navigate = useNavigate();
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      navigate('/tx-mvrv');
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
            sx={{
              color: colors.redAccent[500],
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px 8px',
              marginTop: '8px',
              display: 'inline-block', // Ensures the background wraps tightly around the text
            }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The MVRV Ratio (Market Value to Realized Value) compares the market value of Bitcoin to its realized value. A high MVRV indicates that the market is overvalued, while a low MVRV suggests it is undervalued. This widget helps identify potential market overheating or undervaluation."
          borderColor={backgroundColor}
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
    
    const navigate = useNavigate();
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      navigate('/bitcoin');
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
            sx={{
              color: colors.redAccent[500],
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px 8px',
              marginTop: '8px',
              display: 'inline-block', // Ensures the background wraps tightly around the text
            }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Mayer Multiple is a ratio of Bitcoin's current price to its 200-day moving average. It helps identify whether Bitcoin is overbought or oversold. A high Mayer Multiple indicates that Bitcoin is significantly above its historical average, suggesting potential overvaluation, while a low value indicates undervaluation."
          borderColor={backgroundColor}
        />
      </Box>
    );
  });

  const BitcoinRiskWidget = memo(() => {
  const [riskLevel, setRiskLevel] = useState(null);
  const { btcData } = useContext(DataContext);

  // 1. Load IDB cached risk once on mount for instant non-zero display (before btcData arrives)
  useEffect(() => {
    (async () => {
      try {
        const riskData = await getBitcoinRisk();
        if (riskData && riskData.riskLevel !== undefined) {
          setRiskLevel(riskData.riskLevel);
          logger.log('BitcoinRiskWidget: using IDB cached risk level');
        }
      } catch (e) {
        logger.error('BitcoinRiskWidget: error reading IDB risk', e);
      }
    })();
  }, []);

  // 2. Derive fresh risk from btcData (authoritative, ensures widget exactly matches the risk chart).
  // This replaces the previous always-on effect + backend attempt (which was not a 0-1 composite and always fell back + warned).
  const freshRisk = useMemo(() => {
    if (!btcData || btcData.length === 0) return null;
    try {
      const riskDataArray = calculateRiskMetric(btcData);
      if (riskDataArray && riskDataArray.length > 0) {
        const calculatedRisk = riskDataArray[riskDataArray.length - 1].Risk;
        if (isFinite(calculatedRisk)) {
          saveBitcoinRisk(calculatedRisk).catch(() => {});
          logger.log('BitcoinRiskWidget: calculated fresh risk from btcData (to match chart)');
          return calculatedRisk;
        }
      }
    } catch (e) {
      logger.error('BitcoinRiskWidget: error during local calc', e);
    }
    return null;
  }, [btcData]);

  // Override with fresh calc as soon as btcData is available/updated (no more repeated backend calls)
  useEffect(() => {
    if (freshRisk !== null) {
      setRiskLevel(freshRisk);
    }
  }, [freshRisk]);

  const displayRisk = riskLevel !== null ? Math.max(0, Math.min(100, riskLevel * 100)).toFixed(2) : 0;
  const backgroundColor = getBackgroundColor(displayRisk);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(displayRisk);
  const isSignificant = parseFloat(displayRisk) >= 85;

  const [isInfoVisible, setIsInfoVisible] = useState(false);
  
  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/risk');
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
      {isSignificant && (
        <Typography
          variant="body1"
          sx={{
            color: colors.redAccent[500],
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px 8px',
            marginTop: '8px',
            display: 'inline-block', // Ensures the background wraps tightly around the text
          }}
        >
          Warning: Cycle nearing end.
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="The Bitcoin Risk Level assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average, incorporating a factor that accounts for sustained periods above the moving average. It calculates a normalized score between 0 and 1, where a higher score indicates higher risk, particularly after prolonged bull markets amplified by higher price levels. A lower score indicates lower risk."
        borderColor={backgroundColor}
      />
    </Box>
  );
});

  // Fear and Greed Gauge
  const FearAndGreedGauge = memo(() => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { fearAndGreedData, fetchFearAndGreedData, latestFearAndGreed, fetchLatestFearAndGreed } = useContext(DataContext);
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    // Prefer the freshest latestFearAndGreed (from binary-latest endpoint) over last of full fearAndGreedData
    const latestFg = latestFearAndGreed || (fearAndGreedData && fearAndGreedData.length > 0 ? fearAndGreedData[fearAndGreedData.length - 1] : null);
    const latestValue = latestFg ? Math.max(0, Math.min(100, Number(latestFg.value))) : 0;
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
      if (!fearAndGreedData || fearAndGreedData.length === 0) {
        fetchFearAndGreedData();
      }
      if (!latestFearAndGreed) {
        fetchLatestFearAndGreed();
      }
    }, [fearAndGreedData, fetchFearAndGreedData, latestFearAndGreed, fetchLatestFearAndGreed]);

    const navigate = useNavigate();
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      navigate('/fear-and-greed-chart');
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
            sx={{
              color: colors.redAccent[500],
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px 8px',
              marginTop: '8px',
              display: 'inline-block', // Ensures the background wraps tightly around the text
            }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The Fear and Greed Index gauges market sentiment, ranging from 0 (Extreme Fear) to 100 (Extreme Greed). It’s calculated using factors like volatility, market momentum, and social media sentiment."
          borderColor={backgroundColor}
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
 
      if (latestRatio !== null) {
        let heat;

        if (latestRatio < 0.65) {
          // Strongly skewed toward Cold below 0.65
          heat = 1;
        } else {
          // Exponential ramp between 0.65 and 0.75
          const t = Math.min(1, (latestRatio - 0.65) / 0.10); // normalize 0.65→0.75 to 0→1
          heat = Math.pow(t, 3.5) * 100; // exponent 3.5 = fast exponential rise
        }

        heat = Math.max(0, Math.min(100, heat));
        setHeatScore(heat);
      }
      }
    }, [btcData]);
 
    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 85;
 
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    
    const navigate = useNavigate();
    const handleChartRedirect = (event) => {
      event.stopPropagation();
      navigate('/pi-cycle');
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
            sx={{
              color: colors.redAccent[500],
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '4px 8px',
              marginTop: '8px',
              display: 'inline-block', // Ensures the background wraps tightly around the text
            }}
          >
            Warning: Cycle nearing end.
          </Typography>
        )}
        <InfoOverlay
          isVisible={isInfoVisible}
          explanation="The PiCycle Top Indicator (created by Phillip Swift) uses the 111-day and 350-day moving averages to predict potential market tops. The ratio of these moving averages shows decreasing peaks, suggesting a cycle top of under 1.0."
          borderColor={backgroundColor}
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

  // Map type prop to daysLeftData keys
  const typeMap = {
    low: 'bottom',
    halving: 'halving',
    peak: 'peak',
    top: 'top',                    // NEW: for post-top phase
  };
  const mappedType = typeMap[type] || type;

  // Define cycle dates
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
    top: {
      'Cycle 4': { start: '2025-10-06', end: null }, // Bull market top date (user-specified)
    },
  }), []);

  // Calculate days between two dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate) || isNaN(endDate)) {
      console.warn(`Invalid dates: start=${start}, end=${end}`);
      return 0;
    }
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  };

  // Historical average top-to-bottom duration (bull market top → next cycle bottom)
  // Based on 2017-12-17 top → 2018-12-15 bottom (~363 days)
  // and 2021-11-08 top → 2022-11-21 bottom (~378 days)
  const averageTopToBottomDays = 370; // ~1 year average — accurate & coherent with historical cycle data

  // Calculate average cycle lengths (kept for backward compatibility)
  const averageCycleLengths = useMemo(() => {
    const averages = { bottom: 0, halving: 0, peak: 0 };
    const bottomDays = [
      calculateDays(cycleDates.bottom['Cycle 2'].start, cycleDates.bottom['Cycle 2'].end),
      calculateDays(cycleDates.bottom['Cycle 3'].start, cycleDates.bottom['Cycle 3'].end),
    ].filter(days => days > 0);
    averages.bottom = bottomDays.length > 0 ? Math.round(bottomDays.reduce((sum, days) => sum + days, 0) / bottomDays.length) : 0;

    const halvingDays = [
      calculateDays(cycleDates.halving['Cycle 2'].start, cycleDates.halving['Cycle 2'].end),
      calculateDays(cycleDates.halving['Cycle 3'].start, cycleDates.halving['Cycle 3'].end),
    ].filter(days => days > 0);
    averages.halving = halvingDays.length > 0 ? Math.round(halvingDays.reduce((sum, days) => sum + days, 0) / halvingDays.length) : 0;

    const peakDays = [
      calculateDays(cycleDates.peak['Cycle 1'].start, cycleDates.peak['Cycle 1'].end),
      calculateDays(cycleDates.peak['Cycle 2'].start, cycleDates.peak['Cycle 2'].end),
    ].filter(days => days > 0);
    averages.peak = peakDays.length > 0 ? Math.round(peakDays.reduce((sum, days) => sum + days, 0) / peakDays.length) : 0;

    return averages;
  }, [cycleDates]);

  // Calculate days elapsed and days left (now includes 'top')
  const daysLeftData = useMemo(() => {
    const data = {
      bottom: { elapsed: 0, left: 0, average: averageCycleLengths.bottom },
      halving: { elapsed: 0, left: 0, average: averageCycleLengths.halving },
      peak: { elapsed: 0, left: 0, average: averageCycleLengths.peak },
      top: { elapsed: 0, left: 0, average: averageTopToBottomDays }, // NEW
    };

    if (btcData.length === 0) {
      console.warn('btcData is empty, returning default daysLeftData');
      return data;
    }

    const currentDate = btcData[btcData.length - 1]?.time || new Date().toISOString().split('T')[0];
    const parsedCurrentDate = new Date(currentDate);
    if (isNaN(parsedCurrentDate)) {
      console.warn('Invalid current date:', currentDate);
      return data;
    }

    // Bottom calculations
    const bottomStartDate = new Date(cycleDates.bottom['Cycle 4'].start);
    if (!isNaN(bottomStartDate)) {
      data.bottom.elapsed = calculateDays(cycleDates.bottom['Cycle 4'].start, currentDate);
      data.bottom.left = Math.max(0, averageCycleLengths.bottom - data.bottom.elapsed);
    }

    // Halving calculations
    const halvingStartDate = new Date(cycleDates.halving['Cycle 4'].start);
    if (!isNaN(halvingStartDate)) {
      data.halving.elapsed = calculateDays(cycleDates.halving['Cycle 4'].start, currentDate);
      data.halving.left = Math.max(0, averageCycleLengths.halving - data.halving.elapsed);
    }

    // Peak calculations
    const peakStartDate = new Date(cycleDates.peak['Cycle 3'].start);
    if (!isNaN(peakStartDate)) {
      data.peak.elapsed = calculateDays(cycleDates.peak['Cycle 3'].start, currentDate);
      data.peak.left = Math.max(0, averageCycleLengths.peak - data.peak.elapsed);
    }

    // NEW: Top (Bull Market Top → Expected Bottom) calculations
    const topStartDate = new Date(cycleDates.top['Cycle 4'].start);
    if (!isNaN(topStartDate)) {
      data.top.elapsed = calculateDays(cycleDates.top['Cycle 4'].start, currentDate);
      data.top.left = Math.max(0, averageTopToBottomDays - data.top.elapsed);
    } else {
      console.warn('Invalid top start date:', cycleDates.top['Cycle 4'].start);
    }

    return data;
  }, [averageCycleLengths, averageTopToBottomDays, btcData, cycleDates]);

  // Non-linear color scaling (unchanged)
  const calculateNonLinearHeatScore = (elapsed, average) => {
    if (average <= 0) return 0;
    const progress = elapsed / average;
    const skewedProgress = Math.pow(progress, 3);
    return Math.min(100, skewedProgress * 100);
  };

  useEffect(() => {
    if (btcData.length === 0) {
      setHeatScore(0);
      return;
    }
    const cycleData = daysLeftData[mappedType];
    if (!cycleData) {
      console.warn(`No cycle data for mapped type ${mappedType} (original type: ${type})`);
      setHeatScore(0);
      return;
    }
    if (cycleData.average > 0) {
      const calculatedHeatScore = calculateNonLinearHeatScore(cycleData.elapsed, cycleData.average);
      setHeatScore(calculatedHeatScore);
    } else {
      setHeatScore(0);
    }
  }, [daysLeftData, type, mappedType, btcData]);

  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(heatScore || 0);
  const isSignificant = heatScore >= 85;

  const titleMap = {
    low: 'Cycle Low',
    halving: 'Halving',
    peak: 'Cycle Peak',
    top: 'Cycle Top (Oct 6, 2025)',           // NEW title
  };

  const explanationMap = {
    low: 'Estimates days left in the current Bitcoin cycle based on historical averages from cycle lows (Cycles 2 and 3).',
    halving: 'Estimates days left in the current Bitcoin cycle based on historical averages from halvings (Cycles 2 and 3).',
    peak: 'Estimates days left in the current Bitcoin cycle based on historical averages from cycle peaks (Cycles 1 and 2).',
    top: 'Days elapsed since the bull market top on October 6, 2025, and estimated days remaining until the average historical cycle bottom (~370 days / ~1 year from top). This now tracks progress through the expected post-top bear market phase.',
  };

  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/market-cycles');
  };

  const projectedBottomDate = useMemo(() => {
    if (!daysLeftData[mappedType] || daysLeftData[mappedType].left <= 0) return null;

    const startDate = new Date(cycleDates.top?.['Cycle 4']?.start || '2025-10-06');
    if (isNaN(startDate)) return null;

    const projected = new Date(startDate);
    projected.setDate(projected.getDate() + daysLeftData[mappedType].average);
    return projected.toISOString().split('T')[0];
  }, [daysLeftData, mappedType, cycleDates]);

  const formatDate = (dateStr) => {
  const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Box sx={{
      ...chartBoxStyle(colors, theme),
      backgroundColor,
      transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
      border: isSignificant ? `2px solid ${colors.redAccent[500]}` : 'none',
      padding: '24px',
      textAlign: 'center',
      position: 'relative',
    }}>
      <InfoIcon
        sx={{ position: 'absolute', top: '12px', right: '12px', color: textColor, cursor: 'pointer', fontSize: '35px', zIndex: 1001, padding: '4px', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
        onMouseEnter={() => setIsInfoVisible(true)}
        onMouseLeave={() => setIsInfoVisible(false)}
        aria-label="Information"
      />
      <ShowChartIcon
        sx={{ position: 'absolute', top: '12px', left: '12px', color: textColor, cursor: 'pointer', fontSize: '35px', zIndex: 1001, padding: '4px', borderRadius: '50%', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
        onMouseDown={handleChartRedirect}
        aria-label="View chart"
      />
      <Typography variant="h4" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
        Days Since {titleMap[type] || titleMap[mappedType]}
      </Typography>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Typography variant="h3" color={textColor} sx={{ fontWeight: 'bold' }}>
          {daysLeftData[mappedType]?.left >= 0 ? daysLeftData[mappedType].left : 'N/A'}
        </Typography>
        <Typography variant="h5" color={textColor} sx={{ fontWeight: 'bold' }}>
          Avg: {daysLeftData[mappedType]?.average > 0 ? daysLeftData[mappedType].average : 'N/A'} days
        </Typography>
        <Typography variant="body1" color={textColor}>
          Elapsed: {daysLeftData[mappedType]?.elapsed >= 0 ? daysLeftData[mappedType].elapsed : 'N/A'} days
        </Typography>
        {projectedBottomDate && (
          <Typography variant="body1" color={textColor} sx={{ mt: 1, fontWeight: 500 }}>
            Projected Bottom: ~{formatDate(projectedBottomDate)}
          </Typography>
        )}
        <Typography variant="body1" color={textColor}>
          Heat: {heatDescription}
        </Typography>
      </Box>
      {isSignificant && (
        <Typography variant="body1" sx={{ color: colors.redAccent[500], textAlign: 'center', fontWeight: 'bold', fontSize: '11px', backgroundColor: 'white', borderRadius: '8px', padding: '4px 8px', marginTop: '8px', display: 'inline-block' }}>
          Warning: Cycle nearing end.
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation={explanationMap[type] || explanationMap[mappedType] || ''}
      />
    </Box>
  );
});

const MarketHeatGaugeWidget = memo(() => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [heatScore, setHeatScore] = useState(null);
  const [debugScores, setDebugScores] = useState({});
  const [debugInputs, setDebugInputs] = useState({});
  const { mvrvData, btcData, fearAndGreedData, latestFearAndGreed } = useContext(DataContext);

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
          logger.error('Error fetching risk in heat calc (non-widget):', error);
          riskHeat = 0;
        }
        const fearGreedLatest = latestFearAndGreed || (fearAndGreedData && fearAndGreedData.length > 0 ? fearAndGreedData[fearAndGreedData.length - 1] : null);
        const fearGreedValueRaw = fearGreedLatest ? fearGreedLatest.value : 0;
        const fearGreedValue = Math.max(0, Math.min(100, Number(fearGreedValueRaw)));
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

  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/market-heat-index');
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
          sx={{
            color: colors.redAccent[500],
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px 8px',
            marginTop: '8px',
            display: 'inline-block',
          }}
        >
          Warning: Cycle nearing end.
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

// New Daily RSI Widget (added here)
const DailyRsiWidget = memo(() => {
  const { btcData } = useContext(DataContext);
  const [latestRsi, setLatestRsi] = useState(null);
  const [heatScore, setHeatScore] = useState(null);

  const calculateRSI = (data, period) => {
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
  };

  useEffect(() => {
    if (btcData && btcData.length > 14) {
      const rsiData = calculateRSI(btcData, 14); // Daily RSI with period=14
      const latestRsiValue = rsiData[rsiData.length - 1]?.value;
      if (latestRsiValue !== undefined) {
        const cappedRsi = Math.max(0, Math.min(100, latestRsiValue));
        setLatestRsi(cappedRsi);
        setHeatScore(cappedRsi); // Map RSI directly to heat (high RSI = high heat, overbought)
      }
    }
  }, [btcData]);

  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(heatScore || 0);
  const isSignificant = heatScore !== null && heatScore >= 70; // Overbought warning
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/bitcoin');
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
        Daily RSI
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
          Current: {latestRsi !== null ? latestRsi.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="body1" color={textColor}>
          Heat: {heatDescription}
        </Typography>
      </Box>
      {isSignificant && (
        <Typography
          variant="body1"
          sx={{
            color: colors.redAccent[500],
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px 8px',
            marginTop: '8px',
            display: 'inline-block',
          }}
        >
          Warning: Overbought
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="Relative Strength Index (RSI) measures momentum on a 14-day period. Values above 70 suggest overbought conditions (potential top); below 30 indicate oversold (potential bottom)."
        borderColor={backgroundColor}
      />
    </Box>
  );
});

// Weekly RSI Widget
const WeeklyRsiWidget = memo(() => {
  const { btcData } = useContext(DataContext);
  const [latestRsi, setLatestRsi] = useState(null);
  const [heatScore, setHeatScore] = useState(null);

  const calculateRSI = (data, period) => {
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
  };

  useEffect(() => {
    if (btcData && btcData.length > 98) {
      const rsiData = calculateRSI(btcData, 98); // Weekly RSI with period=98 (14 weeks)
      const latestRsiValue = rsiData[rsiData.length - 1]?.value;
      if (latestRsiValue !== undefined) {
        const cappedRsi = Math.max(0, Math.min(100, latestRsiValue));
        setLatestRsi(cappedRsi);
        setHeatScore(cappedRsi); // Map RSI directly to heat (high RSI = high heat, overbought)
      }
    }
  }, [btcData]);

  const backgroundColor = getBackgroundColor(heatScore || 0);
  const textColor = getTextColor(backgroundColor);
  const heatDescription = getHeatDescription(heatScore || 0);
  const isSignificant = heatScore !== null && heatScore >= 70; // Overbought warning
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const navigate = useNavigate();
  const handleChartRedirect = (event) => {
    event.stopPropagation();
    navigate('/bitcoin');
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
        Weekly RSI
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
          Current: {latestRsi !== null ? latestRsi.toFixed(2) : 'N/A'}
        </Typography>
        <Typography variant="body1" color={textColor}>
          Heat: {heatDescription}
        </Typography>
      </Box>
      {isSignificant && (
        <Typography
          variant="body1"
          sx={{
            color: colors.redAccent[500],
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '11px',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '4px 8px',
            marginTop: '8px',
            display: 'inline-block',
          }}
        >
          Warning: Overbought
        </Typography>
      )}
      <InfoOverlay
        isVisible={isInfoVisible}
        explanation="Relative Strength Index (RSI) measures momentum on a 14-week period (98 days). Values above 70 suggest overbought conditions (potential top); below 30 indicate oversold (potential bottom)."
        borderColor={backgroundColor}
      />
    </Box>
  );
});

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
          Price Based Indicators
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
          <div key="dailyRsi"><DailyRsiWidget /></div>
          <div key="weeklyRsi"><WeeklyRsiWidget /></div>
        </ResponsiveGridLayout>
                <Typography
          variant="h4"
          color={colors.grey[100]}
          gutterBottom
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          Cycle Bottom Projection (from Oct 2025 Top)
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={cycleLengthLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setCycleLengthLayout(allLayouts)}
          isDraggable={false}
          isResizable={false}
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="daysSinceTop">
            <DaysLeftWidget type="top" />
          </div>
        </ResponsiveGridLayout>
      </Box>
    </Box>
  );
});
// Export MarketOverview wrapped with React.memo
export default restrictToPaidSubscription(memo(MarketOverview));