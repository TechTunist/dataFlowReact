import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
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
  const [heatWeights, setHeatWeights] = useState({
    fg: 15, mvrv: 25, mayer: 20, risk: 20, pi: 10, alt: 10, txmvrv: 10,
  });
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

  // Persisted results per strategy so switching chips reloads the previous run's chart/portfolio curve for visual comparison
  const [resultsByStrategy, setResultsByStrategy] = useState({});

  // Legend toggle state for the portfolio value chart series (invested / portfolioValue / lumpSumValue)
  // Allows hiding the lump sum line which can dominate/skew the view depending on start date.
  const [hiddenPortfolioSeries, setHiddenPortfolioSeries] = useState(new Set());

  // Attempt to load the user's currently saved Market Heat Index slider configuration (weights etc.)
  // so the DCA backtest for the heat strategy reflects the exact tunings they have in /market-heat-index.
  useEffect(() => {
    const loadSavedHeatWeights = async () => {
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
          if (data.marketHeatIndexSettings?.weights && typeof data.marketHeatIndexSettings.weights === 'object') {
            setHeatWeights(prev => ({ ...prev, ...data.marketHeatIndexSettings.weights }));
          }
        }
      } catch (e) {
        // non-fatal; just use the defaults
      }
    };
    loadSavedHeatWeights();
  }, [isSignedIn, getToken]);

  const isTx = strategy === 'tx-tension';
  const isHeat = strategy === 'heat-index';

  // Ensure data
  useEffect(() => {
    fetchBtcData();
    if (isTx || isHeat) {
      fetchTxMvrvRatioData(txSmoothing);
    }
    if (isHeat) {
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
      // Market Heat Index as third indicator (0-100 scale).
      // Uses the user's currently saved weights from /market-heat-index (loaded above) when available.
      // High heat = overheated (favor sells), low heat = cold (favor buy boosts).
      const w = heatWeights;
      const totalW = (w.fg + w.mvrv + w.mayer + w.risk + w.pi + w.alt + w.txmvrv) || 100;

      const riskData = calculateRiskMetric(contextBtcData || []);
      const riskMap = {};
      riskData.forEach(d => { riskMap[d.time] = d.Risk * 100; });

      const mvrvMap = {};
      (mvrvData || []).forEach(d => { mvrvMap[d.time] = Number(d.value); });

      const fgMap = {};
      (fearAndGreedData || []).forEach(item => {
        if (item && item.timestamp != null) {
          const d = new Date(item.timestamp * 1000).toISOString().split('T')[0];
          fgMap[d] = Number(item.value);
        }
      });

      const txPayload = txMvrvRatioDataBySmoothing?.[txSmoothing] || {};
      const txmvrvMap = {};
      (txPayload.series || []).forEach(d => { txmvrvMap[d.time] = Number(d.value); });

      return (contextBtcData || []).map(d => {
        const t = d.time;
        let heat = 50;
        // risk (0-100)
        const r = riskMap[t];
        if (r != null) heat += (r - 50) * (w.risk / totalW);
        // mvrv normalized roughly to 0-100 contribution
        const m = mvrvMap[t];
        if (m != null) {
          const mScore = Math.max(0, Math.min(100, ((m - 1) / 3) * 100));
          heat += (mScore - 50) * (w.mvrv / totalW);
        }
        // fear & greed (high greed = hot)
        const f = fgMap[t];
        if (f != null) heat += (f - 50) * (w.fg / totalW);
        // tx mvrv ratio (high = hot) - rough scale
        const tx = txmvrvMap[t];
        if (tx != null) {
          const txScore = Math.max(0, Math.min(100, ((tx - 8) / 25) * 100));
          heat += (txScore - 50) * (w.txmvrv / totalW);
        }
        heat = Math.max(0, Math.min(100, heat));
        return {
          time: t,
          price: d.value,
          indicator: heat,
          raw: d,
        };
      });
    } else {
      return [];
    }
  }, [contextBtcData, txMvrvRatioDataBySmoothing, strategy, txSmoothing, heatWeights, mvrvData, fearAndGreedData, altcoinSeasonTimeseriesData]);

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

  // Load previously computed results (incl. chart series with lump sum) when switching strategy chips
  useEffect(() => {
    const saved = resultsByStrategy[strategy];
    if (saved) {
      setSimulationResults(saved);
    } else {
      // No previous run for this strategy yet -> clear chart so user sees placeholder until they run for it
      setSimulationResults(null);
    }
  }, [strategy, resultsByStrategy]);

  // Helper to get applicable action for a given indicator value (used only for backtest logic)
  const getActionForIndicator = useCallback((indicator) => {
    // Check sells first (overbought)
    for (const tier of sortedSellTiers) {
      if (isTx) {
        if (indicator >= tier.level) {
          return { type: 'sell', percent: tier.sellPercent || 0, tier };
        }
      } else {
        if (indicator >= tier.level) {
          return { type: 'sell', percent: tier.sellPercent || 0, tier };
        }
      }
    }
    // Then buys (oversold) - strongest (lowest for tx/risk) first because sorted
    for (const tier of sortedBuyTiers) {
      if (isTx) {
        if (indicator <= tier.level) {
          return { type: 'buy', multiplier: tier.multiplier || 1, tier };
        }
      } else {
        if (indicator <= tier.level) {
          return { type: 'buy', multiplier: tier.multiplier || 1, tier };
        }
      }
    }
    return { type: 'normal', multiplier: 1 };
  }, [sortedBuyTiers, sortedSellTiers, isTx]);

  // The core backtesting engine (all frontend)
  const runBacktest = useCallback(() => {
    if (simSeriesData.length === 0) return null;

    setIsRunning(true);

    let btcHeld = 0;
    let totalUsdInvested = 0;
    let totalUsdRealized = 0;
    const transactions = [];
    const portfolioSeries = [];

    const data = simSeriesData; // filtered for backtest start

    let currentPrice = 0;

    // Separate cooldowns so frequency applies per action type, and supports "only buy on trigger"
    let lastBuyDate = new Date(startDate);
    lastBuyDate.setDate(lastBuyDate.getDate() - frequency);
    let lastSellDate = new Date(startDate);
    lastSellDate.setDate(lastSellDate.getDate() - frequency);

    // Initial point (start of sim period)
    if (data.length > 0) {
      portfolioSeries.push({
        time: data[0].time,
        invested: 0,
        portfolioValue: 0,
        price: data[0].price || 0,
      });
    }

    data.forEach((day) => {
      const dayDate = new Date(day.time);
      currentPrice = day.price;
      const ind = day.indicator;

      const action = getActionForIndicator(ind);

      const daysSinceBuy = (dayDate - lastBuyDate) / (1000 * 60 * 60 * 24);
      const daysSinceSell = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);

      const buyIntervalOk = daysSinceBuy >= frequency;
      const sellIntervalOk = daysSinceSell >= frequency;

      let boughtThisStep = false;

      if (action.type === 'buy' && buyIntervalOk) {
        // In trigger-only: we only buy here (when tier hit). In periodic-boost we also allow the else below for normal.
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
          boughtThisStep = true;
        }
      } else if (action.type === 'sell' && sellIntervalOk && btcHeld > 0) {
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
      } else if (buyStrategy === 'periodic-boost' && buyIntervalOk) {
        // Normal scheduled DCA buy (only in periodic-boost mode; suppressed in trigger-only)
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
          boughtThisStep = true;
        }
      }

      // Always record portfolio state for the chart at decision points (and final will be ensured)
      // This keeps the series reasonably dense without one point per calendar day.
      portfolioSeries.push({
        time: day.time,
        invested: totalUsdInvested,
        portfolioValue: totalUsdRealized + (btcHeld * currentPrice),
        price: currentPrice,
      });
    });

    const finalBtcValue = btcHeld * currentPrice;
    const totalPortfolio = totalUsdRealized + finalBtcValue;
    const netGain = totalPortfolio - totalUsdInvested;
    const roi = totalUsdInvested > 0 ? (netGain / totalUsdInvested) * 100 : 0;

    // Ensure a final point at the very end of the data window (even if no action on last day)
    if (data.length > 0) {
      const lastTime = data[data.length - 1].time;
      const lastInvested = totalUsdInvested;
      const lastPortfolio = totalUsdRealized + (btcHeld * currentPrice);
      if (portfolioSeries.length === 0 || portfolioSeries[portfolioSeries.length - 1].time !== lastTime) {
        portfolioSeries.push({ time: lastTime, invested: lastInvested, portfolioValue: lastPortfolio, price: currentPrice });
      }
    }

    // Augment every point with lumpSumValue for the chart (uses the *final* total capital the strategy deployed,
    // bought once at the very first price of the sim window, then valued at the price of each point in the series).
    if (data.length > 0 && totalUsdInvested > 0 && data[0].price > 0) {
      const lumpBtc = totalUsdInvested / data[0].price;
      portfolioSeries.forEach((pt) => {
        const ptPrice = (pt.price != null) ? pt.price : currentPrice;
        pt.lumpSumValue = lumpBtc * ptPrice;
      });
    }

    // Simple Static DCA benchmark (same schedule, fixed amount, no sells/boosts)
    let staticBtc = 0;
    let staticInvested = 0;
    let staticLastDate = new Date(startDate);
    staticLastDate.setDate(staticLastDate.getDate() - frequency);

    data.forEach(day => {
      const d = new Date(day.time);
      const delta = (d - staticLastDate) / (1000*60*60*24);
      if (delta >= frequency && day.price > 0) {
        staticBtc += dcaAmount / day.price;
        staticInvested += dcaAmount;
        staticLastDate = d;
      }
    });
    const staticFinalValue = staticBtc * currentPrice;
    const staticRoi = staticInvested > 0 ? ((staticFinalValue - staticInvested) / staticInvested) * 100 : 0;

    // Lump Sum benchmark: same *total capital actually deployed*, invested all at once on the first day of the sim window, held to the end (no sells)
    let lumpSumFinal = 0;
    let lumpSumRoi = 0;
    if (data.length > 0 && totalUsdInvested > 0 && data[0].price > 0) {
      const firstPrice = data[0].price;
      const lumpBtc = totalUsdInvested / firstPrice;
      lumpSumFinal = lumpBtc * currentPrice;
      lumpSumRoi = ((lumpSumFinal - totalUsdInvested) / totalUsdInvested) * 100;
    }

    const result = {
      strategy: isTx ? 'Tx Tension (MVRV/Tx)' : 'Bitcoin Risk',
      totalUsdInvested: totalUsdInvested,
      totalUsdRealized: totalUsdRealized,
      btcHeld: btcHeld,
      finalBtcValue: finalBtcValue,
      totalPortfolio: totalPortfolio,
      roi: roi,
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
      buyStrategyUsed: buyStrategy,
      lastPrice: currentPrice,
      dataPoints: data.length,
    };

    setSimulationResults(result);
    // Save for this strategy so switching between Risk <-> Tx Tension restores the exact previous chart + lump sum curve
    setResultsByStrategy(prev => ({ ...prev, [strategy]: result }));
    setIsRunning(false);
    setShowTrades(true);
  }, [simSeriesData, dcaAmount, frequency, startDate, getActionForIndicator, isTx, buyStrategy, strategy]);

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
      const def = isBuy 
        ? { level: isHeat ? 30 : isTx ? 12 : 0.30, multiplier: 1.5, label: 'New Tier' }
        : { level: isHeat ? 75 : isTx ? 28 : 0.70, sellPercent: 20, label: 'New Tier' };
      return [...prev, def];
    });
  };

  const removeTier = (listSetter, index) => {
    listSetter(prev => prev.filter((_, i) => i !== index));
  };

  // Reset to sensible defaults per strategy
  const resetDefaults = () => {
    if (isTx) {
      // Raw ratio scale for Tx Tension (lower number = stronger buy signal)
      setTxBuyTiers([
        { level: 9, multiplier: 2.5, label: 'Strong Oversold' },
        { level: 15, multiplier: 1.6, label: 'Medium Oversold' },
      ]);
      setTxSellTiers([
        { level: 22, sellPercent: 12, label: 'Medium Overbought' },
        { level: 32, sellPercent: 28, label: 'Strong Overbought' },
      ]);
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

  const currentTiersDisplay = isTx 
    ? 'MVRV/Tx Ratio (raw values from API: lower ratio ≈ stronger oversold / buy signal; higher ≈ overbought / sell signal). Tiers below use this scale.'
    : isHeat
      ? 'Market Heat Index (0-100). Low values = cold/oversold (good for buy boosts). High = hot/overbought (good for sells). Uses your saved weights from /market-heat-index if you have tuned them.'
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

    // Sell zones (higher = stronger sell)
    let prevSell = null;
    sellsSortedDesc.forEach((tier, idx) => {
      const strength = (sellsSortedDesc.length - idx) / Math.max(1, sellsSortedDesc.length);
      const alpha = 0.07 + (strength * 0.16);
      const fill = `rgba(239, 83, 80, ${alpha})`; // red tones
      elements.push(
        <ReferenceArea
          key={`sell-zone-${idx}`}
          y1={tier.level}
          y2={prevSell}
          fill={fill}
          fillOpacity={1}
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
          stroke="#ef5350"
          strokeDasharray="2 2"
          strokeOpacity={0.65}
          strokeWidth={1}
        />
      );
    });

    return elements;
  }, [buyTiers, sellTiers, strategy, fullChartData]);

  const metricLabel = strategy === 'risk'
    ? 'Bitcoin Risk Metric (0-1)'
    : strategy === 'tx-tension'
      ? 'Tx Tension (MVRV/Tx Ratio)'
      : 'Market Heat Index (0-100, using your saved config weights)';

  const metricLineColor = strategy === 'risk'
    ? colors.greenAccent[400]
    : strategy === 'tx-tension'
      ? colors.blueAccent[400]
      : '#00bcd4';

  const metricYDomain = strategy === 'risk' ? [0, 1.02] : strategy === 'heat-index' ? [0, 102] : ['auto', 'auto'];

  return (
    <Box sx={{ p: isMobile ? 1 : { xs: 1, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Strategy Selector - shell now provides the "Dynamic DCA Simulator" title from meta (no more CryptoLogical above it) */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 3, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: colors.grey[200] }}>Strategy / Indicator</Typography>
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
                <MenuItem value="sma-7">7-day SMA</MenuItem>
                <MenuItem value="sma-28">28-day SMA</MenuItem>
                <MenuItem value="ema-7">7-day EMA</MenuItem>
                <MenuItem value="ema-28">28-day EMA</MenuItem>
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
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="DCA Amount (USD)"
              type="number"
              value={dcaAmount}
              onChange={e => setDcaAmount(Math.max(1, parseFloat(e.target.value) || 100))}
              fullWidth size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              fullWidth size="small" InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={{ color: colors.grey[200] }}>Buy mode</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Button size="small" variant={buyStrategy === 'periodic-boost' ? 'contained' : 'outlined'} onClick={() => setBuyStrategy('periodic-boost')}
                sx={{ color: buyStrategy === 'periodic-boost' ? '#111' : colors.greenAccent[500], borderColor: colors.greenAccent[500], backgroundColor: buyStrategy === 'periodic-boost' ? colors.greenAccent[500] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                Periodic+boost
              </Button>
              <Button size="small" variant={buyStrategy === 'trigger-only' ? 'contained' : 'outlined'} onClick={() => setBuyStrategy('trigger-only')}
                sx={{ color: buyStrategy === 'trigger-only' ? '#111' : colors.blueAccent[400], borderColor: colors.blueAccent[400], backgroundColor: buyStrategy === 'trigger-only' ? colors.blueAccent[400] : 'transparent', fontSize: '0.7rem', px: 1, py: 0.25 }}>
                Trigger only
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
                  backgroundColor: colors.blueAccent[500],
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
          {buyStrategy === 'trigger-only' ? 'In trigger-only mode the frequency is used as cooldown after a level is hit (no normal periodic buys).' : 'In periodic mode you buy every interval (boosted when a tier matches).'}
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
                    <Typography variant="caption" sx={{ color: colors.greenAccent[200] }}>{tier.label || `Tier ${idx + 1}`} — {Number(tier.level).toFixed(isTx ? 1 : 2)}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.grey[200] }}>Trigger Level</Typography>
                        <Slider
                          value={tier.level}
                          min={isHeat ? 0 : isTx ? 0 : 0}
                          max={isHeat ? 100 : isTx ? 40 : 1}
                          step={isHeat ? 1 : isTx ? 0.5 : 0.01}
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
                    <Typography variant="caption" sx={{ color: colors.blueAccent[200] }}>{tier.label || `Tier ${idx + 1}`} — {Number(tier.level).toFixed(isTx ? 1 : 2)}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.grey[200] }}>Trigger Level</Typography>
                        <Slider
                          value={tier.level}
                          min={isHeat ? 0 : isTx ? 5 : 0}
                          max={isHeat ? 100 : isTx ? 60 : 1}
                          step={isHeat ? 1 : isTx ? 0.5 : 0.01}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Portfolio Value vs Total Invested</Typography>
              <MuiTooltip title="Shows cumulative capital deployed via DCA over time, and the current total portfolio value (realized profits from sells + value of BTC still held).">
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
                      formatter={(value) => ['$' + Math.round(value).toLocaleString()]}
                    />
                    <Legend 
                      wrapperStyle={{ color: colors.grey[200], fontSize: 12, cursor: 'pointer' }} 
                      onClick={(e) => e && e.dataKey && togglePortfolioSeries(e.dataKey)}
                    />
                    {!hiddenPortfolioSeries.has('invested') && (
                      <Line 
                        type="step" 
                        dataKey="invested" 
                        name="Total Invested (DCA)" 
                        stroke={colors.greenAccent[500]} 
                        strokeWidth={2.5} 
                        dot={false} 
                        activeDot={{ r: 3, fill: colors.greenAccent[400] }}
                      />
                    )}
                    {!hiddenPortfolioSeries.has('portfolioValue') && (
                      <Line 
                        type="linear" 
                        dataKey="portfolioValue" 
                        name="Portfolio Value (incl. sells + remaining BTC)" 
                        stroke={colors.blueAccent[400]} 
                        strokeWidth={2.5} 
                        dot={false} 
                        activeDot={{ r: 3, fill: colors.blueAccent[400] }}
                      />
                    )}
                    {/* Lump sum comparison line: same final capital all deployed at the sim's first price, held (no sells/boosts). Dashed for visual distinction. Click legend to toggle (useful when start date creates skew). */}
                    {!hiddenPortfolioSeries.has('lumpSumValue') && (
                      <Line 
                        type="linear" 
                        dataKey="lumpSumValue" 
                        name="Lump Sum (final capital all-in at start, held)" 
                        stroke={colors.grey[300]} 
                        strokeWidth={2} 
                        strokeDasharray="5 3"
                        dot={false} 
                        activeDot={{ r: 3, fill: colors.grey[300] }}
                      />
                    )}
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
              Green = capital you put in over time. Blue = what your portfolio (including profits locked in via sells and the BTC you still hold) is worth at each point.
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
                  Green/teal bands = buy boost zones (stronger tiers = more saturated tint). Red bands = sell / take-profit zones. Update tiers on the left and re-run to see impact on the portfolio chart above.
                </Typography>
              </Box>
            )}

            {/* Compact results summary placed directly under the chart (per request) so the most important numbers are visible instantly without further scrolling. Granular trade log is kept lower down. */}
            {simulationResults && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${colors.primary[500]}` }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: colors.grey[200] }}>Results Summary</Typography>
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
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`Static DCA: ${simulationResults.staticDca.roi.toFixed(1)}%`} />
                  <Chip size="small" label={`Lump Sum: ${simulationResults.lumpSum?.roi?.toFixed(1) ?? 0}%`} />
                  <Chip size="small" color="success" label={`Beat static: ${(simulationResults.roi - simulationResults.staticDca.roi).toFixed(1)}pp`} />
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: colors.grey[500] }}>
                  BTC held: {simulationResults.btcHeld.toFixed(4)} • Trades: {simulationResults.transactionCount} • Mode: {simulationResults.buyStrategyUsed || 'periodic-boost'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

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
                  <Typography variant="caption" sx={{ color: colors.greenAccent[300], fontWeight: 500 }}>Current Run — {simulationResults.strategy}</Typography>
                  <Grid container spacing={isMobile ? 0.75 : 1} sx={{ mt: 0.5 }}>
                    {[
                      { label: 'Invested', value: `$${simulationResults.totalUsdInvested.toFixed(0)}` },
                      { label: 'Portfolio', value: `$${simulationResults.totalPortfolio.toFixed(0)}` },
                      { label: 'Net P/L', value: `$${(simulationResults.totalPortfolio - simulationResults.totalUsdInvested).toFixed(0)}` },
                      { label: 'ROI', value: `${simulationResults.roi.toFixed(1)}%` },
                    ].map((s, i) => (
                      <Grid item xs={6} sm={3} key={i}>
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
                {showTrades ? 'Hide' : 'Show'} Trade Log ({simulationResults.transactions.length} trades)
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
          Data is loaded client-side. Configure buy/sell tiers on the left, set your DCA amount + frequency + start date, then run the backtest. The portfolio chart and results update with your dynamic strategy vs static DCA and lump-sum equivalents.
        </Typography>
      </UnderChartRow>
    </Box>
  );
};

export default DynamicDCASimulator;
