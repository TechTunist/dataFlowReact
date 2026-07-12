import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme, useMediaQuery, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartTooltip from './ChartTooltip';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';
import {
  MARKET_CAP_FAIR_VALUE_TYPES,
  dedupeSortSeries,
  computeFairValueDifferenceSeries,
} from '../utility/marketCapFairValueUtils';

const MARKET_TYPE_OPTIONS = Object.entries(MARKET_CAP_FAIR_VALUE_TYPES).map(([value, config]) => ({
  value,
  label: config.label,
}));

const MarketCapDifference = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const differenceSeriesRef = useRef(null);
  const marketCapSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData: contextBtcData, btcLastUpdated, marketCapData: contextMarketCapData, marketCapLastUpdated, total2Data: contextTotal2Data, total2LastUpdated, total3Data: contextTotal3Data, total3LastUpdated } = useChartData();
  const { fetchBtcData, fetchMarketCapData, fetchTotal2Data, fetchTotal3Data } = useChartDataActions();
  const [selectedMarketType, setSelectedMarketType] = useState('total');
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  const marketTypeConfig = MARKET_CAP_FAIR_VALUE_TYPES[selectedMarketType];

  const rawSeriesData = useMemo(() => {
    switch (selectedMarketType) {
      case 'btc':
        return contextBtcData;
      case 'total2':
        return contextTotal2Data;
      case 'total3':
        return contextTotal3Data;
      default:
        return contextMarketCapData;
    }
  }, [selectedMarketType, contextBtcData, contextMarketCapData, contextTotal2Data, contextTotal3Data]);

  const seriesData = useMemo(() => dedupeSortSeries(rawSeriesData), [rawSeriesData]);

  const differenceData = useMemo(
    () => computeFairValueDifferenceSeries(seriesData, selectedMarketType),
    [seriesData, selectedMarketType]
  );

  const seriesLastUpdated = useMemo(() => {
    switch (selectedMarketType) {
      case 'btc':
        return btcLastUpdated;
      case 'total2':
        return total2LastUpdated;
      case 'total3':
        return total3LastUpdated;
      default:
        return marketCapLastUpdated;
    }
  }, [selectedMarketType, btcLastUpdated, marketCapLastUpdated, total2LastUpdated, total3LastUpdated]);

  const fetchSeriesData = useCallback(async () => {
    switch (selectedMarketType) {
      case 'btc':
        await fetchBtcData();
        break;
      case 'total2':
        await fetchTotal2Data();
        break;
      case 'total3':
        await fetchTotal3Data();
        break;
      default:
        await fetchMarketCapData();
    }
  }, [selectedMarketType, fetchBtcData, fetchMarketCapData, fetchTotal2Data, fetchTotal3Data]);

  const percentageFormatter = useCallback((value) => `${value.toFixed(2)}%`, []);
  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
    return value.toFixed(0);
  }, []);

  const setInteractivityHandler = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  const valuationDifference = useMemo(() => {
    if (differenceData.length === 0) return null;
    const latestDifference = differenceData[differenceData.length - 1]?.value;
    if (!latestDifference) return null;
    const difference = latestDifference - 100;
    const isOvervalued = difference > 0;
    const percentage = Math.abs(difference).toFixed(2);
    return {
      label: isOvervalued ? 'Overvaluation' : 'Undervaluation',
      percentage: `${percentage}%`,
    };
  }, [differenceData]);

  useEffect(() => {
    const fetchData = async () => {
      if (seriesData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchSeriesData();
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchSeriesData, seriesData.length]);

  useEffect(() => {
    if (differenceData.length === 0 || seriesData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      handleScroll: false,
      handleScale: false,
    });

    const marketCapSeries = chart.addLineSeries({
      priceScaleId: 'left',
      lineWidth: 2,
      color: colors.primary[300],
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    marketCapSeriesRef.current = marketCapSeries;
    marketCapSeries.setData(seriesData);

    const differenceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      color: colors.blueAccent[500],
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: percentageFormatter },
    });
    differenceSeriesRef.current = differenceSeries;
    differenceSeries.setData(differenceData);

    chart.addLineSeries({
      priceScaleId: 'right',
      color: colors.greenAccent[500],
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    }).setData(differenceData.map(({ time }) => ({ time, value: 100 })));

    chart.priceScale('left').applyOptions({
      mode: 1,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    chart.priceScale('right').applyOptions({
      mode: 0,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: { type: 'custom', formatter: percentageFormatter },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const marketCapDataPoint = param.seriesData.get(marketCapSeriesRef.current);
        const differenceDataPoint = param.seriesData.get(differenceSeriesRef.current);
        setTooltipData({
          date: dateStr,
          marketCap: marketCapDataPoint?.value ? compactNumberFormatter(marketCapDataPoint.value) : undefined,
          difference: differenceDataPoint?.value ? percentageFormatter(differenceDataPoint.value) : undefined,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;
    resetChartView();

    return () => {
      chartRef.current = null;
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [differenceData, seriesData, colors, percentageFormatter, compactNumberFormatter, resetChartView]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  const handleMarketTypeChange = useCallback((event) => {
    setSelectedMarketType(event.target.value);
    resetChartView();
  }, [resetChartView]);

  const tooltipValueLabel = selectedMarketType === 'btc' ? 'Price' : 'Market Cap';

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: isNarrowScreen ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isNarrowScreen ? 'stretch' : 'center',
            gap: '12px',
            padding: '5px 10px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: isNarrowScreen ? 'column' : 'row',
              alignItems: isNarrowScreen ? 'stretch' : 'center',
              gap: '16px',
              flex: 1,
            }}
          >
            <FormControl sx={{ minWidth: isNarrowScreen ? '100%' : '200px', maxWidth: '220px' }}>
              <InputLabel
                id="market-cap-type-label"
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                }}
              >
                Market
              </InputLabel>
              <Select
                value={selectedMarketType}
                onChange={handleMarketTypeChange}
                label="Market"
                labelId="market-cap-type-label"
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
                {MARKET_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <div className="span-container">
              <span style={{ marginRight: '20px', display: 'inline-block' }}>
                <span style={{ backgroundColor: colors.primary[300], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                {marketTypeConfig.seriesLabel}
              </span>
              <span style={{ display: 'inline-block' }}>
                <span style={{ backgroundColor: colors.blueAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                Fair Value Delta
              </span>
            </div>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
            <button onClick={setInteractivityHandler} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </Box>
        </Box>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : isNarrowScreen ? 'calc(100% - 140px)' : 'calc(100% - 56px)', width: '100%', border: '2px solid #a9a9a9' }}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} onDoubleClick={setInteractivityHandler} />
      </div>
      <UnderChartRow>
        {!isDashboard && differenceData.length > 0 && <LastUpdated customDate={seriesLastUpdated} />}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>

      {!isDashboard && differenceData.length > 0 && valuationDifference && (
        <UnderChartValue>
          <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
            {valuationDifference.label}: <b style={{ color: valuationDifference.label === 'Overvaluation' ? '#ff0062' : colors.greenAccent[500] }}>{valuationDifference.percentage}</b>
          </span>
        </UnderChartValue>
      )}

      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'What it is',
              content: `The percentage of ${marketTypeConfig.label} ${marketTypeConfig.valueNoun} relative to fair value.`,
            },
            {
              title: 'What this chart shows',
              content: `Grey line (left): ${marketTypeConfig.seriesLabel.toLowerCase()}. Blue line (right): percentage of fair value. The dashed green line at 100% is where ${marketTypeConfig.valueNoun} equals fair value.`,
            },
            {
              title: 'How it is built',
              content: (
                <>
                  Fair value comes from a logarithmic regression model fitted to historical {marketTypeConfig.label}{' '}
                  {marketTypeConfig.valueNoun} data, using the same mid-band parameters as the corresponding market
                  capitalisation chart. Slope (m) and intercept (b) of the best-fit line are derived as:
                  <ul>
                    <li>
                      <strong>
                        m = (n * sum(ln(x) * ln(y)) - sum(ln(x)) * sum(ln(y))) / (n * sum(ln(x)^2) -
                        (sum(ln(x)))^2)
                      </strong>
                    </li>
                    <li>
                      <strong>b = (sum(ln(y)) - m * sum(ln(x))) / n</strong>
                    </li>
                  </ul>
                  n is the total number of data points, x is the time index (after ln), and y is the data
                  value (after ln).
                </>
              ),
            },
            {
              title: 'How to interpret',
              content: `Values below 100% mean ${marketTypeConfig.valueNoun} is below fair value (undervalued). Values above 100% mean ${marketTypeConfig.valueNoun} exceeds fair value (overvalued). The over/undervaluation readout above reflects the latest gap from 100%.`,
            },
          ]}
        />
      )}

      {!isDashboard && (
        <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} isNarrowScreen={isNarrowScreen} render={(data) => (
          <b>
            {data.marketCap && <div style={{ fontSize: '15px', color: colors.primary[300] }}>{tooltipValueLabel}: ${data.marketCap}</div>}
            {data.difference && <div style={{ fontSize: '15px', color: colors.blueAccent[500] }}>Percentage of Fair Value: {data.difference}</div>}
            {data.difference && <div style={{ fontSize: '15px', color: colors.greenAccent[500] }}>Fair Value: 100%</div>}
            {data.date && <div style={{ fontSize: '13px' }}>{data.date}</div>}
          </b>
        )} />
      )}
    </div>
  );
};

export default MarketCapDifference;