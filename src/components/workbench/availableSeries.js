/**
 * Workbench series configuration.
 *
 * Extracted from Workbench.jsx as part of professionalization decomposition.
 * Central place for available macro/crypto/indicator/stock series metadata.
 * Used by useWorkbenchSeriesData, useWorkbenchSeriesManagement, and the chart component.
 *
 * This makes adding new series (e.g. more FRED, altcoins, or stocks) a single-file change.
 */

import { STOCKS } from '../../config/stocksConfig';

export const colorMap = {
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

// Convert hex to RGB for rgba properties (used for area fills)
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : hex;
};

// Available Macro series (FRED + custom macro)
export const availableMacroSeries = {
  UMCSENT: { label: 'Consumer Sentiment (UMCSI)', color: '#FFA500', chartType: 'area', scaleId: 'umcsent-scale', allowLogScale: true, isFred: true, seriesId: 'UMCSENT', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  SP500: { label: 'S&P 500 Index', color: '#0000FF', chartType: 'area', scaleId: 'sp500-scale', allowLogScale: true, isFred: true, seriesId: 'SP500', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DFF: { label: 'Federal Funds Rate', color: '#800080', chartType: 'line', scaleId: 'dff-scale', allowLogScale: true, isFred: true, seriesId: 'DFF', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  CPIAUCSL: { label: 'Consumer Price Index (CPI)', color: '#328032', chartType: 'area', scaleId: 'cpi-scale', allowLogScale: true, isFred: true, seriesId: 'CPIAUCSL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  UNRATE: { label: 'Unemployment Rate', color: '#FF0000', chartType: 'area', scaleId: 'unrate-scale', allowLogScale: true, isFred: true, seriesId: 'UNRATE', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DGS10: { label: '10-Year Treasury Yield', color: '#00FFFF', chartType: 'line', scaleId: 'dgs10-scale', allowLogScale: true, isFred: true, seriesId: 'DGS10', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  T10Y2Y: { label: '10Y-2Y Treasury Spread', color: '#FF00FF', chartType: 'line', scaleId: 't10y2y-scale', allowLogScale: false, isFred: true, seriesId: 'T10Y2Y', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  USRECD: { label: 'U.S. Recession Indicator', color: 'rgba(28, 28, 28, 0.1)', chartType: 'histogram', scaleId: 'usrecd-scale', allowLogScale: true, isFred: true, seriesId: 'USRECD', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  M2SL: { label: 'M2 Money Supply', color: '#FFFF00', chartType: 'area', scaleId: 'm2sl-scale', allowLogScale: true, isFred: true, seriesId: 'M2SL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  FED_BALANCE: { label: 'Fed Balance Sheet (Total Assets)', color: '#20B2AA', chartType: 'area', scaleId: 'fedbalance-scale', allowLogScale: true, isFred: false, dataKey: 'fedBalanceData', fetchFunction: 'fetchFedBalanceData', valueKey: 'value' },
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
  // Growth slice: high-ROI free FRED series (populate + update_fred_macro required in prod)
  WALCL: { label: 'Fed Balance Sheet (WALCL)', color: '#20B2AA', chartType: 'area', scaleId: 'walcl-scale', allowLogScale: true, isFred: true, seriesId: 'WALCL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  PCEPILFE: { label: 'Core PCE Price Index', color: '#FF7F50', chartType: 'area', scaleId: 'pcepilfe-scale', allowLogScale: true, isFred: true, seriesId: 'PCEPILFE', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  CPILFESL: { label: 'Core CPI (ex Food & Energy)', color: '#48D1CC', chartType: 'area', scaleId: 'cpilfesl-scale', allowLogScale: true, isFred: true, seriesId: 'CPILFESL', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  MORTGAGE30US: { label: '30-Year Mortgage Rate', color: '#DA70D6', chartType: 'line', scaleId: 'mortgage30us-scale', allowLogScale: false, isFred: true, seriesId: 'MORTGAGE30US', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
  DTWEXBGS: { label: 'Trade-Weighted USD Index (Broad)', color: '#87CEEB', chartType: 'line', scaleId: 'dtwexbgs-scale', allowLogScale: true, isFred: true, seriesId: 'DTWEXBGS', fetchFunction: 'fetchFredSeriesData', valueKey: 'value' },
};

// Available Crypto series for selection
export const availableCryptoSeries = {
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
export const availableIndicatorSeries = {
  DOMINANCE: { label: 'Bitcoin Dominance', color: '#FFD700', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'dominanceData', fetchFunction: 'fetchDominanceData', valueKey: 'btc', allowLogScale: false },
  ETH_DOMINANCE: {
    label: 'Ethereum Dominance',
    color: '#4169E1',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'dominanceData',
    fetchFunction: 'fetchDominanceData',
    valueKey: 'eth',
    allowLogScale: false
  },
  FEAR_GREED: { label: 'Fear and Greed Index', color: '#4169E1', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'fearAndGreedData', fetchFunction: 'fetchFearAndGreedData', valueKey: 'value', allowLogScale: false },
  TOTAL_MARKET_CAP: { label: 'Total Crypto Market Cap', color: '#FF8C00', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'marketCapData', fetchFunction: 'fetchMarketCapData', valueKey: 'value', allowLogScale: true },
  MARKET_CAP_DIFFERENCE: { label: 'Market Cap Difference', color: '#DC143C', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'differenceData', fetchFunction: 'fetchDifferenceData', valueKey: 'value', allowLogScale: false },
  BTC_TX_COUNT: { label: 'BTC Transaction Count', color: '#00FFFF', chartType: 'area', scaleId: 'indicator-shared-scale', dataKey: 'txCountData', fetchFunction: 'fetchTxCountData', valueKey: 'value', allowLogScale: true },
  ALT_SEASON_INDEX: { label: 'Altcoin Season Index', color: '#00BFFF', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'altcoinSeasonTimeseriesData', fetchFunction: 'fetchAltcoinSeasonTimeseriesData', valueKey: 'index', allowLogScale: false },
  MVRV_RISK: { label: 'MVRV Z-Score Risk', color: '#8A2BE2', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'mvrvRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  PUELL_RISK: { label: 'Puell Multiple Risk', color: '#FFA500', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'puellRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  MINER_CAP_RISK: { label: 'Miner Cap Thermo Risk', color: '#9400D3', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'minerCapThermoCapRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  FEE_RISK: { label: 'Fee Risk', color: '#228B22', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'feeRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  SOPL_RISK: { label: 'SOPL Risk', color: '#B22222', chartType: 'line', scaleId: 'indicator-shared-scale', dataKey: 'soplRiskData', fetchFunction: 'fetchRiskMetricsData', valueKey: 'Risk', allowLogScale: false },
  TX_TENSION: {
    label: 'Tx Tension (MVRV/Tx Ratio)',
    color: '#1E90FF',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'txMvrvRatioDataBySmoothing',
    nestedKey: 'sma-7',
    seriesField: 'series',
    fetchFunction: 'fetchTxMvrvRatioData',
    fetchArgs: ['sma-7'],
    valueKey: 'value',
    allowLogScale: true,
  },
  MVRV_Z_SCORE: {
    label: 'MVRV Z-Score',
    color: '#7B68EE',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'mvrvData',
    fetchFunction: 'fetchMvrvData',
    valueKey: 'value',
    allowLogScale: false,
  },
  TX_MVRV: {
    label: 'MVRV (On-Chain)',
    color: '#5F9EA0',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'txMvrvData',
    fetchFunction: 'fetchTxMvrvData',
    valueKey: 'mvrv',
    allowLogScale: true,
  },
  BTC_RISK_METRIC: {
    label: 'Bitcoin Risk Metric',
    color: '#32CD32',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    computed: 'btcRisk',
    fetchFunction: 'fetchBtcData',
    dataKey: 'btcData',
    valueKey: 'Risk',
    allowLogScale: false,
  },
  RUNNING_ROI_RISK: {
    label: 'Running ROI Risk',
    color: '#DA70D6',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    computed: 'runningRoiRisk',
    fetchFunction: 'fetchBtcData',
    dataKey: 'btcData',
    valueKey: 'riskScore',
    allowLogScale: false,
  },
  FLOOR_ECHO_INDEX: {
    label: 'Floor Echo Index (FEI)',
    color: '#20B2AA',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'floorEchoData',
    seriesField: 'series',
    fetchFunction: 'fetchFloorEchoData',
    valueKey: 'fei',
    allowLogScale: false,
  },
  MARKET_HEAT_INDEX: {
    label: 'Market Heat Index',
    color: '#00BCD4',
    chartType: 'area',
    scaleId: 'indicator-shared-scale',
    computed: 'marketHeat',
    marketHeatSmaPeriod: '28d',
    txMvrvSmoothing: 'sma-7',
    valueKey: 'value',
    allowLogScale: false,
  },
  TOTAL2_MARKET_CAP: {
    label: 'Total2 Market Cap (ex-BTC)',
    color: '#CD853F',
    chartType: 'area',
    scaleId: 'indicator-shared-scale',
    dataKey: 'total2Data',
    fetchFunction: 'fetchTotal2Data',
    valueKey: 'value',
    allowLogScale: true,
  },
  TOTAL3_MARKET_CAP: {
    label: 'Total3 Market Cap (ex-BTC & ETH)',
    color: '#BC8F8F',
    chartType: 'area',
    scaleId: 'indicator-shared-scale',
    dataKey: 'total3Data',
    fetchFunction: 'fetchTotal3Data',
    valueKey: 'value',
    allowLogScale: true,
  },
  SP500_DIV_UNRATE: {
    label: 'S&P 500 Div vs Unemployment²',
    color: '#6B8E23',
    chartType: 'line',
    scaleId: 'indicator-shared-scale',
    dataKey: 'sp500DivUnrateData',
    fetchFunction: 'fetchSp500DivUnrateData',
    valueKey: 'value',
    allowLogScale: false,
  },
};

// Distinct palette for equities (cycles if more stocks are added to stocksConfig)
const STOCK_COLOR_PALETTE = [
  '#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#3B1F2B',
  '#95C623', '#5C4D7D', '#E8871E', '#1B998B', '#FF6B6B',
  '#4ECDC4', '#FFE66D', '#6A4C93', '#1982C4', '#8AC926',
  '#FF595E', '#FFCA3A', '#6A0572', '#AB83A1', '#F72585',
  '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0', '#06D6A0',
  '#FFD166', '#EF476F', '#118AB2', '#073B4C', '#9B5DE5',
  '#00BBF9', '#00F5D4', '#FEE440', '#F15BB5',
];

// Available Stock series, daily OHLCV via fetchAltcoinData (same cache layer as altcoins)
export const availableStockSeries = STOCKS.reduce((acc, stock, index) => {
  acc[stock.value] = {
    label: stock.label,
    color: STOCK_COLOR_PALETTE[index % STOCK_COLOR_PALETTE.length],
    chartType: 'line',
    scaleId: 'stock-shared-scale',
    dataKey: 'altcoinData',
    fetchFunction: 'fetchAltcoinData',
    symbol: stock.value,
    allowLogScale: true,
    valueKey: 'value',
  };
  return acc;
}, {});

export default {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  availableStockSeries,
  colorMap,
  hexToRgb,
};
