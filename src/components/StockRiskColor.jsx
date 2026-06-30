import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import { Box, FormControl, InputLabel, MenuItem, Select, useMediaQuery } from '@mui/material';
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import {
  calculateStockRiskMetricByVersion,
  STOCK_RISK_METRIC_VERSIONS,
} from '../utility/stockRiskMetric';
import { STOCKS, stockLoadingMessage, stockRiskInsufficientHistoryMessage } from '../config/stocksConfig';
import StockGroupSelect from './StockGroupSelect';
import ChartInfoSections from './ChartInfoSections';

const STOCK_RISK_VERSION_STORAGE_KEY = 'stockRiskMetricVersion';

const StockRiskColor = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const { altcoinData, fetchAltcoinData, isAltcoinDataFetched } = useContext(DataContext);
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedStock, setSelectedStock] = useState('MSTR');
  const [riskMetricVersion, setRiskMetricVersion] = useState(() => {
    try {
      const stored = localStorage.getItem(STOCK_RISK_VERSION_STORAGE_KEY);
      return stored === 'v2' ? 'v2' : 'v1';
    } catch {
      return 'v1';
    }
  });

  const selectedStockLabel = useMemo(() => {
    const match = STOCKS.find((s) => s.value === selectedStock);
    return match ? match.label : selectedStock;
  }, [selectedStock]);

  const chartSourceData = useMemo(
    () => altcoinData[selectedStock] ?? [],
    [altcoinData, selectedStock]
  );

  const isSourceDataReady = Boolean(
    isAltcoinDataFetched[selectedStock] && altcoinData[selectedStock] !== undefined
  );

  const chartData = useMemo(
    () =>
      chartSourceData.length > 0
        ? calculateStockRiskMetricByVersion(chartSourceData, riskMetricVersion)
        : [],
    [chartSourceData, riskMetricVersion]
  );

  const currentRisk = chartData.length > 0 ? chartData[chartData.length - 1].Risk : null;

  const [layout, setLayout] = useState({
    title: `${selectedStockLabel} Price vs. Risk Level`,
    autosize: true,
    margin: { l: 60, r: 50, b: 30, t: 30, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: '', autorange: true },
    yaxis: {
      title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      type: 'log',
      autorange: true,
      automargin: true,
      fixedrange: true,
    },
    legend: {
      title: { text: isNarrowScreen ? '' : 'Select Risk Bands' },
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
      tracegroupgap: isNarrowScreen ? 5 : 10,
      itemsizing: isNarrowScreen ? 'constant' : undefined,
      font: { size: isNarrowScreen ? 10 : 12 },
    },
  });

  const [datasets, setDatasets] = useState(
    Array.from({ length: 10 }, (_, index) => ({
      data: [],
      visible: true,
      label: isNarrowScreen
        ? `${((index + 1) * 0.1).toFixed(1)}`
        : `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`,
    }))
  );

  useEffect(() => {
    // [] is truthy, only skip fetch when we already have rows
    if (!altcoinData[selectedStock]?.length) {
      fetchAltcoinData(selectedStock);
    }
  }, [selectedStock, altcoinData, fetchAltcoinData]);

  useEffect(() => {
    if (chartData.length === 0) return;
    const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const newDatasets = riskBands.map((upperLimit, index) => {
      const lowerLimit = index === 0 ? 0.0 : riskBands[index - 1];
      const filteredData = chartData.filter((d) => d.Risk >= lowerLimit && d.Risk <= upperLimit);
      return {
        data: filteredData,
        visible: datasets[index]?.visible ?? true,
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: filteredData.map((d) => d.Risk),
          colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
          cmin: 0,
          cmax: 1,
          size: 10,
        },
        name: isNarrowScreen
          ? `${upperLimit.toFixed(1)}`
          : `${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}`,
        hovertemplate:
          `<b>Risk Band:</b> ${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}<br>` +
          `<b>Risk:</b> %{marker.color:.2f}<br>` +
          `<b>Price:</b> $%{y:,.2f}<br>` +
          `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
      };
    });
    newDatasets.push({
      x: chartData.map((d) => d.time),
      y: chartData.map((d) => d.value),
      type: 'scatter',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: `${selectedStockLabel} Price`,
      visible: datasets[10]?.visible ?? true,
    });
    setDatasets(newDatasets);
  }, [chartData, theme, selectedStockLabel, isNarrowScreen]);

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      title: isDashboard ? '' : `${selectedStockLabel} Price vs. Risk Level`,
      yaxis: {
        ...prev.yaxis,
        title: { text: 'Price ($)', font: { color: colors.primary[100], size: 14 }, standoff: 5 },
      },
    }));
  }, [colors, selectedStockLabel, isDashboard]);

  const resetChartView = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true },
      yaxis: { ...prev.yaxis, autorange: true },
    }));
  }, []);

  const handleRelayout = (event) => {
    if (!event['xaxis.range[0]']) return;
    const newXMin = new Date(event['xaxis.range[0]']);
    const newXMax = new Date(event['xaxis.range[1]']);
    const visibleData = chartData.filter((d) => {
      const date = new Date(d.time);
      return date >= newXMin && date <= newXMax;
    });
    if (visibleData.length === 0) return;
    const yValues = visibleData.map((d) => d.value);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const factor = 1.05;
    setLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, range: [event['xaxis.range[0]'], event['xaxis.range[1]']], autorange: false },
      yaxis: {
        ...prev.yaxis,
        range: [Math.log10(Math.max(yMin / factor, 1e-10)), Math.log10(yMax * factor)],
        autorange: false,
      },
    }));
  };

  const handleLegendDoubleClick = (event) => {
    const curveNumber = event.curveNumber;
    setDatasets((prev) =>
      prev.map((dataset, index) => {
        if (curveNumber >= 0 && curveNumber < 10) {
          return { ...dataset, visible: index === curveNumber || index === 10 };
        }
        if (curveNumber === 10 && index === 10) {
          return { ...dataset, visible: !dataset.visible };
        }
        return dataset;
      })
    );
    return false;
  };

  const handleLegendClick = (event) => {
    const curveNumber = event.curveNumber;
    setDatasets((prev) =>
      prev.map((dataset, i) =>
        i === curveNumber ? { ...dataset, visible: !dataset.visible } : dataset
      )
    );
    return false;
  };

  const handleRiskMetricVersionChange = (event) => {
    const nextVersion = event.target.value;
    setRiskMetricVersion(nextVersion);
    try {
      localStorage.setItem(STOCK_RISK_VERSION_STORAGE_KEY, nextVersion);
    } catch {
      // ignore storage failures
    }
    resetChartView();
  };

  const handleStockChange = (event) => {
    setSelectedStock(event.target.value);
    setDatasets(
      Array.from({ length: 10 }, (_, index) => ({
        data: [],
        visible: true,
        label: isNarrowScreen
          ? `${((index + 1) * 0.1).toFixed(1)}`
          : `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`,
      }))
    );
    resetChartView();
  };

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <div className="chart-top-div" style={{ paddingTop: '30px', paddingBottom: '30px' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isNarrowScreen ? 'row' : { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: isNarrowScreen ? 'space-between' : { xs: 'center', sm: 'space-between' },
              gap: '20px',
              marginTop: '30px',
              marginBottom: '20px',
              width: '100%',
            }}
          >
            <FormControl
              sx={{
                ...(isNarrowScreen
                  ? { flex: 2, minWidth: '100px' }
                  : { minWidth: '100px', width: { xs: '100%', sm: '280px' } }),
              }}
            >
              <InputLabel
                id="stock-risk-color-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Stock
              </InputLabel>
              <StockGroupSelect
                value={selectedStock}
                onChange={handleStockChange}
                label="Stock"
                labelId="stock-risk-color-label"
                colors={colors}
              />
            </FormControl>
            <FormControl
              sx={{
                ...(isNarrowScreen
                  ? { flex: 2, minWidth: '100px' }
                  : { minWidth: '100px', width: { xs: '100%', sm: '240px' } }),
              }}
            >
              <InputLabel
                id="stock-risk-color-model-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Risk Model
              </InputLabel>
              <Select
                value={riskMetricVersion}
                onChange={handleRiskMetricVersionChange}
                label="Risk Model"
                labelId="stock-risk-color-model-label"
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1.5, pl: 2 },
                }}
              >
                {Object.entries(STOCK_RISK_METRIC_VERSIONS).map(([value, config]) => (
                  <MenuItem key={value} value={value}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <button
              onClick={resetChartView}
              className="button-reset"
              style={{
                backgroundColor: 'transparent',
                color: '#31d6aa',
                borderColor: '#70d8bd',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: '1px solid',
              }}
            >
              Reset Chart
            </button>
          </Box>
        </div>
      )}
      <div
        ref={containerRef}
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% + 50px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
        }}
      >
        {chartData.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.grey[100],
              zIndex: 2,
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            {!isSourceDataReady || chartSourceData.length === 0
              ? stockLoadingMessage(selectedStock)
              : stockRiskInsufficientHistoryMessage(chartSourceData.length)}
          </div>
        )}
        <Plot
          ref={plotRef}
          data={datasets.map((dataset) => ({
            type: dataset.type,
            mode: dataset.mode,
            x: dataset.x || dataset.data.map((d) => d.time),
            y: dataset.y || dataset.data.map((d) => d.value),
            marker: dataset.marker || {},
            line: dataset.line || {},
            name: dataset.name,
            hoverinfo: 'text',
            hovertemplate: dataset.hovertemplate,
            visible: dataset.visible ? true : 'legendonly',
          }))}
          layout={{
            ...layout,
            title: isDashboard ? '' : `${selectedStockLabel} Price vs. Risk Level`,
            showlegend: !isDashboard,
          }}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true, dragmode: 'zoom' }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          onLegendDoubleClick={handleLegendDoubleClick}
          onLegendClick={handleLegendClick}
          onDoubleClick={resetChartView}
        />
      </div>
      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey={`${selectedStock.toLowerCase()}Data`} />}
      </UnderChartRow>
      {!isDashboard && (
        <UnderChartValue>
          <p className="current-risk" style={{ fontSize: '1.15rem', color: colors.primary[100], margin: 0 }}>
            Current Risk:{' '}
            <b style={{ color: colors.greenAccent[500] }}>
              {currentRisk !== null ? currentRisk.toFixed(2) : 'Loading...'}
            </b>
          </p>
        </UnderChartValue>
      )}
      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'What it is',
              content:
                'A scatter view of stock price (log scale) with each point colored by its risk band for the selected stock.',
            },
            {
              title: 'How it is built',
              content:
                'Stock risk uses price vs the 200-day average, a 3-year calibration band, 21-day smoothing, and log-odds tail compression so colour bands cluster in the middle unless price is truly extended.',
            },
            {
              title: 'How to interpret',
              content:
                'Warmer colours mean stretched vs trend; cooler colours mean relative value. Double-click a legend entry to isolate a band. The current risk readout above summarizes the latest score.',
            },
          ]}
        />
      )}
    </div>
  );
};

export default restrictToPaidSubscription(StockRiskColor);