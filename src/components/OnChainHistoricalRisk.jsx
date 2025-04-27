import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';

const OnChainHistoricalRisk = ({ isDashboard = false, mvrvData: propMvrvData, btcData: propBtcData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const riskSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();

  // Access DataContext
  const { btcData: contextBtcData, mvrvData: contextMvrvData, fetchBtcData, fetchMvrvData } = useContext(DataContext);
  const btcData = propBtcData || contextBtcData;
  const mvrvData = propMvrvData || contextMvrvData;

  // Function to calculate risk metric based on weighted MVRV-Z score
  const calculateMvrvZRisk = (mvrvData, btcData) => {
    if (!mvrvData.length || !btcData.length) {
      return [];
    }

    // Create a unified date array from both datasets
    const allDates = new Set([
      ...btcData.map((item) => item.time),
      ...mvrvData.map((item) => item.time),
    ]);
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    // Interpolate or forward-fill btcData to match all dates
    let lastBtcValue = null;
    const alignedBtcData = sortedDates.map((date) => {
      const btcItem = btcData.find((b) => b.time === date);
      if (btcItem && btcItem.value != null) {
        lastBtcValue = btcItem.value;
        return { time: date, value: btcItem.value };
      }
      return lastBtcValue != null ? { time: date, value: lastBtcValue } : null;
    }).filter((item) => item != null);

    // Filter mvrvData to dates within btcData range and forward-fill
    const btcStartTime = new Date(btcData[0].time).getTime();
    const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
    let lastMvrvValue = null;
    const alignedMvrvData = sortedDates.map((date) => {
      const itemTime = new Date(date).getTime();
      if (itemTime < btcStartTime || itemTime > btcEndTime) return null;
      const mvrvItem = mvrvData.find((m) => m.time === date);
      if (mvrvItem && mvrvItem.value != null) {
        lastMvrvValue = mvrvItem.value;
        return { time: date, value: mvrvItem.value };
      }
      return lastMvrvValue != null ? { time: date, value: lastMvrvValue } : null;
    }).filter((item) => item != null);

    // Adjustable parameters for diminishing returns and peak/trough amplification
    const decayRate = 0.5; // Controls recency weighting (0 to 3)
    const peakSensitivity = 0.6; // Controls peak amplification (0.5 to 5)
    const capitulationSensitivity = 0.01; // Controls trough amplification (0 to 5)
    const earlySmoothingFactor = 0.0; // Controls early data smoothing (0 to 2)
    const shiftConstant = 0.24; // Shifts risk metric to lower minimum (0 to 0.5)
    const extensionFactor = 0.3; // Controls Z-score extension effect (0 to 2)

    // Calculate weights for diminishing returns (exponential)
    const weights = alignedMvrvData.map((_, index) => {
      const t = index / (alignedMvrvData.length - 1); // Normalized time (0 to 1)
      return Math.exp(decayRate * t); // Exponential weight increase
    });
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    // Calculate weighted mean
    const weightedMean = alignedMvrvData.reduce((sum, item, index) => {
      return sum + item.value * weights[index];
    }, 0) / weightSum;

    // Calculate weighted standard deviation
    const weightedVariance = alignedMvrvData.reduce((sum, item, index) => {
      return sum + weights[index] * Math.pow(item.value - weightedMean, 2);
    }, 0) / weightSum;
    const weightedStdDev = Math.sqrt(weightedVariance) || 1; // Avoid division by zero

    // Calculate weighted MVRV-Z scores
    const mvrvZScores = alignedMvrvData.map((item, index) => ({
      time: item.time,
      value: item.value,
      zScore: (item.value - weightedMean) / weightedStdDev,
    }));

    // Calculate 50-day moving average of Z-scores
    const zScoreMA = mvrvZScores.map((item, i) => {
      const windowSize = 50;
      const start = Math.max(0, i - windowSize + 1);
      const window = mvrvZScores.slice(start, i + 1);
      const ma = window.reduce((sum, val) => sum + val.zScore, 0) / window.length;
      return {
        time: item.time,
        zScore: item.zScore,
        zScoreMA: ma,
      };
    });

    // Apply sigmoid transformation with capitulation and extension adjustment
    const riskScores = zScoreMA.map((item) => {
      const extension = item.zScore - item.zScoreMA;
      return {
        time: item.time,
        value: item.value,
        risk: 1 / (1 + Math.exp(
          -peakSensitivity * item.zScore -
          capitulationSensitivity * Math.max(0, -item.zScore) -
          extensionFactor * extension
        )),
      };
    });

    // Apply variable smoothing (wider window for early data)
    const smoothedRisk = riskScores.map((item, i) => {
      const t = i / (riskScores.length - 1); // Normalized time
      const windowSize = Math.round(5 + earlySmoothingFactor * (1 - t) * 25); // 5 to ~30 days
      const start = Math.max(0, i - windowSize + 1);
      const window = riskScores.slice(start, i + 1);
      return {
        ...item,
        risk: window.reduce((sum, val) => sum + val.risk, 0) / window.length,
      };
    });

    // Generate normalized risk data with shift adjustment
    const normalizedRisk = smoothedRisk.map((item) => {
      const btcItem = alignedBtcData.find((b) => b.time === item.time);
      if (!btcItem) {
        return null; // Skip entries without Bitcoin price
      }
      const adjustedRisk = Math.max(0, (item.risk - shiftConstant) / (1 - shiftConstant)); // Shift and scale
      return {
        time: item.time,
        value: btcItem.value, // Bitcoin price
        Risk: adjustedRisk, // Adjusted risk metric
      };
    }).filter((item) => item != null);

    return normalizedRisk;
  };

  // Calculate risk data
  const chartData = (mvrvData.length > 0 && btcData.length > 0) ? calculateMvrvZRisk(mvrvData, btcData) : [];

  // Function to set chart interactivity
  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  // Function to format numbers to 'k', 'M', etc. for price scale labels
  function compactNumberFormatter(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + 'M'; // Millions
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k'; // Thousands
    } else {
      return value.toFixed(0); // For values less than 1000
    }
  }

  // Function to reset the chart view
  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
    fetchMvrvData();
  }, [fetchBtcData, fetchMvrvData]);

  // Render chart
  useEffect(() => {
    if (chartData.length === 0) {
      console.log('No chart data to render');
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.01,
          bottom: 0.01,
        },
        borderVisible: false,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        minBarSpacing: 0.001,
      },
    });

    // Series for MVRV-Z Risk Metric
    const riskSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (value) => value.toFixed(2),
      },
    });
    riskSeriesRef.current = riskSeries;
    const riskSeriesData = chartData.map((data) => ({ time: data.time, value: data.Risk }));
    riskSeries.setData(riskSeriesData);

    // Series for Bitcoin Price on Logarithmic Scale
    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    // Use btcData directly to avoid corruption
    const priceSeriesData = btcData.map((data) => ({ time: data.time, value: data.value }));
    priceSeries.setData(priceSeriesData);

    chart.applyOptions({
      handleScroll: isInteractive,
      handleScale: isInteractive,
    });

    chart.priceScale('left').applyOptions({
      mode: 1, // Logarithmic scale
      borderVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });

    chart.priceScale('right').applyOptions({
      mode: 0, // Linear scale for risk (0 to 1)
      borderVisible: false,
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    // Set current price and risk level
    const latestBtcData = btcData[btcData.length - 1];
    const latestRiskData = chartData[chartData.length - 1];
    if (latestBtcData) {
      const price = Math.floor(latestBtcData.value / 1000);
      setCurrentBtcPrice(price);
    }
    if (latestRiskData) {
      try {
        const riskLevel = latestRiskData.Risk.toFixed(2);
        setCurrentRiskLevel(riskLevel);
      } catch (error) {
        console.error('Failed to set risk level:', error);
      }
    }

    window.addEventListener('resize', resizeChart);
    window.addEventListener('resize', resetChartView);
    resizeChart();

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
      window.removeEventListener('resize', resetChartView);
    };
  }, [chartData, theme.palette.mode, isDashboard, btcData]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className="chart-top-div">
          <div className="span-container">
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: 'gray',
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span
                style={{
                  backgroundColor: '#ff0062',
                  height: '10px',
                  width: '10px',
                  display: 'inline-block',
                  marginRight: '5px',
                }}
              ></span>
              MVRV-Z Risk
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
          height: 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) {
              setInteractivity(true);
            } else {
              setInteractivity(false);
            }
          }}
        />
      </div>

      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="mvrvData" />}
      </div>

      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem' }}>
            Current MVRV-Z Risk Level: <b>{currentRiskLevel}</b> (${currentBtcPrice.toFixed(0)}k)
          </div>

          <p className="chart-info">
            The On-Chain Historical Risk chart displays a risk metric derived from the MVRV-Z score, which is based on the Market Value to Realized Value (MVRV) ratio. The risk metric uses a weighted MVRV-Z score, emphasizing recent data to account for diminishing returns, with enhanced smoothing for early data to reduce volatility. It incorporates the Z-score’s extension from its moving average to amplify extreme market conditions and is transformed to approach 1 during market cycle peaks (overvaluation) and 0 during capitulation periods (undervaluation), with a shift adjustment to calibrate the minimum risk level. The Bitcoin price is plotted on a logarithmic scale to contextualize risk levels against market trends.
          </p>
        </div>
      )}
    </div>
  );
};

export default OnChainHistoricalRisk;