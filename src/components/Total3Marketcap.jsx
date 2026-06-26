import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from '../theme';
import { useTheme, useMediaQuery } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import BitcoinFees from './BitcoinTransactionFees';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartTooltip from './ChartTooltip';
import ChartInfoSections from './ChartInfoSections';

const Total3Chart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { total3Data: contextTotal3Data, fetchTotal3Data, total3LastUpdated } = useContext(DataContext);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scaleMode = 1;
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // ONLY CHANGE: Deduplicate + sort timestamps (fixes Lightweight Charts crash)
  const total3Data = useMemo(() => {
    const seen = new Set();
    return (contextTotal3Data || [])
      .filter(item => {
        const time = item.time || item.date;
        if (!time) return false;
        const key = typeof time === 'string' ? time : time.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date));
  }, [contextTotal3Data]);

  // Fetch data only if not present in context
  useEffect(() => {
    const fetchData = async () => {
      if (total3Data.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchTotal3Data();
      } catch (err) {
        setError('Failed to fetch total3 data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchTotal3Data, total3Data.length]);

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
    if (total3Data.length === 0) return {};
    const extendedData = extendDataForFuture(total3Data, 156);
    const { slope, intercept } = calculateLogarithmicRegression(total3Data);
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
      logMid: calculateRegressionPoints(0.012, 'violet', -370, 0.994),
      logTop: calculateRegressionPoints(0.059, 'green', -450, 0.993),
      logTop2: calculateRegressionPoints(0.075, 'lime', -490, 0.994),
    };
  }, [total3Data, calculateLogarithmicRegression, extendDataForFuture]);

  const valuationDifference = useMemo(() => {
    if (total3Data.length === 0 || !regressionLines.logMid) return null;
    const latestTotal3 = total3Data[total3Data.length - 1]?.value;
    const latestTotal3Date = total3Data[total3Data.length - 1]?.time;
    if (!latestTotal3 || !latestTotal3Date) return null;
    const fairValueOnLatestDate = regressionLines.logMid.find(
      (point) => point.time === latestTotal3Date
    )?.value;
    if (!fairValueOnLatestDate) return null;
    const difference = ((latestTotal3 - fairValueOnLatestDate) / fairValueOnLatestDate) * 100;
    const isOvervalued = difference > 0;
    const percentage = Math.abs(difference).toFixed(2);
    const currentTotal3Formatted = latestTotal3 ? `($${(latestTotal3 / 1e12).toFixed(2)}T)` : '';
    return {
      label: isOvervalued ? 'Overvaluation' : 'Undervaluation',
      percentage: `${percentage}%`,
      currentTotal3: currentTotal3Formatted,
    };
  }, [total3Data, regressionLines]);

  useEffect(() => {
    if (total3Data.length === 0) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100]
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] }
      },
      timeScale: { minBarSpacing: 0.001 },
      handleScroll: false,
      handleScale: false,
    });
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(total3Data);

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
  }, [total3Data, colors, regressionLines, compactNumberFormatter, resetChartView]);

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
        {!isDashboard && (
          <ChartTooltip tooltipData={tooltipData} chartContainerRef={chartContainerRef} isNarrowScreen={isNarrowScreen} render={(tooltipData) => (
<>
<b>
              {tooltipData.price && <div>Total3: ${tooltipData.price}</div>}
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
</>
)} />
        )}
      </div>
      <UnderChartRow>
        {!isDashboard && total3Data.length > 0 && <LastUpdated customDate={total3LastUpdated} />}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>

      {!isDashboard && total3Data.length > 0 && valuationDifference && (
        <UnderChartValue>
          <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
            {valuationDifference.label}: <b style={{ color: valuationDifference.label === 'Overvaluation' ? '#ff0062' : colors.greenAccent[500] }}>{valuationDifference.percentage}</b> {valuationDifference.currentTotal3}
          </span>
        </UnderChartValue>
      )}

      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'What it is',
              content:
                'Total3 is total crypto market capitalization excluding Bitcoin and Ethereum, displayed from 2014-06-21 onwards on a logarithmic scale with fitted regression bands.',
            },
            {
              title: 'How it is built',
              content: (
                <>
                  Regression bands are fitted to the absolute lows, highs, and fair value levels over the full
                  history of the data. The bands use a logarithmic regression model. Slope (m) and intercept (b)
                  of the best-fit line are derived as:
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
              content:
                'The violet mid band is fair value. Total3 above fair value suggests overvaluation; below suggests undervaluation. Upper bands (green, lime) mark historic exuberance zones; lower bands (red, maroon) mark deep value areas. The over/undervaluation readout above compares the latest Total3 reading to the fair value band.',
            },
          ]}
        />
      )}
    </div>
  );
};

export default Total3Chart;