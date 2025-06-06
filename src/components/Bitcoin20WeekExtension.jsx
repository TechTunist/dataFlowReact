import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const Bitcoin20WeekExtension = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData, fetchBtcData } = useContext(DataContext);
  const plotRef = useRef(null);

  // Define extension ranges with vivid colors
  const extensionRanges = [
    { range: [-Infinity, -50], color: 'rgb(0, 0, 153)', label: '<-50' },
    { range: [-50, -25], color: 'rgb(0, 102, 255)', label: '-50 - -25' },
    { range: [-25, 0], color: 'rgb(0, 255, 255)', label: '-25 - 0' },
    { range: [0, 25], color: 'rgb(0, 255, 0)', label: '0 - 25' },
    { range: [25, 50], color: 'rgb(255, 255, 51)', label: '25 - 50' },
    { range: [50, 75], color: 'rgb(255, 204, 51)', label: '50 - 75' },
    { range: [75, 100], color: 'rgb(255, 153, 0)', label: '75 - 100' },
    { range: [100, Infinity], color: 'rgb(255, 0, 0)', label: '>100' },
  ];

  const getColorForExtension = (extension) => {
    for (const range of extensionRanges) {
      if (extension >= range.range[0] && extension < range.range[1]) {
        return range.color;
      }
    }
    return 'rgb(255, 255, 255)'; // Fallback color
  };

  const calculateExtension = (data) => {
    const windowSize = 140; // 20 weeks * 7 days
    return data.map((item, index) => {
      const start = Math.max(index - windowSize + 1, 0);
      const subset = data.slice(start, index + 1);
      const ma = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
      const extension = ((item.value - ma) / ma) * 100;
      return { ...item, MA: ma, Extension: extension };
    });
  };

  const downsampleData = (data, factor = 5) => {
    if (data.length <= 200) return data;
    const downsampled = [];
    for (let i = 0; i < data.length; i += factor) {
      const slice = data.slice(i, i + factor);
      const avgValue = slice.reduce((sum, item) => sum + parseFloat(item.value), 0) / slice.length;
      const avgExtension = slice.reduce((sum, item) => sum + item.Extension, 0) / slice.length;
      downsampled.push({
        time: slice[0].time,
        value: avgValue,
        Extension: avgExtension,
      });
    }
    return downsampled;
  };

  const chartData = useMemo(() => {
    const fullData = btcData.length > 0 ? calculateExtension(btcData) : [];
    return downsampleData(fullData, 5);
  }, [btcData]);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Price vs. 20-Week MA Extension',
    autosize: true,
    margin: { l: 60, r: 50, b: 50, t: 30, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { autorange: true },
    yaxis: {
      title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      type: 'log',
      autorange: true,
      automargin: true,
    },
    yaxis2: {
      title: { text: 'Extension (%)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      overlaying: 'y',
      side: 'right',
      autorange: true,
      automargin: true,
      zeroline: true,
      zerolinecolor: colors.primary[100],
      zerolinewidth: 1,
    },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    },
    hovermode: 'closest',
    hoverdistance: 10,
  });

  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (chartData.length === 0) return;

    // Price line
    const priceLineTrace = {
      x: chartData.map(d => d.time),
      y: chartData.map(d => d.value),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Price',
      yaxis: 'y',
      hoverinfo: 'skip',
      visible: true,
      showlegend: true,
    };

    // Optional colored points on price line
    const coloredPointsTrace = {
      x: chartData.map(d => d.time),
      y: chartData.map(d => d.value),
      type: 'scatter',
      mode: 'markers',
      marker: { color: chartData.map(d => getColorForExtension(d.Extension)), size: 6 },
      name: 'Extension Points',
      yaxis: 'y',
      hoverinfo: 'skip',
      visible: 'legendonly',
    };

    // Hidden traces for price tooltips
    const rangeTraces = extensionRanges.map(range => {
      const filteredData = chartData.filter(d => d.Extension >= range.range[0] && d.Extension < range.range[1]);
      return {
        x: filteredData.map(d => d.time),
        y: filteredData.map(d => d.value),
        customdata: filteredData.map(d => [d.Extension]),
        type: 'scatter',
        mode: 'none',
        name: range.label,
        hovertemplate:
          '<b>Price:</b> $%{y:,.0f}<br>' +
          '<b>Extension:</b> %{customdata[0]:.2f}%<br>' +
          '<b>Date:</b> %{x|%B %d, %Y}<extra></extra>',
        hoverlabel: { bgcolor: range.color, font: { color: '#000' } },
        visible: true,
        showlegend: false,
      };
    });

    // Hidden traces for extension tooltips
    const extensionRangeTraces = extensionRanges.map(range => {
      const filteredData = chartData.filter(d => d.Extension >= range.range[0] && d.Extension < range.range[1]);
      return {
        x: filteredData.map(d => d.time),
        y: filteredData.map(d => d.Extension),
        customdata: filteredData.map(d => [d.value]),
        type: 'scatter',
        mode: 'none',
        name: range.label + ' Extension',
        yaxis: 'y2',
        hovertemplate:
          '<b>Price:</b> $%{customdata[0]:,.0f}<br>' +
          '<b>Extension:</b> %{y:.2f}%<br>' +
          '<b>Date:</b> %{x|%B %d, %Y}<extra></extra>',
        hoverlabel: { bgcolor: range.color, font: { color: '#000' } },
        visible: true,
        showlegend: false,
      };
    });

    // Colored area segments
    const segmentTraces = [];
    for (let i = 0; i < chartData.length - 1; i++) {
      const dateToday = chartData[i].time;
      const dateTomorrow = chartData[i + 1].time;
      const extToday = chartData[i].Extension;
      const extTomorrow = chartData[i + 1].Extension;
      const avgExtension = (extToday + extTomorrow) / 2;
      const color = getColorForExtension(avgExtension);

      segmentTraces.push({
        x: [dateToday, dateToday, dateTomorrow, dateTomorrow],
        y: [0, extToday, extTomorrow, 0],
        type: 'scatter',
        mode: 'lines',
        fill: 'toself',
        fillcolor: color.replace('rgb', 'rgba').replace(')', ',0.8)'),
        line: { width: 0 },
        showlegend: false,
        yaxis: 'y2',
        hoverinfo: 'skip',
        visible: true,
      });
    }

    // Legend entries for extension ranges
    const legendTraces = extensionRanges.map(range => ({
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: range.color, size: 10 },
      name: range.label,
      showlegend: true,
      visible: true,
    }));

    setDatasets([priceLineTrace, coloredPointsTrace, ...rangeTraces, ...extensionRangeTraces, ...segmentTraces, ...legendTraces]);
  }, [chartData, theme]);

  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      yaxis: { ...prevLayout.yaxis, title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 } },
      yaxis2: { ...prevLayout.yaxis2, title: { text: 'Extension (%)', font: { color: colors.primary[100], size: 14 }, standoff: 5 }, zerolinecolor: colors.primary[100] },
    }));
  }, [colors]);

  const resetChartView = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { autorange: true },
      yaxis: { autorange: true },
      yaxis2: { autorange: true },
    }));
    setDatasets(prevDatasets => prevDatasets.map(dataset => ({ ...dataset, visible: true })));
  };

  const latestExtension = chartData.length > 0 ? chartData[chartData.length - 1].Extension.toFixed(2) : 'N/A';

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div></div>
          <div>
            <button onClick={resetChartView} className="button-reset">Reset Chart</button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
        <Plot
          ref={plotRef}
          data={datasets}
          layout={layout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div className='under-chart'>
        {!isDashboard && (
          <div>
            <LastUpdated storageKey="btcData" />
            <p>Latest Extension: {latestExtension}%</p>
          </div>
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <div>
          <p className='chart-info'>
            The Bitcoin 20-Week Extension chart shows the percentage difference between the current price and the 20-week moving average (MA),
            which helps to identify if we are currently in a bubble or a bear market. The chart is color-coded to indicate different ranges of extension.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(Bitcoin20WeekExtension);