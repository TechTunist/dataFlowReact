import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme, useMediaQuery } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';

const TotalMarketCap = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { marketCapData, fetchMarketCapData, marketCapLastUpdated } =
    useContext(DataContext);

  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const scaleMode = 1; // Fixed to logarithmic

  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Fetch data only if not present in context
  useEffect(() => {
    const fetchData = async () => {
      if (marketCapData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchMarketCapData();
      } catch (err) {
        setError('Failed to fetch market cap data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchMarketCapData, marketCapData.length]);

  const calculateLogarithmicRegression = useCallback((data) => {
    const n = data.length;
    const sumLogX = data.reduce((sum, _, index) => sum + Math.log(index + 1), 0);
    const sumY = data.reduce((sum, point) => sum + Math.log(point.value), 0);
    const sumLogXSquared = data.reduce((sum, _, index) => sum + Math.log(index + 1) ** 2, 0);
    const sumLogXLogY = data.reduce(
      (sum, point, index) => sum + Math.log(index + 1) * Math.log(point.value),
      0
    );

    const slope = (n * sumLogXLogY - sumLogX * sumY) / (n * sumLogXSquared - sumLogX ** 2);
    const intercept = (sumY - slope * sumLogX) / n;

    return { slope, intercept };
  }, []);

  const extendDataForFuture = useCallback((data, weeks) => {
    const lastDate = new Date(data[data.length - 1].time);
    const extendedData = [...data];
    for (let i = 1; i <= weeks; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i * 7);
      extendedData.push({ time: nextDate.toISOString().split('T')[0], value: null });
    }
    return extendedData;
  }, []);

  const compactNumberFormatter = useCallback((value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
    return value.toFixed(0);
  }, []);

  const setInteractivity = useCallback(() => setIsInteractive((prev) => !prev), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  const regressionLines = useMemo(() => {
    if (marketCapData.length === 0) return {};

    const extendedData = extendDataForFuture(marketCapData, 156);
    const { slope, intercept } = calculateLogarithmicRegression(marketCapData);

    const calculateRegressionPoints = (scale, color, shiftDays = 0, curveAdjustment = 1) => {
      return extendedData.map(({ time }, index) => {
        const x = Math.log(index + 1 - shiftDays + 1);
        const adjustedX = Math.pow(x, curveAdjustment);
        const delta = intercept - 11.5;
        const adjustedSlope = slope + 2;
        const y = Math.exp(adjustedSlope * adjustedX + delta) * scale;
        return { time, value: y };
      });
    };

    return {
      logBase2: calculateRegressionPoints(0.0025, 'maroon', -275, 0.999),
      logBase: calculateRegressionPoints(0.008, 'red', -315, 0.991),
      logMid: calculateRegressionPoints(0.01, 'violet', -370, 0.993),
      logTop: calculateRegressionPoints(0.05, 'green', -350, 0.993),
      logTop2: calculateRegressionPoints(0.065, 'lime', -450, 0.995),
    };
  }, [marketCapData, calculateLogarithmicRegression, extendDataForFuture]);

  // Calculate the percentage difference between current market cap and fair value
  const valuationDifference = useMemo(() => {
    if (marketCapData.length === 0 || !regressionLines.logMid) return null;

    // Get the latest market cap value and its date
    const latestMarketCap = marketCapData[marketCapData.length - 1]?.value;
    const latestMarketCapDate = marketCapData[marketCapData.length - 1]?.time;

    if (!latestMarketCap || !latestMarketCapDate) return null;

    // Find the fair value on the latest market cap date
    const fairValueOnLatestDate = regressionLines.logMid.find(
      (point) => point.time === latestMarketCapDate
    )?.value;

    if (!fairValueOnLatestDate) return null;

    // Calculate percentage difference: ((current - fair) / fair) * 100
    const difference = ((latestMarketCap - fairValueOnLatestDate) / fairValueOnLatestDate) * 100;
    const isOvervalued = difference > 0;
    const percentage = Math.abs(difference).toFixed(2);

    return {
      label: isOvervalued ? 'Overvaluation' : 'Undervaluation',
      percentage: `${percentage}%`,
    };
  }, [marketCapData, regressionLines]);

  useEffect(() => {
    if (marketCapData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      handleScroll: false, // Disable scrolling on initial render
      handleScale: false, // Disable zooming on initial render
    });

    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(marketCapData);

    chart.priceScale('right').applyOptions({
      mode: scaleMode,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });

    const logRegression2TopSeries = chart.addLineSeries({
      color: 'lime',
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const logRegressionTopSeries = chart.addLineSeries({
      color: 'green',
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const logRegressionMidSeries = chart.addLineSeries({
      color: 'violet',
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const logRegressionBaseSeries = chart.addLineSeries({
      color: 'red',
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const logRegressionBase2Series = chart.addLineSeries({
      color: 'maroon',
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    logRegression2TopSeries.setData(regressionLines.logTop2);
    logRegressionTopSeries.setData(regressionLines.logTop);
    logRegressionMidSeries.setData(regressionLines.logMid);
    logRegressionBaseSeries.setData(regressionLines.logBase);
    logRegressionBase2Series.setData(regressionLines.logBase2);

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const logBaseData = param.seriesData.get(logRegressionBaseSeries);
        const logBase2Data = param.seriesData.get(logRegressionBase2Series);
        const logMidData = param.seriesData.get(logRegressionMidSeries);
        const logTopData = param.seriesData.get(logRegressionTopSeries);
        const logTop2Data = param.seriesData.get(logRegression2TopSeries);

        setTooltipData({
          date: dateStr,
          price: priceData?.value ? compactNumberFormatter(priceData.value) : undefined,
          logBase: logBaseData?.value ? compactNumberFormatter(logBaseData.value) : undefined,
          logBase2: logBase2Data?.value ? compactNumberFormatter(logBase2Data.value) : undefined,
          fairValue: logMidData?.value ? compactNumberFormatter(logMidData.value) : undefined,
          logTop: logTopData?.value ? compactNumberFormatter(logTopData.value) : undefined,
          logTop2: logTop2Data?.value ? compactNumberFormatter(logTop2Data.value) : undefined,
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
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [marketCapData, colors, regressionLines, compactNumberFormatter, resetChartView]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  useEffect(() => {
    if (priceSeriesRef.current) {
      const { lineColor } =
        theme.palette.mode === 'dark'
          ? { lineColor: 'rgba(38, 198, 218, 1)' }
          : { lineColor: 'rgba(255, 140, 0, 0.8)' };
      priceSeriesRef.current.applyOptions({ lineColor });
    }
  }, [theme.palette.mode]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className="chart-top-div">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span className="button-reset">Logarithmic</span>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
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
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
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
          onDoubleClick={setInteractivity}
        />
      </div>
      <div className="under-chart">
        {!isDashboard && marketCapData.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            {!isDashboard && <LastUpdated customDate={marketCapLastUpdated} />}
            {valuationDifference && (
              <span
                style={{
                  fontSize: '1.3rem',
                  color: valuationDifference.label === 'Overvaluation' ? '#ff0062' : colors.blueAccent[500],
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {valuationDifference.label}: {valuationDifference.percentage}
              </span>
            )}
          </div>
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -300;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 10000 / (chartWidth + 300);
              const rightPosition = cursorX + offset + 30;
              const leftPosition = cursorX - tooltipWidth - offset -20;
              return rightPosition + tooltipWidth <= chartWidth
                ? `${rightPosition}px`
                : leftPosition >= 0
                ? `${leftPosition}px`
                : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 100}px`,
            width: isNarrowScreen ? '150px' : '200px',
            fontSize: isNarrowScreen ? '12px' : '14px',
          }}
        >
          <b>
            {tooltipData.price && <div>Market Cap: ${tooltipData.price}</div>}
            {tooltipData.logTop2 && (
              <div style={{ color: 'lime' }}>Upper Band 2: ${tooltipData.logTop2}</div>
            )}
            {tooltipData.logTop && (
              <div style={{ color: 'green' }}>Upper Band: ${tooltipData.logTop}</div>
            )}
            {tooltipData.fairValue && (
              <div style={{ color: 'violet' }}>Fair Value: ${tooltipData.fairValue}</div>
            )}
            {tooltipData.logBase && (
              <div style={{ color: 'red' }}>Lower Band: ${tooltipData.logBase}</div>
            )}
            {tooltipData.logBase2 && (
              <div style={{ color: 'maroon' }}>Lower Band 2: ${tooltipData.logBase2}</div>
            )}
            {tooltipData.date && <div style={{ fontSize: '13px' }}>{tooltipData.date}</div>}
          </b>
        </div>
      )}
      {!isDashboard && (
        <div className="chart-info">
          The total market cap of every crypto asset combined. The regression bands have been fitted to
          the absolute lows, highs, and fair value levels over the total history of the asset class.
          The bands are calculated using a logarithmic regression model.
          <br />
          <br />
          The core calculation involves determining the slope (m) and intercept (b) of the best-fit
          line. These are derived using the following formulas:
          <br />
          <ul>
            <li>
              <b>
                m = (n * sum(ln(x) * ln(y)) - sum(ln(x)) * sum(ln(y))) / (n * sum(ln(x)^2) -
                (sum(ln(x)))^2)
              </b>
            </li>
            <li>
              <b>b = (sum(ln(y)) - m * sum(ln(x))) / n</b>
            </li>
          </ul>
          <br />
          n = the total number of data points, <br />
          x = the time index (after taking the natural logarithm), and <br />
          y = the data value (after taking the natural logarithm) <br />
          <br />
        </div>
      )}
    </div>
  );
};

export default TotalMarketCap;