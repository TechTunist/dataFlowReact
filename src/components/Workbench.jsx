import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// Color mapping for named colors to RGB (kept for fallback compatibility)
const colorMap = {
  orange: '255, 165, 0',
  blue: '0, 0, 255',
  purple: '128, 0, 128',
  green: '50, 128, 50',
  red: '255, 0, 0',
  cyan: '0, 255, 255',
  magenta: '255, 0, 255',
  gray: '128, 128, 128',
  yellow: '255, 255, 0',
  teal: '0, 128, 128',
  pink: '255, 141, 161',
  white: '255, 255, 255',
  rec: '200, 200, 200',
  gold: '255, 215, 0',
};

// Convert hex to RGB for rgba properties
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : hex;
};

// Available FRED series for selection
const availableFredSeries = {
  UMCSENT: { label: 'Consumer Sentiment (UMCSI)', color: '#FFA500', chartType: 'area', scaleId: 'umcsent-scale', allowLogScale: true },
  SP500: { label: 'S&P 500 Index', color: '#0000FF', chartType: 'area', scaleId: 'sp500-scale', allowLogScale: true },
  DFF: { label: 'Federal Funds Rate', color: '#800080', chartType: 'line', scaleId: 'dff-scale', allowLogScale: true },
  CPIAUCSL: { label: 'Consumer Price Index (CPI)', color: '#328032', chartType: 'area', scaleId: 'cpi-scale', allowLogScale: true },
  UNRATE: { label: 'Unemployment Rate', color: '#FF0000', chartType: 'area', scaleId: 'unrate-scale', allowLogScale: true },
  DGS10: { label: '10-Year Treasury Yield', color: '#00FFFF', chartType: 'line', scaleId: 'dgs10-scale', allowLogScale: true },
  T10Y2Y: { label: '10Y-2Y Treasury Spread', color: '#FF00FF', chartType: 'line', scaleId: 't10y2y-scale', allowLogScale: true },
  USRECD: { label: 'U.S. Recession Indicator', color: 'rgba(28, 28, 28, 0.1)', chartType: 'histogram', scaleId: 'usrecd-scale', allowLogScale: true },
  M2SL: { label: 'M2 Money Supply', color: '#FFFF00', chartType: 'area', scaleId: 'm2sl-scale', allowLogScale: true },
  GDPC1: { label: 'U.S. GDP', color: '#FFFFFF', chartType: 'area', scaleId: 'gdpc1-scale', allowLogScale: true },
  PAYEMS: { label: 'Nonfarm Payrolls', color: '#808080', chartType: 'area', scaleId: 'payems-scale', allowLogScale: true },
  HOUST: { label: 'Housing Starts', color: '#FF8DA1', chartType: 'area', scaleId: 'houst-scale', allowLogScale: true },
  VIXCLS: { label: 'VIX Volatility Index', color: '#008080', chartType: 'line', scaleId: 'vixcls-scale', allowLogScale: true },
};

// Available Crypto series for selection
const availableCryptoSeries = {
  BTC: { label: 'Bitcoin (BTC)', color: '#FFD700', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'btcData', fetchFunction: 'fetchBtcData', allowLogScale: true },
  ETH: { label: 'Ethereum (ETH)', color: '#4169E1', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'ethData', fetchFunction: 'fetchEthData', allowLogScale: true },
  SOL: { label: 'Solana (SOL)', color: '#FF8C00', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'SOL', allowLogScale: true },
  ADA: { label: 'Cardano (ADA)', color: '#DC143C', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ADA', allowLogScale: true },
  DOGE: { label: 'Dogecoin (DOGE)', color: '#00FFFF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'DOGE', allowLogScale: true },
  LINK: { label: 'Chainlink (LINK)', color: '#FF69B4', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LINK', allowLogScale: true },
  XRP: { label: 'Ripple (XRP)', color: '#1E90FF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XRP', allowLogScale: true },
  AVAX: { label: 'Avalanche (AVAX)', color: '#00BFFF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'AVAX', allowLogScale: true },
  TON: { label: 'Toncoin (TON)', color: '#8A2BE2', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'TON', allowLogScale: true },
  BNB: { label: 'Binance Coin (BNB)', color: '#FFA500', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'BNB', allowLogScale: true },
  AAVE: { label: 'Aave (AAVE)', color: '#9400D3', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'AAVE', allowLogScale: true },
  CRO: { label: 'Crypto.com Coin (CRO)', color: '#228B22', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'CRO', allowLogScale: true },
  SUI: { label: 'Sui (SUI)', color: '#B22222', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'SUI', allowLogScale: true },
  HBAR: { label: 'Hedera (HBAR)', color: '#4682B4', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'HBAR', allowLogScale: true },
  XLM: { label: 'Stellar (XLM)', color: '#0080FF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XLM', allowLogScale: true },
  APT: { label: 'Aptos (APT)', color: '#BA55D3', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'APT', allowLogScale: true },
  DOT: { label: 'Polkadot (DOT)', color: '#32CD32', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'DOT', allowLogScale: true },
  VET: { label: 'VeChain (VET)', color: '#FF7F50', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'VET', allowLogScale: true },
  UNI: { label: 'Uniswap (UNI)', color: '#8B4513', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'UNI', allowLogScale: true },
  LTC: { label: 'Litecoin (LTC)', color: '#A9A9A9', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LTC', allowLogScale: true },
  LEO: { label: 'UNUS SED LEO (LEO)', color: '#CD5C5C', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LEO', allowLogScale: true },
  HYPE: { label: 'Hype (HYPE)', color: '#9932CC', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'HYPE', allowLogScale: true },
  NEAR: { label: 'NEAR Protocol (NEAR)', color: '#00CED1', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'NEAR', allowLogScale: true },
  FET: { label: 'Fetch.ai (FET)', color: '#6B8E23', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'FET', allowLogScale: true },
  ONDO: { label: 'Ondo Finance (ONDO)', color: '#FF6347', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ONDO', allowLogScale: true },
  ICP: { label: 'Internet Computer (ICP)', color: '#C71585', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ICP', allowLogScale: true },
  XMR: { label: 'Monero (XMR)', color: '#A52A2A', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XMR', allowLogScale: true },
  MATIC: { label: 'Polygon (MATIC)', color: '#9370DB', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'POL', allowLogScale: true },
  ALGO: { label: 'Algorand (ALGO)', color: '#008B8B', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ALGO', allowLogScale: true },
  RENDER: { label: 'Render Token (RNDR)', color: '#3CB371', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'RENDER', allowLogScale: true },
  ARB: { label: 'Arbitrum (ARB)', color: '#FF4500', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ARB', allowLogScale: true },
  RAY: { label: 'Raydium (RAY)', color: '#DA70D6', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'RAY', allowLogScale: true },
  MOVE: { label: 'Move (MOVE)', color: '#8B0000', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'MOVE', allowLogScale: true },
};

const WorkbenchChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => value.toLocaleString(),
  explanation = '',
  scaleMode = 'linear',
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRefs = useRef({});
  const prevSeriesRef = useRef({ fred: [], crypto: [] }); // Track previous series for changes
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData, btcData, fetchBtcData, ethData, fetchEthData, altcoinData, fetchAltcoinData } = useContext(DataContext);

  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFredSeries, setActiveFredSeries] = useState([]);
  const [activeCryptoSeries, setActiveCryptoSeries] = useState([]);
  const [editClicked, setEditClicked] = useState({});
  const [openDialog, setOpenDialog] = useState({ open: false, seriesId: null });
  const [seriesMovingAverages, setSeriesMovingAverages] = useState({});
  const [seriesColors, setSeriesColors] = useState({});
  const [dialogMovingAverage, setDialogMovingAverage] = useState('');
  const [dialogColor, setDialogColor] = useState('');
  const [zoomRange, setZoomRange] = useState(null); // Store zoom state
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null); // Clear saved zoom on reset
    }
  }, []);

  // Clear all series
  const clearAllSeries = useCallback(() => {
    setActiveFredSeries([]);
    setActiveCryptoSeries([]);
    setZoomRange(null); // Reset zoom when clearing series
  }, []);

  // Calculate moving average
  const calculateMovingAverage = (data, period) => {
    if (!data || data.length < period) return [];

    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const window = data.slice(i - period + 1, i + 1);
      const avg = window.reduce((sum, item) => sum + (item.value || 0), 0) / period;
      result.push({
        time: data[i].time,
        value: avg,
      });
    }
    return result;
  };

  // Get data with moving average applied (if any)
  const getSeriesData = useMemo(() => {
    return (seriesId, rawData) => {
      if (!rawData) return [];
      const movingAverage = seriesMovingAverages[seriesId];
      if (!movingAverage || movingAverage === 'None') return rawData;
  
      const periodMap = {
        '7 day': 7,
        '28 day': 28,
        '3 month': 90,
      };
      const period = periodMap[movingAverage];
      if (!period) return rawData;
  
      return calculateMovingAverage(rawData, period);
    };
  }, [seriesMovingAverages]);

  // Get the latest value for a series at or before a given time
  const getLatestValue = (data, time) => {
    if (!data || data.length === 0) return null;
    const targetTime = new Date(time).getTime();
    // Binary search for efficiency
    let left = 0, right = data.length - 1;
    let latestPoint = null;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const pointTime = new Date(data[mid].time).getTime();
      if (pointTime <= targetTime) {
        latestPoint = data[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return latestPoint ? latestPoint.value : null;
  };

  // Get series color (custom or default)
  const getSeriesColor = (id) => {
    if (seriesColors[id]) return seriesColors[id];
    return (availableFredSeries[id] || availableCryptoSeries[id])?.color || '#00FFFF';
  };

  // Handle edit button click
  const handleEditClick = (event, seriesId) => {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    } else {
      console.warn('Invalid event object:', event);
    }

    setEditClicked(prev => ({ ...prev, [seriesId]: true }));
    setDialogMovingAverage(seriesMovingAverages[seriesId] || 'None');
    setDialogColor(seriesColors[seriesId] || availableFredSeries[seriesId]?.color || '#00FFFF');
    setOpenDialog({ open: true, seriesId });
    setTimeout(() => {
      setEditClicked(prev => ({ ...prev, [seriesId]: false }));
    }, 300);
  };

  // Handle dialog moving average change
  const handleMovingAverageChange = (event) => {
    setDialogMovingAverage(event.target.value);
  };

  // Handle dialog color change
  const handleColorChange = (event) => {
    setDialogColor(event.target.value); // Stores hex color (e.g., "#FF0000")
  };

  // Save moving average and color, then close dialog
  const handleSaveDialog = () => {
    if (openDialog.seriesId) {
      setSeriesMovingAverages(prev => ({
        ...prev,
        [openDialog.seriesId]: dialogMovingAverage,
      }));
      setSeriesColors(prev => ({
        ...prev,
        [openDialog.seriesId]: dialogColor,
      }));
    }
    setOpenDialog({ open: false, seriesId: null });
    setDialogMovingAverage('');
    setDialogColor('');
  };

  // Close dialog without saving
  const handleCloseDialog = () => {
    setOpenDialog({ open: false, seriesId: null });
    setDialogMovingAverage('');
    setDialogColor('');
  };

  // Handle FRED series selection change
  const handleFredSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveFredSeries(selected);
    selected.forEach(id => {
      if (!fredSeriesData[id]) {
        setIsLoading(true);
        setError(null);
        fetchFredSeriesData(id)
          .catch(err => {
            setError(`Failed to fetch data for ${id}. Please try again later.`);
            console.error(`Error fetching ${id}:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };

  // Handle Crypto series selection change
  const handleCryptoSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveCryptoSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableCryptoSeries[id];
      const fetchFunction = seriesInfo.fetchFunction;
      if (fetchFunction === 'fetchBtcData' && btcData.length === 0) {
        setIsLoading(true);
        setError(null);
        fetchBtcData()
          .catch(err => {
            setError(`Failed to fetch Bitcoin data. Please try again later.`);
            console.error(`Error fetching Bitcoin data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (fetchFunction === 'fetchEthData' && ethData.length === 0) {
        setIsLoading(true);
        setError(null);
        fetchEthData()
          .catch(err => {
            setError(`Failed to fetch Ethereum data. Please try again later.`);
            console.error(`Error fetching Ethereum data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (fetchFunction === 'fetchAltcoinData' && (!altcoinData[seriesInfo.coin] || altcoinData[seriesInfo.coin].length === 0)) {
        setIsLoading(true);
        setError(null);
        fetchAltcoinData(seriesInfo.coin)
          .catch(err => {
            setError(`Failed to fetch ${seriesInfo.coin} data. Please try again later.`);
            console.error(`Error fetching ${seriesInfo.coin} data:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };

  // Initialize chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart container is not available');
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: {
        minBarSpacing: 0.001,
        timeVisible: true,
        secondsVisible: false,
        smoothScroll: true, // Improve panning smoothness
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        visible: false,
      },
    });
    chartRef.current = chart;

    const resizeChart = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors]);

  // Update chart styling when theme changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
  }, [colors]);

  useEffect(() => {
    if (!chartRef.current) return;
  
    // Check if series changed
    const isNewSeries =
      JSON.stringify(activeFredSeries.sort()) !== JSON.stringify(prevSeriesRef.current.fred.sort()) ||
      JSON.stringify(activeCryptoSeries.sort()) !== JSON.stringify(prevSeriesRef.current.crypto.sort());
    prevSeriesRef.current = { fred: activeFredSeries, crypto: activeCryptoSeries };
  
    // Clear existing series
    Object.keys(seriesRefs.current).forEach(id => {
      if (chartRef.current && seriesRefs.current[id]) {
        try {
          chartRef.current.removeSeries(seriesRefs.current[id]);
        } catch (err) {
          console.error(`Error removing series ${id}:`, err);
        }
      }
      delete seriesRefs.current[id];
    });
  
    // Combine FRED and Crypto series, ensuring USRECD is at the back
    const allSeries = [
      ...activeFredSeries.map(id => ({ id, type: 'fred' })),
      ...activeCryptoSeries.map(id => ({ id, type: 'crypto' })),
    ];
    const sortedSeries = allSeries.sort((a, b) => {
      if (a.id === 'USRECD') return 1;
      if (b.id === 'USRECD') return -1;
      return 0;
    });
  
    // Track used price scales
    const usedPriceScales = new Set();
  
    // Add series to the chart
    sortedSeries.forEach(({ id, type }) => {
      const seriesInfo = type === 'fred' ? availableFredSeries[id] : availableCryptoSeries[id];
      const seriesColor = getSeriesColor(id);
      const rgbColor = seriesColor.startsWith('rgba') ? seriesColor : hexToRgb(seriesColor);
      let series;
      if (seriesInfo.chartType === 'area') {
        series = chartRef.current.addAreaSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          topColor: `rgba(${rgbColor}, 0.56)`,
          bottomColor: `rgba(${rgbColor}, 0.04)`,
          lineColor: seriesColor,
        });
      } else if (seriesInfo.chartType === 'line') {
        series = chartRef.current.addLineSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesColor,
        });
      } else if (seriesInfo.chartType === 'histogram') {
        series = chartRef.current.addHistogramSeries({
          priceScaleId: seriesInfo.scaleId,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesColor,
        });
      }
      seriesRefs.current[id] = series;
      usedPriceScales.add(seriesInfo.scaleId);
  
      // Set data based on type
      let data = [];
      if (type === 'fred' && fredSeriesData[id]?.length > 0) {
        const rawData = fredSeriesData[id]
          .filter(item => item.value != null && !isNaN(item.value))
          .sort((a, b) => new Date(a.time) - new Date(b.time));
        data = getSeriesData(id, rawData);
      } else if (type === 'crypto') {
        if (seriesInfo.dataKey === 'btcData' && btcData.length > 0) {
          data = btcData;
        } else if (seriesInfo.dataKey === 'ethData' && ethData.length > 0) {
          data = ethData;
        } else if (seriesInfo.dataKey === 'altcoinData' && altcoinData[seriesInfo.coin]?.length > 0) {
          data = altcoinData[seriesInfo.coin];
        }
      }
      if (data.length > 0) {
        try {
          // Filter out invalid data for logarithmic scale, except for USRECD
          const validData = scaleModeState === 1 && id !== 'USRECD'
            ? data.filter(item => item.value > 0) // Log scale requires positive values
            : data;
          if (validData.length === 0 && id !== 'USRECD') {
            console.warn(`No valid data for series ${id} in logarithmic scale`);
            setError(`Cannot display ${seriesInfo.label} in logarithmic scale due to non-positive values.`);
          } else {
            series.setData(validData);
          }
        } catch (err) {
          console.error(`Error setting data for series ${id}:`, err);
          setError(`Failed to display ${seriesInfo.label}. The data may be incompatible.`);
        }
      }
    });
  
    // Define price scales, keeping USRECD scale in linear mode
    const priceScales = Object.keys(availableFredSeries).reduce((acc, id) => {
      const seriesInfo = availableFredSeries[id];
      return {
        ...acc,
        [seriesInfo.scaleId]: {
          mode: id === 'USRECD' ? 0 : scaleModeState, // USRECD always linear (0)
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
          visible: usedPriceScales.has(seriesInfo.scaleId),
        },
      };
    }, {});
    priceScales['crypto-shared-scale'] = {
      mode: scaleModeState,
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: 0.05 },
      position: 'right',
      width: 50,
      visible: usedPriceScales.has('crypto-shared-scale'),
    };
  
    try {
      chartRef.current.applyOptions({
        additionalPriceScales: priceScales,
      });
    } catch (err) {
      console.error('Error applying price scales:', err);
      setError('Failed to apply chart scales.');
    }
  
    // Apply scale mode to all used scales
    usedPriceScales.forEach(scaleId => {
      try {
        const mode = scaleId === 'usrecd-scale' ? 0 : scaleModeState; // USRECD scale always linear
        chartRef.current.priceScale(scaleId).applyOptions({ mode });
      } catch (err) {
        console.error(`Failed to apply scale mode for ${scaleId}:`, err);
        setError(`Cannot apply ${scaleModeState === 1 ? 'logarithmic' : 'linear'} scale to ${scaleId}.`);
      }
    });
  
    // Fit content only for new series or initial load
    if (isNewSeries || zoomRange === null) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  
    // Tooltip subscription with debounced updates
    let tooltipTimeout = null;
// In the useEffect for series and scales, update the tooltip subscription:
chartRef.current.subscribeCrosshairMove(param => {
  if (
    !param.point ||
    !param.time ||
    param.point.x < 0 ||
    param.point.x > chartContainerRef.current.clientWidth ||
    param.point.y < 0 ||
    param.point.y > chartContainerRef.current.clientHeight
  ) {
    clearTimeout(tooltipTimeout);
    setTooltipData(null);
    return;
  }

  const tooltip = {
    date: param.time,
    values: {},
    x: param.point.x,
    y: param.point.y,
  };

  sortedSeries.forEach(({ id, type }) => {
    const series = seriesRefs.current[id];
    if (!series) return;
    let data;
    if (type === 'fred') {
      data = getSeriesData(id, fredSeriesData[id]);
    } else if (type === 'crypto') {
      const seriesInfo = availableCryptoSeries[id];
      if (seriesInfo.dataKey === 'btcData') data = btcData;
      else if (seriesInfo.dataKey === 'ethData') data = ethData;
      else if (seriesInfo.dataKey === 'altcoinData') data = altcoinData[seriesInfo.coin];
    }
    const value = param.seriesData.get(series)?.value ?? getLatestValue(data, param.time);
    tooltip.values[id] = value;
  });

  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    setTooltipData(tooltip);
  }, 50); // Increase debounce to 50ms
});
  
    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove();
      }
    };
  }, [fredSeriesData, btcData, ethData, altcoinData, activeFredSeries, activeCryptoSeries, seriesMovingAverages, seriesColors, chartType, valueFormatter, scaleModeState]);
  
  // Restore zoom
  useEffect(() => {
    if (!chartRef.current || !zoomRange) return;
    chartRef.current.timeScale().setVisibleLogicalRange(zoomRange);
  }, [zoomRange]);

  // Save zoom state on change
  useEffect(() => {
    if (!chartRef.current) return;
    let zoomTimeout = null;
    const handler = () => {
      const range = chartRef.current.timeScale().getVisibleLogicalRange();
      if (range) {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          setZoomRange(prev => {
            if (prev && prev.from === range.from && prev.to === range.to) {
              return prev;
            }
            return range;
          });
        }, 100); // Debounce zoom updates
      }
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      clearTimeout(zoomTimeout);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      }
    };
  }, []);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true }, // Enable smooth kinetic scrolling
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
            marginTop: '50px',
          }}
        >
          {/* FRED Series Dropdown */}
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="fred-series-label"
              shrink
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Macro Data
            </InputLabel>
            <Select
              multiple
              value={activeFredSeries}
              onChange={handleFredSeriesChange}
              labelId="fred-series-label"
              label="Macro Data"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((id) => availableFredSeries[id]?.label || id).join(', ')
                  : 'Select FRED Series'
              }
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600] },
              }}
            >
              {Object.entries(availableFredSeries).map(([id, { label }]) => (
                <MenuItem key={id} value={id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={activeFredSeries.includes(id)}
                      sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <span>{label}</span>
                  </Box>
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(e, id);
                    }}
                    sx={{ display: 'inline-block' }}
                  >
                    <Button
                      disabled={!activeFredSeries.includes(id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: activeFredSeries.includes(id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        border: `1px solid ${activeFredSeries.includes(id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        minWidth: '50px',
                        backgroundColor: editClicked[id] ? '#4cceac' : 'transparent',
                        ...(editClicked[id] && { color: 'black', borderColor: 'violet' }),
                        '&:hover': {
                          borderColor: activeFredSeries.includes(id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                          backgroundColor: activeFredSeries.includes(id) && !editClicked[id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                        },
                        '&.Mui-disabled': {
                          pointerEvents: 'none',
                          opacity: 0.6,
                        },
                      }}
                    >
                      Edit
                    </Button>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Crypto Series Dropdown */}
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="crypto-series-label"
              shrink
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Crypto Series
            </InputLabel>
            <Select
              multiple
              value={activeCryptoSeries}
              onChange={handleCryptoSeriesChange}
              labelId="crypto-series-label"
              label="Crypto Series"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((id) => availableCryptoSeries[id]?.label || id).join(', ')
                  : 'Select Crypto Series'
              }
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600] },
              }}
            >
              {Object.entries(availableCryptoSeries).map(([id, { label }]) => (
                <MenuItem key={id} value={id}>
                  <Checkbox
                    checked={activeCryptoSeries.includes(id)}
                    sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Dialog for Moving Average and Color Settings */}
      <Dialog
        open={openDialog.open}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], fontSize: '18px' }}>
          {openDialog.seriesId ? availableFredSeries[openDialog.seriesId]?.label : ''}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel
              id="moving-average-label"
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              Moving Averages
            </InputLabel>
            <Select
              labelId="moving-average-label"
              label="Moving Averages"
              value={dialogMovingAverage}
              onChange={handleMovingAverageChange}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="None">None</MenuItem>
              <MenuItem value="7 day">7 day</MenuItem>
              <MenuItem value="28 day">28 day</MenuItem>
              <MenuItem value="3 month">3 month</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel
              id="color-label"
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                '&.Mui-focused': { color: colors.greenAccent[500] },
              }}
            >
              Color
            </InputLabel>
            <input
              type="color"
              value={dialogColor}
              onChange={handleColorChange}
              style={{
                width: '100%',
                height: '40px',
                marginTop: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            sx={{
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': {
                borderColor: colors.greenAccent[500],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              },
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleSaveDialog}
            sx={{
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': {
                borderColor: colors.greenAccent[500],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {!isDashboard && (
        <div className='chart-top-div'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: theme.palette.mode === 'dark' ? colors.primary[100] : colors.grey[900] }}>
              {scaleModeState === 1 ? 'Logarithmic' : 'Linear'}
            </span>
            {isLoading && (
              <span style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}>
                Loading...
              </span>
            )}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : (theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900]),
                borderColor: isInteractive ? 'violet' : (theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700]),
              }}
            >
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button
              onClick={resetChartView}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Reset Chart
            </button>
            <button
              onClick={clearAllSeries}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}` }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {activeFredSeries.length === 0 && activeCryptoSeries.length === 0 && !isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              fontSize: '16px',
              zIndex: 2,
            }}
          >
            Select a series to display
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
            padding: '5px 10px',
            borderRadius: '4px',
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Series</div>}
          {[...activeFredSeries, ...activeCryptoSeries].map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: getSeriesColor(id),
                  marginRight: '5px',
                }}
              />
              {(availableFredSeries[id] || availableCryptoSeries[id])?.label || id}
            </div>
          ))}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && [...activeFredSeries, ...activeCryptoSeries].some(id => {
          if (activeFredSeries.includes(id)) {
            const data = getSeriesData(id, fredSeriesData[id]);
            return data?.length > 0;
          }
          const seriesInfo = availableCryptoSeries[id];
          if (seriesInfo.dataKey === 'btcData') return btcData.length > 0;
          if (seriesInfo.dataKey === 'ethData') return ethData.length > 0;
          if (seriesInfo.dataKey === 'altcoinData') return altcoinData[seriesInfo.coin]?.length > 0;
          return false;
        }) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...[...activeFredSeries, ...activeCryptoSeries].map(id => {
                    if (activeFredSeries.includes(id)) {
                      const data = getSeriesData(id, fredSeriesData[id]);
                      if (data?.length > 0) {
                        return new Date(data[data.length - 1].time).getTime();
                      }
                    } else if (activeCryptoSeries.includes(id)) {
                      const seriesInfo = availableCryptoSeries[id];
                      if (seriesInfo.dataKey === 'btcData' && btcData.length > 0) {
                        return new Date(btcData[btcData.length - 1].time).getTime();
                      } else if (seriesInfo.dataKey === 'ethData' && ethData.length > 0) {
                        return new Date(ethData[ethData.length - 1].time).getTime();
                      } else if (seriesInfo.dataKey === 'altcoinData' && altcoinData[seriesInfo.coin]?.length > 0) {
                        return new Date(altcoinData[seriesInfo.coin][altcoinData[seriesInfo.coin].length - 1].time).getTime();
                      }
                    }
                    return 0;
                  })
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (activeFredSeries.length > 0 || activeCryptoSeries.length > 0) && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 10000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              return rightPosition + tooltipWidth <= chartWidth ? `${rightPosition}px` : (leftPosition >= 0 ? `${leftPosition}px` : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`);
            })(),
            top: `${tooltipData.y + 100}px`,
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            padding: '5px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          {[...activeFredSeries, ...activeCryptoSeries].map(id => (
            <div key={id}>
              <div style={{ fontSize: '15px' }}>
                <span style={{ color: getSeriesColor(id) }}>
                  {(availableFredSeries[id] || availableCryptoSeries[id])?.label || id}
                  {activeFredSeries.includes(id) && seriesMovingAverages[id] && seriesMovingAverages[id] !== 'None' ? ` (${seriesMovingAverages[id]} MA): ` : ': '}
                  {tooltipData.values[id] != null ? valueFormatter(tooltipData.values[id]) : ' : N/A'}
                </span>
              </div>
            </div>
          ))}
          <div>{tooltipData.date.toString().substring(0, 4) === currentYear ? `${tooltipData.date} - latest` : tooltipData.date}</div>
        </div>
      )}
      {!isDashboard && explanation && (
        <p className='chart-info' style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}>
          {explanation}
        </p>
      )}
    </div>
  );
};

export default WorkbenchChart;