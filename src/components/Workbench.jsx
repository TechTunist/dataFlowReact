
import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Snackbar, Alert } from '@mui/material';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
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
// Available Macro series (FRED + custom macro)
const availableMacroSeries = {
  UMCSENT: { label: 'Consumer Sentiment (UMCSI)', color: '#FFA500', chartType: 'area', scaleId: 'umcsent-scale', allowLogScale: true, isFred: true, seriesId: 'UMCSENT', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  SP500: { label: 'S&P 500 Index', color: '#0000FF', chartType: 'area', scaleId: 'sp500-scale', allowLogScale: true, isFred: true, seriesId: 'SP500', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DFF: { label: 'Federal Funds Rate', color: '#800080', chartType: 'line', scaleId: 'dff-scale', allowLogScale: true, isFred: true, seriesId: 'DFF', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  CPIAUCSL: { label: 'Consumer Price Index (CPI)', color: '#328032', chartType: 'area', scaleId: 'cpi-scale', allowLogScale: true, isFred: true, seriesId: 'CPIAUCSL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  UNRATE: { label: 'Unemployment Rate', color: '#FF0000', chartType: 'area', scaleId: 'unrate-scale', allowLogScale: true, isFred: true, seriesId: 'UNRATE', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DGS10: { label: '10-Year Treasury Yield', color: '#00FFFF', chartType: 'line', scaleId: 'dgs10-scale', allowLogScale: true, isFred: true, seriesId: 'DGS10', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  T10Y2Y: { label: '10Y-2Y Treasury Spread', color: '#FF00FF', chartType: 'line', scaleId: 't10y2y-scale', allowLogScale: false, isFred: true, seriesId: 'T10Y2Y', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  USRECD: { label: 'U.S. Recession Indicator', color: 'rgba(28, 28, 28, 0.1)', chartType: 'histogram', scaleId: 'usrecd-scale', allowLogScale: true, isFred: true, seriesId: 'USRECD', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  M2SL: { label: 'M2 Money Supply', color: '#FFFF00', chartType: 'area', scaleId: 'm2sl-scale', allowLogScale: true, isFred: true, seriesId: 'M2SL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  GDPC1: { label: 'U.S. GDP', color: '#FFFFFF', chartType: 'area', scaleId: 'gdpc1-scale', allowLogScale: true, isFred: true, seriesId: 'GDPC1', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  PAYEMS: { label: 'Nonfarm Payrolls', color: '#808080', chartType: 'area', scaleId: 'payems-scale', allowLogScale: true, isFred: true, seriesId: 'PAYEMS', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  HOUST: { label: 'Housing Starts', color: '#FF8DA1', chartType: 'area', scaleId: 'houst-scale', allowLogScale: true, isFred: true, seriesId: 'HOUST', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  VIXCLS: { label: 'VIX Volatility Index', color: '#008080', chartType: 'line', scaleId: 'vixcls-scale', allowLogScale: true, isFred: true, seriesId: 'VIXCLS', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  INFLATION: { label: 'US Inflation', color: '#FF4500', chartType: 'line', scaleId: 'inflation-scale', allowLogScale: false, isFred: false, dataKey: 'inflationData', fetchFunction: 'fetchInflationData', valueKey: 'value' },
  INTEREST: { label: 'US Interest Rates', color: '#00CED1', chartType: 'line', scaleId: 'interest-scale', allowLogScale: false, isFred: false, dataKey: 'interestData', fetchFunction: 'fetchInterestData', valueKey: 'value' },
  INITIAL_CLAIMS: { label: 'US Initial Claims', color: '#FF69B4', chartType: 'area', scaleId: 'initialclaims-scale', allowLogScale: true, isFred: false, dataKey: 'initialClaimsData', fetchFunction: 'fetchInitialClaimsData', valueKey: 'value' },
  UNEMPLOYMENT: { label: 'US Unemployment', color: '#9370DB', chartType: 'area', scaleId: 'unemployment-scale', allowLogScale: false, isFred: false, dataKey: 'unemploymentData', fetchFunction: 'fetchUnemploymentData', valueKey: 'value' },
  T5YIE: { label: '5-Year Inflation Expectation', color: '#00FA9A', chartType: 'line', scaleId: 't5yie-scale', allowLogScale: false, isFred: true, seriesId: 'T5YIE', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DEXUSEU: { label: 'Euro to US Dollar', color: '#FFDAB9', chartType: 'line', scaleId: 'dexuseu-scale', allowLogScale: true, isFred: true, seriesId: 'DEXUSEU', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DCOILWTICO: { label: 'WTI Crude Oil Price', color: '#556B2F', chartType: 'area', scaleId: 'dcoilwtico-scale', allowLogScale: true, isFred: true, seriesId: 'DCOILWTICO', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  PPIACO: { label: 'Producer Price Index', color: '#FF1493', chartType: 'area', scaleId: 'ppiaco-scale', allowLogScale: true, isFred: true, seriesId: 'PPIACO', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  A191RL1Q225SBEA: { label: 'US Real GDP Growth', color: '#20B2AA', chartType: 'area', scaleId: 'a191rl1q225sbea-scale', allowLogScale: false, isFred: true, seriesId: 'A191RL1Q225SBEA', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  M1SL: { label: 'M1 Money Supply', color: '#8B008B', chartType: 'area', scaleId: 'm1sl-scale', allowLogScale: true, isFred: true, seriesId: 'M1SL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  TEDRATE: { label: 'TED Spread', color: '#DAA520', chartType: 'line', scaleId: 'tedrate-scale', allowLogScale: true, isFred: true, seriesId: 'TEDRATE', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DEXJPUS: { label: 'Yen to US Dollar', color: '#2F4F4F', chartType: 'line', scaleId: 'dexjpus-scale', allowLogScale: true, isFred: true, seriesId: 'DEXJPUS', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DEXUSUK: { label: 'Pound to US Dollar', color: '#CD853F', chartType: 'line', scaleId: 'dexusuk-scale', allowLogScale: true, isFred: true, seriesId: 'DEXUSUK', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DEXCAUS: { label: 'CAD to US Dollar', color: '#8B4513', chartType: 'line', scaleId: 'dexcaus-scale', allowLogScale: true, isFred: true, seriesId: 'DEXCAUS', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  CFNAI: { label: 'Chicago Fed Index', color: '#4B0082', chartType: 'area', scaleId: 'cfnai-scale', allowLogScale: false, isFred: true, seriesId: 'CFNAI', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  USEPUINDXD: { label: 'Economic Policy Uncertainty', color: '#FF4500', chartType: 'area', scaleId: 'usepuindxd-scale', allowLogScale: true, isFred: true, seriesId: 'USEPUINDXD', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  CSUSHPINSA: { label: 'Case-Shiller Home Price Index', color: '#6A5ACD', chartType: 'area', scaleId: 'csushpinsa-scale', allowLogScale: true, isFred: true, seriesId: 'CSUSHPINSA', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  NIKKEI225: { label: 'Nikkei 225 Index', color: '#FF69B4', chartType: 'area', scaleId: 'nikkei225-scale', allowLogScale: true, isFred: true, seriesId: 'NIKKEI225', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  IRLTLT01DEM156N: { label: 'German 10-Year Bond Yield', color: '#BDB76B', chartType: 'line', scaleId: 'irltlt01dem156n-scale', allowLogScale: false, isFred: true, seriesId: 'IRLTLT01DEM156N', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
};
// Available Crypto series for selection
const availableCryptoSeries = {
  BTC: { label: 'Bitcoin (BTC)', color: '#FFD700', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'btcData', fetchFunction: 'fetchBtcData', allowLogScale: true, valueKey: 'value' },
  ETH: { label: 'Ethereum (ETH)', color: '#4169E1', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'ethData', fetchFunction: 'fetchEthData', allowLogScale: true, valueKey: 'value' },
  SOL: { label: 'Solana (SOL)', color: '#FF8C00', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'SOL', allowLogScale: true, valueKey: 'value' },
  ADA: { label: 'Cardano (ADA)', color: '#DC143C', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ADA', allowLogScale: true, valueKey: 'value' },
  DOGE: { label: 'Dogecoin (DOGE)', color: '#00FFFF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'DOGE', allowLogScale: true, valueKey: 'value' },
  LINK: { label: 'Chainlink (LINK)', color: '#FF69B4', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LINK', allowLogScale: true, valueKey: 'value' },
  XRP: { label: 'Ripple (XRP)', color: '#1E90FF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XRP', allowLogScale: true, valueKey: 'value' },
  AVAX: { label: 'Avalanche (AVAX)', color: '#00BFFF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'AVAX', allowLogScale: true, valueKey: 'value' },
  TON: { label: 'Toncoin (TON)', color: '#8A2BE2', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'TON', allowLogScale: true, valueKey: 'value' },
  BNB: { label: 'Binance Coin (BNB)', color: '#FFA500', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'BNB', allowLogScale: true, valueKey: 'value' },
  AAVE: { label: 'Aave (AAVE)', color: '#9400D3', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'AAVE', allowLogScale: true, valueKey: 'value' },
  CRO: { label: 'Crypto.com Coin (CRO)', color: '#228B22', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'CRO', allowLogScale: true, valueKey: 'value' },
  SUI: { label: 'Sui (SUI)', color: '#B22222', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'SUI', allowLogScale: true, valueKey: 'value' },
  HBAR: { label: 'Hedera (HBAR)', color: '#4682B4', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'HBAR', allowLogScale: true, valueKey: 'value' },
  XLM: { label: 'Stellar (XLM)', color: '#0080FF', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XLM', allowLogScale: true, valueKey: 'value' },
  APT: { label: 'Aptos (APT)', color: '#BA55D3', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'APT', allowLogScale: true, valueKey: 'value' },
  DOT: { label: 'Polkadot (DOT)', color: '#32CD32', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'DOT', allowLogScale: true, valueKey: 'value' },
  VET: { label: 'VeChain (VET)', color: '#FF7F50', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'VET', allowLogScale: true, valueKey: 'value' },
  UNI: { label: 'Uniswap (UNI)', color: '#8B4513', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'UNI', allowLogScale: true, valueKey: 'value' },
  LTC: { label: 'Litecoin (LTC)', color: '#A9A9A9', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LTC', allowLogScale: true, valueKey: 'value' },
  LEO: { label: 'UNUS SED LEO (LEO)', color: '#CD5C5C', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LEO', allowLogScale: true, valueKey: 'value' },
  HYPE: { label: 'Hype (HYPE)', color: '#9932CC', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'HYPE', allowLogScale: true, valueKey: 'value' },
  NEAR: { label: 'NEAR Protocol (NEAR)', color: '#00CED1', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'NEAR', allowLogScale: true, valueKey: 'value' },
  FET: { label: 'Fetch.ai (FET)', color: '#6B8E23', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'FET', allowLogScale: true, valueKey: 'value' },
  ONDO: { label: 'Ondo Finance (ONDO)', color: '#FF6347', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ONDO', allowLogScale: true, valueKey: 'value' },
  ICP: { label: 'Internet Computer (ICP)', color: '#C71585', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ICP', allowLogScale: true, valueKey: 'value' },
  XMR: { label: 'Monero (XMR)', color: '#A52A2A', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XMR', allowLogScale: true, valueKey: 'value' },
  MATIC: { label: 'Polygon (MATIC)', color: '#9370DB', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'POL', allowLogScale: true, valueKey: 'value' },
  ALGO: { label: 'Algorand (ALGO)', color: '#008B8B', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ALGO', allowLogScale: true, valueKey: 'value' },
  RENDER: { label: 'Render Token (RNDR)', color: '#3CB371', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'RENDER', allowLogScale: true, valueKey: 'value' },
  ARB: { label: 'Arbitrum (ARB)', color: '#FF4500', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'ARB', allowLogScale: true, valueKey: 'value' },
  RAY: { label: 'Raydium (RAY)', color: '#DA70D6', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'RAY', allowLogScale: true, valueKey: 'value' },
  MOVE: { label: 'Move (MOVE)', color: '#8B0000', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'MOVE', allowLogScale: true, valueKey: 'value' },
};
// Available Indicator series for selection
const availableIndicatorSeries = {
  DOMINANCE: { label: 'Bitcoin Dominance', color: '#FFD700', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'dominanceData', fetchFunction: 'fetchDominanceData', valueKey: 'value', allowLogScale: false },
  FEAR_GREED: { label: 'Fear and Greed Index', color: '#4169E1', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'fearAndGreedData', fetchFunction: 'fetchFearAndGreedData', valueKey: 'value', allowLogScale: false },
  TOTAL_MARKET_CAP: { label: 'Total Crypto Market Cap', color: '#FF8C00', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'marketCapData', fetchFunction: 'fetchMarketCapData', valueKey: 'value', allowLogScale: true },
  MARKET_CAP_DIFFERENCE: { label: 'Market Cap Difference', color: '#DC143C', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'differenceData', fetchFunction: 'fetchDifferenceData', valueKey: 'value', allowLogScale: false },
  BTC_TX_COUNT: { label: 'BTC Transaction Count', color: '#00FFFF', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'txCountData', fetchFunction: 'fetchTxCountData', valueKey: 'value', allowLogScale: true },
  TX_MVRV_TX_COUNT: { label: 'TX Count (TX MVRV)', color: '#FF69B4', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'txMvrvData', fetchFunction: 'fetchTxMvrvData', valueKey: 'tx_count', allowLogScale: true },
  TX_MVRV_MVRV: { label: 'MVRV (TX MVRV)', color: '#1E90FF', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'txMvrvData', fetchFunction: 'fetchTxMvrvData', valueKey: 'mvrv', allowLogScale: false },
  ALT_SEASON_INDEX: { label: 'Altcoin Season Index', color: '#00BFFF', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'altcoinSeasonTimeseriesData', fetchFunction: 'fetchAltcoinSeasonTimeseriesData', valueKey: 'index', allowLogScale: false },
  MVRV_RISK: { label: 'MVRV Z-Score Risk', color: '#8A2BE2', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'mvrvRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  PUELL_RISK: { label: 'Puell Multiple Risk', color: '#FFA500', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'puellRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  MINER_CAP_RISK: { label: 'Miner Cap Thermo Risk', color: '#9400D3', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'minerCapThermoCapRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  FEE_RISK: { label: 'Fee Risk', color: '#228B22', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'feeRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  SOPL_RISK: { label: 'SOPL Risk', color: '#B22222', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'soplRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
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
  const prevSeriesRef = useRef({ macro: [], crypto: [], indicator: [], derived: [] });
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const dataContext = useContext(DataContext);
  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMacroSeries, setActiveMacroSeries] = useState([]);
  const [activeCryptoSeries, setActiveCryptoSeries] = useState([]);
  const [activeIndicatorSeries, setActiveIndicatorSeries] = useState([]);
  const [activeDerivedSeries, setActiveDerivedSeries] = useState([]);
  const [derivedSeriesDefs, setDerivedSeriesDefs] = useState([]);
  const [derivedData, setDerivedData] = useState({});
  const [showDerivedDialog, setShowDerivedDialog] = useState(false);
  const [newDerivedSeries1, setNewDerivedSeries1] = useState('');
  const [newDerivedSeries2, setNewDerivedSeries2] = useState('');
  const [newDerivedOperation, setNewDerivedOperation] = useState('+');
  const [newDerivedLabel, setNewDerivedLabel] = useState('');
  const [newDerivedColor, setNewDerivedColor] = useState('#00FFFF');
  const [editClicked, setEditClicked] = useState({});
  const [openDialog, setOpenDialog] = useState({ open: false, seriesId: null, type: null });
  const [seriesMovingAverages, setSeriesMovingAverages] = useState({});
  const [seriesColors, setSeriesColors] = useState({});
  const [dialogMovingAverage, setDialogMovingAverage] = useState('');
  const [dialogColor, setDialogColor] = useState('');
  const [zoomRange, setZoomRange] = useState(null);
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
  }, []);
  const clearAllSeries = useCallback(() => {
    setActiveMacroSeries([]);
    setActiveCryptoSeries([]);
    setActiveIndicatorSeries([]);
    setActiveDerivedSeries([]);
    setDerivedSeriesDefs([]);
    setDerivedData({});
    setZoomRange(null);
  }, []);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
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
  const getLatestValue = (data, time) => {
    if (!data || data.length === 0) return null;
    const targetTime = new Date(time).getTime();
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
  const getSeriesColor = (id, type) => {
    if (seriesColors[id]) return seriesColors[id];
    if (type === 'macro') return availableMacroSeries[id]?.color || '#00FFFF';
    if (type === 'crypto') return availableCryptoSeries[id]?.color || '#00FFFF';
    if (type === 'indicator') return availableIndicatorSeries[id]?.color || '#00FFFF';
    if (type === 'derived') return derivedSeriesDefs.find(d => d.id === id)?.color || '#00FFFF';
    return '#00FFFF';
  };
  const getSeriesInfo = (id, type) => {
    if (type === 'macro') return availableMacroSeries[id];
    if (type === 'crypto') return availableCryptoSeries[id];
    if (type === 'indicator') return availableIndicatorSeries[id];
    if (type === 'derived') return derivedSeriesDefs.find(d => d.id === id);
  };
  const getType = (id) => {
    if (availableMacroSeries[id]) return 'macro';
    if (availableCryptoSeries[id]) return 'crypto';
    if (availableIndicatorSeries[id]) return 'indicator';
    return null;
  };
  const getValueKey = (id) => {
    return (availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.valueKey || 'value';
  };
  const getRawData = (id, type) => {
    if (type === 'macro') {
      const info = availableMacroSeries[id];
      if (info.isFred) return dataContext.fredSeriesData[info.seriesId] || [];
      return dataContext[info.dataKey] || [];
    } else if (type === 'crypto') {
      const info = availableCryptoSeries[id];
      if (info.dataKey === 'btcData') return dataContext.btcData || [];
      if (info.dataKey === 'ethData') return dataContext.ethData || [];
      if (info.dataKey === 'altcoinData') return dataContext.altcoinData[info.coin] || [];
    } else if (type === 'indicator') {
      const info = availableIndicatorSeries[id];
      return dataContext[info.dataKey] || [];
    } else if (type === 'derived') {
      return derivedData[id] || [];
    }
    return [];
  };
  const getNormalizedData = (rawData, valueKey) => {
    return rawData
      .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
      .map(item => ({
        time: item.time || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
        value: parseFloat(item[valueKey]),
      }))
      .filter(item => item.time !== null)
      .sort((a, b) => new Date(a.time) - new Date(b.time));
  };
  const computeDerivedData = (d1, d2, op) => {
    const map1 = new Map(d1.map(d => [d.time, d.value]));
    const map2 = new Map(d2.map(d => [d.time, d.value]));
    const times = [...new Set([...d1.map(d => d.time), ...d2.map(d => d.time)])].sort();
    let last1 = null, last2 = null;
    const result = [];
    for (let t of times) {
      if (map1.has(t)) last1 = map1.get(t);
      if (map2.has(t)) last2 = map2.get(t);
      if (last1 !== null && last2 !== 0) {
        let v;
        switch (op) {
          case '+': v = last1 + last2; break;
          case '-': v = last1 - last2; break;
          case '*': v = last1 * last2; break;
          case '/': v = last2 !== 0 ? last1 / last2 : null; break;
          default: v = null;
        }
        if (v !== null) {
          result.push({ time: t, value: v });
        }
      }
    }
    return result;
  };
  const handleCreateDerived = () => {
    if (!newDerivedSeries1 || !newDerivedSeries2 || !newDerivedLabel) {
      setSnackbar({ open: true, message: 'Please fill in all fields for derived series.' });
      return;
    }
    if (newDerivedSeries1 === newDerivedSeries2) {
      setSnackbar({ open: true, message: 'Series 1 and Series 2 must be different.' });
      return;
    }
    const type1 = getType(newDerivedSeries1);
    const type2 = getType(newDerivedSeries2);
    const raw1 = getRawData(newDerivedSeries1, type1);
    const raw2 = getRawData(newDerivedSeries2, type2);
    const valueKey1 = getValueKey(newDerivedSeries1);
    const valueKey2 = getValueKey(newDerivedSeries2);
    const norm1 = getNormalizedData(raw1, valueKey1);
    const norm2 = getNormalizedData(raw2, valueKey2);
    const computed = computeDerivedData(norm1, norm2, newDerivedOperation);
    if (computed.length === 0) {
      setSnackbar({ open: true, message: 'No overlapping data for the selected series.' });
      return;
    }
    const newId = `derived_${derivedSeriesDefs.length + 1}`;
    setDerivedData(prev => ({ ...prev, [newId]: computed }));
    setDerivedSeriesDefs(prev => [
      ...prev,
      {
        id: newId,
        label: newDerivedLabel,
        series1: newDerivedSeries1,
        series2: newDerivedSeries2,
        operation: newDerivedOperation,
        color: newDerivedColor,
        scaleId: 'derived-scale',
        chartType: 'line',
        allowLogScale: true,
      }
    ]);
    setActiveDerivedSeries(prev => [...prev, newId]);
    setShowDerivedDialog(false);
    setNewDerivedSeries1('');
    setNewDerivedSeries2('');
    setNewDerivedOperation('+');
    setNewDerivedLabel('');
    setNewDerivedColor('#00FFFF');
  };
  const handleEditClick = (event, seriesId, type) => {
    event.stopPropagation();
    event.preventDefault();
    setEditClicked(prev => ({ ...prev, [seriesId]: true }));
    setDialogMovingAverage(seriesMovingAverages[seriesId] || 'None');
    setDialogColor(seriesColors[seriesId] || getSeriesColor(seriesId, type));
    setOpenDialog({ open: true, seriesId, type });
    setTimeout(() => {
      setEditClicked(prev => ({ ...prev, [seriesId]: false }));
    }, 300);
  };
  const handleMovingAverageChange = (event) => {
    setDialogMovingAverage(event.target.value);
  };
  const handleColorChange = (event) => {
    setDialogColor(event.target.value);
  };
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
    setOpenDialog({ open: false, seriesId: null, type: null });
    setDialogMovingAverage('');
    setDialogColor('');
  };
  const handleCloseDialog = () => {
    setOpenDialog({ open: false, seriesId: null, type: null });
    setDialogMovingAverage('');
    setDialogColor('');
  };
  const handleMacroSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveMacroSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableMacroSeries[id];
      if (seriesInfo.isFred) {
        if (!dataContext.fredSeriesData[id]) {
          setIsLoading(true);
          setError(null);
          dataContext.fetchFredSeriesData(id)
            .catch(err => {
              setError(`Failed to fetch data for ${id}. Please try again later.`);
              console.error(`Error fetching ${id}:`, err);
            })
            .finally(() => setIsLoading(false));
        }
      } else {
        if (dataContext[seriesInfo.dataKey].length === 0) {
          setIsLoading(true);
          setError(null);
          dataContext[seriesInfo.fetchFunction]()
            .catch(err => {
              setError(`Failed to fetch data for ${id}. Please try again later.`);
              console.error(`Error fetching ${id}:`, err);
            })
            .finally(() => setIsLoading(false));
        }
      }
    });
  };
  const handleCryptoSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveCryptoSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableCryptoSeries[id];
      const dataKey = seriesInfo.dataKey;
      const coin = seriesInfo.coin;
      if (dataKey === 'btcData' && dataContext.btcData.length === 0) {
        setIsLoading(true);
        setError(null);
        dataContext.fetchBtcData()
          .catch(err => {
            setError(`Failed to fetch Bitcoin data. Please try again later.`);
            console.error(`Error fetching Bitcoin data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (dataKey === 'ethData' && dataContext.ethData.length === 0) {
        setIsLoading(true);
        setError(null);
        dataContext.fetchEthData()
          .catch(err => {
            setError(`Failed to fetch Ethereum data. Please try again later.`);
            console.error(`Error fetching Ethereum data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (dataKey === 'altcoinData' && (!dataContext.altcoinData[coin] || dataContext.altcoinData[coin].length === 0)) {
        setIsLoading(true);
        setError(null);
        dataContext.fetchAltcoinData(coin)
          .catch(err => {
            setError(`Failed to fetch ${coin} data. Please try again later.`);
            console.error(`Error fetching ${coin} data:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };
  const handleIndicatorSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveIndicatorSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableIndicatorSeries[id];
      if (dataContext[seriesInfo.dataKey].length === 0) {
        setIsLoading(true);
        setError(null);
        dataContext[seriesInfo.fetchFunction]()
          .catch(err => {
            setError(`Failed to fetch data for ${id}. Please try again later.`);
            console.error(`Error fetching ${id}:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };
  const handleDerivedSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveDerivedSeries(selected);
  };
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
        smoothScroll: true,
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
    const isNewSeries =
      JSON.stringify(activeMacroSeries.sort()) !== JSON.stringify(prevSeriesRef.current.macro.sort()) ||
      JSON.stringify(activeCryptoSeries.sort()) !== JSON.stringify(prevSeriesRef.current.crypto.sort()) ||
      JSON.stringify(activeIndicatorSeries.sort()) !== JSON.stringify(prevSeriesRef.current.indicator.sort()) ||
      JSON.stringify(activeDerivedSeries.sort()) !== JSON.stringify(prevSeriesRef.current.derived.sort());
    prevSeriesRef.current = { macro: activeMacroSeries, crypto: activeCryptoSeries, indicator: activeIndicatorSeries, derived: activeDerivedSeries };
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
    const allSeries = [
      ...activeMacroSeries.map(id => ({ id, type: 'macro' })),
      ...activeCryptoSeries.map(id => ({ id, type: 'crypto' })),
      ...activeIndicatorSeries.map(id => ({ id, type: 'indicator' })),
      ...activeDerivedSeries.map(id => ({ id, type: 'derived' })),
    ];
    const sortedSeries = allSeries.sort((a, b) => {
      if (a.id === 'USRECD') return 1;
      if (b.id === 'USRECD') return -1;
      return 0;
    });
    const usedPriceScales = new Set();
    sortedSeries.forEach(({ id, type }) => {
      const seriesInfo = getSeriesInfo(id, type);
      const seriesColor = getSeriesColor(id, type);
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
      let rawData = getRawData(id, type);
      let valueKey = getValueKey(id);
      const timeKey = (type === 'indicator' && seriesInfo.dataKey === 'txMvrvData') ? 'date' : 'time';
      rawData = rawData
        .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
        .map(item => ({
          time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
          value: parseFloat(item[valueKey]),
        }))
        .filter(item => item.time !== null)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      if (rawData.length > 0) {
        try {
          const validData = scaleModeState === 1 && seriesInfo.allowLogScale
            ? rawData.filter(item => item.value > 0)
            : rawData;
          if (validData.length === 0 && scaleModeState === 1 && seriesInfo.allowLogScale) {
            console.warn(`No valid data for series ${id} in logarithmic scale`);
            setError(`Cannot display ${seriesInfo.label} in logarithmic scale due to non-positive values.`);
          } else {
            series.setData(getSeriesData(id, validData));
          }
        } catch (err) {
          console.error(`Error setting data for series ${id}:`, err);
          setError(`Failed to display ${seriesInfo.label}. The data may be incompatible.`);
        }
      }
    });
    const priceScales = {};
    [...Object.keys(availableMacroSeries), ...Object.keys(availableCryptoSeries), ...Object.keys(availableIndicatorSeries), 'derived-scale'].forEach(key => {
      const seriesInfo = availableMacroSeries[key] || availableCryptoSeries[key] || availableIndicatorSeries[key] || { allowLogScale: true };
      priceScales[key === 'derived-scale' ? 'derived-scale' : seriesInfo.scaleId] = {
        mode: key === 'USRECD' ? 0 : (seriesInfo.allowLogScale ? scaleModeState : 0),
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        position: 'right',
        width: 50,
        visible: usedPriceScales.has(key === 'derived-scale' ? 'derived-scale' : seriesInfo.scaleId),
      };
    });
    try {
      chartRef.current.applyOptions({
        priceScales: priceScales,
      });
    } catch (err) {
      console.error('Error applying price scales:', err);
      setError('Failed to apply chart scales.');
    }
    usedPriceScales.forEach(scaleId => {
      try {
        const seriesInfo = [...Object.values(availableMacroSeries), ...Object.values(availableCryptoSeries), ...Object.values(availableIndicatorSeries), ...derivedSeriesDefs].find(s => s.scaleId === scaleId);
        const mode = scaleId === 'usrecd-scale' ? 0 : (seriesInfo?.allowLogScale ? scaleModeState : 0);
        chartRef.current.priceScale(scaleId).applyOptions({ mode });
      } catch (err) {
        console.error(`Failed to apply scale mode for ${scaleId}:`, err);
        setError(`Cannot apply ${scaleModeState === 1 ? 'logarithmic' : 'linear'} scale to ${scaleId}.`);
      }
    });
    if (isNewSeries || zoomRange === null) {
      chartRef.current.timeScale().fitContent();
      setZoomRange(null);
    }
    let tooltipTimeout = null;
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
        let data = [];
        let seriesInfo = getSeriesInfo(id, type);
        let raw = getRawData(id, type);
        let valueKey = getValueKey(id);
        const timeKey = (type === 'indicator' && seriesInfo.dataKey === 'txMvrvData') ? 'date' : 'time';
        raw = raw
          .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
          .map(item => ({
            time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
            value: parseFloat(item[valueKey]),
          }))
          .filter(item => item.time !== null)
          .sort((a, b) => new Date(a.time) - new Date(b.time));
        data = getSeriesData(id, raw);
        const value = param.seriesData.get(series)?.value ?? getLatestValue(data, param.time);
        tooltip.values[id] = value;
      });
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        setTooltipData(tooltip);
      }, 50);
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove();
      }
    };
  }, [dataContext, activeMacroSeries, activeCryptoSeries, activeIndicatorSeries, activeDerivedSeries, derivedSeriesDefs, derivedData, seriesMovingAverages, seriesColors, chartType, valueFormatter, scaleModeState]);
  useEffect(() => {
    if (!chartRef.current || !zoomRange) return;
    chartRef.current.timeScale().setVisibleLogicalRange(zoomRange);
  }, [zoomRange]);
  useEffect(() => {
    if (!chartRef.current) return;
    let zoomTimeout = null;
    const handler = () => {
      const range = chartRef.current.timeScale().getVisibleLogicalRange();
      if (range) {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          setZoomRange(range);
        }, 100);
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
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
        kineticScroll: { touch: true, mouse: true },
      });
    }
  }, [isInteractive]);
  const getLastTime = (id, type) => {
    const raw = getRawData(id, type);
    if (raw.length === 0) return 0;
    const last = raw[raw.length - 1];
    const timeField = last.time || last.date || last.end_date || (last.timestamp ? new Date(last.timestamp * 1000).toISOString().split('T')[0] : 0);
    return new Date(timeField).getTime();
  };
  const allActive = [...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries];
  const hasDerived = derivedSeriesDefs.length > 0;
  const numSelectors = hasDerived ? 4 : 3;
  const minWidthNeeded = numSelectors * 250 + (numSelectors - 1) * 20;
  let breakpointForRow;
  if (minWidthNeeded <= 600) breakpointForRow = 'sm';
  else if (minWidthNeeded <= 900) breakpointForRow = 'md';
  else if (minWidthNeeded <= 1200) breakpointForRow = 'lg';
  else breakpointForRow = 'xl';
  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', [breakpointForRow]: 'row' },
            alignItems: { xs: 'stretch', [breakpointForRow]: 'center' },
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            marginTop: '50px',
            width: '100%',
            mx: 'auto',
          }}
        >
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="macro-series"
            options={Object.entries(availableMacroSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={activeMacroSeries.map(id => ({ id, label: availableMacroSeries[id].label }))}
            onChange={(event, newValue) => handleMacroSeriesChange({ target: { value: newValue.map(v => v.id) } })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'macro')}
                    disabled={!activeMacroSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeMacroSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeMacroSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeMacroSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeMacroSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
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
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Macro Data"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="crypto-series"
            options={Object.entries(availableCryptoSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={activeCryptoSeries.map(id => ({ id, label: availableCryptoSeries[id].label }))}
            onChange={(event, newValue) => handleCryptoSeriesChange({ target: { value: newValue.map(v => v.id) } })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'crypto')}
                    disabled={!activeCryptoSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeCryptoSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeCryptoSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeCryptoSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeCryptoSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
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
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Crypto Series"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="indicator-series"
            options={Object.entries(availableIndicatorSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={activeIndicatorSeries.map(id => ({ id, label: availableIndicatorSeries[id].label }))}
            onChange={(event, newValue) => handleIndicatorSeriesChange({ target: { value: newValue.map(v => v.id) } })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'indicator')}
                    disabled={!activeIndicatorSeries.includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: activeIndicatorSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${activeIndicatorSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: activeIndicatorSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: activeIndicatorSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
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
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Indicators"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          {hasDerived && (
            <Autocomplete
              multiple
              disableCloseOnSelect={true}
              id="derived-series"
              options={derivedSeriesDefs.map(d => ({ id: d.id, label: d.label }))}
              getOptionLabel={(option) => option.label}
              value={activeDerivedSeries.map(id => ({ id, label: derivedSeriesDefs.find(d => d.id === id).label }))}
              onChange={(event, newValue) => handleDerivedSeriesChange({ target: { value: newValue.map(v => v.id) } })}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(tagValue) => (
                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tagValue.map((option) => option.label).join(', ')}
                </Box>
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox
                    style={{ marginRight: 8 }}
                    checked={selected}
                    sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  {option.label}
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      onClick={(e) => handleEditClick(e, option.id, 'derived')}
                      disabled={!activeDerivedSeries.includes(option.id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: activeDerivedSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        border: `1px solid ${activeDerivedSeries.includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        minWidth: '50px',
                        backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                        ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                        '&:hover': {
                          borderColor: activeDerivedSeries.includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                          backgroundColor: activeDerivedSeries.includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
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
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Derived Series"
                  sx={{
                    minWidth: '250px',
                    width: { xs: '100%', [breakpointForRow]: '250px' },
                    '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                    '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                    '& .MuiOutlinedInput-root': {
                      color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                      '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                      '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                      '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                    },
                  }}
                />
              )}
            />
          )}
        </Box>
      )}
      <Dialog
        open={showDerivedDialog}
        onClose={() => setShowDerivedDialog(false)}
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
          Create Derived Series
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-series1-label">Series 1</InputLabel>
            <Select
              labelId="derived-series1-label"
              label="Series 1"
              value={newDerivedSeries1}
              onChange={(e) => setNewDerivedSeries1(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              {allActive.map(id => (
                <MenuItem key={id} value={id}>
                  {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-operation-label">Operation</InputLabel>
            <Select
              labelId="derived-operation-label"
              label="Operation"
              value={newDerivedOperation}
              onChange={(e) => setNewDerivedOperation(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="+">Addition (+)</MenuItem>
              <MenuItem value="-">Subtraction (-)</MenuItem>
              <MenuItem value="*">Multiplication (*)</MenuItem>
              <MenuItem value="/">Division (/)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-series2-label">Series 2</InputLabel>
            <Select
              labelId="derived-series2-label"
              label="Series 2"
              value={newDerivedSeries2}
              onChange={(e) => setNewDerivedSeries2(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              {allActive.map(id => (
                <MenuItem key={id} value={id}>
                  {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id])?.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Label"
            value={newDerivedLabel}
            onChange={(e) => setNewDerivedLabel(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-color-label">Color</InputLabel>
            <input
              type="color"
              value={newDerivedColor}
              onChange={(e) => setNewDerivedColor(e.target.value)}
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
            onClick={() => setShowDerivedDialog(false)}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDerived}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
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
          {openDialog.seriesId ? getSeriesInfo(openDialog.seriesId, openDialog.type)?.label : ''}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="moving-average-label">Moving Averages</InputLabel>
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
            <InputLabel id="color-label">Color</InputLabel>
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
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button onClick={handleSaveDialog}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="error" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
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
            <button
              onClick={() => setShowDerivedDialog(true)}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Create Derived
            </button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}` }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {(activeMacroSeries.length === 0 && activeCryptoSeries.length === 0 && activeIndicatorSeries.length === 0 && activeDerivedSeries.length === 0) && !isDashboard && (
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
          {[...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: getSeriesColor(id, activeMacroSeries.includes(id) ? 'macro' : activeCryptoSeries.includes(id) ? 'crypto' : activeIndicatorSeries.includes(id) ? 'indicator' : 'derived'),
                  marginRight: '5px',
                }}
              />
              {(availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id] || derivedSeriesDefs.find(d => d.id === id))?.label || id}
            </div>
          ))}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && [...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].some(id => {
          let data = [];
          const type = getType(id) || (activeDerivedSeries.includes(id) ? 'derived' : null);
          const raw = getRawData(id, type);
          const valueKey = getValueKey(id);
          const timeKey = (type === 'indicator' && getSeriesInfo(type, type)?.dataKey === 'txMvrvData') ? 'date' : 'time';
          const norm = raw
            .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
            .map(item => ({
              time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
              value: parseFloat(item[valueKey]),
            }))
            .filter(item => item.time !== null)
            .sort((a, b) => new Date(a.time) - new Date(b.time));
          data = getSeriesData(id, norm);
          return data?.length > 0;
        }) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...[...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].map(id => {
                    const type = getType(id) || (activeDerivedSeries.includes(id) ? 'derived' : null);
                    if (type === 'derived') {
                      const def = derivedSeriesDefs.find(d => d.id === id);
                      if (def) {
                        return Math.max(getLastTime(def.series1, getType(def.series1)), getLastTime(def.series2, getType(def.series2)));
                      }
                      return 0;
                    } else {
                      return getLastTime(id, type);
                    }
                  })
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (activeMacroSeries.length > 0 || activeCryptoSeries.length > 0 || activeIndicatorSeries.length > 0 || activeDerivedSeries.length > 0) && (
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
          {[...activeMacroSeries, ...activeCryptoSeries, ...activeIndicatorSeries, ...activeDerivedSeries].map(id => (
            <div key={id}>
              <div style={{ fontSize: '15px' }}>
                <span style={{ color: getSeriesColor(id, activeMacroSeries.includes(id) ? 'macro' : activeCryptoSeries.includes(id) ? 'crypto' : activeIndicatorSeries.includes(id) ? 'indicator' : 'derived') }}>
                  {getSeriesInfo(id, activeMacroSeries.includes(id) ? 'macro' : activeCryptoSeries.includes(id) ? 'crypto' : activeIndicatorSeries.includes(id) ? 'indicator' : 'derived')?.label || id}
                  {seriesMovingAverages[id] && seriesMovingAverages[id] !== 'None' ? ` (${seriesMovingAverages[id]} MA): ` : ': '}
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
export default restrictToPaidSubscription(WorkbenchChart);