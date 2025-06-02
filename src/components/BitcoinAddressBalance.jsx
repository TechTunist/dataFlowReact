// src/components/BitcoinAddressBalancesChart.js
import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from '../theme';
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Checkbox } from '@mui/material';
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import Plotly from 'plotly.js-gl2d-dist';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const BitcoinAddressBalancesChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { fetchOnchainMetricsData, onchainMetricsData, onchainMetricsLastUpdated, refreshOnchainMetricsData, onchainFetchError } = useContext(DataContext);
  const plotRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scaleMode, setScaleMode] = useState(1); // 1: Logarithmic, 0: Linear
  const [isInteractive, setIsInteractive] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState(['AdrBalNtv1Cnt', 'AdrBalUSD1MCnt']);
  const [activeSMAs, setActiveSMAs] = useState([]);

  const addressMetrics = useMemo(
    () => ({
      'AdrBal1in100KCnt': { label: 'Addresses ≥ 100,000 BTC', color: '#FF4500' },
      'AdrBal1in10KCnt': { label: 'Addresses ≥ 10,000 BTC', color: '#FFA500' },
      'AdrBal1in1KCnt': { label: 'Addresses ≥ 1,000 BTC', color: '#FFFF00' },
      'AdrBalNtv0.001Cnt': { label: 'Addresses ≥ 0.001 BTC', color: '#ADFF2F' },
      'AdrBalNtv0.01Cnt': { label: 'Addresses ≥ 0.01 BTC', color: '#00FF00' },
      'AdrBalNtv0.1Cnt': { label: 'Addresses ≥ 0.1 BTC', color: '#00CED1' },
      'AdrBalNtv1Cnt': { label: 'Addresses ≥ 1 BTC', color: '#1E90FF' },
      'AdrBalNtv10Cnt': { label: 'Addresses ≥ 10 BTC', color: '#9932CC' },
      'AdrBalNtv100Cnt': { label: 'Addresses ≥ 100 BTC', color: '#FF69B4' },
      'AdrBalUSD1Cnt': { label: 'Addresses ≥ $1', color: '#FFD700' },
      'AdrBalUSD10Cnt': { label: 'Addresses ≥ $10', color: '#FF6347' },
      'AdrBalUSD100Cnt': { label: 'Addresses ≥ $100', color: '#4682B4' },
      'AdrBalUSD1KCnt': { label: 'Addresses ≥ $1,000', color: '#9ACD32' },
      'AdrBalUSD10KCnt': { label: 'Addresses ≥ $10,000', color: '#20B2AA' },
      'AdrBalUSD100KCnt': { label: 'Addresses ≥ $100,000', color: '#BA55D3' },
      'AdrBalUSD1MCnt': { label: 'Addresses ≥ $1,000,000', color: '#F08080' },
    }),
    []
  );

  const smaIndicators = useMemo(
    () => ({
      sma50: { label: 'SMA 50', color: '#FF0000', period: 50 },
      sma100: { label: 'SMA 100', color: '#0000FF', period: 100 },
      sma200: { label: 'SMA 200', color: '#008000', period: 200 },
    }),
    []
  );

  const calculateSMA = useCallback((data, period) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1 || data[i] === null) {
        sma.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        if (slice.some((val) => val === null)) {
          sma.push(null);
        } else {
          const avg = slice.reduce((sum, val) => sum + val, 0) / period;
          sma.push(avg);
        }
      }
    }
    return sma;
  }, []);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Address Balances Over Time',
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.grey[100] },
    xaxis: { title: '', autorange: true, tickcolor: colors.grey[100], gridcolor: colors.grey[500] },
    yaxis: {
      title: 'Number of Addresses',
      type: 'log',
      autorange: true,
      tickcolor: colors.grey[100],
      gridcolor: colors.grey[500],
      tickformat: ',.0f',
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
    hoverlabel: { bgcolor: colors.grey[700], font: { color: colors.grey[100] } },
  });

  const datasets = useMemo(() => {
    if (!onchainMetricsData || onchainMetricsData.length === 0) {
      console.log('No onchainMetricsData available for datasets');
      return [];
    }

    const metricTraces = activeMetrics.map((metric) => ({
      x: onchainMetricsData.map((d) => d.time),
      y: onchainMetricsData.map((d) => d[metric]),
      type: 'scattergl',
      mode: 'lines',
      line: { color: addressMetrics[metric].color, width: 2 },
      name: addressMetrics[metric].label,
      visible: true,
      hovertemplate: `<b>${addressMetrics[metric].label}</b>: %{y:,.0f}<br><extra></extra>`,
    }));

    const smaTraces = activeSMAs
      .map((smaKey) => {
        const { period, color, label } = smaIndicators[smaKey];
        return activeMetrics.map((metric) => {
          const smaValues = calculateSMA(onchainMetricsData.map((d) => d[metric]), period);
          return {
            x: onchainMetricsData.map((d) => d.time),
            y: smaValues,
            type: 'scattergl',
            mode: 'lines',
            line: { color: color, width: 1, dash: 'dash' },
            name: `${label} (${addressMetrics[metric].label})`,
            visible: true,
            hovertemplate: `<b>${label}</b>: %{y:,.2f}<br><extra></extra>`,
          };
        });
      })
      .flat();

    return [...metricTraces, ...smaTraces];
  }, [onchainMetricsData, activeMetrics, activeSMAs, addressMetrics, calculateSMA, colors]);

  useEffect(() => {
    const fetchData = async () => {
      if (onchainMetricsData.length > 0) {
        console.log(`Using cached data: ${onchainMetricsData.length} records`);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching address metrics data');
        await fetchOnchainMetricsData();
        if (onchainFetchError) {
          throw new Error(onchainFetchError);
        }
      } catch (err) {
        console.error('Error fetching address metrics:', err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchOnchainMetricsData, onchainMetricsData, onchainFetchError]);

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.grey[100] },
      xaxis: { ...prev.xaxis, tickcolor: colors.grey[100], gridcolor: colors.grey[500] },
      yaxis: {
        ...prev.yaxis,
        type: scaleMode === 1 ? 'log' : 'linear',
        tickcolor: colors.grey[100],
        gridcolor: colors.grey[500],
      },
    }));
  }, [colors, scaleMode]);

  const handleMetricChange = useCallback(
    (event) => {
      const selected = event.target.value;
      console.log(`Metric selection changed to: ${selected.join(', ')}`);
      setActiveMetrics(selected);
    },
    []
  );

  const handleSMAChange = useCallback((event) => {
    console.log(`SMA selection changed to: ${event.target.value.join(', ')}`);
    setActiveSMAs(event.target.value);
  }, []);

  const toggleScaleMode = useCallback(() => {
    setScaleMode((prev) => {
      console.log(`Scale mode toggled to: ${prev === 1 ? 'Linear' : 'Logarithmic'}`);
      return prev === 1 ? 0 : 1;
    });
  }, []);

  const setInteractivity = useCallback(() => {
    setIsInteractive((prev) => {
      console.log(`Interactivity set to: ${!prev}`);
      return !prev;
    });
  }, []);

  const resetChartView = useCallback(() => {
    console.log('Resetting chart view');
    setLayout((prev) => ({
      ...prev,
      xaxis: { ...prev.xaxis, autorange: true },
      yaxis: { ...prev.yaxis, autorange: true },
    }));
  }, []);

  const handleRelayout = useCallback((event) => {
    if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
      console.log('Chart relayout:', event);
      setLayout((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
          autorange: false,
        },
        yaxis: {
          ...prev.yaxis,
          range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
          autorange: false,
        },
      }));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing data');
    setIsLoading(true);
    refreshOnchainMetricsData().finally(() => setIsLoading(false));
  }, [refreshOnchainMetricsData]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
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
              multiple
              value={activeMetrics}
              onChange={handleMetricChange}
              labelId="metrics-label"
              label="Address Metrics"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((key) => addressMetrics[key].label).join(', ')
                  : 'Select Metrics'
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
                  <Checkbox
                    checked={activeMetrics.includes(key)}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="sma-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Moving Averages
            </InputLabel>
            <Select
              multiple
              value={activeSMAs}
              onChange={handleSMAChange}
              labelId="sma-label"
              label="Moving Averages"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((key) => smaIndicators[key].label).join(', ')
                  : 'Select Moving Averages'
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
              {Object.entries(smaIndicators).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  <Checkbox
                    checked={activeSMAs.includes(key)}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
            <button onClick={resetChartView} className="button-reset">
              Reset Chart
            </button>
            <button onClick={handleRefresh} className="button-reset extra-margin">
              Refresh Data
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
          position: 'relative',
          zIndex: 1,
        }}
        onDoubleClick={() => setInteractivity(!isInteractive)}
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
          {!isDashboard && <div>Active Metrics</div>}
          {activeMetrics.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: addressMetrics[key].color,
                  marginRight: '5px',
                }}
              />
              {addressMetrics[key].label}
            </div>
          ))}
          {activeSMAs.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: smaIndicators[key].color,
                  marginRight: '5px',
                }}
              />
              {smaIndicators[key].label}
            </div>
          ))}
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
            <LastUpdated storageKey="onchainMetricsData" />
            <BitcoinFees />
          </Box>
        </div>
      )}
      {!isDashboard && (
        <p className="chart-info" style={{ marginTop: '10px', textAlign: 'left', width: '100%' }}>
          This chart displays the number of Bitcoin addresses holding various levels of Bitcoin (in BTC) or equivalent USD value over time.
          Metrics like "Addresses ≥ 1 BTC" or "Addresses ≥ $1,000,000" show the distribution of Bitcoin wealth among holders.
          Data is sourced from the Coin Metrics Community API, providing insights into Bitcoin’s adoption and holder behavior.
          <br />
          Source: <a href="https://coinmetrics.io/community-network-data/">Coin Metrics Community API</a>
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinAddressBalancesChart);