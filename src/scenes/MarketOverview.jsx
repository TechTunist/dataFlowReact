// src/scenes/MarketOverview.js
import React, { useState, useEffect, useContext, memo } from 'react';
import FearAndGreed3D from '../components/FearAndGreed3D';
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
import { Box, Typography, useTheme, LinearProgress } from '@mui/material';
import { tokens } from '../theme';
import { DataContext } from '../DataContext';
import useIsMobile from '../hooks/useIsMobile';
import { getBitcoinRisk } from '../utility/idbUtils';

// Wrap GridLayout with WidthProvider for responsiveness
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define MarketOverview component
const MarketOverview = () => {
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
  } = useContext(DataContext);

  // Define breakpoints and columns for different screen sizes
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
  const cols = { lg: 12, md: 8, sm: 6, xs: 4 };

  // Responsive layouts for each section
  const priceLayouts = {
    lg: [
      { i: 'bitcoin', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    md: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    sm: [
      { i: 'bitcoin', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
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

  const onChainLayouts = {
    lg: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'mvrvRatio', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'marketHeat', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    ],
    md: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mvrvRatio', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketHeat', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    sm: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'mvrvRatio', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'marketHeat', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'bitcoinRisk', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mvrvRatio', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'mayerMultiple', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketHeat', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    ],
  };

  // State for grid layouts
  const [priceLayout, setPriceLayout] = useState(priceLayouts);
  const [indicatorsLayout, setIndicatorsLayout] = useState(indicatorsLayouts);
  const [sentimentLayout, setSentimentLayout] = useState(sentimentLayouts);
  const [onChainLayout, setOnChainLayout] = useState(onChainLayouts);

  useEffect(() => {
    console.log('MarketOverview mounted');
    return () => console.log('MarketOverview unmounted');
  }, []);

  console.log('MarketOverview rendered');

  // Fetch data on mount
  useEffect(() => {
    fetchBtcData();
    fetchEthData();
    fetchFearAndGreedData();
    fetchInflationData();
    fetchMarketCapData();
    fetchMvrvData();
  }, [fetchBtcData, fetchEthData, fetchFearAndGreedData, fetchInflationData, fetchMarketCapData, fetchMvrvData]);

  // Responsive row height and margin
  const rowHeight = isMobile ? 100 : 120;
  const margin = isMobile ? [8, 8] : [16, 16];

  // Calculate MVRV peak projection
  const calculateMvrvPeakProjection = (mvrvData) => {
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

    const latestPeak = peaks[0];
    const projectedPeak = latestPeak 
      ? latestPeak.value * (1 - avgDecrease) 
      : null;

    return { projectedPeak };
  };

  // Calculate Mayer Multiple
  const calculateMayerMultiple = (data) => {
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
  };

  // Gauge colors from CryptoFearAndGreedIndex
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
    if (value <= 20) return 'Cold';
    if (value <= 40) return 'Cool';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Warm';
    return 'Hot';
  };

  // Text color based on background luminance
  const getTextColor = (bgColor) => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    // Calculate luminance
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Use dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 
      ? (theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100])
      : (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]);
  };

  // MVRV Ratio Widget
  const MvrvRatioWidget = memo(() => {
    const [currentMvrv, setCurrentMvrv] = useState(null);
    const [projectedPeak, setProjectedPeak] = useState(null);
    const [heatScore, setHeatScore] = useState(null);
    const [zScore, setZScore] = useState(null);

    useEffect(() => {
      if (mvrvData && mvrvData.length > 0) {
        const latestMvrv = mvrvData[mvrvData.length - 1].value;
        const { projectedPeak } = calculateMvrvPeakProjection(mvrvData);

        if (latestMvrv && projectedPeak) {
          setCurrentMvrv(latestMvrv);
          setProjectedPeak(projectedPeak);

          // Calculate heat score (0-100)
          const thresholds = [projectedPeak, 3.7];
          const distances = thresholds.map(t => ((latestMvrv - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          const heat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
          setHeatScore(heat);

          // Calculate z-score
          const values = mvrvData.map(item => item.value);
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          const z = (latestMvrv - projectedPeak) / stdDev;
          setZScore(z);
        }
      }
    }, [mvrvData]);

    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 80 && zScore !== null && Math.abs(zScore) <= 1;

    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[600]}` : 'none',
        padding: '24px',
      }}>
        <Typography variant="h5" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
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
          <Typography variant="h6" color={textColor} sx={{ fontWeight: 'bold' }}>
            Current: {currentMvrv !== null ? currentMvrv.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="h6" color={textColor} sx={{ fontWeight: 'bold' }}>
            Predicted Peak: {projectedPeak !== null ? projectedPeak.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="body2" color={textColor}>
            Heat: {heatDescription}
          </Typography>
          <Typography variant="body2" color={textColor}>
            Z-Score: {zScore !== null ? zScore.toFixed(2) : 'N/A'}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body2"
            color={colors.redAccent[200]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market is overheated.
          </Typography>
        )}
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
        const latestMayer = mayerMultiples[mayerMultiples.length - 1].value;

        if (latestMayer) {
          setCurrentMayer(latestMayer);

          // Calculate heat score
          const thresholds = [2.4, 0.6];
          const distances = thresholds.map(t => ((latestMayer - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          const heat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
          setHeatScore(heat);

          // Calculate z-score
          const values = mayerMultiples.map(item => item.value);
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
    const isSignificant = heatScore !== null && heatScore >= 80 && (currentMayer >= 2.4 || currentMayer <= 0.6);

    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[600]}` : 'none',
        padding: '24px',
      }}>
        <Typography variant="h5" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
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
          <Typography variant="h6" color={textColor} sx={{ fontWeight: 'bold' }}>
            Current: {currentMayer !== null ? currentMayer.toFixed(2) : 'N/A'}
          </Typography>
          <Typography variant="body2" color={textColor}>
            Heat: {heatDescription}
          </Typography>
          <Typography variant="body2" color={textColor}>
            Z-Score: {zScore !== null ? zScore.toFixed(2) : 'N/A'}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body2"
            color={colors.redAccent[200]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market is overheating or severely undervalued.
          </Typography>
        )}
      </Box>
    );
  });

  // Bitcoin Risk Widget
  const BitcoinRiskWidget = memo(() => {
    const [riskLevel, setRiskLevel] = useState(null);

    useEffect(() => {
      const fetchRiskLevel = async () => {
        try {
          const riskData = await getBitcoinRisk();
          setRiskLevel(riskData ? riskData.riskLevel : 0);
        } catch (error) {
          console.error('Error fetching Bitcoin risk level:', error);
          setRiskLevel(0);
        }
      };
      fetchRiskLevel();
    }, []);

    const displayRisk = riskLevel !== null ? (riskLevel * 100).toFixed(2) : 0;
    const backgroundColor = getBackgroundColor(displayRisk);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(displayRisk);
    const isSignificant = displayRisk > 80;

    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[600]}` : 'none',
        padding: '24px',
        textAlign: 'center',
      }}>
        <Typography variant="h5" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Bitcoin Risk Level
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h1"
            color={textColor}
            sx={{ fontWeight: 'bold' }}
          >
            {displayRisk}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color={textColor}
          sx={{ textAlign: 'center', mt: 1 }}
        >
          Heat: {heatDescription}
        </Typography>
        <Typography
          variant="body2"
          color={textColor}
          sx={{ textAlign: 'center', mt: 1 }}
        >
          {displayRisk <= 20 ? 'Low Risk' : displayRisk <= 60 ? 'Medium Risk' : 'High Risk'}
        </Typography>
        {isSignificant && (
          <Typography
            variant="body2"
            color={colors.redAccent[200]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: High market risk.
          </Typography>
        )}
      </Box>
    );
  });

  // Fear and Greed Gauge
  const FearAndGreedGauge = memo(() => {
    const latestValue = fearAndGreedData && fearAndGreedData.length > 0 ? fearAndGreedData[fearAndGreedData.length - 1].value : 0;
    const backgroundColor = getBackgroundColor(latestValue);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(latestValue);
    const isSignificant = latestValue > 80;

    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[600]}` : 'none',
        padding: '24px',
      }}>
        <Typography variant="h5" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Fear and Greed Index
        </Typography>
        <FearAndGreed3D backgroundColor={backgroundColor} />
        <Typography
          variant="body2"
          color={textColor}
          sx={{ textAlign: 'center', mt: 1 }}
        >
          Current: {latestValue}
        </Typography>
        <Typography
          variant="body2"
          color={textColor}
          sx={{ textAlign: 'center', mt: 1 }}
        >
          Heat: {heatDescription}
        </Typography>
        {isSignificant && (
          <Typography
            variant="body2"
            color={colors.redAccent[200]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Extreme market greed.
          </Typography>
        )}
      </Box>
    );
  });

  // Market Heat Gauge Widget
  const MarketHeatGaugeWidget = memo(() => {
    const [heatScore, setHeatScore] = useState(null);

    useEffect(() => {
      if (mvrvData && mvrvData.length > 0 && btcData && btcData.length > 200 && fearAndGreedData && fearAndGreedData.length > 0) {
        // MVRV Heat
        const latestMvrv = mvrvData[mvrvData.length - 1].value;
        const { projectedPeak } = calculateMvrvPeakProjection(mvrvData);
        let mvrvHeat = 0;
        if (latestMvrv && projectedPeak) {
          const thresholds = [projectedPeak, 3.7];
          const distances = thresholds.map(t => ((latestMvrv - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          mvrvHeat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
        }

        // Mayer Multiple Heat
        const mayerMultiples = calculateMayerMultiple(btcData);
        const latestMayer = mayerMultiples[mayerMultiples.length - 1].value;
        let mayerHeat = 0;
        if (latestMayer) {
          const thresholds = [2.4, 0.6];
          const distances = thresholds.map(t => ((latestMayer - t) / t) * 100);
          const minDistance = Math.min(...distances.map(Math.abs));
          mayerHeat = Math.max(0, Math.min(100, 100 - (minDistance / 20) * 100));
        }

        // Bitcoin Risk Heat
        let riskHeat = 0;
        const fetchRisk = async () => {
          try {
            const riskData = await getBitcoinRisk();
            riskHeat = riskData && riskData.riskLevel !== undefined ? riskData.riskLevel * 100 : 0;
          } catch {
            riskHeat = 0;
          }
          // Fear and Greed Heat
          const fearGreedValue = fearAndGreedData[fearAndGreedData.length - 1].value;

          // Average heat score
          const scores = [mvrvHeat, mayerHeat, riskHeat, fearGreedValue].filter(v => v !== null);
          const avgHeat = scores.length > 0 ? scores.reduce((sum, val) => sum + val, 0) / scores.length : 0;
          setHeatScore(avgHeat);
        };
        fetchRisk();
      }
    }, [mvrvData, btcData, fearAndGreedData]);

    const backgroundColor = getBackgroundColor(heatScore || 0);
    const textColor = getTextColor(backgroundColor);
    const heatDescription = getHeatDescription(heatScore || 0);
    const isSignificant = heatScore !== null && heatScore >= 80;

    return (
      <Box sx={{
        ...chartBoxStyle(colors, theme),
        backgroundColor: backgroundColor,
        transition: 'background-color 0.3s ease, transform 0.2s ease-in-out',
        border: isSignificant ? `2px solid ${colors.redAccent[600]}` : 'none',
        padding: '24px',
      }}>
        <Typography variant="h5" color={textColor} gutterBottom sx={{ fontWeight: 'bold' }}>
          Market Heat Gauge
        </Typography>
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={heatScore || 0}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.grey[theme.palette.mode === 'dark' ? 700 : 300],
              '& .MuiLinearProgress-bar': {
                backgroundColor: backgroundColor,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body2" color={textColor}>0 (Cold)</Typography>
            <Typography variant="body2" color={textColor}>
              {heatScore !== null ? heatScore.toFixed(0) : 'N/A'}
            </Typography>
            <Typography variant="body2" color={textColor}>100 (Hot)</Typography>
          </Box>
          <Typography
            variant="body2"
            color={textColor}
            sx={{ textAlign: 'center', mt: 1 }}
          >
            Heat: {heatDescription}
          </Typography>
        </Box>
        {isSignificant && (
          <Typography
            variant="body2"
            color={colors.redAccent[200]}
            sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}
          >
            Warning: Market is significantly overheated.
          </Typography>
        )}
      </Box>
    );
  });

  // Chart components
  const BitcoinPriceChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h6" color={colors.grey[100]} gutterBottom>
        Bitcoin Price
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={btcData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
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
      <Typography variant="h6" color={colors.grey[100]} gutterBottom>
        Ethereum Price
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={ethData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grey[500]} />
          <XAxis dataKey="time" stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
          <YAxis stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
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
      <Typography variant="h6" color={colors.grey[100]} gutterBottom>
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
      <Typography variant="h6" color={colors.grey[100]} gutterBottom>
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
          <YAxis stroke={colors.grey[100]} tick={{ fontSize: 12 }} />
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
    boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `0 6px 16px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
    },
  });

  return (
    <Box
      sx={{
        padding: isMobile ? '16px' : '32px',
        backgroundColor: colors.primary[500],
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <Typography
        variant="h4"
        color={colors.grey[100]}
        gutterBottom
        sx={{ fontWeight: 'bold', marginBottom: '24px' }}
      >
        Market Overview
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
        {/* Price Section */}
        <Typography
          variant="h5"
          color={colors.grey[100]}
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          Price
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={priceLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setPriceLayout(allLayouts)}
          isDraggable
          isResizable
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="bitcoin">
            <BitcoinPriceChart />
          </div>
          <div key="ethereum">
            <EthereumPriceChart />
          </div>
        </ResponsiveGridLayout>

        {/* Indicators Section */}
        <Typography
          variant="h5"
          color={colors.grey[100]}
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          Indicators
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={indicatorsLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setIndicatorsLayout(allLayouts)}
          isDraggable
          isResizable
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="inflation">
            <InflationChart />
          </div>
          <div key="marketCap">
            <MarketCapChart />
          </div>
        </ResponsiveGridLayout>

        {/* Sentiment Section */}
        <Typography
          variant="h5"
          color={colors.grey[100]}
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          Sentiment
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={sentimentLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setSentimentLayout(allLayouts)}
          isDraggable
          isResizable
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="fearAndGreed">
            <FearAndGreedGauge />
          </div>
        </ResponsiveGridLayout>

        {/* On Chain Section */}
        <Typography
          variant="h5"
          color={colors.grey[100]}
          sx={{ fontWeight: 'bold', margin: '24px 0 16px' }}
        >
          On Chain
        </Typography>
        <ResponsiveGridLayout
          className="layout"
          layouts={onChainLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setOnChainLayout(allLayouts)}
          isDraggable
          isResizable
          compactType="vertical"
          margin={margin}
          containerPadding={[0, 0]}
          style={{ width: '100%' }}
        >
          <div key="bitcoinRisk">
            <BitcoinRiskWidget />
          </div>
          <div key="mvrvRatio">
            <MvrvRatioWidget />
          </div>
          <div key="mayerMultiple">
            <MayerMultipleWidget />
          </div>
          <div key="marketHeat">
            <MarketHeatGaugeWidget />
          </div>
        </ResponsiveGridLayout>
      </Box>
    </Box>
  );
};

// Export MarketOverview wrapped with React.memo
export default memo(MarketOverview);