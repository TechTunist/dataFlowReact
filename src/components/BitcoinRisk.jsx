import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import { saveBitcoinRisk } from '../utility/idbUtils';
import { calculateRiskMetric } from '../utility/riskMetric';

const BitcoinRisk = ({ isDashboard = false, isChartPage = false, riskData: propRiskData, simulatorDcaLevels = null, hideControls = false }) => {
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

  const { btcData, fetchBtcData } = useContext(DataContext);

  const chartData = propRiskData || (btcData.length > 0 ? calculateRiskMetric(btcData) : []);

  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  function compactNumberFormatter(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k';
    } else {
      return value.toFixed(0);
    }
  }

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (chartData.length === 0) return;

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
        title: 'Risk',
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        title: 'Price',
      },
      timeScale: {
        minBarSpacing: 0.001,
      },
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
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

    // Draw custom DCA levels for the simulator (if provided)
    if (simulatorDcaLevels && simulatorDcaLevels.length > 0) {
      simulatorDcaLevels.forEach((lvl) => {
        const levelSeries = chart.addLineSeries({
          color: lvl.color || (lvl.type === 'buy' ? colors.greenAccent[500] : '#f472b6'),
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        levelSeries.setData(chartData.map(data => ({ time: data.time, value: lvl.level })));
      });
    }

    chart.applyOptions({
      handleScroll: isInteractive,
      handleScale: isInteractive,
    });

    chart.priceScale('left').applyOptions({
      mode: 1,
      borderVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
      title: 'Price',
    });

    chart.priceScale('right').applyOptions({
      title: 'Risk',
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const price = Math.floor(chartData[chartData.length - 1].value / 1000);
    setCurrentBtcPrice(price);

    const latestData = chartData[chartData.length - 1];
    try {
      const riskLevel = latestData.Risk.toFixed(2);
      setCurrentRiskLevel(riskLevel);
      if (typeof indexedDB !== 'undefined') {
        saveBitcoinRisk(parseFloat(riskLevel)).catch(error => {
          console.error('Error saving Bitcoin risk level:', error);
        });
      }
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
  }, [chartData, colors, isDashboard, isInteractive, simulatorDcaLevels]);

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
        <div className='chart-top-div'>
          <div className='span-container'>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
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
          height: isDashboard ? "100%" : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            setInteractivity();
          }}
        />
      </div>

      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </UnderChartRow>

      {!isDashboard && (
        <>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Current Risk level: <b style={{ color: colors.greenAccent[500] }}>{currentRiskLevel}</b> (${currentBtcPrice.toFixed(0)}k)
            </span>
          </UnderChartValue>
          <p className='chart-info'>
            The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average, incorporating a factor that accounts for sustained periods above the moving average. It calculates a normalized score between 0 and 1, where a higher score indicates higher risk, particularly after prolonged bull markets amplified by higher price levels. A lower score indicates lower risk. This method provides a view of when it might be riskier or safer to invest in Bitcoin based on historical price movements and market maturity.
          </p>
        </>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinRisk);
