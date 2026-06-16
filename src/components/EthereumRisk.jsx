import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const EthereumRisk = ({ isDashboard = false, riskData: propRiskData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const riskSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();
  const { ethData, fetchEthData } = useContext(DataContext);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [currentEthPrice, setCurrentEthPrice] = useState(0);

  // Calculate risk data if not provided via prop
  const calculateRiskMetric = (data) => {
    const movingAverage = data.map((item, index) => {
      const start = Math.max(index - 373, 0);
      const subset = data.slice(start, index + 1);
      const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
      return { ...item, MA: avg };
    });

    movingAverage.forEach((item, index) => {
      const preavg = (Math.log(item.value) - Math.log(item.MA)) * index ** 0.395;
      item.Preavg = preavg;
    });

    const preavgValues = movingAverage.map(item => item.Preavg);
    const preavgMin = Math.min(...preavgValues);
    const preavgMax = Math.max(...preavgValues);
    const normalizedRisk = movingAverage.map(item => ({
      ...item,
      Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin),
    }));

    return normalizedRisk;
  };

  const chartData = useMemo(() => {
    return propRiskData || (ethData.length > 0 ? calculateRiskMetric(ethData) : []);
  }, [propRiskData, ethData]);

  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    else if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    else return value.toFixed(0);
  };

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchEthData();
      } catch (err) {
        console.error('Error fetching Ethereum data:', err);
      }
    };
    fetchData();
  }, [fetchEthData]);

  // Chart rendering useEffect
  useEffect(() => {
    if (chartData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      rightPriceScale: { scaleMargins: { top: 0.01, bottom: 0.01 }, borderVisible: false },
      leftPriceScale: { visible: true, borderColor: 'rgba(197, 203, 206, 1)', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { minBarSpacing: 0.001 },
    });

    const riskSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
    });
    riskSeriesRef.current = riskSeries;
    riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

    chart.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });

    chart.priceScale('left').applyOptions({
      mode: 1,
      borderVisible: false,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const price = chartData[chartData.length - 1].value;
    setCurrentEthPrice(price);
    const latestData = chartData[chartData.length - 1];
    try {
      const riskLevel = latestData.Risk.toFixed(2);
      setCurrentRiskLevel(riskLevel);
    } catch (error) {
      console.error('Failed to set risk level:', error);
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
  }, [chartData, colors, isDashboard, isInteractive]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div className='span-container'>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Ethereum Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Risk Metric
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : '#31d6aa',
                borderColor: isInteractive ? 'violet' : '#70d8bd'
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

      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => setInteractivity(!isInteractive && !isDashboard)}
        />
      </div>

      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey="ethData" />}
      </UnderChartRow>

      {!isDashboard && (
        <>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Current Risk level: <b style={{ color: colors.greenAccent[500] }}>{currentRiskLevel}</b> (${currentEthPrice.toFixed(2)})
            </span>
          </UnderChartValue>

          <p className='chart-info'>
            The risk metric assesses Ethereum's investment risk over time by comparing its daily prices to a 374-day moving average.
            It does so by calculating the normalized logarithmic difference between the price and the moving average,
            producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
            This method provides a simplified view of when it might be riskier or safer to invest in Ethereum based on historical price movements.
          </p>
        </>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(EthereumRisk);
