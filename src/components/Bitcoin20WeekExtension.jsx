import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const Bitcoin20WeekExtension = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData, fetchBtcData } = useContext(DataContext);
  const plotRef = useRef(null);

  // Define color ranges with more vivid colors
  const extensionRanges = [
    { range: [-Infinity, -50], color: 'rgb(0, 0, 153)', label: '<-50' }, // Vivid dark blue
    { range: [-50, -25], color: 'rgb(0, 102, 255)', label: '-50 - -25' }, // Vivid blue
    { range: [-25, 0], color: 'rgb(0, 255, 255)', label: '-25 - 0' }, // Vivid cyan
    { range: [0, 25], color: 'rgb(0, 255, 0)', label: '0 - 25' }, // Vivid green
    { range: [25, 50], color: 'rgb(255, 255, 51)', label: '25 - 50' }, // Vivid yellow
    { range: [50, 75], color: 'rgb(255, 204, 51)', label: '50 - 75' }, // Vivid gold
    { range: [75, 100], color: 'rgb(255, 153, 0)', label: '75 - 100' }, // Vivid orange
    { range: [100, Infinity], color: 'rgb(255, 0, 0)', label: '>100' }, // Vivid red
  ];

  // Helper function to get color based on extension value
  const getColorForExtension = (extension) => {
    for (const range of extensionRanges) {
      if (extension >= range.range[0] && extension < range.range[1]) {
        return range.color;
      }
    }
    return 'rgb(255, 255, 255)'; // Fallback color (white)
  };

  // Calculate 20-week (140-day) moving average and extension
  const calculateExtension = (data) => {
    const windowSize = 140; // 20 weeks * 7 days
    return data.map((item, index) => {
      const start = Math.max(index - windowSize + 1, 0);
      const subset = data.slice(start, index + 1);
      const ma = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
      const extension = ((item.value - ma) / ma) * 100; // Percentage difference
      return { ...item, MA: ma, Extension: extension };
    });
  };

  // Downsample data to reduce the number of segments
  const downsampleData = (data, factor = 5) => {
    if (data.length <= 200) return data; // No downsampling if data is small
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
    return downsampleData(fullData, 5); // Downsample by a factor of 5
  }, [btcData]);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Price vs. 20-Week MA Extension',
    autosize: true,
    margin: { l: 60, r: 50, b: 50, t: 30, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: '', autorange: true },
    yaxis: {
      title: {
        text: 'Price ($)',
        font: { color: colors.primary[100], size: 14 },
        standoff: 5,
      },
      type: 'log',
      autorange: true,
      automargin: true,
    },
    yaxis2: {
      title: {
        text: 'Extension (%)',
        font: { color: colors.primary[100], size: 14 },
        standoff: 5,
      },
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
  });

  const [datasets, setDatasets] = useState([]);
  const [allVisible, setAllVisible] = useState(true);

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (chartData.length === 0) return;

    // Bitcoin Price Trace
    const priceTrace = {
      x: chartData.map(d => d.time),
      y: chartData.map(d => d.value),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Price',
      yaxis: 'y',
      hovertemplate:
        `<b>Price:</b> $%{y:,.0f}<br>` +
        `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
      visible: true,
    };

    // Overlay Trace for Hover Info (Transparent)
    const overlayTrace = {
      x: chartData.map(d => d.time),
      y: chartData.map(d => d.Extension),
      type: 'scatter',
      mode: 'lines',
      line: { width: 0 },
      fill: 'tozeroy',
      fillcolor: 'rgba(0,0,0,0)', // Transparent
      name: '20-Week MA Extension',
      yaxis: 'y2',
      hovertemplate:
        `<b>Extension:</b> %{y:.2f}%<br>` +
        `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
      visible: true,
      showlegend: false,
    };

    // Create a trace for each segment between consecutive points
    const segmentTraces = [];
    for (let i = 0; i < chartData.length - 1; i++) {
      const dateToday = chartData[i].time;
      const dateTomorrow = chartData[i + 1].time;
      const extToday = chartData[i].Extension;
      const extTomorrow = chartData[i + 1].Extension;
      const avgExtension = (extToday + extTomorrow) / 2; // Average extension for the segment
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

    // Dummy traces for the legend
    const legendTraces = extensionRanges.map(range => ({
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: range.color, size: 10 },
      name: range.label,
      showlegend: true,
      visible: 'legendonly',
    }));

    setDatasets([priceTrace, overlayTrace, ...segmentTraces, ...legendTraces]);
  }, [chartData, theme]);

  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      yaxis: {
        ...prevLayout.yaxis,
        title: {
          text: 'Price ($)',
          font: { color: colors.primary[100], size: 14 },
          standoff: 5,
        },
      },
      yaxis2: {
        ...prevLayout.yaxis2,
        title: {
          text: 'Extension (%)',
          font: { color: colors.primary[100], size: 14 },
          standoff: 5,
        },
        zerolinecolor: colors.primary[100],
      },
    }));
  }, [colors]);

  const resetChartView = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
      yaxis2: { ...prevLayout.yaxis2, autorange: true },
    }));
    setDatasets(prevDatasets =>
      prevDatasets.map(dataset => ({
        ...dataset,
        visible: dataset.name === '20-Week MA Extension' || dataset.name === 'Price' ? true : dataset.showlegend ? 'legendonly' : true,
      }))
    );
    setAllVisible(true);
  };

  const toggleAllVisibility = () => {
    const newVisibility = !allVisible;
    setDatasets(prevDatasets =>
      prevDatasets.map(dataset => ({
        ...dataset,
        visible: newVisibility
          ? dataset.name === '20-Week MA Extension' || dataset.name === 'Price' || !dataset.showlegend
            ? true
            : 'legendonly'
          : dataset.name === '20-Week MA Extension' || dataset.name === 'Price'
          ? 'legendonly'
          : dataset.showlegend
          ? 'legendonly'
          : 'legendonly',
      }))
    );
    setAllVisible(newVisibility);
  };

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div>
            <button onClick={toggleAllVisibility} className="button-toggle">
              {allVisible ? 'Hide all' : 'Show all'}
            </button>
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <Plot
          ref={plotRef}
          data={datasets}
          layout={layout}
          config={{
            staticPlot: isDashboard,
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default restrictToPaidSubscription(Bitcoin20WeekExtension);