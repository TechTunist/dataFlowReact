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
import BitcoinRisk from './BitcoinRisk';
import BitcoinTxMvrvChart from './BitcoinTxMvrv';

const DynamicDCASimulator = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    btcData: contextBtcData,
    fetchBtcData,
    txMvrvRatioDataBySmoothing,
    fetchTxMvrvRatioData,
  } = useContext(DataContext);

  // Strategy selection
  const [strategy, setStrategy] = useState('risk'); // 'risk' | 'tx-tension'
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
  const [txBuyTiers, setTxBuyTiers] = useState([
    { level: 0.35, multiplier: 1.5, label: 'Medium Oversold' },
    { level: 0.22, multiplier: 2.5, label: 'Strong Oversold' },
  ]);
  const [txSellTiers, setTxSellTiers] = useState([
    { level: 0.72, sellPercent: 12, label: 'Medium Overbought' },
    { level: 0.85, sellPercent: 30, label: 'Strong Overbought' },
  ]);

  // Simulation results
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showTrades, setShowTrades] = useState(false);

  const isTx = strategy === 'tx-tension';

  // Ensure data
  useEffect(() => {
    fetchBtcData();
    if (isTx) {
      fetchTxMvrvRatioData(txSmoothing);
    }
  }, [fetchBtcData, fetchTxMvrvRatioData, isTx, txSmoothing]);

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
    } else {
      const payload = txMvrvRatioDataBySmoothing?.[txSmoothing];
      const ratioSeries = payload?.series || [];
      if (ratioSeries.length === 0) return [];

      return ratioSeries
        .map(d => {
          const p = priceMap.get(d.time) || priceMap.get([...priceMap.keys()].find(k => k >= d.time) || d.time);
          return {
            time: d.time,
            price: p || 0,
            indicator: d.value, // the normalized MVRV/Tx ratio (high = overbought)
            raw: d,
          };
        })
        .filter(d => d.price > 0);
    }
  }, [contextBtcData, txMvrvRatioDataBySmoothing, strategy, txSmoothing]);

  // Filtered data for simulation backtest (respects startDate)
  const simSeriesData = useMemo(() => {
    return fullChartData.filter(d => d.time >= startDate);
  }, [fullChartData, startDate]);

  // For chart we always want full history + visible levels across time
  const chartSeriesData = fullChartData;

  // Current tiers based on strategy (for chart + sim)
  const buyTiers = useMemo(() => (isTx ? txBuyTiers : riskBuyTiers), [isTx, txBuyTiers, riskBuyTiers]);
  const sellTiers = useMemo(() => (isTx ? txSellTiers : riskSellTiers), [isTx, txSellTiers, riskSellTiers]);

  // Sorted for logic (lowest buy level first for strongest oversold, highest sell for strongest)
  const sortedBuyTiers = useMemo(() => [...buyTiers].sort((a, b) => a.level - b.level), [buyTiers]);
  const sortedSellTiers = useMemo(() => [...sellTiers].sort((a, b) => b.level - a.level), [sellTiers]);

  // The visualization now uses the *exact same* full chart components as the standalone /risk and /tx-mvrv pages
  // (via <BitcoinRisk ... simulatorDcaLevels={...} /> and <BitcoinTxMvrvChart ... />).
  // This guarantees:
  // - identical data loading and full history (back to the earliest available data, not 2023)
  // - identical zoom, pan, scale, fit behavior as the main pages
  // - custom DCA levels are overlaid as extra dashed lines via the simulatorDcaLevels prop (drawn only in simulator context)
  // The old custom lightweight-charts implementation has been removed.

  // Helper to get applicable action for a given indicator value
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
    let lastActionDate = new Date(startDate);
    lastActionDate.setDate(lastActionDate.getDate() - frequency);

    const data = simSeriesData; // filtered for backtest start

    let currentPrice = 0;

    data.forEach((day) => {
      const dayDate = new Date(day.time);
      currentPrice = day.price;
      const ind = day.indicator;

      const daysSince = (dayDate - lastActionDate) / (1000 * 60 * 60 * 24);
      if (daysSince < frequency) return;

      const action = getActionForIndicator(ind);

      if (action.type === 'buy') {
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
        }
      } else if (action.type === 'sell' && btcHeld > 0) {
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
        }
      } else {
        // normal DCA
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
        }
      }

      lastActionDate = dayDate;
    });

    const finalBtcValue = btcHeld * currentPrice;
    const totalPortfolio = totalUsdRealized + finalBtcValue;
    const netGain = totalPortfolio - totalUsdInvested;
    const roi = totalUsdInvested > 0 ? (netGain / totalUsdInvested) * 100 : 0;

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
      lastPrice: currentPrice,
      dataPoints: data.length,
    };

    setSimulationResults(result);
    setIsRunning(false);
    setShowTrades(true);
  }, [simSeriesData, dcaAmount, frequency, startDate, getActionForIndicator, isTx]);

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
        ? { level: isTx ? 0.30 : 0.30, multiplier: 1.5, label: 'New Tier' }
        : { level: isTx ? 0.78 : 0.70, sellPercent: 20, label: 'New Tier' };
      return [...prev, def];
    });
  };

  const removeTier = (listSetter, index) => {
    listSetter(prev => prev.filter((_, i) => i !== index));
  };

  // Reset to sensible defaults per strategy
  const resetDefaults = () => {
    if (isTx) {
      setTxBuyTiers([
        { level: 0.35, multiplier: 1.5, label: 'Medium Oversold' },
        { level: 0.22, multiplier: 2.5, label: 'Strong Oversold' },
      ]);
      setTxSellTiers([
        { level: 0.72, sellPercent: 12, label: 'Medium Overbought' },
        { level: 0.85, sellPercent: 30, label: 'Strong Overbought' },
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

  const currentTiersDisplay = isTx ? 'MVRV/Tx Ratio (0 = strong undervaluation, 1 = strong overvaluation)' : 'Risk (0 = low risk / good entry, 1 = high risk)';

  const getSimulatorLevels = useMemo(() => {
    if (isTx) {
      return [
        ...txBuyTiers.map(t => ({ level: t.level, type: 'buy', color: colors.greenAccent[500], label: t.label })),
        ...txSellTiers.map(t => ({ level: t.level, type: 'sell', color: '#f472b6', label: t.label })),
      ];
    } else {
      return [
        ...riskBuyTiers.map(t => ({ level: t.level, type: 'buy', color: colors.greenAccent[500], label: t.label })),
        ...riskSellTiers.map(t => ({ level: t.level, type: 'sell', color: '#f472b6', label: t.label })),
      ];
    }
  }, [isTx, txBuyTiers, txSellTiers, riskBuyTiers, riskSellTiers, colors]);

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, color: colors.primary[100], fontWeight: 600 }}>
        Dynamic DCA Simulator
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: colors.grey[300], maxWidth: 860 }}>
        Backtest dynamic dollar-cost averaging strategies that automatically adjust buy amounts or take profits based on on-chain/market indicators.
        All calculations happen in your browser using historical data.
      </Typography>

      {/* Strategy Selector */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: colors.grey[200] }}>Strategy / Indicator</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label="Bitcoin Risk Metric (0-1)"
            onClick={() => setStrategy('risk')}
            color={strategy === 'risk' ? 'success' : 'default'}
            variant={strategy === 'risk' ? 'filled' : 'outlined'}
            sx={{ fontSize: '0.95rem', py: 2 }}
          />
          <Chip
            label="Tx Tension (MVRV/Tx Ratio)"
            onClick={() => setStrategy('tx-tension')}
            color={strategy === 'tx-tension' ? 'success' : 'default'}
            variant={strategy === 'tx-tension' ? 'filled' : 'outlined'}
            sx={{ fontSize: '0.95rem', py: 2 }}
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

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Backtest Parameters</Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="DCA Amount (USD)"
                  type="number"
                  value={dcaAmount}
                  onChange={e => setDcaAmount(Math.max(1, parseFloat(e.target.value) || 100))}
                  fullWidth size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Frequency</InputLabel>
                  <Select value={frequency} label="Frequency" onChange={e => setFrequency(parseInt(e.target.value))}>
                    <MenuItem value={1}>Daily</MenuItem>
                    <MenuItem value={7}>Weekly</MenuItem>
                    <MenuItem value={14}>Bi-weekly</MenuItem>
                    <MenuItem value={28}>Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  fullWidth size="small" InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2.5 }} />

            {/* Tier configuration - only for current strategy */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Dynamic Levels (for this simulator only)</Typography>
              <Button size="small" onClick={resetDefaults} startIcon={<RestartAltIcon />}>Reset Defaults</Button>
            </Box>

            {/* Buy / Oversold tiers */}
            <Accordion defaultExpanded sx={{ backgroundColor: colors.primary[500], mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Buy Boost Tiers (Oversold / Low Risk)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {buyTiers.map((tier, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 1.5, background: colors.primary[600], borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">{tier.label || `Tier ${idx + 1}`}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption">Trigger Level</Typography>
                        <Slider
                          value={tier.level}
                          min={0} max={1} step={0.01}
                          onChange={(_, v) => {
                            const setter = isTx ? setTxBuyTiers : setRiskBuyTiers;
                            updateTier(setter, idx, 'level', v);
                          }}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      <TextField
                        label="Multiplier"
                        type="number" size="small" sx={{ width: 90 }}
                        value={tier.multiplier}
                        onChange={e => {
                          const setter = isTx ? setTxBuyTiers : setRiskBuyTiers;
                          updateTier(setter, idx, 'multiplier', e.target.value);
                        }}
                      />
                      <Button size="small" color="error" onClick={() => {
                        const setter = isTx ? setTxBuyTiers : setRiskBuyTiers;
                        removeTier(setter, idx);
                      }}>×</Button>
                    </Box>
                  </Box>
                ))}
                <Button size="small" onClick={() => addTier(isTx ? setTxBuyTiers : setRiskBuyTiers, true)}>+ Add Buy Boost Tier</Button>
              </AccordionDetails>
            </Accordion>

            {/* Sell / Overbought tiers */}
            <Accordion defaultExpanded sx={{ backgroundColor: colors.primary[500] }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Sell / De-risk Tiers (Overbought / High Risk)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {sellTiers.map((tier, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 1.5, background: colors.primary[600], borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">{tier.label || `Tier ${idx + 1}`}</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption">Trigger Level</Typography>
                        <Slider
                          value={tier.level}
                          min={0} max={1} step={0.01}
                          onChange={(_, v) => {
                            const setter = isTx ? setTxSellTiers : setRiskSellTiers;
                            updateTier(setter, idx, 'level', v);
                          }}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      <TextField
                        label="% to Sell"
                        type="number" size="small" sx={{ width: 90 }}
                        value={tier.sellPercent}
                        onChange={e => {
                          const setter = isTx ? setTxSellTiers : setRiskSellTiers;
                          updateTier(setter, idx, 'sellPercent', e.target.value);
                        }}
                      />
                      <Button size="small" color="error" onClick={() => {
                        const setter = isTx ? setTxSellTiers : setRiskSellTiers;
                        removeTier(setter, idx);
                      }}>×</Button>
                    </Box>
                  </Box>
                ))}
                <Button size="small" onClick={() => addTier(isTx ? setTxSellTiers : setRiskSellTiers, false)}>+ Add Sell Tier</Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: colors.grey[400] }}>
                  Higher tiers take precedence when multiple levels are triggered.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, backgroundColor: colors.greenAccent[500], color: '#111', fontWeight: 600 }}
              startIcon={<PlayArrowIcon />}
              onClick={runBacktest}
              disabled={isRunning || simSeriesData.length === 0}
            >
              {isRunning ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
          </Paper>
        </Grid>

        {/* Visualization */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}`, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Live Indicator View — {isTx ? 'Tx Tension Ratio' : 'Risk Metric'}</Typography>
              <MuiTooltip title="The horizontal lines are the exact DCA trigger levels you configured above. They only affect this simulator.">
                <InfoOutlinedIcon fontSize="small" sx={{ color: colors.grey[400] }} />
              </MuiTooltip>
            </Box>
            <Box sx={{ 
              width: '100%', 
              minHeight: 420, 
              borderRadius: 2, 
              overflow: 'hidden',
              border: `1px solid ${colors.primary[500]}`,
              background: colors.primary[700]
            }}>
              {strategy === 'risk' ? (
                <BitcoinRisk 
                  isDashboard={false}
                  isChartPage={true}
                  hideControls={true}
                  simulatorDcaLevels={getSimulatorLevels}
                />
              ) : (
                <BitcoinTxMvrvChart 
                  isDashboard={false}
                  isChartPage={true}
                  hideControls={true}
                  simulatorDcaLevels={getSimulatorLevels}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: colors.grey[400], mt: 1, display: 'block' }}>
              This is the exact same chart as the standalone page. Your custom DCA levels are drawn as extra lines (green for buy-boost/oversold, pink for sell/overbought). Full history, zoom, and pan work exactly as on /risk or /tx-mvrv.
            </Typography>
          </Paper>
        </Grid>

        {/* Results */}
        {simulationResults && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, backgroundColor: colors.primary[400], border: `1px solid ${colors.primary[500]}` }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Backtest Results — {simulationResults.strategy}</Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Invested', value: `$${simulationResults.totalUsdInvested.toFixed(0)}` },
                  { label: 'Final Portfolio Value', value: `$${simulationResults.totalPortfolio.toFixed(0)}` },
                  { label: 'Net P/L', value: `$${(simulationResults.totalPortfolio - simulationResults.totalUsdInvested).toFixed(0)}` },
                  { label: 'ROI', value: `${simulationResults.roi.toFixed(1)}%` },
                  { label: 'BTC Held', value: simulationResults.btcHeld.toFixed(4) },
                  { label: 'Trades Executed', value: simulationResults.transactionCount },
                ].map((stat, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Box sx={{ p: 1.5, background: colors.primary[500], borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                      <Typography variant="h6" sx={{ color: colors.greenAccent[400], fontWeight: 600 }}>{stat.value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Benchmarks */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Benchmarks</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Chip label={`Static DCA ROI: ${simulationResults.staticDca.roi.toFixed(1)}%`} />
                  <Chip label={`Static DCA Final: $${simulationResults.staticDca.finalValue.toFixed(0)}`} />
                  <Chip label={`This strategy beat static by ${(simulationResults.roi - simulationResults.staticDca.roi).toFixed(1)}pp`} color="success" />
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
                          <TableCell sx={{ color: t.type === 'BUY' ? colors.greenAccent[400] : '#f472b6', fontWeight: 600 }}>{t.type}</TableCell>
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
          Data is loaded client-side. Adjust tiers on the left — the chart updates instantly. The levels shown here are exclusive to the Dynamic DCA Simulator.
        </Typography>
      </UnderChartRow>
    </Box>
  );
};

export default DynamicDCASimulator;
