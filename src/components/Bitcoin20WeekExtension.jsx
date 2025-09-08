import React, { useEffect, useState, useContext, useMemo, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, useMediaQuery } from "@mui/material";
import '../styling/bitcoinChart.css';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';

const Bitcoin20WeekExtension = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData, fetchBtcData } = useContext(DataContext);
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const isMobile = useIsMobile();
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

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

  const [showExtensionArea, setShowExtensionArea] = useState(true); // State for extension area visibility
  const [showExtensionPoints, setShowExtensionPoints] = useState(false); // State for extension points visibility
  const [rangeVisibility, setRangeVisibility] = useState(
    extensionRanges.reduce((acc, r) => { acc[r.label] = true; return acc; }, {})
  ); // State for range visibility
  const [isSelectAll, setIsSelectAll] = useState(false); // State for deselect/select all toggle

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
    if (data.length <= 200) return data; // Return original data for small datasets
    const downsampled = [];
    for (let i = 0; i < data.length - 1; i += factor) { // Stop before the last point
      const slice = data.slice(i, Math.min(i + factor, data.length));
      const avgValue = slice.reduce((sum, item) => sum + parseFloat(item.value), 0) / slice.length;
      const avgExtension = slice.reduce((sum, item) => sum + item.Extension, 0) / slice.length;
      downsampled.push({
        time: slice[0].time,
        value: avgValue,
        Extension: avgExtension,
      });
    }
    // Append the last data point to ensure the latest value is included
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      downsampled.push({
        time: lastPoint.time,
        value: parseFloat(lastPoint.value),
        Extension: lastPoint.Extension,
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
      fixedrange: true,
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
      fixedrange: true,
    },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    },
    showlegend: isMobile ? false : true,
    hovermode: 'closest',
    hoverdistance: 10,
  });

  const [datasets, setDatasets] = useState([]);
  // Add a render key to force re-render of the Plot component
  const [renderKey, setRenderKey] = useState(0);

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

    // Colored points on price line
    const coloredPointsTrace = {
      x: chartData.map(d => d.time),
      y: chartData.map(d => d.value),
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: chartData.map(d => {
          const range = extensionRanges.find(r => d.Extension >= r.range[0] && d.Extension < r.range[1]);
          return range && rangeVisibility[range.label] ? range.color : 'rgba(0, 0, 0, 0)';
        }),
        size: 6
      },
      name: 'Extension Points',
      yaxis: 'y',
      hoverinfo: 'skip',
      visible: showExtensionPoints ? true : 'legendonly',
      showlegend: true,
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
        visible: rangeVisibility[range.label] ? true : 'legendonly',
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
        visible: rangeVisibility[range.label] ? true : 'legendonly',
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
      const range = extensionRanges.find(r => avgExtension >= r.range[0] && avgExtension < r.range[1]);
      const visible = showExtensionArea && range && rangeVisibility[range.label] ? true : 'legendonly';
      const color = range ? range.color : 'rgb(255, 255, 255)';
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
        visible: visible,
      });
    }

    // Legend entry for toggling extension area
    const extensionAreaLegendTrace = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: 'rgba(0, 0, 0, 0)', size: 0 }, // Invisible marker
      name: 'Extension Area',
      showlegend: true,
      visible: true,
    };

    // Legend entry for deselect/select all
    const toggleAllLegendTrace = {
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { color: 'rgba(0, 0, 0, 0)', size: 0 }, // Invisible marker
      name: 'Deselect / Select All',
      showlegend: true,
      visible: true,
    };

    // Legend entries for extension ranges
    const legendTraces = extensionRanges.map(range => ({
      x: [null],
      y: [null],
      type: 'scatter',
      mode: 'markers',
      marker: { 
        color: rangeVisibility[range.label] ? range.color : 'rgb(128, 128, 128)', 
        size: 10 
      },
      name: range.label,
      showlegend: true,
      visible: true,
    }));

    setDatasets([
      priceLineTrace,
      coloredPointsTrace,
      ...rangeTraces,
      ...extensionRangeTraces,
      ...segmentTraces,
      extensionAreaLegendTrace,
      toggleAllLegendTrace,
      ...legendTraces
    ]);
  }, [chartData, theme, showExtensionArea, showExtensionPoints, rangeVisibility]);

  useEffect(() => {
    setLayout({
      title: isDashboard ? '' : 'Bitcoin Price vs. 20-Week MA Extension',
      autosize: true,
      margin: { l: 60, r: 50, b: isNarrowScreen ? 80 : 50, t: 30, pad: 4 },
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      xaxis: { autorange: true },
      yaxis: {
        title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
        type: 'log',
        autorange: true,
        automargin: true,
        fixedrange: true,
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
        fixedrange: true,
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: isNarrowScreen ? -0.3 : -0.2,
        yanchor: 'top',
        font: { size: isNarrowScreen ? 10 : 12 },
        itemwidth: isNarrowScreen ? 70 : undefined,
        tracegroupgap: isNarrowScreen ? 2 : 10,
        itemsizing: 'constant',
      },
      showlegend: isMobile ? false : true,
      hovermode: 'closest',
      hoverdistance: 10,
    });
  }, [colors, isDashboard, isMobile, isNarrowScreen]);

  const resetChartView = useCallback(() => {
    // Update layout to reset axes
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
      yaxis2: { ...prevLayout.yaxis2, autorange: true },
    }));
    // Force re-render by updating renderKey
    setRenderKey(prevKey => prevKey + 1);
  }, []);

  const handleRelayout = (event) => {
    if (event['xaxis.range[0]']) {
      const newXMin = new Date(event['xaxis.range[0]']);
      const newXMax = new Date(event['xaxis.range[1]']);
      const visibleData = chartData.filter(d => {
        const date = new Date(d.time);
        return date >= newXMin && date <= newXMax;
      });
      if (visibleData.length > 0) {
        const yValues = visibleData.map(d => d.value);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const factor = 1.05; // 5% padding for log scale
        const clampedYMin = Math.max(yMin / factor, 1e-10); // Multiplicative padding
        const clampedYMax = yMax * factor;
        const extValues = visibleData.map(d => d.Extension);
        const extMin = Math.min(...extValues);
        const extMax = Math.max(...extValues);
        const extPadding = (extMax - extMin) * 0.05; // 5% padding for linear scale
        setLayout(prevLayout => ({
          ...prevLayout,
          xaxis: {
            ...prevLayout.xaxis,
            range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
            autorange: false,
          },
          yaxis: {
            ...prevLayout.yaxis,
            range: [Math.log10(clampedYMin), Math.log10(clampedYMax)],
            autorange: false,
          },
          yaxis2: {
            ...prevLayout.yaxis2,
            range: [extMin - extPadding, extMax + extPadding],
            autorange: false,
          },
        }));
      }
    }
  };

  // Handle legend click to toggle visibility
  const handleLegendClick = useCallback((event) => {
    const name = event.data[event.curveNumber].name;
    if (name === 'Extension Area') {
      setShowExtensionArea(prev => !prev);
      setRenderKey(prev => prev + 1);
      return false;
    }
    if (name === 'Extension Points') {
      setShowExtensionPoints(prev => !prev);
      setRenderKey(prev => prev + 1);
      return false;
    }
    if (name === 'Deselect / Select All') {
      setRangeVisibility(prev => {
        const newVisibility = isSelectAll ? true : false;
        return extensionRanges.reduce((acc, r) => {
          acc[r.label] = newVisibility;
          return acc;
        }, {});
      });
      setIsSelectAll(prev => !prev);
      setRenderKey(prev => prev + 1);
      return false;
    }
    if (extensionRanges.some(r => r.label === name)) {
      setRangeVisibility(prev => ({
        ...prev,
        [name]: !prev[name]
      }));
      setRenderKey(prev => prev + 1);
      return false;
    }
    return true; // Allow default behavior for other legend items
  }, [extensionRanges, isSelectAll]);

  // Handle double-click to reset chart
  const handleDoubleClick = useCallback(() => {
    resetChartView();
  }, [resetChartView]);

  // Handle cursor changes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .chart-container .js-plotly-plot .plotly .cursor-ew-resize {
        cursor: default !important;
      }
      .chart-container .js-plotly-plot .plotly .cursor-ns-resize {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      <div
        ref={containerRef}
        className="chart-container"
        style={{ height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}
      >
        <Plot
          key={renderKey} // Force re-render when renderKey changes
          ref={plotRef}
          data={datasets}
          layout={layout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true, dragmode: 'zoom' }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          onRelayout={handleRelayout}
          onLegendClick={handleLegendClick}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <div className='under-chart'>
        {!isDashboard && (
          <div>
            <LastUpdated storageKey="btcData" />
          </div>
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Latest Extension: {latestExtension}%
          </div>
          <p className='chart-info'>
            The Bitcoin 20-Week Extension chart shows the percentage difference between the current price and the 20-week moving average (MA),
            which helps to identify if we are currently in a bubble or a bear market. The chart is color-coded to indicate different ranges of extension.
            Toggle 'Extension Area' to show or hide the extension percentage visualization, 'Extension Points' to show or hide colored points on the price line,
            or 'Deselect / Select All' to toggle all ranges. Individual ranges can be toggled to show or hide their corresponding points and tooltips,
            with deselected ranges appearing greyed out in the legend.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(Bitcoin20WeekExtension);