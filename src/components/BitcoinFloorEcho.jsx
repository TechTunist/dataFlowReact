import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import '../styling/bitcoinChart.css';

import {
  UnderChartRow,
  UnderChartValue,
  ChartUnderSection,
} from './ChartUnderSection';
import ChartInfoSections from './ChartInfoSections';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartTooltip from './ChartTooltip';
import LastUpdated from '../hooks/LastUpdated';
import useIsMobile from '../hooks/useIsMobile';
import {
  applyFeiSmoothing,
  getFloorEchoReferenceLevels,
  FLOOR_ECHO_FIXED_FLOOR_BAND,
  FLOOR_ECHO_FIXED_ECHO_BAND,
  FLOOR_ECHO_SMOOTHING_OPTIONS,
} from '../utility/floorEchoIndex';

const BitcoinFloorEcho = ({ isDashboard = false, isChartPage = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const feiSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const floorLineRef = useRef(null);
  const echoLineRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const [isInteractive, setIsInteractive] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [smoothingPeriod, setSmoothingPeriod] = useState(7);

  const {
    floorEchoData,
    fetchFloorEchoData,
    floorEchoLastUpdated,
    isFloorEchoDataFetched,
  } = useContext(DataContext);

  const rawSeries = useMemo(() => floorEchoData?.series || [], [floorEchoData]);

  const feiSeries = useMemo(
    () => applyFeiSmoothing(rawSeries, smoothingPeriod),
    [rawSeries, smoothingPeriod],
  );

  const feiState = useMemo(() => {
    if (!feiSeries.length) return null;
    const last = feiSeries[feiSeries.length - 1];
    const levels = getFloorEchoReferenceLevels(feiSeries);
    const inFloorZone = last.fei <= (levels.echoBand ?? FLOOR_ECHO_FIXED_ECHO_BAND) * 1.12
      && (last.dampening ?? 1) >= 0.75;
    const nearHistoricFloor = last.fei <= (levels.floorBand ?? FLOOR_ECHO_FIXED_FLOOR_BAND) * 1.2
      && (last.dampening ?? 1) >= 0.85;
    return {
      ...last,
      levels,
      inFloorZone,
      nearHistoricFloor,
      signal: nearHistoricFloor
        ? 'Floor Echo: approaching prior bottom cluster'
        : inFloorZone
          ? 'Capitulation zone: watch for local minimum'
          : last.fei < (levels.median ?? 50)
            ? 'Below median: cooling'
            : 'Neutral / recovery',
    };
  }, [feiSeries]);
  const refLevels = useMemo(() => {
    const derived = getFloorEchoReferenceLevels(feiSeries);
    return {
      floorBand: derived.floorBand ?? floorEchoData?.floorBand ?? FLOOR_ECHO_FIXED_FLOOR_BAND,
      echoBand: derived.echoBand ?? floorEchoData?.echoBand ?? FLOOR_ECHO_FIXED_ECHO_BAND,
    };
  }, [feiSeries, floorEchoData]);

  const priceData = useMemo(
    () => feiSeries
      .filter((d) => d.btcPrice > 0)
      .map((d) => ({ time: d.time, value: d.btcPrice })),
    [feiSeries],
  );

  const feiChartData = useMemo(
    () => feiSeries.map((d) => ({ time: d.time, value: d.fei })),
    [feiSeries],
  );

  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return value.toFixed(0);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setDataError(null);
      try {
        await fetchFloorEchoData();
      } catch (err) {
        setDataError('Failed to load Floor Echo Index.');
        console.warn(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchFloorEchoData]);

  useEffect(() => {
    if (!isFloorEchoDataFetched || isLoading) return;
    if (rawSeries.length === 0) {
      setDataError('Floor Echo data is not available yet. Run the backend precompute job.');
    } else {
      setDataError(null);
    }
  }, [rawSeries.length, isLoading, isFloorEchoDataFetched]);

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
        scaleMargins: { top: 0.05, bottom: 0.05 },
        borderVisible: false,
        mode: 0,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 0.4)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1,
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    feiSeriesRef.current = chart.addLineSeries({
      color: '#00e5c0',
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (v) => v.toFixed(1) },
    });
    priceSeriesRef.current = chart.addLineSeries({
      color: 'rgba(160,160,160,0.85)',
      priceScaleId: 'left',
      lineWidth: 1,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    floorLineRef.current = feiSeriesRef.current.createPriceLine({
      price: FLOOR_ECHO_FIXED_FLOOR_BAND,
      color: 'rgba(255, 80, 120, 0.7)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Historic floor band',
    });
    echoLineRef.current = feiSeriesRef.current.createPriceLine({
      price: FLOOR_ECHO_FIXED_ECHO_BAND,
      color: 'rgba(255, 200, 80, 0.6)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Echo zone',
    });

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point || !param.time
        || param.point.x < 0 || param.point.y < 0
        || param.point.x > chartContainerRef.current.clientWidth
        || param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
        return;
      }
      setTooltipData({
        date: param.time,
        price: param.seriesData.get(priceSeriesRef.current)?.value,
        fei: param.seriesData.get(feiSeriesRef.current)?.value,
        x: param.point.x,
        y: param.point.y,
      });
    });

    chartRef.current = chart;
    const onResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [colors.primary, compactNumberFormatter]);

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
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [colors, isInteractive]);

  useEffect(() => {
    if (!feiSeriesRef.current || !priceSeriesRef.current) return;
    if (feiChartData.length > 0) feiSeriesRef.current.setData(feiChartData);
    if (priceData.length > 0) priceSeriesRef.current.setData(priceData);
    if (refLevels.floorBand != null && floorLineRef.current) {
      floorLineRef.current.applyOptions({ price: refLevels.floorBand });
    }
    if (refLevels.echoBand != null && echoLineRef.current) {
      echoLineRef.current.applyOptions({ price: refLevels.echoBand });
    }
    chartRef.current?.timeScale().fitContent();
  }, [feiChartData, priceData, refLevels]);

  const setInteractivity = useCallback(() => {
    setIsInteractive((prev) => !prev);
  }, []);

  const resetChartView = () => chartRef.current?.timeScale().fitContent();

  const chartHeight = isDashboard
    ? '100%'
    : isChartPage
      ? 'var(--chart-area-min-height, clamp(400px, 62vh, 780px))'
      : 'calc(100% - 100px)';

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '30px',
              marginTop: '8px',
            }}
          >
            <FormControl sx={{ minWidth: '140px', width: { xs: '100%', sm: '200px' } }}>
              <InputLabel
                id="fei-smoothing-label"
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                }}
              >
                Smoothing Period
              </InputLabel>
              <Select
                value={smoothingPeriod}
                onChange={(e) => setSmoothingPeriod(Number(e.target.value))}
                label="Smoothing Period"
                labelId="fei-smoothing-label"
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
                {FLOOR_ECHO_SMOOTHING_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading…</span>}
            {dataError && <span style={{ color: colors.redAccent[500] }}>{dataError}</span>}
            <Box sx={{ display: 'flex', gap: '10px', marginLeft: { sm: 'auto' } }}>
              <button
                type="button"
                onClick={setInteractivity}
                className="button-reset"
                style={{
                  backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                  color: isInteractive ? 'black' : '#31d6aa',
                  borderColor: isInteractive ? 'violet' : '#70d8bd',
                }}
              >
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </button>
              <button
                type="button"
                onClick={resetChartView}
                className="button-reset extra-margin"
              >
                Reset Chart
              </button>
            </Box>
          </Box>
          <div className="chart-top-div">
            <div className="span-container">
              <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }} />
                Bitcoin Price
              </span>
              <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ backgroundColor: '#00e5c0', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }} />
                Floor Echo Index
              </span>
              <span style={{ marginRight: '20px', display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ borderBottom: '2px dashed rgba(255, 80, 120, 0.7)', width: '16px', display: 'inline-block', marginRight: '5px', verticalAlign: 'middle' }} />
                Historic floor band
              </span>
              <span style={{ display: 'inline-block', color: colors.primary[100] }}>
                <span style={{ borderBottom: '2px dashed rgba(255, 200, 80, 0.6)', width: '16px', display: 'inline-block', marginRight: '5px', verticalAlign: 'middle' }} />
                Echo zone
              </span>
            </div>
          </div>
        </>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: chartHeight,
          width: '100%',
          border: isDashboard ? undefined : `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}`,
        }}
        onDoubleClick={() => {
          if (!isDashboard) setInteractivity();
        }}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%' }} />
        {!isDashboard && tooltipData && (
          <ChartTooltip
            tooltipData={tooltipData}
            chartContainerRef={chartContainerRef}
            style={{
              backgroundColor: colors.primary[900],
              padding: '6px 10px',
              borderRadius: '4px',
              color: colors.primary[100],
            }}
            render={(tip) => (
              <>
                <div>{tip.date}</div>
                {tip.price != null && (
                  <div>BTC: ${compactNumberFormatter(tip.price)}</div>
                )}
                {tip.fei != null && (
                  <div style={{ color: '#00e5c0' }}>Floor Echo: {tip.fei.toFixed(1)}</div>
                )}
              </>
            )}
          />
        )}
      </div>

      {!isDashboard && (
        <>
          <UnderChartRow style={{ justifyContent: 'flex-start' }}>
            <LastUpdated customDate={floorEchoLastUpdated} />
          </UnderChartRow>
          <ChartUnderSection borderColor={colors.primary[500]} sx={{ color: colors.primary[100] }}>
            {feiState && (
              <UnderChartValue>
                <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: colors.primary[100] }}>
                  Floor Echo:{' '}
                  <b style={{ color: feiState.nearHistoricFloor ? colors.redAccent[400] : colors.greenAccent[500] }}>
                    {feiState.fei.toFixed(1)}
                  </b>
                  {' · '}
                  <span style={{ color: feiState.inFloorZone ? colors.redAccent[400] : colors.grey[300] }}>
                    {feiState.signal}
                  </span>
                </span>
              </UnderChartValue>
            )}
            <ChartInfoSections
              sx={{ maxWidth: '900px' }}
              sections={[
                {
                  title: 'What it is',
                  content: 'The Floor Echo Index (FEI) measures how many independent crypto datasets are capitulating together. Prior Bitcoin cycle lows formed when sentiment, on-chain valuation, network activity, market structure, and miner stress all broke down at once: a "floor echo" of earlier bottoms, not a single panic spike.',
                },
                {
                  title: 'What this chart shows',
                  content: 'Grey line (left axis): BTC price (log scale). Teal line (right axis): FEI from 0–100. Red dashed line: historic floor band (~8th percentile of FEI history). Yellow dashed line: echo zone (~15th percentile). Use the smoothing selector to reduce day-to-day noise (7 days to 12 months).',
                },
                {
                  title: 'How it is built',
                  content: 'Daily inputs aligned to BTC: Fear & Greed; on-chain risk (MVRV, Puell, SOPL); transaction count; BTC dominance and altcoin-season index; miner thermo-cap stress. Macro and equity ratios are excluded because they often stress early in bears before price reaches the true floor. Each input becomes a 0–1 stress score, weighted (on-chain 30%, F&G 18%, alt regime 18%, tx 16%, miners 18%), then dampened by BTC drawdown from the rolling ~2-year peak so shallow pullbacks cannot print a full capitulation reading. The result is ranked against full history so cycle extremes land in a similar low band.',
                },
                {
                  title: 'How to interpret',
                  content: 'Low FEI (teal line dropping toward the red/yellow bands) deep into a bear market suggests broad capitulation. Watch for a local price minimum forming. FEI revisiting the floor band near prior cycle lows is the main signal; mid-bear bounces can still show elevated stress without implying the cycle low is in. High FEI means fewer datasets are in stress: recovery or mid-cycle conditions. The status line above summarizes the latest reading. FEI is a confluence context tool, not a standalone buy/sell trigger. Combine it with price structure and your own risk framework.',
                },
              ]}
            />
          </ChartUnderSection>
        </>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinFloorEcho);