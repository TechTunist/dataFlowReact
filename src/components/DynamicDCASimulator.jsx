import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import { DataContext } from '../DataContext';
import { calculateRiskMetric } from '../utility/riskMetric';
import {
  Box, Typography, Button, Slider, TextField, Select, MenuItem, FormControl, InputLabel,
  Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, Chip, Divider, Tooltip as MuiTooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { UnderChartRow } from './ChartUnderSection';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea, ReferenceLine
} from 'recharts';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth, useUser } from '@clerk/clerk-react';
import { apiUrl } from '../config/api';
import {
  TX_MVRV_SMOOTHING,
  DEFAULT_MARKET_HEAT_WEIGHTS,
  DEFAULT_MARKET_HEAT_SETTINGS,
  computeMarketHeatPipeline,
  getMarketHeatSmaLabel,
} from '../utility/marketHeatUtils';

// Tx Tension ratio scale varies widely by smoothing (e.g. ~74 on 7-day SMA vs ~850 on 3-day SMA).
// Tier defaults are expressed as fractions of the series max so they stay meaningful across smoothings.
const TX_TIER_DEFAULT_FRACTIONS = {
  buyStrong: 0.12,
  buyMedium: 0.20,
  sellMedium: 0.30,
  sellStrong: 0.43,
};

const TX_LEGACY_REFERENCE_MAX = 74;

const computeTxIndicatorRange = (values) => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { min: 0, max: 40, step: 0.5, dataMin: 0, dataMax: 40 };
  }
  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite);
  let paddedMax = Math.ceil(dataMax * 1.08);
  if (paddedMax <= 0) paddedMax = 40;
  const step = paddedMax > 300 ? 10 : paddedMax > 150 ? 5 : paddedMax > 75 ? 2 : paddedMax > 30 ? 1 : 0.5;
  return { min: 0, max: paddedMax, step, dataMin, dataMax };
};

const DCA_STATE_KEY = 'cryptological:dcaSimulatorState';
const DCA_RESULTS_KEY_PREFIX = 'cryptological:dcaSimulatorResults:';
const DCA_RESULTS_INDEX_KEY = `${DCA_RESULTS_KEY_PREFIX}_keys`;
const DCA_PERSISTENCE_MAX_SERIES_POINTS = 500;

const wrapBuyResult = (buyResult) => {
  if (!buyResult) return null;
  if (buyResult['selling-on'] || buyResult['hold-btc-only']) return buyResult;
  if (buyResult.buyStrategyUsed) {
    const sellKey = buyResult.sellStrategyEnabled !== false ? 'selling-on' : 'hold-btc-only';
    return { [sellKey]: buyResult };
  }
  return buyResult;
};

const migrateStrategyResults = (val) => {
  if (!val) return null;
  if (val.buyStrategyUsed) {
    const sellKey = val.sellStrategyEnabled !== false ? 'selling-on' : 'hold-btc-only';
    return { [val.buyStrategyUsed]: { [sellKey]: val } };
  }
  if (val['periodic-boost'] || val['trigger-only']) {
    return {
      ...(val['periodic-boost'] ? { 'periodic-boost': wrapBuyResult(val['periodic-boost']) } : {}),
      ...(val['trigger-only'] ? { 'trigger-only': wrapBuyResult(val['trigger-only']) } : {}),
    };
  }
  return val;
};

const downsampleSeries = (series, maxPoints = DCA_PERSISTENCE_MAX_SERIES_POINTS) => {
  if (!Array.isArray(series) || series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  const sampled = series.filter((_, index) => index % step === 0 || index === series.length - 1);
  if (sampled[sampled.length - 1] !== series[series.length - 1]) {
    sampled.push(series[series.length - 1]);
  }
  return sampled;
};

const slimBacktestResult = (result) => {
  if (!result) return null;
  return {
    ...result,
    portfolioSeries: downsampleSeries(result.portfolioSeries),
    transactions: Array.isArray(result.transactions) ? result.transactions.slice(0, 120) : [],
  };
};

const slimStrategyResults = (strategyResults) => {
  if (!strategyResults) return null;
  const slimmed = {};
  ['periodic-boost', 'trigger-only'].forEach((buyMode) => {
    const buyBucket = strategyResults[buyMode];
    if (!buyBucket) return;
    slimmed[buyMode] = {
      ...(buyBucket['selling-on'] ? { 'selling-on': slimBacktestResult(buyBucket['selling-on']) } : {}),
      ...(buyBucket['hold-btc-only'] ? { 'hold-btc-only': slimBacktestResult(buyBucket['hold-btc-only']) } : {}),
    };
  });
  return slimmed;
};

const loadPersistedResultsByStrategy = () => {
  const migrated = {};
  try {
    const keysRaw = localStorage.getItem(DCA_RESULTS_INDEX_KEY);
    const keys = keysRaw ? JSON.parse(keysRaw) : [];
    keys.forEach((key) => {
      const raw = localStorage.getItem(`${DCA_RESULTS_KEY_PREFIX}${key}`);
      if (!raw) return;
      migrated[key] = migrateStrategyResults(JSON.parse(raw));
    });

    if (Object.keys(migrated).length > 0) return migrated;

    const legacyRaw = localStorage.getItem(DCA_STATE_KEY);
    if (!legacyRaw) return migrated;
    const legacy = JSON.parse(legacyRaw);
    if (!legacy.resultsByStrategy || typeof legacy.resultsByStrategy !== 'object') return migrated;
    Object.entries(legacy.resultsByStrategy).forEach(([key, val]) => {
      if (val) migrated[key] = migrateStrategyResults(val);
    });
  } catch (e) {
    console.warn('Failed to load persisted DCA simulation results', e);
  }
  return migrated;
};

const savePersistedResultsByStrategy = (resultsByStrategy) => {
  const keys = Object.keys(resultsByStrategy || {}).filter((key) => resultsByStrategy[key]);
  try {
    localStorage.setItem(DCA_RESULTS_INDEX_KEY, JSON.stringify(keys));
    keys.forEach((key) => {
      const slimmed = slimStrategyResults(resultsByStrategy[key]);
      localStorage.setItem(`${DCA_RESULTS_KEY_PREFIX}${key}`, JSON.stringify(slimmed));
    });
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((key) => key?.startsWith(DCA_RESULTS_KEY_PREFIX) && key !== DCA_RESULTS_INDEX_KEY)
      .forEach((storageKey) => {
        const strategyKey = storageKey.slice(DCA_RESULTS_KEY_PREFIX.length);
        if (!keys.includes(strategyKey)) {
          localStorage.removeItem(storageKey);
        }
      });
  } catch (e) {
    console.warn('Failed to persist DCA simulation results (storage full?)', e);
  }
};

const clearPersistedResultsByStrategy = () => {
  try {
    const keysRaw = localStorage.getItem(DCA_RESULTS_INDEX_KEY);
    const keys = keysRaw ? JSON.parse(keysRaw) : [];
    keys.forEach((key) => localStorage.removeItem(`${DCA_RESULTS_KEY_PREFIX}${key}`));
    localStorage.removeItem(DCA_RESULTS_INDEX_KEY);
    Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((key) => key?.startsWith(DCA_RESULTS_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Failed to clear persisted DCA simulation results', e);
  }
};

const buildTxTierDefaults = (rangeMax, step = 0.5) => {
  const snap = (fraction) => {
    const raw = rangeMax * fraction;
    return Math.max(0, Math.min(rangeMax, Math.round(raw / step) * step));
  };
  return {
    buy: [
      { level: snap(TX_TIER_DEFAULT_FRACTIONS.buyStrong), multiplier: 2.5, label: 'Strong Oversold' },
      { level: snap(TX_TIER_DEFAULT_FRACTIONS.buyMedium), multiplier: 1.6, label: 'Medium Oversold' },
    ],
    sell: [
      { level: snap(TX_TIER_DEFAULT_FRACTIONS.sellMedium), sellPercent: 12, label: 'Medium Overbought' },
      { level: snap(TX_TIER_DEFAULT_FRACTIONS.sellStrong), sellPercent: 28, label: 'Strong Overbought' },
    ],
  };
};

const DynamicDCASimulator = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { isSignedIn, getToken } = useAuth?.() || {};
  const { user } = useUser?.() || {};

  const {
    btcData: contextBtcData,
    fetchBtcData,
    txMvrvRatioDataBySmoothing,
    fetchTxMvrvRatioData,
    mvrvData,
    fetchMvrvData,
    fearAndGreedData,
    fetchFearAndGreedData,
    altcoinSeasonTimeseriesData,
    fetchAltcoinSeasonTimeseriesData,
  } = useContext(DataContext);

  // Strategy selection
  const [strategy, setStrategy] = useState('risk'); // 'risk' | 'tx-tension' | 'heat-index'
  const [txSmoothing, setTxSmoothing] = useState('sma-7');

  // Common simulation params
  const [dcaAmount, setDcaAmount] = useState(100);
  const [frequency, setFrequency] = useState(7); // days
  const [startDate, setStartDate] = useState('2016-01-01');

  // Risk specific tiers (example starting point inspired by existing)
  const [riskBuyTiers, setRiskBuyTiers] = useState([
    { level: 0.25, multiplier: 2.0, label: 'Strong Oversold' },
    { level: 0.40, multiplier: 1.5, label: 'Medium Oversold' },
  ]);
  const [riskSellTiers, setRiskSellTiers] = useState([
    { level: 0.65, sellPercent: 15, label: 'Medium Overbought' },
    { level: 0.80, sellPercent: 35, label: 'Strong Overbought' },
  ]);

  // Tx Tension specific tiers (ONLY exist in this simulator)
  // NOTE: Tx uses *raw* MVRV/Tx ratio values from the API (typically ~5-45; lower = oversold/buy opportunity).
  // These defaults are in that scale (unlike Risk which is 0-1).
  const [txBuyTiers, setTxBuyTiers] = useState([
    { level: 9, multiplier: 2.5, label: 'Strong Oversold' },
    { level: 15, multiplier: 1.6, label: 'Medium Oversold' },
  ]);
  const [txSellTiers, setTxSellTiers] = useState([
    { level: 22, sellPercent: 12, label: 'Medium Overbought' },
    { level: 32, sellPercent: 28, label: 'Strong Overbought' },
  ]);

  // Heat Index (Market Heat Index) specific tiers + weights.
  // Weights default to the standard ones from /market-heat-index; we attempt to load the user's saved configuration below.
  const [heatWeights, setHeatWeights] = useState({ ...DEFAULT_MARKET_HEAT_WEIGHTS });
  const [heatSmaPeriod, setHeatSmaPeriod] = useState(DEFAULT_MARKET_HEAT_SETTINGS.smaPeriod);
  const [heatStretchToFullRange, setHeatStretchToFullRange] = useState(DEFAULT_MARKET_HEAT_SETTINGS.stretchToFullRange);
  const [heatBuyTiers, setHeatBuyTiers] = useState([
    { level: 25, multiplier: 2.0, label: 'Cold / Strong Oversold' },
    { level: 40, multiplier: 1.5, label: 'Cool / Medium Oversold' },
  ]);
  const [heatSellTiers, setHeatSellTiers] = useState([
    { level: 70, sellPercent: 15, label: 'Warm / Medium Overbought' },
    { level: 85, sellPercent: 35, label: 'Hot / Strong Overbought' },
  ]);

  // Simulation results
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  // Buy strategy: 'periodic-boost' = buy every freq days (boost amount if tier hit), 
  // 'trigger-only' = only buy when a buy tier is hit (freq then acts as cooldown since last buy). No automatic "normal" buys.
  const [buyStrategy, setBuyStrategy] = useState('periodic-boost');

  // When false, sell tiers are ignored — portfolio stays 100% in BTC (no exit/de-risk strategy).
  const [enableDynamicSelling, setEnableDynamicSelling] = useState(true);

  // Persisted results per strategy so switching chips reloads the previous run's chart/portfolio curve for visual comparison
  const [resultsByStrategy, setResultsByStrategy] = useState({});
  const [persistenceReady, setPersistenceReady] = useState(false);

  // Legend toggle state for the portfolio value chart series (invested / portfolioValue / lumpSumValue)
  // Allows hiding the lump sum line which can dominate/skew the view depending on start date.
  const [hiddenPortfolioSeries, setHiddenPortfolioSeries] = useState(new Set());

  const applySavedHeatSettings = useCallback(async () => {
    if (!isSignedIn || !getToken) return;
    try {
      const token = await getToken();
      const resp = await fetch(apiUrl('/api/user-settings/get/'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        const s = data.marketHeatIndexSettings;
        if (!s) return;
        if (s.weights && typeof s.weights === 'object') {
          setHeatWeights((prev) => ({ ...prev, ...s.weights }));
        }
        if (s.smaPeriod) {
          setHeatSmaPeriod(s.smaPeriod);
        }
        if (typeof s.stretchToFullRange === 'boolean') {
          setHeatStretchToFullRange(s.stretchToFullRange);
        }
      }
    } catch (e) {
      // non-fatal; just use the defaults
    }
  }, [isSignedIn, getToken]);

  // Load saved Market Heat Index settings from /market-heat-index so the DCA chart/backtest
  // uses the exact same weights, smoothing, and stretch configuration as the component page.
  useEffect(() => {
    applySavedHeatSettings();
  }, [applySavedHeatSettings]);

  // Re-sync when user switches to the heat strategy (picks up latest MHI tunings without full reload).
  useEffect(() => {
    if (strategy === 'heat-index') {
      applySavedHeatSettings();
    }
  }, [strategy, applySavedHeatSettings]);

  const isTx = strategy === 'tx-tension';
  const isHeat = strategy === 'heat-index';

  // Ensure data
  useEffect(() => {
    fetchBtcData();
    if (isTx) {
      fetchTxMvrvRatioData(txSmoothing);
    }
    if (isHeat) {
      fetchTxMvrvRatioData(TX_MVRV_SMOOTHING);
      fetchMvrvData();
      fetchFearAndGreedData();
      fetchAltcoinSeasonTimeseriesData();
    }
  }, [fetchBtcData, fetchTxMvrvRatioData, fetchMvrvData, fetchFearAndGreedData, fetchAltcoinSeasonTimeseriesData, isTx, isHeat, txSmoothing]);

  // Full data for visualization chart (always entire history)
  const fullChartData = useMemo(() => {
    if (!contextBtcData || contextBtcData.length === 0) return [];

    const priceMap = new Map(contextBtcData.map(d => [d.time, d.value]));

    if (strategy === 'risk') {
      const riskData = calculateRiskMetric(contextBtcData);
      return riskData.map(d => ({
        time: d.time,
        price: d.value,
        indicator: Math.max(0, Math.min(1, d.Risk)),
        raw: d,
      }));
    } else if (strategy === 'tx-tension') {
      const payload = txMvrvRatioDataBySmoothing?.[txSmoothing];
      const ratioSeries = payload?.series || [];
      if (ratioSeries.length === 0) return [];

      return ratioSeries
        .map(d => {
          const p = priceMap.get(d.time) || priceMap.get([...priceMap.keys()].find(k => k >= d.time) || d.time);
          return {
            time: d.time,
            price: p || 0,
            indicator: d.value, // raw MVRV/Tx ratio (high = overbought)
            raw: d,
          };
        })
        .filter(d => d.price > 0);
    } else if (strategy === 'heat-index') {
      const { plottedData } = computeMarketHeatPipeline({
        btcData: contextBtcData || [],
        mvrvData: mvrvData || [],
        fearAndGreedData: fearAndGreedData || [],
        altcoinSeasonTimeseriesData: altcoinSeasonTimeseriesData || [],
        txMvrvRatioDataBySmoothing: txMvrvRatioDataBySmoothing || {},
        weights: heatWeights,
        smaPeriod: heatSmaPeriod,
        stretchToFullRange: heatStretchToFullRange,
        txMvrvSmoothing: TX_MVRV_SMOOTHING,
      });

      return plottedData.map((d) => ({
        time: d.time,
        price: d.btcPrice,
        indicator: d.value,
        raw: d,
      }));
    } else {
      return [];
    }
  }, [
    contextBtcData,
    txMvrvRatioDataBySmoothing,
    strategy,
    txSmoothing,
    heatWeights,
    heatSmaPeriod,
    heatStretchToFullRange,
    mvrvData,
    fearAndGreedData,
    altcoinSeasonTimeseriesData,
  ]);

  // Tx Tension ratio range for the active smoothing — drives slider bounds and metric chart Y-axis
  const txIndicatorRange = useMemo(() => {
    if (!isTx || fullChartData.length === 0) {
      return computeTxIndicatorRange([]);
    }
    return computeTxIndicatorRange(fullChartData.map((d) => d.indicator));
  }, [isTx, fullChartData]);

  const txBuyTiersRef = useRef(txBuyTiers);
  const txSellTiersRef = useRef(txSellTiers);
  const prevTxScaleRef = useRef({ smoothing: txSmoothing, max: null });

  useEffect(() => {
    txBuyTiersRef.current = txBuyTiers;
  }, [txBuyTiers]);

  useEffect(() => {
    txSellTiersRef.current = txSellTiers;
  }, [txSellTiers]);

  // Rescale tier levels when smoothing changes so relative trigger positions stay on-chart
  useEffect(() => {
    if (!isTx || txIndicatorRange.dataMax == null) return;

    const newMax = txIndicatorRange.max;
    const step = txIndicatorRange.step;
    const prev = prevTxScaleRef.current;

    const roundLevel = (value) => Math.max(0, Math.min(newMax, Math.round(value / step) * step));

    const scaleTiers = (oldMax) => {
      if (!oldMax || oldMax <= 0 || newMax <= 0) return;
      const scale = newMax / oldMax;
      setTxBuyTiers((tiers) => tiers.map((t) => ({ ...t, level: roundLevel(t.level * scale) })));
      setTxSellTiers((tiers) => tiers.map((t) => ({ ...t, level: roundLevel(t.level * scale) })));
    };

    if (prev.smoothing !== txSmoothing) {
      if (prev.max != null) {
        scaleTiers(prev.max);
      } else {
        const maxTier = Math.max(
          0,
          ...txBuyTiersRef.current.map((t) => t.level),
          ...txSellTiersRef.current.map((t) => t.level),
        );
        if (maxTier > 0 && maxTier < newMax * 0.12) {
          scaleTiers(TX_LEGACY_REFERENCE_MAX);
        }
      }
      prev.smoothing = txSmoothing;
    }

    prev.max = newMax;
  }, [isTx, txSmoothing, txIndicatorRange.max, txIndicatorRange.step, txIndicatorRange.dataMax]);

  // Filtered data for simulation backtest (respects startDate)
  const simSeriesData = useMemo(() => {
    return fullChartData.filter(d => d.time >= startDate);
  }, [fullChartData, startDate]);

  // For chart we always want full history + visible levels across time
  const chartSeriesData = fullChartData;

  // Current tiers based on strategy (for chart + sim)
  const buyTiers = useMemo(() => (isTx ? txBuyTiers : isHeat ? heatBuyTiers : riskBuyTiers), [isTx, isHeat, txBuyTiers, heatBuyTiers, riskBuyTiers]);
  const sellTiers = useMemo(() => (isTx ? txSellTiers : isHeat ? heatSellTiers : riskSellTiers), [isTx, isHeat, txSellTiers, heatSellTiers, riskSellTiers]);

  // Sorted for logic (lowest buy level first for strongest oversold, highest sell for strongest)
  const sortedBuyTiers = useMemo(() => [...buyTiers].sort((a, b) => a.level - b.level), [buyTiers]);
  const sortedSellTiers = useMemo(() => [...sellTiers].sort((a, b) => b.level - a.level), [sellTiers]);

  const buyModeLabel = useMemo(
    () => (buyStrategy === 'periodic-boost' ? 'Constant DCA' : 'Trigger-Level DCA'),
    [buyStrategy]
  );

  const sellModeLabel = useMemo(
    () => (enableDynamicSelling ? 'Selling On' : 'Hold BTC Only'),
    [enableDynamicSelling]
  );

  const getSellModeKey = useCallback((sellingEnabled) => (
    sellingEnabled ? 'selling-on' : 'hold-btc-only'
  ), []);

  // Resolve cached result for strategy + buy mode + exit strategy (supports legacy formats)
  const getCachedResult = useCallback((strategyKey, buyMode, sellingEnabled) => {
    const saved = resultsByStrategy[strategyKey];
    if (!saved) return null;
    const sellKey = sellingEnabled ? 'selling-on' : 'hold-btc-only';

    const buyBucket = saved[buyMode];
    if (buyBucket?.[sellKey]) return buyBucket[sellKey];
    if (buyBucket?.buyStrategyUsed && buyBucket.sellStrategyEnabled === sellingEnabled) return buyBucket;

    if (saved.buyStrategyUsed === buyMode && saved.sellStrategyEnabled === sellingEnabled) return saved;

    return null;
  }, [resultsByStrategy]);

  // Load previously computed results when switching strategy, buy mode, or exit strategy
  useEffect(() => {
    const modeResult = getCachedResult(strategy, buyStrategy, enableDynamicSelling);
    setSimulationResults(modeResult);
  }, [strategy, buyStrategy, enableDynamicSelling, getCachedResult]);

  // Helper to get applicable action for a given indicator value (used only for backtest logic)
  const getActionForIndicator = useCallback((indicator, sellingEnabled = true) => {
    if (sellingEnabled) {
      for (const tier of sortedSellTiers) {
        if (indicator >= tier.level) {
          return { type: 'sell', percent: tier.sellPercent || 0, tier };
        }
      }
    }
    for (const tier of sortedBuyTiers) {
      if (indicator <= tier.level) {
        return { type: 'buy', multiplier: tier.multiplier || 1, tier };
      }
    }
    return { type: 'normal', multiplier: 1 };
  }, [sortedBuyTiers, sortedSellTiers]);

  const strategyDisplayName = useMemo(() => {
    if (isTx) return 'Tx Tension (MVRV/Tx)';
    if (isHeat) return 'Market Heat Index';
    return 'Bitcoin Risk Metric';
  }, [isTx, isHeat]);

  // Core backtesting engine — pure computation for a single buy mode + selling setting
  const computeBacktestResult = useCallback((buyMode, sellingEnabled) => {
    if (simSeriesData.length === 0) return null;

    let btcHeld = 0;
    let totalUsdInvested = 0;
    let totalUsdRealized = 0;
    const transactions = [];
    const portfolioSeries = [];
    const data = simSeriesData;
    let currentPrice = 0;

    let lastBuyDate = new Date(startDate);
    lastBuyDate.setDate(lastBuyDate.getDate() - frequency);
    let lastSellDate = new Date(startDate);
    lastSellDate.setDate(lastSellDate.getDate() - frequency);

    if (data.length > 0) {
      portfolioSeries.push({
        time: data[0].time,
        invested: 0,
        portfolioValue: 0,
        btcValue: 0,
        cashValue: 0,
        price: data[0].price || 0,
      });
    }

    data.forEach((day) => {
      const dayDate = new Date(day.time);
      currentPrice = day.price;
      const ind = day.indicator;
      const action = getActionForIndicator(ind, sellingEnabled);

      const daysSinceBuy = (dayDate - lastBuyDate) / (1000 * 60 * 60 * 24);
      const daysSinceSell = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);
      const buyIntervalOk = daysSinceBuy >= frequency;
      const sellIntervalOk = daysSinceSell >= frequency;

      if (action.type === 'buy' && buyIntervalOk) {
        const usdToSpend = dcaAmount * (action.multiplier || 1);
        if (usdToSpend > 0 && currentPrice > 0) {
          const btcBought = usdToSpend / currentPrice;
          btcHeld += btcBought;
          totalUsdInvested += usdToSpend;
          transactions.push({
            date: day.time,
            type: 'BUY',
            usd: usdToSpend,
            btc: btcBought,
            price: currentPrice,
            indicator: ind.toFixed(3),
            note: action.tier ? `${action.tier.label || 'Boost'} (x${action.multiplier})` : 'Normal',
          });
          lastBuyDate = dayDate;
        }
      } else if (sellingEnabled && action.type === 'sell' && sellIntervalOk && btcHeld > 0) {
        const sellPct = action.percent || 0;
        if (sellPct > 0) {
          const btcSold = btcHeld * (sellPct / 100);
          const usdReceived = btcSold * currentPrice;
          btcHeld -= btcSold;
          totalUsdRealized += usdReceived;
          transactions.push({
            date: day.time,
            type: 'SELL',
            usd: usdReceived,
            btc: btcSold,
            price: currentPrice,
            indicator: ind.toFixed(3),
            note: `${sellPct}% of holdings @ ${action.tier?.label || 'Overbought'}`,
          });
          lastSellDate = dayDate;
        }
      } else if (buyMode === 'periodic-boost' && buyIntervalOk) {
        if (dcaAmount > 0 && currentPrice > 0) {
          const btcBought = dcaAmount / currentPrice;
          btcHeld += btcBought;
          totalUsdInvested += dcaAmount;
          transactions.push({
            date: day.time,
            type: 'BUY',
            usd: dcaAmount,
            btc: btcBought,
            price: currentPrice,
            indicator: ind.toFixed(3),
            note: 'Normal DCA',
          });
          lastBuyDate = dayDate;
        }
      }

      const btcValue = btcHeld * currentPrice;
      portfolioSeries.push({
        time: day.time,
        invested: totalUsdInvested,
        portfolioValue: totalUsdRealized + btcValue,
        btcValue,
        cashValue: totalUsdRealized,
        price: currentPrice,
      });
    });

    const finalBtcValue = btcHeld * currentPrice;
    const totalPortfolio = totalUsdRealized + finalBtcValue;
    const netGain = totalPortfolio - totalUsdInvested;
    const roi = totalUsdInvested > 0 ? (netGain / totalUsdInvested) * 100 : 0;

    if (data.length > 0) {
      const lastTime = data[data.length - 1].time;
      const lastInvested = totalUsdInvested;
      const lastPortfolio = totalUsdRealized + (btcHeld * currentPrice);
      if (portfolioSeries.length === 0 || portfolioSeries[portfolioSeries.length - 1].time !== lastTime) {
        portfolioSeries.push({
          time: lastTime,
          invested: lastInvested,
          portfolioValue: lastPortfolio,
          btcValue: finalBtcValue,
          cashValue: totalUsdRealized,
          price: currentPrice,
        });
      }
    }

    if (data.length > 0 && totalUsdInvested > 0 && data[0].price > 0) {
      const lumpBtc = totalUsdInvested / data[0].price;
      portfolioSeries.forEach((pt) => {
        const ptPrice = (pt.price != null) ? pt.price : currentPrice;
        pt.lumpSumValue = lumpBtc * ptPrice;
      });
    }

    let staticBtc = 0;
    let staticInvested = 0;
    let staticLastDate = new Date(startDate);
    staticLastDate.setDate(staticLastDate.getDate() - frequency);

    data.forEach(day => {
      const d = new Date(day.time);
      const delta = (d - staticLastDate) / (1000 * 60 * 60 * 24);
      if (delta >= frequency && day.price > 0) {
        staticBtc += dcaAmount / day.price;
        staticInvested += dcaAmount;
        staticLastDate = d;
      }
    });
    const staticFinalValue = staticBtc * currentPrice;
    const staticRoi = staticInvested > 0 ? ((staticFinalValue - staticInvested) / staticInvested) * 100 : 0;

    let lumpSumFinal = 0;
    let lumpSumRoi = 0;
    if (data.length > 0 && totalUsdInvested > 0 && data[0].price > 0) {
      const firstPrice = data[0].price;
      const lumpBtc = totalUsdInvested / firstPrice;
      lumpSumFinal = lumpBtc * currentPrice;
      lumpSumRoi = ((lumpSumFinal - totalUsdInvested) / totalUsdInvested) * 100;
    }

    const buyModeLabelUsed = buyMode === 'periodic-boost' ? 'Constant DCA' : 'Trigger-Level DCA';

    return {
      strategy: strategyDisplayName,
      totalUsdInvested,
      totalUsdRealized,
      btcHeld,
      finalBtcValue,
      totalPortfolio,
      roi,
      transactionCount: transactions.length,
      transactions,
      staticDca: {
        invested: staticInvested,
        finalValue: staticFinalValue,
        roi: staticRoi,
        btc: staticBtc,
      },
      lumpSum: {
        invested: totalUsdInvested,
        finalValue: lumpSumFinal,
        roi: lumpSumRoi,
      },
      portfolioSeries,
      buyStrategyUsed: buyMode,
      buyModeLabel: buyModeLabelUsed,
      sellStrategyEnabled: sellingEnabled,
      lastPrice: currentPrice,
      dataPoints: data.length,
    };
  }, [simSeriesData, dcaAmount, frequency, startDate, getActionForIndicator, strategyDisplayName]);

  const hasResultsForCurrentStrategy = useMemo(
    () => Boolean(
      getCachedResult(strategy, 'periodic-boost', true)
      || getCachedResult(strategy, 'periodic-boost', false)
      || getCachedResult(strategy, 'trigger-only', true)
      || getCachedResult(strategy, 'trigger-only', false)
    ),
    [strategy, getCachedResult]
  );

  const alternateBuyModeResult = useMemo(
    () => getCachedResult(strategy, buyStrategy === 'periodic-boost' ? 'trigger-only' : 'periodic-boost', enableDynamicSelling),
    [strategy, buyStrategy, enableDynamicSelling, getCachedResult]
  );

  const alternateSellModeResult = useMemo(
    () => getCachedResult(strategy, buyStrategy, !enableDynamicSelling),
    [strategy, buyStrategy, enableDynamicSelling, getCachedResult]
  );

  // Run all buy mode + exit strategy combinations so toggles switch instantly without re-running
  const runBacktest = useCallback(() => {
    if (simSeriesData.length === 0) return null;

    setIsRunning(true);

    const strategyResults = {
      'periodic-boost': {
        'selling-on': computeBacktestResult('periodic-boost', true),
        'hold-btc-only': computeBacktestResult('periodic-boost', false),
      },
      'trigger-only': {
        'selling-on': computeBacktestResult('trigger-only', true),
        'hold-btc-only': computeBacktestResult('trigger-only', false),
      },
    };

    const sellKey = getSellModeKey(enableDynamicSelling);
    setResultsByStrategy(prev => ({ ...prev, [strategy]: strategyResults }));
    setSimulationResults(strategyResults[buyStrategy][sellKey]);
    setIsRunning(false);
    setShowTrades(true);
  }, [simSeriesData, computeBacktestResult, strategy, buyStrategy, enableDynamicSelling, getSellModeKey]);

  // Tier editor helpers
  const updateTier = (listSetter, index, key, value) => {
    listSetter(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: parseFloat(value) };
      return copy;
    });
  };

  const addTier = (listSetter, isBuy) => {
    listSetter(prev => {
      const txDefaults = buildTxTierDefaults(txIndicatorRange.max, txIndicatorRange.step);
      const def = isBuy
        ? { level: isHeat ? 30 : isTx ? txDefaults.buy[0].level : 0.30, multiplier: 1.5, label: 'New Tier' }
        : { level: isHeat ? 75 : isTx ? txDefaults.sell[0].level : 0.70, sellPercent: 20, label: 'New Tier' };
      return [...prev, def];
    });
  };

  const removeTier = (listSetter, index) => {
    listSetter(prev => prev.filter((_, i) => i !== index));
  };

  // Reset to sensible defaults per strategy
  const resetDefaults = () => {
    if (isTx) {
      const txDefaults = buildTxTierDefaults(txIndicatorRange.max, txIndicatorRange.step);
      setTxBuyTiers(txDefaults.buy);
      setTxSellTiers(txDefaults.sell);
    } else if (isHeat) {
      setHeatBuyTiers([
        { level: 25, multiplier: 2.0, label: 'Cold / Strong Oversold' },
        { level: 40, multiplier: 1.5, label: 'Cool / Medium Oversold' },
      ]);
      setHeatSellTiers([
        { level: 70, sellPercent: 15, label: 'Warm / Medium Overbought' },
        { level: 85, sellPercent: 35, label: 'Hot / Strong Overbought' },
      ]);
    } else {
      setRiskBuyTiers([
        { level: 0.25, multiplier: 2.0, label: 'Strong Oversold' },
        { level: 0.40, multiplier: 1.5, label: 'Medium Oversold' },
      ]);
      setRiskSellTiers([
        { level: 0.65, sellPercent: 15, label: 'Medium Overbought' },
        { level: 0.80, sellPercent: 35, label: 'Strong Overbought' },
      ]);
    }
  };

  const txLevelDecimals = txIndicatorRange.max > 100 ? 0 : 1;

  const currentTiersDisplay = isTx
    ? `MVRV/Tx Ratio (${txSmoothing}) — observed range ~${txIndicatorRange.dataMin.toFixed(txLevelDecimals)}–${txIndicatorRange.dataMax.toFixed(txLevelDecimals)}; tier sliders span 0–${txIndicatorRange.max}. Lower = oversold/buy; higher = overbought/sell.`
    : isHeat
      ? `Market Heat Index (0-100) — synced with /market-heat-index (${getMarketHeatSmaLabel(heatSmaPeriod)} smoothing${heatStretchToFullRange ? ', stretched to 0–100' : ''}). Low = cold/oversold; high = hot/overbought.`
      : 'Risk (0 = low risk / good entry, 1 = high risk)';

  // Note: getSimulatorLevels was previously used to overlay tiers on the embedded risk/tx charts.
  // Those embeds have been removed per requirements; the levels array is no longer needed here
  // but the tier state (buyTiers/sellTiers) continues to drive the backtest logic.

  // Toggle handler for portfolio chart legend (supports hiding lump sum to avoid skew from start-date timing)
  const togglePortfolioSeries = useCallback((dataKey) => {
    if (!dataKey) return;
    setHiddenPortfolioSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  const portfolioSeriesLegend = useMemo(() => ([
    { dataKey: 'invested', label: 'Total Invested (DCA)', color: colors.greenAccent[500], dashed: false },
    { dataKey: 'portfolioValue', label: 'Portfolio Value (incl. sells + remaining BTC)', color: colors.blueAccent[400], dashed: false },
    { dataKey: 'lumpSumValue', label: 'Lump Sum (final capital all-in at start, held)', color: colors.grey[300], dashed: true },
  ]), [colors]);

  const renderPortfolioLegend = useCallback(() => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', pt: 1, pb: 0.5 }}>
      {portfolioSeriesLegend.map((item) => {
        const isHidden = hiddenPortfolioSeries.has(item.dataKey);
        return (
          <Box
            key={item.dataKey}
            onClick={() => togglePortfolioSeries(item.dataKey)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              userSelect: 'none',
              opacity: isHidden ? 0.4 : 1,
              transition: 'opacity 0.15s ease',
              '&:hover': { opacity: isHidden ? 0.6 : 0.85 },
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 0,
                borderTop: `3px ${item.dashed ? 'dashed' : 'solid'} ${item.color}`,
                opacity: isHidden ? 0.35 : 1,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: isHidden ? colors.grey[500] : colors.grey[200],
                fontSize: '0.75rem',
                lineHeight: 1.2,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  ), [portfolioSeriesLegend, hiddenPortfolioSeries, togglePortfolioSeries, colors]);

  // Subtle level bands + lines for the decision metric chart underneath the portfolio chart.
  // Stronger tiers (farther extremes) get slightly higher opacity (more visible tint) but still subtle.
  const metricChartElements = useMemo(() => {
    const elements = [];
    if (!fullChartData || fullChartData.length === 0) return elements;

    const buysSorted = [...buyTiers].sort((a, b) => a.level - b.level);
    const sellsSortedDesc = [...sellTiers].sort((a, b) => b.level - a.level);

    const isHeat = strategy === 'heat-index';
    const isRisk = strategy === 'risk';

    // Buy zones (lower indicator = stronger buy for all three strategies)
    let prevBuy = null;
    buysSorted.forEach((tier, idx) => {
      const strength = (buysSorted.length - idx) / Math.max(1, buysSorted.length); // first (lowest) = strongest
      const alpha = 0.07 + (strength * 0.16); // subtle range ~0.07-0.23
      const fill = isHeat
        ? `rgba(0, 188, 212, ${alpha})`   // cyan/teal for heat
        : `rgba(76, 175, 80, ${alpha})`;  // green for risk / tx
      elements.push(
        <ReferenceArea
          key={`buy-zone-${idx}`}
          y1={prevBuy}
          y2={tier.level}
          fill={fill}
          fillOpacity={1}
          stroke="none"
        />
      );
      prevBuy = tier.level;
    });

    // Sell zones (higher = stronger sell) — greyed when exit strategy is Hold BTC Only
    const sellActive = enableDynamicSelling;
    let prevSell = null;
    sellsSortedDesc.forEach((tier, idx) => {
      const strength = (sellsSortedDesc.length - idx) / Math.max(1, sellsSortedDesc.length);
      const alpha = 0.07 + (strength * 0.16);
      const fill = sellActive
        ? `rgba(239, 83, 80, ${alpha})`
        : `rgba(158, 158, 158, ${alpha * 0.55})`;
      elements.push(
        <ReferenceArea
          key={`sell-zone-${idx}`}
          y1={tier.level}
          y2={prevSell}
          fill={fill}
          fillOpacity={sellActive ? 1 : 0.7}
          stroke="none"
        />
      );
      prevSell = tier.level;
    });

    // Thin dashed reference lines at exact tier levels (for precision, low visual weight)
    buysSorted.forEach((tier, idx) => {
      elements.push(
        <ReferenceLine
          key={`buy-line-${idx}`}
          y={tier.level}
          stroke={isHeat ? '#00bcd4' : '#4caf50'}
          strokeDasharray="2 2"
          strokeOpacity={0.65}
          strokeWidth={1}
        />
      );
    });
    sellsSortedDesc.forEach((tier, idx) => {
      elements.push(
        <ReferenceLine
          key={`sell-line-${idx}`}
          y={tier.level}
          stroke={sellActive ? '#ef5350' : colors.grey[500]}
          strokeDasharray="2 2"
          strokeOpacity={sellActive ? 0.65 : 0.35}
          strokeWidth={1}
        />
      );
    });

    return elements;
  }, [buyTiers, sellTiers, strategy, fullChartData, enableDynamicSelling, colors]);

  const metricLabel = strategy === 'risk'
    ? 'Bitcoin Risk Metric (0-1)'
    : strategy === 'tx-tension'
      ? `Tx Tension (MVRV/Tx Ratio, ${txSmoothing}, 0–${txIndicatorRange.max})`
      : `Market Heat Index (0-100, ${getMarketHeatSmaLabel(heatSmaPeriod)}${heatStretchToFullRange ? ', stretched' : ''})`;

  const metricLineColor = strategy === 'risk'
    ? colors.greenAccent[400]
    : strategy === 'tx-tension'
      ? colors.blueAccent[400]
      : '#00bcd4';

  const metricYDomain = strategy === 'risk'
    ? [0, 1.02]
    : strategy === 'heat-index'
      ? [0, 102]
      : isTx
        ? [0, txIndicatorRange.max]
        : ['auto', 'auto'];

  // Strategy comparison data - uses the currently selected buy mode for fair side-by-side ROI
  const strategyComparisons = useMemo(() => {
    const entries = Object.entries(resultsByStrategy || {}).map(([key]) => {
      const modeResult = getCachedResult(key, buyStrategy, enableDynamicSelling);
      return {
        key,
        name: key === 'risk' ? 'Bitcoin Risk Metric' : key === 'tx-tension' ? 'Tx Tension (MVRV/Tx)' : key === 'heat-index' ? 'Market Heat Index' : key,
        roi: modeResult?.roi ?? 0,
      };
    }).filter(e => getCachedResult(e.key, buyStrategy, enableDynamicSelling));
    return entries.sort((a, b) => b.roi - a.roi);
  }, [resultsByStrategy, buyStrategy, enableDynamicSelling, getCachedResult]);

  const hasMultipleStrategiesRun = strategyComparisons.length > 1;

  // Clear only the saved simulation results (keeps user's tuned tiers, weights, and parameters)
  const clearSimulations = useCallback(() => {
    setResultsByStrategy({});
    setSimulationResults(null);
    setShowTrades(false);
    setHiddenPortfolioSeries(new Set());
    clearPersistedResultsByStrategy();
  }, []);

  // ============================================
  // Persistence: localStorage for simulations + config between sessions and component mounts
  // ============================================

  // Load persisted state once on mount (after initial defaults)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DCA_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);

        if (saved.strategy) setStrategy(saved.strategy);
        if (typeof saved.txSmoothing === 'string') setTxSmoothing(saved.txSmoothing);
        if (typeof saved.dcaAmount === 'number') setDcaAmount(saved.dcaAmount);
        if (typeof saved.frequency === 'number') setFrequency(saved.frequency);
        if (typeof saved.startDate === 'string') setStartDate(saved.startDate);
        if (typeof saved.buyStrategy === 'string') setBuyStrategy(saved.buyStrategy);
        if (typeof saved.enableDynamicSelling === 'boolean') setEnableDynamicSelling(saved.enableDynamicSelling);

        if (Array.isArray(saved.riskBuyTiers)) setRiskBuyTiers(saved.riskBuyTiers);
        if (Array.isArray(saved.riskSellTiers)) setRiskSellTiers(saved.riskSellTiers);
        if (Array.isArray(saved.txBuyTiers)) setTxBuyTiers(saved.txBuyTiers);
        if (Array.isArray(saved.txSellTiers)) setTxSellTiers(saved.txSellTiers);
        if (Array.isArray(saved.heatBuyTiers)) setHeatBuyTiers(saved.heatBuyTiers);
        if (Array.isArray(saved.heatSellTiers)) setHeatSellTiers(saved.heatSellTiers);

        if (saved.heatWeights && typeof saved.heatWeights === 'object') {
          setHeatWeights((prev) => ({ ...prev, ...saved.heatWeights }));
        }
        if (typeof saved.heatSmaPeriod === 'string') setHeatSmaPeriod(saved.heatSmaPeriod);
        if (typeof saved.heatStretchToFullRange === 'boolean') setHeatStretchToFullRange(saved.heatStretchToFullRange);
      }

      const migratedResults = loadPersistedResultsByStrategy();
      if (Object.keys(migratedResults).length > 0) {
        setResultsByStrategy(migratedResults);
      }

      // Note: simulationResults is restored via the existing resultsByStrategy + strategy effect
      // hiddenPortfolioSeries is intentionally not restored (UI preference)
    } catch (e) {
      console.warn('Failed to load persisted DCA simulator state', e);
    } finally {
      setPersistenceReady(true);
    }
  }, []); // run once

  // Save config + per-strategy results only after hydration (avoids mount race wiping saved runs)
  useEffect(() => {
    if (!persistenceReady) return;

    const stateToPersist = {
      strategy,
      txSmoothing,
      dcaAmount,
      frequency,
      startDate,
      buyStrategy,
      enableDynamicSelling,
      riskBuyTiers,
      riskSellTiers,
      txBuyTiers,
      txSellTiers,
      heatWeights,
      heatSmaPeriod,
      heatStretchToFullRange,
      heatBuyTiers,
      heatSellTiers,
    };
    try {
      localStorage.setItem(DCA_STATE_KEY, JSON.stringify(stateToPersist));
      savePersistedResultsByStrategy(resultsByStrategy);
    } catch (e) {
      console.warn('Failed to persist DCA simulator state (storage full?)', e);
    }
  }, [
    persistenceReady,
    strategy,
    txSmoothing,
    dcaAmount,
    frequency,
    startDate,
    buyStrategy,
    enableDynamicSelling,
    riskBuyTiers,
    riskSellTiers,
    txBuyTiers,
    txSellTiers,
    heatWeights,
    heatSmaPeriod,
    heatStretchToFullRange,
    heatBuyTiers,
    heatSellTiers,
    resultsByStrategy,
  ]);

  return (
    <Box sx={{ p: isMobile ? 1 : { xs: 1, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Strategy Selector - shell now provides the "Dynamic DCA Simulator" title from meta (no more CryptoLogical above it) */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 3, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: colors.grey[200] }}>Strategy / Indicator</Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={clearSimulations}
            sx={{ 
              fontSize: '0.7rem', 
              py: 0.25, 
              px: 1,
              minWidth: 'auto',
              borderColor: colors.redAccent ? colors.redAccent[400] : undefined 
            }}
          >
            Clear Simulations
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip
            label="Bitcoin Risk Metric (0-1)"
            onClick={() => setStrategy('risk')}
            color={strategy === 'risk' ? 'success' : 'default'}
            variant={strategy === 'risk' ? 'filled' : 'outlined'}
            sx={{ fontSize: isMobile ? '0.8rem' : '0.95rem', py: isMobile ? 1 : 2 }}
          />
          <Chip
            label="Tx Tension (MVRV/Tx Ratio)"
            onClick={() => setStrategy('tx-tension')}
            color={strategy === 'tx-tension' ? 'success' : 'default'}
            variant={strategy === 'tx-tension' ? 'filled' : 'outlined'}
            sx={{ fontSize: isMobile ? '0.8rem' : '0.95rem', py: isMobile ? 1 : 2 }}
          />
          <Chip
            label="Market Heat Index (composite)"
            onClick={() => setStrategy('heat-index')}
            color={strategy === 'heat-index' ? 'success' : 'default'}
            variant={strategy === 'heat-index' ? 'filled' : 'outlined'}
            sx={{ fontSize: isMobile ? '0.8rem' : '0.95rem', py: isMobile ? 1 : 2 }}
          />
          {isTx && (
            <FormControl size="small" sx={{ minWidth: 140, ml: 1 }}>
              <InputLabel>Smoothing</InputLabel>
              <Select value={txSmoothing} label="Smoothing" onChange={e => setTxSmoothing(e.target.value)}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="sma-3">3-day SMA</MenuItem>
                <MenuItem value="sma-7">7-day SMA</MenuItem>
                <MenuItem value="sma-14">14-day SMA</MenuItem>
                <MenuItem value="sma-21">21-day SMA</MenuItem>
                <MenuItem value="sma-28">28-day SMA</MenuItem>
                <MenuItem value="sma-42">6-week SMA</MenuItem>
                <MenuItem value="sma-56">8-week SMA</MenuItem>
                <MenuItem value="sma-140">20-week SMA</MenuItem>
                <MenuItem value="ema-3">3-day EMA</MenuItem>
                <MenuItem value="ema-7">7-day EMA</MenuItem>
                <MenuItem value="ema-14">14-day EMA</MenuItem>
                <MenuItem value="ema-21">21-day EMA</MenuItem>
                <MenuItem value="ema-28">28-day EMA</MenuItem>
                <MenuItem value="ema-42">6-week EMA</MenuItem>
                <MenuItem value="ema-56">8-week EMA</MenuItem>
                <MenuItem value="ema-140">20-week EMA</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: colors.grey[400] }}>
          {currentTiersDisplay}
        </Typography>
      </Paper>

      {/* Compact top-level parameters (moved higher so users can set DCA amount/freq/start/buy-mode + run without scrolling past the chart) */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: colors.grey[200] }}>Backtest Parameters (set these first)</Typography>
        <Grid container spacing={isMobile ? 1.5 : 2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="DCA Amount (USD)"
              type="number"
              value={dcaAmount}
              onChange={e => setDcaAmount(Math.max(1, parseFloat(e.target.value) || 100))}
              fullWidth size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Frequency (days)</InputLabel>
              <Select value={frequency} label="Frequency (days)" onChange={e => setFrequency(parseInt(e.target.value))}>
                <MenuItem value={1}>Daily</MenuItem>
                <MenuItem value={7}>Weekly</MenuItem>
                <MenuItem value={14}>Bi-weekly</MenuItem>
                <MenuItem value={28}>Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              fullWidth size="small" InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: colors.grey[200], display: 'block' }}>Buy Mode</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Button size="small" variant={buyStrategy === 'periodic-boost' ? 'contained' : 'outlined'} onClick={() => setBuyStrategy('periodic-boost')}
                sx={{ color: buyStrategy === 'periodic-boost' ? '#111' : colors.greenAccent[500], borderColor: colors.greenAccent[500], backgroundColor: buyStrategy === 'periodic-boost' ? colors.greenAccent[500] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                Constant
              </Button>
              <Button size="small" variant={buyStrategy === 'trigger-only' ? 'contained' : 'outlined'} onClick={() => setBuyStrategy('trigger-only')}
                sx={{ color: buyStrategy === 'trigger-only' ? '#111' : colors.blueAccent[400], borderColor: colors.blueAccent[400], backgroundColor: buyStrategy === 'trigger-only' ? colors.blueAccent[400] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                On Trigger
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: colors.grey[200], display: 'block' }}>Exit Strategy</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Button size="small" variant={enableDynamicSelling ? 'contained' : 'outlined'} onClick={() => setEnableDynamicSelling(true)}
                sx={{ color: enableDynamicSelling ? '#111' : colors.blueAccent[400], borderColor: colors.blueAccent[400], backgroundColor: enableDynamicSelling ? colors.blueAccent[400] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                Selling On
              </Button>
              <Button size="small" variant={!enableDynamicSelling ? 'contained' : 'outlined'} onClick={() => setEnableDynamicSelling(false)}
                sx={{ color: !enableDynamicSelling ? '#111' : colors.grey[400], borderColor: colors.grey[500], backgroundColor: !enableDynamicSelling ? colors.grey[400] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                Hodl BTC
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ 
                backgroundColor: colors.greenAccent[500], 
                color: '#111', 
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#da07ff',
                  color: '#fff'
                }
              }}
              startIcon={<PlayArrowIcon />}
              onClick={runBacktest}
              disabled={isRunning || simSeriesData.length === 0}
            >
              {isRunning ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
          </Grid>
        </Grid>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: colors.grey[500] }}>
          Run backtest computes all four combinations (Constant / Trigger-Level × Selling On / Hold BTC Only) for instant comparison.
          {enableDynamicSelling
            ? ' Selling On: portfolio = cash from sells (price-stable) + remaining BTC (moves with price).'
            : ' Hold BTC Only: portfolio = 100% BTC holdings — entire value moves with Bitcoin price.'}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Tiers / Dynamic Levels (left column). Main params + Run are now in the compact bar above so they are visible instantly without scrolling past the chart. */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: isMobile ? 1.5 : 2.5, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: colors.grey[100] }}>Dynamic Levels (edit then re-run)</Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={resetDefaults} 
                startIcon={<RestartAltIcon />}
                sx={{ 
                  color: colors.greenAccent[500], 
                  borderColor: colors.greenAccent[500],
                  '&:hover': { 
                    borderColor: colors.greenAccent[400], 
                    backgroundColor: 'rgba(76, 206, 172, 0.08)' 
                  } 
                }}
              >
                Reset Defaults
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mb: 1.5 }}>
              These control the buy-boost and sell rules for the current strategy. Use the top bar for amount, frequency, start date and buy mode.
            </Typography>

            {/* Buy / Oversold tiers */}
            <Accordion defaultExpanded sx={{ backgroundColor: colors.primary[500], mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ color: colors.greenAccent[300], fontWeight: 500 }}>Buy Boost Tiers (Oversold / Low Risk)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {buyTiers.map((tier, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 1.5, background: colors.primary[500], borderLeft: `4px solid ${colors.greenAccent[500]}`, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.greenAccent[200] }}>{tier.label || `Tier ${idx + 1}`} — {Number(tier.level).toFixed(isTx ? txLevelDecimals : 2)}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.grey[200] }}>Trigger Level</Typography>
                        <Slider
                          value={Math.min(tier.level, isTx ? txIndicatorRange.max : isHeat ? 100 : 1)}
                          min={isHeat ? 0 : isTx ? txIndicatorRange.min : 0}
                          max={isHeat ? 100 : isTx ? txIndicatorRange.max : 1}
                          step={isHeat ? 1 : isTx ? txIndicatorRange.step : 0.01}
                          onChange={(_, v) => {
                            const setter = isHeat ? setHeatBuyTiers : isTx ? setTxBuyTiers : setRiskBuyTiers;
                            updateTier(setter, idx, 'level', v);
                          }}
                          valueLabelDisplay="auto"
                          sx={{ 
                            color: colors.greenAccent[500],
                            '& .MuiSlider-thumb': {
                              width: 20,
                              height: 20,
                            }
                          }}
                        />
                      </Box>
                      <TextField
                        label="Multiplier"
                        type="number" size="small" sx={{ width: 90, '& .MuiInputBase-input': { color: colors.grey[100] } }}
                        value={tier.multiplier}
                        onChange={e => {
                          const setter = isTx ? setTxBuyTiers : setRiskBuyTiers;
                          updateTier(setter, idx, 'multiplier', e.target.value);
                        }}
                      />
                      <Button size="small" color="error" onClick={() => {
                        const setter = isHeat ? setHeatBuyTiers : isTx ? setTxBuyTiers : setRiskBuyTiers;
                        removeTier(setter, idx);
                      }}>×</Button>
                    </Box>
                  </Box>
                ))}
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => addTier(isHeat ? setHeatBuyTiers : isTx ? setTxBuyTiers : setRiskBuyTiers, true)}
                  sx={{ backgroundColor: colors.greenAccent[500], color: '#111', '&:hover': { backgroundColor: colors.greenAccent[400] }, fontSize: '0.75rem' }}
                >
                  + Add Buy Boost Tier
                </Button>
              </AccordionDetails>
            </Accordion>

            {/* Sell / Overbought tiers */}
            <Accordion defaultExpanded sx={{ backgroundColor: colors.primary[500] }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ color: colors.blueAccent[300], fontWeight: 500 }}>Sell / De-risk Tiers (Overbought / High Risk)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {sellTiers.map((tier, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 1.5, background: colors.primary[500], borderLeft: `4px solid ${colors.blueAccent[400]}`, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.blueAccent[200] }}>{tier.label || `Tier ${idx + 1}`} — {Number(tier.level).toFixed(isTx ? txLevelDecimals : 2)}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.grey[200] }}>Trigger Level</Typography>
                        <Slider
                          value={Math.min(tier.level, isTx ? txIndicatorRange.max : isHeat ? 100 : 1)}
                          min={isHeat ? 0 : isTx ? txIndicatorRange.min : 0}
                          max={isHeat ? 100 : isTx ? txIndicatorRange.max : 1}
                          step={isHeat ? 1 : isTx ? txIndicatorRange.step : 0.01}
                          onChange={(_, v) => {
                            const setter = isHeat ? setHeatSellTiers : isTx ? setTxSellTiers : setRiskSellTiers;
                            updateTier(setter, idx, 'level', v);
                          }}
                          valueLabelDisplay="auto"
                          sx={{ 
                            color: colors.blueAccent[400],
                            '& .MuiSlider-thumb': {
                              width: 20,
                              height: 20,
                            }
                          }}
                        />
                      </Box>
                      <TextField
                        label="% to Sell"
                        type="number" size="small" sx={{ width: 90, '& .MuiInputBase-input': { color: colors.grey[100] } }}
                        value={tier.sellPercent}
                        onChange={e => {
                          const setter = isTx ? setTxSellTiers : setRiskSellTiers;
                          updateTier(setter, idx, 'sellPercent', e.target.value);
                        }}
                      />
                      <Button size="small" color="error" onClick={() => {
                        const setter = isHeat ? setHeatSellTiers : isTx ? setTxSellTiers : setRiskSellTiers;
                        removeTier(setter, idx);
                      }}>×</Button>
                    </Box>
                  </Box>
                ))}
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => addTier(isHeat ? setHeatSellTiers : isTx ? setTxSellTiers : setRiskSellTiers, false)}
                  sx={{ backgroundColor: colors.blueAccent[400], color: '#111', '&:hover': { backgroundColor: colors.blueAccent[300] }, fontSize: '0.75rem' }}
                >
                  + Add Sell Tier
                </Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: colors.grey[400] }}>
                  Higher tiers take precedence when multiple levels are triggered.
                  {!enableDynamicSelling && hasResultsForCurrentStrategy && ' (Viewing Hold BTC Only results — toggle Selling On above to compare exit strategy benefit.)'}
                  {!enableDynamicSelling && !hasResultsForCurrentStrategy && ' (Hold BTC Only selected — run backtest to compare against Selling On.)'}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: colors.grey[500] }}>
              After changing levels, use the Run button in the bar above.
            </Typography>
          </Paper>
        </Grid>

        {/* Portfolio Value Chart (replaces the embedded risk/tx indicator chart) */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: isMobile ? 1.5 : 2, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}`, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6">Portfolio Value vs Total Invested</Typography>
                {simulationResults && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={simulationResults.buyModeLabel || buyModeLabel}
                      sx={{ backgroundColor: buyStrategy === 'periodic-boost' ? colors.greenAccent[700] : colors.blueAccent[700], color: colors.grey[100], fontSize: '0.7rem', height: 22 }}
                    />
                    <Chip
                      size="small"
                      label={simulationResults.sellStrategyEnabled ? 'Exit: Selling On' : 'Exit: Hold BTC Only'}
                      sx={{ backgroundColor: simulationResults.sellStrategyEnabled ? colors.blueAccent[800] : colors.primary[600], color: colors.grey[200], fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>
                )}
              </Box>
              <MuiTooltip title="Shows cumulative capital deployed via DCA over time, and the current total portfolio value (cash from sells + value of BTC still held when exit strategy is on; 100% BTC when off).">
                <InfoOutlinedIcon fontSize="small" sx={{ color: colors.grey[400] }} />
              </MuiTooltip>
            </Box>

            <Box sx={{ 
              width: '100%', 
              minHeight: isMobile ? 260 : 380, 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${colors.primary[500]}`,
              background: colors.primary[700],
              p: 1
            }}>
              {simulationResults && simulationResults.portfolioSeries && simulationResults.portfolioSeries.length > 1 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 240 : 360}>
                  <LineChart data={(simulationResults.portfolioSeries || []).map(pt => ({ 
                    ...pt, 
                    lumpSumValue: pt.lumpSumValue != null ? pt.lumpSumValue : 0 
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.primary[500]} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: colors.grey[300], fontSize: 10 }}
                      tickLine={{ stroke: colors.grey[600] }}
                    />
                    <YAxis 
                      tickFormatter={(v) => '$' + Math.round(v).toLocaleString()}
                      tick={{ fill: colors.grey[300], fontSize: 10 }}
                      tickLine={{ stroke: colors.grey[600] }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}`, color: colors.grey[100] }}
                      formatter={(value, name) => ['$' + Math.round(value).toLocaleString(), name]}
                      labelFormatter={(label) => `${label} • ${simulationResults?.buyModeLabel || buyModeLabel} • ${simulationResults?.sellStrategyEnabled ? 'Selling On' : 'Hold BTC Only'}`}
                    />
                    <Legend content={renderPortfolioLegend} />
                    <Line 
                      hide={hiddenPortfolioSeries.has('invested')}
                      type="step" 
                      dataKey="invested" 
                      name="Total Invested (DCA)" 
                      stroke={colors.greenAccent[500]} 
                      strokeWidth={2.5} 
                      dot={false} 
                      activeDot={{ r: 3, fill: colors.greenAccent[400] }}
                    />
                    <Line 
                      hide={hiddenPortfolioSeries.has('portfolioValue')}
                      type="linear" 
                      dataKey="portfolioValue" 
                      name="Portfolio Value (incl. sells + remaining BTC)" 
                      stroke={colors.blueAccent[400]} 
                      strokeWidth={2.5} 
                      dot={false} 
                      activeDot={{ r: 3, fill: colors.blueAccent[400] }}
                    />
                    {/* Lump sum comparison line: same final capital all deployed at the sim's first price, held (no sells/boosts). Dashed for visual distinction. Click legend to toggle (useful when start date creates skew). */}
                    <Line 
                      hide={hiddenPortfolioSeries.has('lumpSumValue')}
                      type="linear" 
                      dataKey="lumpSumValue" 
                      name="Lump Sum (final capital all-in at start, held)" 
                      stroke={colors.grey[300]} 
                      strokeWidth={2} 
                      strokeDasharray="5 3"
                      dot={false} 
                      activeDot={{ r: 3, fill: colors.grey[300] }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  minHeight: isMobile ? 220 : 340, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: colors.grey[400],
                  textAlign: 'center',
                  px: 3
                }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Run a backtest to populate this chart.
                  </Typography>
                  <Typography variant="caption">
                    Two series will appear: cumulative USD invested through the DCA strategy, and the running total portfolio value (cash from sells + unrealized value of BTC still held).
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography variant="caption" sx={{ color: colors.grey[400], mt: 1, display: 'block' }}>
              Green = capital you put in over time. Blue = total portfolio value at each point
              {simulationResults?.sellStrategyEnabled
                ? ' (cash from sells stays flat in USD + remaining BTC moves with price).'
                : ' (100% BTC — entire portfolio moves with Bitcoin price).'}
              {' '}Toggle buy mode and exit strategy above to compare all cached results instantly.
            </Typography>

            {/* NEW: Decision metric visualization placed directly underneath the portfolio chart.
                Shows the live indicator (risk / tx-tension / heat) used by the strategy + subtle colored bands for the configured buy/sell tiers.
                Stronger tiers use slightly higher opacity tints (still kept subtle so the main line remains clearly visible).
                Click legend items on the chart *above* to toggle the three portfolio series (hiding Lump Sum often cleans up skew from start date choice). */}
            {chartSeriesData && chartSeriesData.length > 5 && (
              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: `1px solid ${colors.primary[500]}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ color: colors.grey[200] }}>{metricLabel}</Typography>
                  <MuiTooltip title="This is the exact metric driving the dynamic buy boosts and sell reductions in the backtest. Colored bands visualize your current tier thresholds (stronger/extreme tiers use more visible but still transparent tints). Dashed lines mark the precise level values.">
                    <InfoOutlinedIcon fontSize="small" sx={{ ml: 1, color: colors.grey[500] }} />
                  </MuiTooltip>
                </Box>
                <Box sx={{ 
                  width: '100%', 
                  height: isMobile ? 160 : 210, 
                  borderRadius: 1.5, 
                  overflow: 'hidden',
                  border: `1px solid ${colors.primary[500]}`,
                  background: colors.primary[700],
                  p: 0.5
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeriesData}>
                      <CartesianGrid strokeDasharray="2 2" stroke={colors.primary[500]} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: colors.grey[400], fontSize: 9 }}
                        tickLine={{ stroke: colors.grey[600] }}
                        minTickGap={40}
                      />
                      <YAxis 
                        domain={metricYDomain}
                        tick={{ fill: colors.grey[400], fontSize: 9 }}
                        tickLine={{ stroke: colors.grey[600] }}
                        tickFormatter={(v) => strategy === 'risk' ? v.toFixed(2) : Math.round(v).toString()}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}`, color: colors.grey[100], fontSize: 11 }}
                        labelStyle={{ color: colors.grey[300] }}
                        formatter={(value) => [strategy === 'risk' ? value.toFixed(3) : Math.round(value), 'Metric Value']}
                      />
                      {metricChartElements}
                      <Line 
                        type="linear" 
                        dataKey="indicator" 
                        name="Metric"
                        stroke={metricLineColor} 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 2.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" sx={{ color: colors.grey[500], mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                  Green/teal bands = buy boost zones. Red bands = active sell / take-profit zones.
                  {!enableDynamicSelling && ' Grey bands = sell tiers (inactive while Hold BTC Only is selected — still editable via sliders, turn red when Selling On).'}
                  {' '}Update tiers on the left and re-run to see impact on the portfolio chart above.
                </Typography>
              </Box>
            )}

            {/* Compact results summary placed directly under the chart (per request) so the most important numbers are visible instantly without further scrolling. Granular trade log is kept lower down. */}
            {simulationResults && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${colors.primary[500]}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ color: colors.grey[200] }}>Results Summary</Typography>
                  <Chip size="small" label={simulationResults.buyModeLabel || buyModeLabel} sx={{ fontSize: '0.65rem', height: 20, backgroundColor: buyStrategy === 'periodic-boost' ? colors.greenAccent[800] : colors.blueAccent[800], color: colors.grey[100] }} />
                  <Chip size="small" label={simulationResults.sellStrategyEnabled ? 'Selling On' : 'Hold BTC Only'} sx={{ fontSize: '0.65rem', height: 20 }} variant="outlined" />
                </Box>
                <Grid container spacing={isMobile ? 0.75 : 1}>
                  {[
                    { label: 'Invested', value: `$${simulationResults.totalUsdInvested.toFixed(0)}` },
                    { label: 'Portfolio', value: `$${simulationResults.totalPortfolio.toFixed(0)}` },
                    { label: 'Net P/L', value: `$${(simulationResults.totalPortfolio - simulationResults.totalUsdInvested).toFixed(0)}` },
                    { label: 'ROI', value: `${simulationResults.roi.toFixed(1)}%` },
                  ].map((s, i) => (
                    <Grid item xs={6} sm={3} key={i}>
                      <Box sx={{ p: 0.75, background: colors.primary[500], borderRadius: 1, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: colors.grey[400], fontSize: '0.65rem' }}>{s.label}</Typography>
                        <Typography variant="body2" sx={{ color: colors.greenAccent[400], fontWeight: 600, lineHeight: 1.1 }}>{s.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Grid container spacing={isMobile ? 0.75 : 1} sx={{ mt: 0.75 }}>
                  <Grid item xs={6} sm={simulationResults.sellStrategyEnabled ? 4 : 6}>
                    <Box sx={{ p: 0.75, background: colors.primary[500], borderRadius: 1, textAlign: 'center', borderLeft: `3px solid ${colors.greenAccent[500]}` }}>
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontSize: '0.65rem' }}>BTC Holdings</Typography>
                      <Typography variant="body2" sx={{ color: colors.greenAccent[300], fontWeight: 600, lineHeight: 1.1, fontSize: '0.85rem' }}>
                        {simulationResults.btcHeld.toFixed(4)} BTC
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.grey[500], fontSize: '0.6rem' }}>
                        ${simulationResults.finalBtcValue.toFixed(0)} value
                      </Typography>
                    </Box>
                  </Grid>
                  {simulationResults.sellStrategyEnabled && (
                    <Grid item xs={6} sm={4}>
                      <Box sx={{ p: 0.75, background: colors.primary[500], borderRadius: 1, textAlign: 'center', borderLeft: `3px solid ${colors.blueAccent[400]}` }}>
                        <Typography variant="caption" sx={{ color: colors.grey[400], fontSize: '0.65rem' }}>Cash from Sells</Typography>
                        <Typography variant="body2" sx={{ color: colors.blueAccent[300], fontWeight: 600, lineHeight: 1.1, fontSize: '0.85rem' }}>
                          ${simulationResults.totalUsdRealized.toFixed(0)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.grey[500], fontSize: '0.6rem' }}>
                          realized exit proceeds
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={simulationResults.sellStrategyEnabled ? 4 : 6}>
                    <Box sx={{ p: 0.75, background: colors.primary[500], borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: colors.grey[400], fontSize: '0.65rem' }}>Trades</Typography>
                      <Typography variant="body2" sx={{ color: colors.grey[200], fontWeight: 600, lineHeight: 1.1, fontSize: '0.85rem' }}>
                        {simulationResults.transactionCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.grey[500], fontSize: '0.6rem' }}>
                        {simulationResults.sellStrategyEnabled ? 'buys + sells' : 'buys only'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`Static DCA (${simulationResults.buyModeLabel || buyModeLabel}): ${simulationResults.staticDca.roi.toFixed(1)}%`} />
                  <Chip size="small" label={`Lump Sum: ${simulationResults.lumpSum?.roi?.toFixed(1) ?? 0}%`} />
                  <Chip size="small" color="success" label={`Beat static: ${(simulationResults.roi - simulationResults.staticDca.roi).toFixed(1)}pp`} />
                  {alternateBuyModeResult && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${buyStrategy === 'periodic-boost' ? 'Trigger-Level' : 'Constant'} ROI: ${alternateBuyModeResult.roi.toFixed(1)}%`}
                      sx={{ borderColor: colors.blueAccent[400], color: colors.blueAccent[300] }}
                    />
                  )}
                  {alternateSellModeResult && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${enableDynamicSelling ? 'Hold BTC Only' : 'Selling On'} ROI: ${alternateSellModeResult.roi.toFixed(1)}%`}
                      sx={{ borderColor: colors.grey[400], color: colors.grey[300] }}
                    />
                  )}
                  {alternateSellModeResult && simulationResults.sellStrategyEnabled && (
                    <Chip
                      size="small"
                      color={simulationResults.roi >= alternateSellModeResult.roi ? 'success' : 'default'}
                      label={`Selling vs Hold: ${(simulationResults.roi - alternateSellModeResult.roi).toFixed(1)}pp`}
                    />
                  )}
                  {alternateSellModeResult && !simulationResults.sellStrategyEnabled && (
                    <Chip
                      size="small"
                      color={alternateSellModeResult.roi >= simulationResults.roi ? 'success' : 'default'}
                      label={`Selling vs Hold: ${(alternateSellModeResult.roi - simulationResults.roi).toFixed(1)}pp`}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Strategy Comparison - only appears after you've run 2+ different strategies.
            Placed here above the Detailed Trade Log as requested. */}
        {hasMultipleStrategiesRun && (
          <Grid item xs={12}>
            <Paper sx={{ p: isMobile ? 1.5 : 2.5, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}`, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>Strategy Comparison</Typography>
              <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mb: 1.5 }}>
                {`ROI of each dynamic strategy for ${buyModeLabel} + ${sellModeLabel} (higher is better). Switch buy mode or exit strategy above to compare.`}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {strategyComparisons.map((entry) => {
                  const isWinner = entry.key === strategyComparisons[0]?.key;
                  return (
                    <Box
                      key={entry.key}
                      sx={{
                        flex: '1 1 160px',
                        minWidth: 160,
                        maxWidth: 240,
                        p: 1.5,
                        borderRadius: 1.5,
                        backgroundColor: isWinner ? colors.greenAccent[800] : colors.primary[500],
                        border: isWinner ? `2px solid ${colors.greenAccent[400]}` : `1px solid ${colors.primary[600]}`,
                        position: 'relative',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: isWinner ? colors.greenAccent[200] : colors.grey[300], fontWeight: 500 }}>
                        {entry.name}
                      </Typography>
                      <Typography variant="h5" sx={{ 
                        color: isWinner ? colors.greenAccent[400] : colors.grey[100], 
                        fontWeight: 700, 
                        lineHeight: 1.1, 
                        mt: 0.25 
                      }}>
                        {entry.roi.toFixed(1)}%
                      </Typography>
                      {isWinner && (
                        <Chip 
                          size="small" 
                          label="🏆 Winner" 
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8, 
                            backgroundColor: colors.greenAccent[400], 
                            color: '#111', 
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            height: 20
                          }} 
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: colors.grey[500] }}>
                Winner determined by highest ROI on the dynamic strategy run. Re-run any strategy to update its result here.
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Detailed / granular section (lower on the page, requires scroll). 
            The important summary numbers + chart are already visible higher up (under the chart in the right column). */}
        {simulationResults && (
          <Grid item xs={12}>
            <Paper sx={{ p: isMobile ? 1.5 : 3, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Detailed Trade Log</Typography>
              <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mb: 1.5 }}>
                Full transaction list and extra benchmarks. (Quick summary + key numbers are shown directly under the Portfolio chart above.)
              </Typography>

              {/* Highlighted current dynamic DCA strategy results for completeness in the detailed section */}
              {simulationResults && (
                <Box sx={{ mb: 2, p: 1.5, backgroundColor: colors.primary[500], border: `1px solid ${colors.greenAccent[500]}`, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: colors.greenAccent[300], fontWeight: 500 }}>
                      {simulationResults.buyModeLabel || buyModeLabel} — {simulationResults.strategy}
                    </Typography>
                    <Chip size="small" label={simulationResults.sellStrategyEnabled ? 'Exit: Selling On' : 'Exit: Hold BTC Only'} sx={{ fontSize: '0.65rem', height: 20 }} />
                  </Box>
                  <Grid container spacing={isMobile ? 0.75 : 1} sx={{ mt: 0.5 }}>
                    {[
                      { label: 'Invested', value: `$${simulationResults.totalUsdInvested.toFixed(0)}` },
                      { label: 'Portfolio', value: `$${simulationResults.totalPortfolio.toFixed(0)}` },
                      { label: 'Net P/L', value: `$${(simulationResults.totalPortfolio - simulationResults.totalUsdInvested).toFixed(0)}` },
                      { label: 'ROI', value: `${simulationResults.roi.toFixed(1)}%` },
                      { label: 'BTC Holdings', value: `${simulationResults.btcHeld.toFixed(4)} BTC ($${simulationResults.finalBtcValue.toFixed(0)})` },
                      ...(simulationResults.sellStrategyEnabled
                        ? [{ label: 'Cash from Sells', value: `$${simulationResults.totalUsdRealized.toFixed(0)}` }]
                        : []),
                    ].map((s, i) => (
                      <Grid item xs={6} sm={4} md={simulationResults.sellStrategyEnabled ? 2 : 3} key={i}>
                        <Box sx={{ p: 0.5, background: colors.primary[400], borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: colors.grey[400], fontSize: '0.65rem' }}>{s.label}</Typography>
                          <Typography variant="body2" sx={{ color: colors.greenAccent[400], fontWeight: 600, lineHeight: 1.1, fontSize: '0.85rem' }}>{s.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Benchmarks (kept here for completeness but not the primary view) */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Benchmarks</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Chip label={`Static DCA ROI: ${simulationResults.staticDca.roi.toFixed(1)}%`} />
                  <Chip label={`Static DCA Final: $${simulationResults.staticDca.finalValue.toFixed(0)}`} />
                  <Chip label={`Lump Sum (all-in at start) ROI: ${simulationResults.lumpSum?.roi?.toFixed(1) ?? 0}%`} />
                  <Chip label={`Lump Sum Final: $${simulationResults.lumpSum?.finalValue?.toFixed(0) ?? 0}`} />
                  <Chip 
                    label={`This strategy beat static by ${(simulationResults.roi - simulationResults.staticDca.roi).toFixed(1)}pp`} 
                    color="success" 
                  />
                </Box>
              </Box>

              <Button onClick={() => setShowTrades(!showTrades)} sx={{ mb: 2 }}>
                {showTrades ? 'Hide' : 'Show'} Trade Log — {simulationResults.buyModeLabel || buyModeLabel} ({simulationResults.transactions.length} trades)
              </Button>

              {showTrades && simulationResults.transactions.length > 0 && (
                <TableContainer component={Paper} sx={{ maxHeight: 420, background: colors.primary[500] }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">USD</TableCell>
                        <TableCell align="right">BTC</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell>Indicator</TableCell>
                        <TableCell>Note</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {simulationResults.transactions.slice(0, 150).map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>{t.date}</TableCell>
                          <TableCell sx={{ color: t.type === 'BUY' ? colors.greenAccent[400] : colors.blueAccent[400], fontWeight: 600 }}>{t.type}</TableCell>
                          <TableCell align="right">${t.usd.toFixed(0)}</TableCell>
                          <TableCell align="right">{t.btc.toFixed(5)}</TableCell>
                          <TableCell align="right">${t.price.toFixed(0)}</TableCell>
                          <TableCell>{t.indicator}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: colors.grey[300] }}>{t.note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {simulationResults.transactions.length > 150 && (
                    <Typography variant="caption" sx={{ p: 1, display: 'block' }}>
                      Showing first 150 trades for performance. Full log available in console or future export.
                    </Typography>
                  )}
                </TableContainer>
              )}

              <Typography variant="caption" sx={{ mt: 2, display: 'block', color: colors.grey[400] }}>
                Note: This is a historical backtest for educational purposes only. Past performance does not guarantee future results. Transaction costs, taxes, and slippage are not modeled.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <UnderChartRow>
        <Typography variant="caption" sx={{ color: colors.grey[400] }}>
          Data is loaded client-side. Configure buy/sell tiers, set parameters, then run the backtest. All four combinations are computed — toggle buy mode and exit strategy anytime to compare. Hold BTC Only: portfolio tracks Bitcoin price entirely. Selling On: cash from sells is price-stable; only remaining BTC moves with price — showing the benefit of taking profits at overbought levels.
        </Typography>
      </UnderChartRow>
    </Box>
  );
};

export default DynamicDCASimulator;
