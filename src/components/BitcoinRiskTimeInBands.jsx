import React, { useEffect, useState, useContext, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

const BitcoinRiskBandDuration = ({ isDashboard = false, riskData: propRiskData }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]); // Memoize colors
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);

  const [riskBandDurations, setRiskBandDurations] = useState([]);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);

  // Calculate risk data if not provided via prop
  const calculateRiskMetric = (data) => {
    const movingAverage = data.map((item, index) => {
      const start = Math.max(index - 373, 0);
      const subset = data.slice(start, index + 1);
      const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
      return { ...item, MA: avg };
    });

    const movingAverageWithPreavg = movingAverage.map((item, index) => {
      const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
      return { ...item, Preavg: preavg };
    });

    const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
    const preavgMin = Math.min(...preavgValues);
    const preavgMax = Math.max(...preavgValues);

    const normalizedRisk = movingAverageWithPreavg.map(item => ({
      ...item,
      Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin),
    }));

    return normalizedRisk;
  };

  const chartData = useMemo(() => {
    const formattedData = btcData.map(item => ({
      time: new Date(item.time),
      value: parseFloat(item.value),
    }));
    return propRiskData || (formattedData.length > 0 ? calculateRiskMetric(formattedData) : []);
  }, [propRiskData, btcData]);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Price Risk Band Durations',
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: isDashboard || isMobile ? '' : 'Risk Bands', autorange: true },
    yaxis: { title: 'Percentage of Time (%)', autorange: true },
    showlegend: false,
  });

  const calculateRiskBandDurations = (data) => {
    const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const bandCounts = Array(10).fill(0);

    for (let i = 0; i < data.length; i++) {
      const risk = data[i].Risk;
      const bandIndex = Math.min(Math.floor(risk * 10), 9);
      bandCounts[bandIndex]++;
    }

    const totalDays = bandCounts.reduce((sum, count) => sum + count, 0);
    return bandCounts.map((count, index) => ({
      band: `${(index * 0.1).toFixed(1)} - ${(index + 1) * 0.1 <= 1.0 ? ((index + 1) * 0.1).toFixed(1) : '1.0'}`,
      percentage: (count / totalDays * 100).toFixed(2),
      days: count,
    }));
  };

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  // Update risk band durations and current risk level when chartData changes
  useEffect(() => {
    if (chartData.length === 0) return;

    const durations = calculateRiskBandDurations(chartData);
    setRiskBandDurations(durations);
    setCurrentRiskLevel(chartData[chartData.length - 1].Risk.toFixed(2));
  }, [chartData]);

  // Update layout when theme or isDashboard/isMobile changes
  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      title: isDashboard ? '' : 'Bitcoin Price Risk Band Durations',
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      xaxis: { ...prevLayout.xaxis, title: isDashboard || isMobile ? '' : 'Risk Bands' },
    }));
  }, [colors, isDashboard, isMobile]);

  const resetChartView = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
    }));
  };

  // Handle zoom and pan updates
  const handleRelayout = (event) => {
    if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
      setLayout(prevLayout => ({
        ...prevLayout,
        xaxis: {
          ...prevLayout.xaxis,
          range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
          autorange: false,
        },
        yaxis: {
          ...prevLayout.yaxis,
          range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
          autorange: false,
        },
      }));
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div className="risk-filter">
            {/* Placeholder for future interactivity toggles */}
          </div>
          <div>
            {/* Placeholder for styling */}
          </div>
          <div>
            <button onClick={resetChartView} className="button-reset">
              Reset Chart
            </button>
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{
          height: 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <Plot
          data={[
            {
              type: 'bar',
              x: riskBandDurations.map(risk => risk.band),
              y: riskBandDurations.map(risk => parseFloat(risk.percentage)),
              hoverinfo: 'text+x',
              hovertemplate: 'Risk Band: %{x}<br>Time in: %{y}%<br>Total Days: %{customdata} days<extra></extra>',
              customdata: riskBandDurations.map(risk => risk.days),
              marker: {
                color: riskBandDurations.map((_, index) => {
                  switch (index) {
                    case 0: return colors.redAccent[800];
                    case 1: return colors.redAccent[700];
                    case 2: return colors.redAccent[500];
                    case 3: return colors.redAccent[300];
                    case 4: return colors.redAccent[100];
                    case 5: return colors.blueAccent[100];
                    case 6: return colors.blueAccent[300];
                    case 7: return colors.blueAccent[500];
                    case 8: return colors.blueAccent[700];
                    case 9: return colors.blueAccent[800];
                    default: return colors.grey[400];
                  }
                }),
              },
            },
          ]}
          layout={layout}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          onRelayout={handleRelayout}
        />
      </div>

      {!isDashboard && (
        <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem' }}>
          Current Risk Level: <b>{currentRiskLevel !== null ? currentRiskLevel : 'Loading...'}</b>
        </div>
      )}

      <div className='under-chart'>
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <div>
          <p className='chart-info'>
            This chart shows the total amount of time Bitcoin has spent in each risk band over its entire existence, which
            can help to understand the fleeting nature of the extreme risk bands at either ends of the spectrum.
            The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
            It does so by calculating the normalized logarithmic difference between the price and the moving average.
            <br />
          </p>
        </div>
      )}
    </div>
  );
};

export default BitcoinRiskBandDuration;