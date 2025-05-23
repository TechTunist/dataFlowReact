// src/scenes/MarketOverview.js
import React, { useState, useEffect, useContext, memo } from 'react';
import FearAndGreed3D from '../components/FearAndGreed3D';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import { DataContext } from '../DataContext';
import useIsMobile from '../hooks/useIsMobile';

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
  } = useContext(DataContext);

  // Define breakpoints and columns for different screen sizes
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
  const cols = { lg: 12, md: 8, sm: 6, xs: 4 };

  // Responsive layouts for different breakpoints (added BitcoinRiskWidget)
  const layouts = {
    lg: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'fearAndGreed', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'bitcoinRisk', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 }, // New widget
      { i: 'inflation', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    md: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'fearAndGreed', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'bitcoinRisk', x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 }, // New widget
      { i: 'inflation', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
    ],
    sm: [
      { i: 'bitcoin', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'fearAndGreed', x: 0, y: 4, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'bitcoinRisk', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 2 }, // New widget
      { i: 'inflation', x: 0, y: 8, w: 6, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 0, y: 10, w: 6, h: 2, minW: 2, minH: 2 },
    ],
    xs: [
      { i: 'bitcoin', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'ethereum', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'fearAndGreed', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'bitcoinRisk', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 }, // New widget
      { i: 'inflation', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
      { i: 'marketCap', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
    ],
  };

  // State for grid layout
  const [currentLayout, setCurrentLayout] = useState(layouts);

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
  }, [fetchBtcData, fetchEthData, fetchFearAndGreedData, fetchInflationData, fetchMarketCapData]);

  // Responsive row height and margin
  const rowHeight = isMobile ? 100 : 120;
  const margin = isMobile ? [8, 8] : [16, 16];

  // Chart components (memoized to prevent rerenders)
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

  const FearAndGreedGauge = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <FearAndGreed3D />
    </Box>
  ));

  // New Bitcoin Risk Widget
  const BitcoinRiskWidget = memo(() => {
    // Get the latest risk level from btcData
    const latestBtcData = btcData.slice(-1)[0] || { riskLevel: 0 }; // Adjust field name as needed
    const riskLevel = latestBtcData.riskLevel || 0; // Replace 'riskLevel' with the actual field name

    // Determine the color based on the risk level
    const getRiskColor = (level) => {
      if (level <= 33) return colors.greenAccent[400]; // Low risk
      if (level <= 66) return colors.warning.main; // Medium risk
      return colors.redAccent[400]; // High risk
    };

    return (
      <Box sx={chartBoxStyle(colors, theme)}>
        <Typography variant="h6" color={colors.grey[100]} gutterBottom>
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
            variant="h3"
            color={getRiskColor(riskLevel)}
            sx={{ fontWeight: 'bold' }}
          >
            {riskLevel}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color={colors.grey[300]}
          sx={{ textAlign: 'center', mt: 1 }}
        >
          {riskLevel <= 33 ? 'Low Risk' : riskLevel <= 66 ? 'Medium Risk' : 'High Risk'}
        </Typography>
      </Box>
    );
  });

  const InflationChart = memo(() => (
    <Box sx={chartBoxStyle(colors, theme)}>
      <Typography variant="h6" color={colors.grey[100]} gutterBottom>
        US Inflation
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={inflationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInflation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.greenAccent[400]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.greenAccent[400]} stopOpacity={0} />
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
            stroke={colors.greenAccent[400]}
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
        <ResponsiveGridLayout
          className="layout"
          layouts={currentLayout}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          onLayoutChange={(layout, allLayouts) => setCurrentLayout(allLayouts)}
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
          <div key="fearAndGreed">
            <FearAndGreedGauge />
          </div>
          <div key="bitcoinRisk">
            <BitcoinRiskWidget />
          </div>
          <div key="inflation">
            <InflationChart />
          </div>
          <div key="marketCap">
            <MarketCapChart />
          </div>
        </ResponsiveGridLayout>
      </Box>
    </Box>
  );
};

// Export MarketOverview wrapped with React.memo
export default memo(MarketOverview);