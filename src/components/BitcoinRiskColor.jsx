import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinRiskColor = ({ isDashboard = false, riskData: propRiskData }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]); // Memoize colors
  const { btcData, fetchBtcData } = useContext(DataContext);
  const plotRef = useRef(null); // Ref to access the Plotly instance

  // Calculate risk data if not provided via prop, memoized to prevent unnecessary recalculations
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

  // Memoize chartData to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return propRiskData || (btcData.length > 0 ? calculateRiskMetric(btcData) : []);
  }, [propRiskData, btcData]);

  const [layout, setLayout] = useState({
    title: 'Bitcoin Price vs. Risk Level',
    autosize: true,
    margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: '', autorange: true },
    yaxis: { title: 'Price (USD)', type: 'log', autorange: true },
    legend: {
      title: { text: 'Select Risk Bands' },
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    },
  });

  // Adjusted initial datasets for 10 bins
  const [datasets, setDatasets] = useState(
    Array.from({ length: 10 }, (_, index) => ({
      data: [],
      visible: true,
      label: `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`,
    }))
  );

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  // Update datasets when chartData changes
  useEffect(() => {
    if (chartData.length === 0) return;

    const updateDatasets = (data) => {
      const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]; // Upper limits for 10 bins
      let newDatasets = riskBands.map((upperLimit, index) => {
        const lowerLimit = index === 0 ? 0.0 : riskBands[index - 1];
        const filteredData = data.filter(d => d.Risk > lowerLimit && d.Risk <= upperLimit);

        return {
          data: filteredData,
          visible: true,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: filteredData.map(d => d.Risk),
            colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
            cmin: 0,
            cmax: 1,
            size: 10,
          },
          name: `${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}`,
          hovertemplate:
            `<b>Risk Band:</b> ${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}<br>` +
            `<b>Risk:</b> %{marker.color:.2f}<br>` +
            `<b>Price:</b> $%{y:,.0f}<br>` +
            `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
        };
      });

      // Add the Bitcoin price line dataset
      newDatasets.push({
        x: data.map(d => d.time),
        y: data.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'grey',
          width: 1.5,
        },
        name: 'Bitcoin Price',
        visible: true,
      });

      setDatasets(newDatasets);
    };

    updateDatasets(chartData);
  }, [chartData, theme]);

  // Update layout colors when theme changes
  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
    }));
  }, [colors]);

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

  // Toggle visibility of risk bands using Plotly restyle
  const toggleRiskBand = useCallback((index) => {
    if (plotRef.current && plotRef.current.el) {
      const visibility = datasets[index].visible ? 'legendonly' : true;
      Plot.restyle(plotRef.current.el, { visible: visibility }, [index]);
      setDatasets(prevDatasets =>
        prevDatasets.map((dataset, i) =>
          i === index ? { ...dataset, visible: !dataset.visible } : dataset
        )
      );
    }
  }, [datasets]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
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
          ref={plotRef}
          data={datasets.map(dataset => ({
            type: dataset.type,
            mode: dataset.mode,
            x: dataset.x || dataset.data.map(d => d.time),
            y: dataset.y || dataset.data.map(d => d.value),
            marker: dataset.marker || {},
            line: dataset.line || {},
            name: dataset.name,
            hoverinfo: 'text',
            hovertemplate: dataset.hovertemplate,
            visible: dataset.visible ? true : 'legendonly', // Set initial visibility
          }))}
          layout={{
            ...layout,
            title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level',
            showlegend: !isDashboard,
            legend: isDashboard
              ? {}
              : {
                  title: { text: 'Select Risk Bands' },
                  orientation: 'h',
                  x: 0.5,
                  xanchor: 'center',
                  y: -0.2,
                  yanchor: 'top',
                },
          }}
          config={{
            staticPlot: isDashboard,
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          onRelayout={handleRelayout}
        />
      </div>

      <div className='under-chart'>
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <div>
          <p className='chart-info'>
            The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
            It does so by calculating the normalized logarithmic difference between the price and the moving average,
            producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
            This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
            <br />
          </p>
        </div>
      )}
    </div>
  );
};

// export default BitcoinRiskColor;
export default restrictToPaidSubscription(BitcoinRiskColor);