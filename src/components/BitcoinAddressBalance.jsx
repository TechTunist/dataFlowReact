import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Typography, useMediaQuery } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import Plotly from 'plotly.js-gl2d-dist';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const BitcoinAddressBalancesChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { fetchAddressMetricsData, onchainMetricsData, onchainMetricsLastUpdated, onchainFetchError, btcData, fetchBtcData } = useContext(DataContext);
  const plotRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scaleMode, setScaleMode] = useState(1); // 1: Logarithmic, 0: Linear
  const [isInteractive, setIsInteractive] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState(''); // Single metric selection
  const [rangeStart, setRangeStart] = useState(''); // Start of the address range
  const [rangeEnd, setRangeEnd] = useState(''); // End of the address range
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Fetch address metrics when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchAddressMetricsData();
      } catch (err) {
        setError(`Failed to load address metrics: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchAddressMetricsData]);

  const addressMetrics = useMemo(
    () => ({
      'AdrBalNtv0.001Cnt': { label: 'Addresses ≥ 0.001 BTC', color: '#ADFF2F' },
      'AdrBalNtv0.01Cnt': { label: 'Addresses ≥ 0.01 BTC', color: '#00FF00' },
      'AdrBalNtv0.1Cnt': { label: 'Addresses ≥ 0.1 BTC', color: '#00CED1' },
      'AdrBalNtv1Cnt': { label: 'Addresses ≥ 1 BTC', color: '#1E90FF' },
      'AdrBalNtv10Cnt': { label: 'Addresses ≥ 10 BTC', color: '#9932CC' },
      'AdrBalNtv100Cnt': { label: 'Addresses ≥ 100 BTC', color: '#FF69B4' },
      'AdrBal1in1KCnt': { label: 'Addresses ≥ 1,000 BTC', color: '#FFFF00' },
      'AdrBal1in10KCnt': { label: 'Addresses ≥ 10,000 BTC', color: '#FFA500' },
      'AdrBal1in100KCnt': { label: 'Addresses ≥ 100,000 BTC', color: '#FF4500' },
    }),
    []
  );

  const orderedMetricKeys = useMemo(
    () => Object.keys(addressMetrics),
    [addressMetrics]
  );

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Address Balances Over Time',
    autosize: true,
    margin: { l: 70, r: 70, b: 50, t: isDashboard ? 30 : 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.grey[100], size: 12 },
    xaxis: {
      title: 'Date',
      autorange: true,
      tickcolor: colors.grey[100],
      gridcolor: colors.grey[800],
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: colors.grey[100],
      linewidth: 1,
      ticks: 'outside',
      tickfont: { color: colors.grey[100] },
    },
    yaxis: {
      title: {
        text: 'Number of Addresses',
        font: { color: colors.grey[100], size: 14 },
        standoff: 10,
      },
      type: 'log',
      autorange: true,
      nticks: 5,
      tickcolor: colors.grey[100],
      gridcolor: colors.grey[800],
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: colors.grey[100],
      linewidth: 1,
      ticks: 'outside',
      tickfont: { color: colors.grey[100], size: 12 },
      tickformat: '.2s',
      fixedrange: true,
    },
    yaxis2: {
      title: {
        text: 'BTC Price (USD)',
        font: { color: colors.grey[100], size: 14 },
        standoff: 10,
      },
      type: 'log',
      autorange: true,
      nticks: 5,
      overlaying: 'y',
      side: 'right',
      tickcolor: colors.grey[100],
      gridcolor: colors.grey[800],
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: colors.grey[100],
      linewidth: 1,
      ticks: 'outside',
      tickfont: { color: colors.grey[100], size: 12 },
      tickformat: '$,.2s',
      fixedrange: true,
    },
    showlegend: !isDashboard,
    legend: !isDashboard
      ? {
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.2,
          yanchor: 'top',
          font: { color: colors.grey[100] },
        }
      : {},
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: colors.grey[700],
      font: { color: colors.grey[100], size: isNarrowScreen ? 10 : 12 }
    },
  });

  const datasets = useMemo(() => {
    if (!onchainMetricsData || onchainMetricsData.length === 0) {
      return [];
    }
    let metricTraces = [];
    if (activeMetrics) {
      metricTraces = [{
        x: onchainMetricsData.map((d) => d.time),
        y: onchainMetricsData.map((d) => d[activeMetrics]),
        type: 'scattergl',
        mode: 'lines',
        line: { color: addressMetrics[activeMetrics].color, width: 2 },
        name: addressMetrics[activeMetrics].label,
        visible: true,
        hovertemplate: `<b>${addressMetrics[activeMetrics].label}</b>: %{y:,.0f}<br><extra></extra>`,
      }];
    } else if (rangeStart && rangeEnd) {
      const startIndex = orderedMetricKeys.indexOf(rangeStart);
      const endIndex = orderedMetricKeys.indexOf(rangeEnd);
      const selectedMetrics = orderedMetricKeys.slice(startIndex, endIndex + 1);
      const combinedData = onchainMetricsData.map((dataPoint) => {
        let totalAddresses = 0;
        selectedMetrics.forEach((metric) => {
          totalAddresses += dataPoint[metric] || 0;
        });
        return totalAddresses;
      });
      const startLabel = addressMetrics[rangeStart].label.replace('Addresses ≥ ', ' ≥ ').replace(' BTC', '');
      const endLabel = addressMetrics[rangeEnd].label.replace('Addresses ≥ ', ' ≥ ').replace(' BTC', '');
      const rangeLabel = `Addresses ${startLabel} to ${endLabel}`;
      metricTraces = [{
        x: onchainMetricsData.map((d) => d.time),
        y: combinedData,
        type: 'scattergl',
        mode: 'lines',
        line: { color: addressMetrics[rangeStart].color, width: 2 },
        name: rangeLabel,
        visible: true,
        hovertemplate: `<b>${rangeLabel}</b>: %{y:,.0f}<br><extra></extra>`,
      }];
    }
    const btcPriceTrace = btcData.length > 0 ? [{
      x: btcData.map((d) => d.time),
      y: btcData.map((d) => d.value),
      type: 'scattergl',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Bitcoin Price',
      visible: true,
      hovertemplate: `<b>Bitcoin Price</b>: $%{y:,.0f}<br><extra></extra>`,
      yaxis: 'y2',
    }] : [];
    return [...metricTraces, ...btcPriceTrace];
  }, [onchainMetricsData, btcData, activeMetrics, rangeStart, rangeEnd, addressMetrics, orderedMetricKeys]);

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.grey[100], size: 12 },
      xaxis: {
        ...prev.xaxis,
        title: 'Date',
        tickcolor: colors.grey[100],
        gridcolor: colors.grey[800],
        gridwidth: 1,
        zeroline: false,
        showline: true,
        linecolor: colors.grey[100],
        linewidth: 1,
        ticks: 'outside',
        tickfont: { color: colors.grey[100] },
      },
      yaxis: {
        ...prev.yaxis,
        title: {
          text: 'Number of Addresses',
          font: { color: colors.grey[100], size: 14 },
          standoff: 10,
        },
        type: scaleMode === 1 ? 'log' : 'linear',
        nticks: 5,
        tickcolor: colors.grey[100],
        gridcolor: colors.grey[800],
        gridwidth: 1,
        zeroline: false,
        showline: true,
        linecolor: colors.grey[100],
        linewidth: 1,
        ticks: 'outside',
        tickfont: { color: colors.grey[100], size: 12 },
        tickformat: '.2s',
      },
      yaxis2: {
        ...prev.yaxis2,
        title: {
          text: 'BTC Price (USD)',
          font: { color: colors.grey[100], size: 14 },
          standoff: 10,
        },
        type: 'log',
        nticks: 5,
        tickcolor: colors.grey[100],
        gridcolor: colors.grey[800],
        gridwidth: 1,
        zeroline: false,
        showline: true,
        linecolor: colors.grey[100],
        linewidth: 1,
        ticks: 'outside',
        tickfont: { color: colors.grey[100], size: 12 },
        tickformat: '$,.2s',
      },
      hoverlabel: {
        bgcolor: colors.grey[700],
        font: { color: colors.grey[100], size: isNarrowScreen ? 10 : 12 }
      },
    }));
  }, [colors, scaleMode, isNarrowScreen]);

  const handleMetricChange = (event) => {
    const selected = event.target.value;
    setActiveMetrics(selected);
    setRangeStart('');
    setRangeEnd('');
  };

  const handleRangeStartChange = (event) => {
    const selectedStart = event.target.value;
    setRangeStart(selectedStart);
    setActiveMetrics('');
    if (rangeEnd && orderedMetricKeys.indexOf(rangeEnd) < orderedMetricKeys.indexOf(selectedStart)) {
      setRangeEnd('');
    }
  };

  const handleRangeEndChange = (event) => {
    const selectedEnd = event.target.value;
    setRangeEnd(selectedEnd);
    setActiveMetrics('');
  };

  const toggleScaleMode = () => {
    setScaleMode((prev) => {
      return prev === 1 ? 0 : 1;
    });
  };

  const resetChartView = () => {
    setLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true },
      yaxis: { ...prev.yaxis, autorange: true },
      yaxis2: { ...prev.yaxis2, autorange: true },
    }));
  };

  const handleRelayout = (event) => {
    if (event['xaxis.range[0]']) {
      const newXMin = new Date(event['xaxis.range[0]']);
      const newXMax = new Date(event['xaxis.range[1]']);
      const visibleMetricsData = onchainMetricsData.filter(d => {
        const date = new Date(d.time);
        return date >= newXMin && date <= newXMax;
      });
      const visibleBtcData = btcData.filter(d => {
        const date = new Date(d.time);
        return date >= newXMin && date <= newXMax;
      });
      let yValues = [];
      if (activeMetrics) {
        yValues = visibleMetricsData.map(d => d[activeMetrics]);
      } else if (rangeStart && rangeEnd) {
        const startIndex = orderedMetricKeys.indexOf(rangeStart);
        const endIndex = orderedMetricKeys.indexOf(rangeEnd);
        const selectedMetrics = orderedMetricKeys.slice(startIndex, endIndex + 1);
        yValues = visibleMetricsData.map(dataPoint => {
          let total = 0;
          selectedMetrics.forEach(metric => {
            total += dataPoint[metric] || 0;
          });
          return total;
        });
      }
      const btcYValues = visibleBtcData.map(d => d.value);
      const yMin = yValues.length > 0 ? Math.min(...yValues) : 1e-10;
      const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;
      const btcYMin = btcYValues.length > 0 ? Math.min(...btcYValues) : 1e-10;
      const btcYMax = btcYValues.length > 0 ? Math.max(...btcYValues) : 1;
      const factor = 1.05;
      const clampedYMin = Math.max(yMin / factor, 1e-10);
      const clampedYMax = yMax * factor;
      const clampedBtcYMin = Math.max(btcYMin / factor, 1e-10);
      const clampedBtcYMax = btcYMax * factor;
      const yRange = scaleMode === 1 ? [Math.log10(clampedYMin), Math.log10(clampedYMax)] : [clampedYMin, clampedYMax];
      const y2Range = [Math.log10(clampedBtcYMin), Math.log10(clampedBtcYMax)];
      setLayout((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
          autorange: false,
        },
        yaxis: {
          ...prev.yaxis,
          range: yRange,
          autorange: false,
        },
        yaxis2: {
          ...prev.yaxis2,
          range: y2Range,
          autorange: false,
        },
      }));
    }
  };

  // Handle cursor changes on mousedown/mouseup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svgContainer = plotRef.current.el.querySelector('.svg-container');
    if (svgContainer) {
      svgContainer.style.cursor = 'default';
    }
    const handleMouseDown = () => {
      if (svgContainer) {
        svgContainer.style.cursor = 'ew-resize';
      }
    };
    const handleMouseUp = () => {
      if (svgContainer) {
        svgContainer.style.cursor = 'default';
      }
    };
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: 'center',
            gap: '15px',
            marginBottom: '30px',
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="metrics-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Address Metrics
            </InputLabel>
            <Select
              value={activeMetrics}
              onChange={handleMetricChange}
              labelId="metrics-label"
              label="Address Metrics"
              displayEmpty
              renderValue={(selected) =>
                selected ? addressMetrics[selected].label : 'Select Metrics'
              }
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {Object.entries(addressMetrics).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: { xs: '5px', sm: '10px' },
              width: { xs: '100%', sm: 'auto' },
              flexWrap: 'nowrap',
            }}
          >
            <FormControl sx={{ minWidth: '80px', width: { xs: '30%', sm: '200px' } }}>
              <InputLabel
                id="range-start-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Range Start
              </InputLabel>
              <Select
                value={rangeStart}
                onChange={handleRangeStartChange}
                labelId="range-start-label"
                label="Range Start"
                displayEmpty
                renderValue={(selected) =>
                  selected ? addressMetrics[selected].label : 'Select Start'
                }
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1, pl: 1.5 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                {orderedMetricKeys.map((key) => (
                  <MenuItem key={key} value={key}>
                    <span>{addressMetrics[key].label}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography
              variant="subtitle2"
              sx={{
                color: colors.grey[100],
                fontSize: { xs: '12px', sm: '14px' },
                mx: { xs: '2px', sm: '5px' },
                whiteSpace: 'nowrap',
              }}
            >
              Create Range
            </Typography>
            <FormControl sx={{ minWidth: '80px', width: { xs: '30%', sm: '200px' } }}>
              <InputLabel
                id="range-end-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                }}
              >
                Range End
              </InputLabel>
              <Select
                value={rangeEnd}
                onChange={handleRangeEndChange}
                labelId="range-end-label"
                label="Range End"
                displayEmpty
                disabled={!rangeStart}
                renderValue={(selected) =>
                  selected ? addressMetrics[selected].label : 'Select End'
                }
                sx={{
                  color: colors.grey[100],
                  backgroundColor: colors.primary[500],
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1, pl: 1.5 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
                }}
              >
                {orderedMetricKeys
                  .slice(rangeStart ? orderedMetricKeys.indexOf(rangeStart) : 0)
                  .map((key) => (
                    <MenuItem key={key} value={key}>
                      <span>{addressMetrics[key].label}</span>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}
      {!isDashboard && (
        <div className="chart-top-div">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: colors.grey[100] }}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {(error || onchainFetchError) && (
              <span style={{ color: colors.redAccent[500] }}>{error || onchainFetchError}</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={resetChartView} className="button-reset">
              Reset Chart
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
          zIndex: 1,
          cursor: 'default',
        }}
      >
        <div style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <Plot
            ref={plotRef}
            data={datasets}
            layout={layout}
            config={{
              staticPlot: isDashboard || !isInteractive,
              displayModeBar: false,
              responsive: true,
              dragmode: 'zoom',
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            onRelayout={handleRelayout}
            plotly={Plotly}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: colors.primary[900],
            padding: '5px 10px',
            borderRadius: '4px',
            color: colors.grey[100],
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Selection</div>}
          {activeMetrics && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: addressMetrics[activeMetrics].color,
                  marginRight: '5px',
                }}
              />
              {addressMetrics[activeMetrics].label}
            </div>
          )}
          {rangeStart && rangeEnd && !activeMetrics && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: addressMetrics[rangeStart].color,
                  marginRight: '5px',
                }}
              />
              Addr {addressMetrics[rangeStart].label.replace('Addresses ≥ ', '≥ ').replace(' BTC', '')} to {addressMetrics[rangeEnd].label.replace('Addresses ≥ ', '≥ ').replace(' BTC', '')}
            </div>
          )}
        </div>
      </div>
      {!isDashboard && (
        <div className="under-chart" style={{ padding: '10px 0' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <LastUpdated storageKey="btcData" />
            <BitcoinFees />
          </Box>
        </div>
      )}
      {!isDashboard && (
        <p className="chart-info" style={{ marginTop: '10px', textAlign: 'left', width: '100%' }}>
          This chart displays the number of Bitcoin addresses holding various levels of Bitcoin over time.
          This metric gives an indication of the distribution of Bitcoin wealth among holders.
<br />
          Source: <a href="https://coinmetrics.io/community-network-data/">Coin Metrics Community API</a>
<br />
<br />
</p>
      )}
    </div>
  );
};
export default restrictToPaidSubscription(BitcoinAddressBalancesChart);