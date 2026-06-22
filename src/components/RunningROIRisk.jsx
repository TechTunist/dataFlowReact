// src/components/RunningROIRisk.jsx
import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import {
  useTheme,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartTooltip from './ChartTooltip';
import {
  calculateRunningROI,
  filterPriceDataFromStart,
  mapRunningRoiToRiskSeries,
  BITCOIN_1Y_ROI_CYCLE_PEAKS,
  buildBelowThresholdZones,
  buildAboveThresholdZones,
  summarizeContiguousZones,
  blendRoiSeries,
  easeInOutSmoothstep,
  DEFAULT_BUY_SIGNAL_THRESHOLD,
  DEFAULT_RISK_METRIC_BUY_THRESHOLD,
  DEFAULT_RISK_METRIC_SELL_THRESHOLD,
  BUY_SIGNAL_MIN,
  BUY_SIGNAL_MAX,
  RISK_METRIC_BUY_MIN,
  RISK_METRIC_BUY_MAX,
  RISK_METRIC_SELL_MIN,
  RISK_METRIC_SELL_MAX,
} from '../utility/runningRoiUtils';

const LOOKBACK_DAYS = 365;
const ROI_TRANSITION_MS = 450;
const RAW_ROI_COLOR = '#ff0062';
const RISK_METRIC_COLOR = '#00ccff';

const RunningROIRisk = ({ isDashboard = false }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const roiSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const buyZoneShadedSeriesRef = useRef(null);
  const sellZoneShadedSeriesRef = useRef(null);
  const buySignalPriceLineRef = useRef(null);
  const sellSignalPriceLineRef = useRef(null);
  const buySignalThresholdRef = useRef(DEFAULT_BUY_SIGNAL_THRESHOLD);
  const sellSignalThresholdRef = useRef(DEFAULT_RISK_METRIC_SELL_THRESHOLD);
  const showRiskMetricRef = useRef(false);
  const displayedRoiRef = useRef([]);
  const prevShowRiskMetricRef = useRef(false);
  const transitionRafRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData, ethData, fetchEthData, altcoinData, fetchAltcoinData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentRoi, setCurrentRoi] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartSeriesReady, setChartSeriesReady] = useState(false);

  const [rawBuySignalThreshold, setRawBuySignalThreshold] = useState(DEFAULT_BUY_SIGNAL_THRESHOLD);
  const [riskBuySignalThreshold, setRiskBuySignalThreshold] = useState(DEFAULT_RISK_METRIC_BUY_THRESHOLD);
  const [riskSellSignalThreshold, setRiskSellSignalThreshold] = useState(DEFAULT_RISK_METRIC_SELL_THRESHOLD);
  const [showRiskMetric, setShowRiskMetric] = useState(false);

  const isSignalsEnabled = !isDashboard;
  const isRiskMetricView = showRiskMetric;
  const buySignalMin = isRiskMetricView ? RISK_METRIC_BUY_MIN : BUY_SIGNAL_MIN;
  const buySignalMax = isRiskMetricView ? RISK_METRIC_BUY_MAX : BUY_SIGNAL_MAX;
  const buySignalThreshold = isRiskMetricView ? riskBuySignalThreshold : rawBuySignalThreshold;
  const sellSignalThreshold = riskSellSignalThreshold;

  useEffect(() => {
    buySignalThresholdRef.current = buySignalThreshold;
    sellSignalThresholdRef.current = sellSignalThreshold;
    showRiskMetricRef.current = showRiskMetric;
  }, [buySignalThreshold, sellSignalThreshold, showRiskMetric]);

  const altcoins = [
    { label: 'Bitcoin', value: 'BTC' },
    { label: 'Ethereum', value: 'ETH' },
    { label: 'Solana', value: 'SOL' },
    { label: 'Cardano', value: 'ADA' },
    { label: 'Dogecoin', value: 'DOGE' },
    { label: 'Chainlink', value: 'LINK' },
    { label: 'XRP', value: 'XRP' },
    { label: 'Avalanche', value: 'AVAX' },
    { label: 'Toncoin', value: 'TON' },
    { label: 'Binance-Coin', value: 'BNB' },
    { label: 'Aave', value: 'AAVE' },
    { label: 'Cronos', value: 'CRO' },
    { label: 'Sui', value: 'SUI' },
    { label: 'Hedera', value: 'HBAR' },
    { label: 'Stellar', value: 'XLM' },
    { label: 'Aptos', value: 'APT' },
    { label: 'Polkadot', value: 'DOT' },
    { label: 'VeChain', value: 'VET' },
    { label: 'Uniswap', value: 'UNI' },
    { label: 'Litecoin', value: 'LTC' },
    { label: 'Leo Utility Token', value: 'LEO' },
    { label: 'Hyperliquid', value: 'HYPE' },
    { label: 'Near Protocol', value: 'NEAR' },
    { label: 'Fetch.ai', value: 'FET' },
    { label: 'Ondo Finance', value: 'ONDO' },
    { label: 'Internet Computer', value: 'ICP' },
    { label: 'Monero', value: 'XMR' },
    { label: 'Polygon', value: 'POL' },
    { label: 'Algorand', value: 'ALGO' },
    { label: 'Render', value: 'RENDER' },
    { label: 'Arbitrum', value: 'ARB' },
    { label: 'Raydium', value: 'RAY' },
    { label: 'Move', value: 'MOVE' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const promises = [];
      if (selectedAsset === 'BTC' && btcData.length === 0) {
        promises.push(fetchBtcData());
      } else if (selectedAsset === 'ETH' && ethData.length === 0) {
        promises.push(fetchEthData());
      } else if (selectedAsset !== 'BTC' && selectedAsset !== 'ETH' && !altcoinData[selectedAsset]) {
        promises.push(fetchAltcoinData(selectedAsset));
      }

      if (promises.length > 0) {
        setIsLoading(true);
        try {
          await Promise.all(promises);
        } catch (err) {
          console.error(`Error fetching data for ${selectedAsset}:`, err);
        }
      }
    };

    fetchData();
  }, [selectedAsset, btcData, ethData, altcoinData, fetchBtcData, fetchEthData, fetchAltcoinData]);

  useEffect(() => {
    const assetData = selectedAsset === 'BTC' ? btcData :
                      selectedAsset === 'ETH' ? ethData :
                      altcoinData[selectedAsset] || [];

    if (assetData.length > 0) {
      setChartData(filterPriceDataFromStart(assetData));
      setIsLoading(false);
    }
  }, [selectedAsset, btcData, ethData, altcoinData]);

  const {
    roiData,
    riskMetricData,
    activeRoiData,
    maxRawRoi,
    maxActiveRoi,
    buyZoneData,
    sellZoneData,
    buyZoneRanges,
    inBuyZone,
    inSellZone,
  } = useMemo(() => {
    const filteredData = calculateRunningROI(chartData, LOOKBACK_DAYS);
    const cyclePeaks = selectedAsset === 'BTC' ? BITCOIN_1Y_ROI_CYCLE_PEAKS : null;
    const riskSeries = mapRunningRoiToRiskSeries(filteredData, { peaks: cyclePeaks });

    const rawMax = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.roi)) : 200;
    const adjustedRawMax = Math.max(200, rawMax * 1.1);

    const usingRiskMetric = showRiskMetric && riskSeries.length > 0;
    const active = usingRiskMetric ? riskSeries : filteredData;
    const activeMax = usingRiskMetric ? 1 : adjustedRawMax;

    const buySource = usingRiskMetric ? riskSeries : filteredData;
    const buyZones = buildBelowThresholdZones(buySource, buySignalThreshold);
    const sellZones = usingRiskMetric
      ? buildAboveThresholdZones(riskSeries, sellSignalThreshold)
      : [];

    const latest = active[active.length - 1];

    return {
      roiData: filteredData,
      riskMetricData: riskSeries,
      activeRoiData: active,
      maxRawRoi: adjustedRawMax,
      maxActiveRoi: activeMax,
      buyZoneData: buyZones,
      sellZoneData: sellZones,
      buyZoneRanges: summarizeContiguousZones(buyZones),
      inBuyZone: latest != null && latest.roi < buySignalThreshold,
      inSellZone: usingRiskMetric && latest != null && latest.roi > sellSignalThreshold,
    };
  }, [
    chartData,
    selectedAsset,
    showRiskMetric,
    buySignalThreshold,
    sellSignalThreshold,
  ]);

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  const formatDate = (isoDate) => isoDate.split('-').reverse().join('-');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.01, bottom: 0.01 },
        borderVisible: false,
        mode: 0,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1,
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const buyZoneShadedSeries = chart.addHistogramSeries({
      priceScaleId: 'signal-scale',
      color: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.28)' : 'rgba(0, 128, 0, 0.22)',
      priceFormat: { type: 'custom', minMove: 0.01, formatter: () => '' },
      visible: false,
    });
    buyZoneShadedSeriesRef.current = buyZoneShadedSeries;

    const sellZoneShadedSeries = chart.addHistogramSeries({
      priceScaleId: 'signal-scale',
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 0.28)' : 'rgba(220, 38, 38, 0.22)',
      priceFormat: { type: 'custom', minMove: 0.01, formatter: () => '' },
      visible: false,
    });
    sellZoneShadedSeriesRef.current = sellZoneShadedSeries;

    chart.priceScale('signal-scale').applyOptions({
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: 0.05 },
      visible: false,
    });

    const roiSeries = chart.addLineSeries({
      color: RAW_ROI_COLOR,
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
    });
    roiSeriesRef.current = roiSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

    chart.subscribeCrosshairMove(param => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const roiPoint = param.seriesData.get(roiSeriesRef.current);
        const roiValue = roiPoint?.value;
        const riskMetricView = showRiskMetricRef.current;
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          roi: roiValue,
          isRiskMetricView: riskMetricView,
          inBuyZone: roiValue != null && roiValue < buySignalThresholdRef.current,
          inSellZone: riskMetricView && roiValue != null && roiValue > sellSignalThresholdRef.current,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;
    setChartSeriesReady(true);

    return () => {
      if (transitionRafRef.current) cancelAnimationFrame(transitionRafRef.current);
      chart.remove();
      chartRef.current = null;
      roiSeriesRef.current = null;
      priceSeriesRef.current = null;
      buyZoneShadedSeriesRef.current = null;
      sellZoneShadedSeriesRef.current = null;
      buySignalPriceLineRef.current = null;
      sellSignalPriceLineRef.current = null;
      displayedRoiRef.current = [];
      setChartSeriesReady(false);
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: colors.greenAccent[700] },
          horzLines: { color: colors.greenAccent[700] },
        },
      });
    }
  }, [colors]);

  useEffect(() => {
    if (priceSeriesRef.current && chartData.length > 0) {
      priceSeriesRef.current.setData(chartData.map(data => ({ time: data.time, value: data.value })));
      chartRef.current?.timeScale().fitContent();
    } else if (priceSeriesRef.current) {
      priceSeriesRef.current.setData([]);
    }
  }, [chartData]);

  // Single series: smooth transition when toggling raw ROI ↔ 0–1 risk metric
  useEffect(() => {
    const series = roiSeriesRef.current;
    if (!series) return;

    const targetRoiData = showRiskMetric && riskMetricData.length > 0
      ? riskMetricData
      : roiData;
    const targetSeries = targetRoiData.map((d) => ({ time: d.time, value: d.roi }));
    const targetColor = showRiskMetric ? RISK_METRIC_COLOR : RAW_ROI_COLOR;
    const viewModeChanged = prevShowRiskMetricRef.current !== showRiskMetric;
    prevShowRiskMetricRef.current = showRiskMetric;

    if (transitionRafRef.current) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }

    if (targetSeries.length === 0) {
      series.setData([]);
      displayedRoiRef.current = [];
      return;
    }

    const applyTarget = () => {
      series.setData(targetSeries);
      displayedRoiRef.current = targetSeries;
      series.applyOptions({ color: targetColor });
      chartRef.current?.priceScale('right').applyOptions({
        mode: showRiskMetric ? 0 : 1,
        minimum: showRiskMetric ? 0 : 0.1,
        maximum: showRiskMetric ? 1 : maxRawRoi,
      });
    };

    if (!viewModeChanged || displayedRoiRef.current.length === 0) {
      applyTarget();
      return;
    }

    const fromSeries = displayedRoiRef.current;
    const startMax = showRiskMetric ? maxRawRoi : 1;
    const endMax = showRiskMetric ? 1 : maxRawRoi;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const linear = Math.min(1, elapsed / ROI_TRANSITION_MS);
      const eased = easeInOutSmoothstep(linear);

      const blended = blendRoiSeries(fromSeries, targetRoiData, eased);
      series.setData(blended);
      displayedRoiRef.current = blended;

      const blendedMax = startMax + (endMax - startMax) * eased;
      chartRef.current?.priceScale('right').applyOptions({
        mode: showRiskMetric ? 0 : 1,
        minimum: showRiskMetric ? 0 : 0.1,
        maximum: blendedMax,
      });

      if (linear < 1) {
        transitionRafRef.current = requestAnimationFrame(animate);
      } else {
        applyTarget();
        transitionRafRef.current = null;
      }
    };

    transitionRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (transitionRafRef.current) {
        cancelAnimationFrame(transitionRafRef.current);
        transitionRafRef.current = null;
      }
    };
  }, [roiData, riskMetricData, showRiskMetric, maxActiveRoi, maxRawRoi]);

  useEffect(() => {
    if (buyZoneShadedSeriesRef.current) {
      const active = isSignalsEnabled && buyZoneData.length > 0;
      buyZoneShadedSeriesRef.current.setData(active ? buyZoneData : []);
      buyZoneShadedSeriesRef.current.applyOptions({ visible: active });
    }
    if (sellZoneShadedSeriesRef.current) {
      const active = isSignalsEnabled && isRiskMetricView && sellZoneData.length > 0;
      sellZoneShadedSeriesRef.current.setData(active ? sellZoneData : []);
      sellZoneShadedSeriesRef.current.applyOptions({ visible: active });
    }
  }, [buyZoneData, sellZoneData, isSignalsEnabled, isRiskMetricView]);

  useEffect(() => {
    const series = roiSeriesRef.current;
    if (!chartSeriesReady || !series) return;

    if (buySignalPriceLineRef.current) {
      try { series.removePriceLine(buySignalPriceLineRef.current); } catch (e) { /* noop */ }
      buySignalPriceLineRef.current = null;
    }
    if (sellSignalPriceLineRef.current) {
      try { series.removePriceLine(sellSignalPriceLineRef.current); } catch (e) { /* noop */ }
      sellSignalPriceLineRef.current = null;
    }

    if (!isSignalsEnabled) return;

    try {
      buySignalPriceLineRef.current = series.createPriceLine({
        price: buySignalThreshold,
        color: colors.greenAccent[500],
        lineWidth: 2,
        lineStyle: 2,
        title: 'Buy Signal',
        axisLabelColor: colors.greenAccent[500],
      });
    } catch (e) { /* noop */ }

    if (isRiskMetricView) {
      try {
        sellSignalPriceLineRef.current = series.createPriceLine({
          price: sellSignalThreshold,
          color: colors.redAccent[500],
          lineWidth: 2,
          lineStyle: 2,
          title: 'Sell Signal',
          axisLabelColor: colors.redAccent[500],
        });
      } catch (e) { /* noop */ }
    }
  }, [
    chartSeriesReady,
    isSignalsEnabled,
    isRiskMetricView,
    buySignalThreshold,
    sellSignalThreshold,
    colors,
  ]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('left').applyOptions({ mode: 1 }); // log price
      chartRef.current.priceScale('right').applyOptions({
        title: isRiskMetricView ? 'ROI Risk (0–1)' : '1Y Running ROI',
        mode: isRiskMetricView ? 0 : 1, // linear 0–1 for risk; log for raw ROI
        minimum: isRiskMetricView ? 0 : 0.1,
        maximum: maxActiveRoi,
      });
    }
  }, [isInteractive, maxActiveRoi, isRiskMetricView]);

  useEffect(() => {
    const latestPriceData = chartData[chartData.length - 1];
    const latestActive = activeRoiData[activeRoiData.length - 1];
    setCurrentPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentRoi(
      latestActive?.roi != null
        ? (isRiskMetricView ? latestActive.roi.toFixed(3) : latestActive.roi.toFixed(2))
        : null
    );
  }, [chartData, activeRoiData, isRiskMetricView]);

  const handleAssetChange = (e) => setSelectedAsset(e.target.value);

  const roiLegendLabel = isRiskMetricView ? (isMobile ? 'Risk' : 'ROI Risk') : (isMobile ? 'ROI' : 'Running ROI');
  const roiLegendColor = isRiskMetricView ? RISK_METRIC_COLOR : RAW_ROI_COLOR;
  const valueSuffix = isRiskMetricView ? '' : 'x';

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
            marginBottom: '10px',
            marginTop: '8px',
          }}
        >
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="asset-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Asset
            </InputLabel>
            <Select
              value={selectedAsset}
              onChange={handleAssetChange}
              label="Asset"
              labelId="asset-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              {altcoins.map(asset => (
                <MenuItem key={asset.value} value={asset.value}>
                  {asset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {isSignalsEnabled && (
        <Box
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: '8px',
            backgroundColor: colors.primary[600],
            border: `1px solid ${colors.grey[700]}`,
          }}
        >
          <Typography variant="caption" sx={{ color: colors.grey[300], display: 'block', mb: 1 }}>
            Fixed 1-year running ROI from 1 Nov 2011 onward. Raw view is unmodified (log scale). ROI Risk (0–1) aligns cycle peaks and drawdowns via diminishing-returns scaling — later, shallower bottoms can reach lower risk more easily.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: colors.greenAccent[500], display: 'block', mb: 0.25 }}>
                Buy signal{isRiskMetricView ? ' (risk)' : ' (raw)'}: <b>{buySignalThreshold.toFixed(isRiskMetricView ? 2 : 2)}{isRiskMetricView ? '' : 'x'}</b>
                {' — '}
                <b style={{ color: inBuyZone ? colors.greenAccent[400] : colors.grey[400] }}>
                  {inBuyZone ? 'BUY' : 'NO BUY'}
                </b>
              </Typography>
              <Slider
                value={Math.min(buySignalMax, Math.max(buySignalMin, buySignalThreshold))}
                min={buySignalMin}
                max={buySignalMax}
                step={isRiskMetricView ? 0.01 : 0.05}
                size="small"
                onChange={(_, v) => {
                  const next = Number(v);
                  if (isRiskMetricView) setRiskBuySignalThreshold(next);
                  else setRawBuySignalThreshold(next);
                }}
                sx={{ color: colors.greenAccent[500] }}
              />
            </Box>
            <Box sx={{ opacity: isRiskMetricView ? 1 : 0.45 }}>
              <Typography variant="caption" sx={{ color: colors.redAccent[500], display: 'block', mb: 0.25 }}>
                Sell signal (ROI Risk): <b>{sellSignalThreshold.toFixed(2)}</b>
                {isRiskMetricView && (
                  <>
                    {' — '}
                    <b style={{ color: inSellZone ? colors.redAccent[400] : colors.grey[400] }}>
                      {inSellZone ? 'SELL' : 'NO SELL'}
                    </b>
                  </>
                )}
              </Typography>
              <Slider
                value={sellSignalThreshold}
                min={RISK_METRIC_SELL_MIN}
                max={RISK_METRIC_SELL_MAX}
                step={0.01}
                size="small"
                disabled={!isRiskMetricView}
                onChange={(_, v) => setRiskSellSignalThreshold(Number(v))}
                sx={{ color: colors.redAccent[500] }}
              />
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={showRiskMetric}
                onChange={(e) => setShowRiskMetric(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="caption" sx={{ color: colors.grey[200] }}>
                ROI Risk (0–1)
              </Typography>
            }
          />
        </Box>
      )}

      {!isDashboard && (
        <div className='chart-top-div' style={{ marginBottom: '10px' }}>
          <div className="span-container" style={{ position: 'relative', top: 10, left: 0, zIndex: 2 }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {altcoins.find(asset => asset.value === selectedAsset)?.label} {isMobile ? '' : 'Price'}
            </span>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: roiLegendColor, height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {roiLegendLabel}
            </span>
            {isSignalsEnabled && (
              <>
                <span style={{ marginRight: '12px', display: 'inline-block' }}>
                  <span style={{ backgroundColor: colors.greenAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px', opacity: 0.5 }} />
                  Buy zone
                </span>
                {isRiskMetricView && (
                  <span style={{ display: 'inline-block' }}>
                    <span style={{ backgroundColor: colors.redAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px', opacity: 0.5 }} />
                    Sell zone
                  </span>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) setIsInteractive(true);
            else setIsInteractive(false);
          }}
        />
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              color: colors.grey[100],
            }}
          >
            <span style={{ fontSize: '16px' }}>Loading data...</span>
          </Box>
        )}
        {!isLoading && chartData.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              color: colors.redAccent[500],
            }}
          >
            <span style={{ fontSize: '16px' }}>No data available</span>
          </Box>
        )}

        {tooltipData && (
          <ChartTooltip
            tooltipData={tooltipData}
            chartContainerRef={chartContainerRef}
            xNudge={50}
            render={(tip) => (
              <>
                <div style={{ fontSize: '15px' }}>{altcoins.find(asset => asset.value === selectedAsset)?.label}</div>
                {tip.price && <div style={{ fontSize: '20px' }}>${tip.price.toFixed(2)}</div>}
                {tip.roi != null && (
                  <div style={{ color: tip.isRiskMetricView ? RISK_METRIC_COLOR : RAW_ROI_COLOR }}>
                    {tip.isRiskMetricView ? 'ROI Risk' : 'ROI'}: {tip.roi.toFixed(tip.isRiskMetricView ? 3 : 2)}{tip.isRiskMetricView ? '' : 'x'}
                  </div>
                )}
                {isSignalsEnabled && tip.inBuyZone != null && (
                  <div style={{ color: tip.inBuyZone ? colors.greenAccent[400] : colors.grey[400] }}>
                    Buy zone: {tip.inBuyZone ? 'YES' : 'NO'}
                  </div>
                )}
                {isSignalsEnabled && tip.isRiskMetricView && tip.inSellZone != null && (
                  <div style={{ color: tip.inSellZone ? colors.redAccent[400] : colors.grey[400] }}>
                    Sell zone: {tip.inSellZone ? 'YES' : 'NO'}
                  </div>
                )}
                {tip.date && <div>{formatDate(tip.date)}</div>}
              </>
            )}
          />
        )}
      </div>

      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey={`${selectedAsset.toLowerCase()}Data`} />}
        {!isDashboard && selectedAsset === 'BTC' && <BitcoinFees />}
      </UnderChartRow>

      {!isDashboard && (
        <div>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Current {isRiskMetricView ? 'ROI risk' : '1Y ROI'}:{' '}
              <b style={{ color: roiLegendColor }}>{currentRoi}{valueSuffix}</b> (<b>${currentPrice.toFixed(0)}k</b>)
              {isSignalsEnabled && (
                <>
                  {' '}| Buy: <b style={{ color: inBuyZone ? colors.greenAccent[400] : colors.grey[400] }}>{inBuyZone ? 'YES' : 'NO'}</b>
                  {isRiskMetricView && (
                    <> | Sell: <b style={{ color: inSellZone ? colors.redAccent[400] : colors.grey[400] }}>{inSellZone ? 'YES' : 'NO'}</b></>
                  )}
                </>
              )}
            </span>
          </UnderChartValue>

          {isSignalsEnabled && buyZoneRanges.length > 0 && (
            <Box sx={{ mt: 1, mb: 1, px: 1 }}>
              <Typography variant="caption" sx={{ color: colors.grey[300], display: 'block', mb: 0.5 }}>
                Recent buy zones ({buyZoneRanges.length} period{buyZoneRanges.length !== 1 ? 's' : ''}):
              </Typography>
              <Typography variant="caption" component="div" sx={{ color: colors.grey[400], fontSize: '0.75rem' }}>
                {buyZoneRanges.slice(-5).map((range) => (
                  <div key={`${range.start}-${range.end}`}>
                    {formatDate(range.start)} → {formatDate(range.end)} ({range.days}d, low {range.minRoi.toFixed(isRiskMetricView ? 3 : 2)}{isRiskMetricView ? ' risk' : 'x'} @ ${range.minPrice.toFixed(0)})
                  </div>
                ))}
              </Typography>
            </Box>
          )}

          <p className="chart-info">
            Running ROI is the multiplicative return over a fixed 1-year lookback (1x = flat, 2x = doubled). Data before 1 November 2011 is omitted so early price history does not skew the scale. <b>ROI Risk</b> (0–1) corrects diminishing returns on both tops and bottoms: cycle peaks (2013: 91.51x, 2017: 24.04x, 2021: 11.85x, 2024: 3.35x) are lifted toward 1, while later cycle drawdowns — expected to be less violent — are mapped to progressively lower risk targets so modest pullbacks can still dip meaningfully.
            {isSignalsEnabled && (
              <> Toggle ROI Risk to morph between raw ROI and the 0–1 metric (~450ms). Buy on raw ROI (0.1x–1.0x) or low risk (0–0.5, default 0.2); sell signals in risk view only (default 0.75).</>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(RunningROIRisk);