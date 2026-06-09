import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme, useMediaQuery } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';
import ChartTooltip from './ChartTooltip';

const MarketCapDifference = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const differenceSeriesRef = useRef(null);
  const marketCapSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { 
    marketCapData: contextMarketCapData, 
    fetchMarketCapData, 
    marketCapLastUpdated, 
    differenceData: contextDifferenceData, 
    fetchDifferenceData, 
    differenceLastUpdated 
  } = useContext(DataContext);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // ONLY CHANGE: Deduplicate + sort both datasets (fixes Lightweight Charts crash)
  const marketCapData = useMemo(() => {
    const seen = new Set();
    return (contextMarketCapData || [])
      .filter(item => {
        const time = item.time || item.date;
        if (!time) return false;
        const key = typeof time === 'string' ? time : time.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date));
  }, [contextMarketCapData]);

  const differenceData = useMemo(() => {
    const seen = new Set();
    return (contextDifferenceData || [])
      .filter(item => {
        const time = item.time || item.date;
        if (!time) return false;
        const key = typeof time === 'string' ? time : time.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date));
  }, [contextDifferenceData]);

  const percentageFormatter = useCallback((value) => `${value.toFixed(2)}%`, []);
  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
    return value.toFixed(0);
  }, []);

  const setInteractivityHandler = useCallback(() => setIsInteractive(prev => !prev), []);
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
      setIsLoading(true);
      setError(null);
      try {
        if (marketCapData.length === 0) await fetchMarketCapData();
        if (differenceData.length === 0) await fetchDifferenceData();
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchMarketCapData, fetchDifferenceData, marketCapData.length, differenceData.length]);

  useEffect(() => {
    if (differenceData.length === 0 || marketCapData.length === 0) return;

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
    marketCapSeries.setData(marketCapData);

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
  }, [differenceData, marketCapData, colors, percentageFormatter, compactNumberFormatter, resetChartView]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px' }}>
          <div className="span-container">
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: colors.primary[300], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Total Market Cap
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: colors.blueAccent[500], height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Fair Value Delta
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={setInteractivityHandler} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} onDoubleClick={setInteractivityHandler} />
      </div>
      <div className="under-chart">
        {!isDashboard && differenceData.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <LastUpdated customDate={marketCapLastUpdated} />
            {valuationDifference && (
              <span style={{ fontSize: '1.3rem', color: valuationDifference.label === 'Overvaluation' ? '#ff0062' : colors.blueAccent[500], display: 'block', marginTop: '5px' }}>
                {valuationDifference.label}: {valuationDifference.percentage}
              </span>
            )}
          </div>
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      
      {!isDashboard && (
        <div className="chart-info">
          The percentage of the total market cap relative to the Fair Value of all crypto assets combined.
          The Fair Value line (at 100%) represents where the market cap equals the Fair Value, calculated using
          a logarithmic regression model fitted to historical data. When the total market cap equals the Fair Value,
          the percentage is 100%. Values below 100% indicate the market cap is less than the Fair Value (undervalued),
          while values above 100% indicate the market cap exceeds the Fair Value (overvalued).
          <br /><br />
          The core calculation involves determining the slope (m) and intercept (b) of the best-fit
          line for the Fair Value, using the following formulas:
          <br />
          <ul>
            <li><b>m = (n * sum(ln(x) * ln(y)) - sum(ln(x)) * sum(ln(y))) / (n * sum(ln(x)^2) - (sum(ln(x)))^2)</b></li>
            <li><b>b = (sum(ln(y)) - m * sum(ln(x))) / n</b></li>
          </ul>
          <br />
          n = the total number of data points, <br />
          x = the time index (after taking the natural logarithm), and <br />
          y = the data value (after taking the natural logarithm) <br />
          <br />
        </div>
      )}
    
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} isNarrowScreen={isNarrowScreen} render={(tooltipData) => (
<>
<b>
            {tooltipData.marketCap && <div style={{ fontSize: '15px', color: colors.primary[300] }}>Market Cap: ${tooltipData.marketCap}</div>}
            {tooltipData.difference && <div style={{ fontSize: '15px', color: colors.blueAccent[500] }}>Percentage of Fair Value: {tooltipData.difference}</div>}
            {tooltipData.difference && <div style={{ fontSize: '15px', color: colors.greenAccent[500] }}>Fair Value: 100%</div>}
            {tooltipData.date && <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>}
          </b>
</>
)} />
        )}</div>
  );
};

export default MarketCapDifference;