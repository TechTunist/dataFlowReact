import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import '../styling/bitcoinChart.css';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import Plotly from 'plotly.js-gl2d-dist';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';

// Helper functions for moving averages
const calculateSMA = (data, period) => {
  const result = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    if (slice.every(val => val != null && !isNaN(val))) {
      const avg = slice.reduce((sum, val) => sum + val, 0) / period;
      result[i] = avg;
    }
  }
  // console.log('SMA Input:', data);
  // console.log('SMA Values:', result);
  return result;
};

const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const result = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (i === 0 && data[i] != null && !isNaN(data[i])) {
      result[0] = data[0]; // Initialize with first valid value
    } else if (data[i] != null && !isNaN(data[i]) && result[i - 1] != null) {
      result[i] = data[i] * k + result[i - 1] * (1 - k);
    }
  }
  console.log('EMA Input:', data);
  console.log('EMA Values:', result);
  return result;
};

const FearAndGreedChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData, fetchBtcData, fearAndGreedData, fetchFearAndGreedData } = useContext(DataContext);
  const plotRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('scatter');
  const [smoothing, setSmoothing] = useState('none');
  const [smoothingPeriod, setSmoothingPeriod] = useState(7);
  const [layoutState, setLayoutState] = useState({});

  // Base layout (initial state)
  const baseLayout = useMemo(() => ({
    title: isDashboard ? '' : 'Bitcoin Price vs. Fear and Greed Index',
    autosize: true,
    margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: '', autorange: true },
    yaxis: { title: 'Price (USD)', type: 'log', autorange: true },
    ...(viewMode === 'line' && {
      yaxis2: {
        title: 'Fear and Greed Index',
        range: [0, 100],
        overlaying: 'y',
        side: 'right',
        autorange: false,
        tickfont: { color: colors.greenAccent[500] },
      },
    }),
    showlegend: !isDashboard,
    legend: !isDashboard
      ? {
          title: { text: isMobile ? '' : viewMode === 'scatter' ? 'Select Risk Bands' : 'Legend' },
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.2,
          yanchor: 'top',
        }
      : {},
    hovermode: 'closest',
  }), [colors, isDashboard, isMobile, viewMode]);

  // Combined layout with state overrides
  const layout = useMemo(() => ({ ...baseLayout, ...layoutState }), [baseLayout, layoutState]);

  const getColor = (classification) => {
    switch (classification) {
      case 'Extreme Fear': return '#FF4500';
      case 'Fear': return '#FFA500';
      case 'Neutral': return '#FFFF00';
      case 'Greed': return '#ADFF2F';
      case 'Extreme Greed': return '#00FF00';
      default: return '#D3D3D3';
    }
  };

  // Memoized datasets
  const datasets = useMemo(() => {
    if (btcData.length === 0 || fearAndGreedData.length === 0) return [];

    const startDate = new Date('2018-02-01');
    const btcFormattedData = btcData.filter(item => new Date(item.time) >= startDate);
    const fearGreedMap = {};
    fearAndGreedData.forEach(item => {
      const date = new Date(item.timestamp * 1000).toISOString().slice(0, 10);
      const value = Number(item.value);
      if (!isNaN(value)) {
        fearGreedMap[date] = { value, classification: item.value_classification };
      }
    });

    const btcPriceLine = {
      x: btcFormattedData.map(d => d.time),
      y: btcFormattedData.map(d => d.value),
      type: 'scattergl',
      mode: 'lines',
      line: { color: 'grey', width: 1.5 },
      name: 'Bitcoin Price',
      yaxis: 'y1',
      visible: true,
      hoverinfo: viewMode === 'scatter' ? 'skip' : undefined,
      hovertemplate: viewMode === 'line' ? `<b>Price:</b> $%{y:,.0f}<br><b>Date:</b> %{x|%B %d, %Y}<extra></extra>` : undefined,
      hoverlabel: viewMode === 'line' ? {
        bgcolor: colors.grey[700],
        font: { color: '#FFFFFF' },
        bordercolor: '#FFFFFF',
        align: 'left',
        namelength: -1,
      } : undefined,
    };

    if (viewMode === 'scatter') {
      const fearGreedGroups = {};
      fearAndGreedData.forEach(item => {
        const date = new Date(item.timestamp * 1000).toISOString().slice(0, 10);
        const classification = item.value_classification;
        if (!fearGreedGroups[classification]) fearGreedGroups[classification] = [];
        fearGreedGroups[classification].push({
          time: date,
          value: Number(item.value),
          btcPrice: btcFormattedData.find(btc => btc.time === date)?.value || null,
        });
      });

      const classificationOrder = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
      const fearGreedDataset = Object.keys(fearGreedGroups)
        .sort((a, b) => classificationOrder.indexOf(a) - classificationOrder.indexOf(b))
        .map(classification => ({
          x: fearGreedGroups[classification].map(d => d.time),
          y: fearGreedGroups[classification].map(d => d.btcPrice),
          customdata: fearGreedGroups[classification].map(d => [d.value]),
          type: 'scattergl',
          mode: 'markers',
          marker: { size: 6, color: getColor(classification) },
          name: classification,
          yaxis: 'y1',
          visible: true,
          hovertemplate:
            `<b>Classification:</b> ${classification}<br>` +
            `<b>Value:</b> %{customdata[0]}<br>` +
            `<b>Price:</b> $%{y:,.0f}<br>` +
            `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
          hoverlabel: {
            bgcolor: getColor(classification),
            font: { color: '#000000' },
            bordercolor: '#FFFFFF',
            align: 'left',
            namelength: -1,
          },
        }));

      const btcPriceTooltipGroups = {};
      btcFormattedData.forEach(item => {
        const classification = fearGreedMap[item.time]?.classification || 'Unknown';
        if (!btcPriceTooltipGroups[classification]) btcPriceTooltipGroups[classification] = [];
        btcPriceTooltipGroups[classification].push({
          time: item.time,
          value: item.value,
          fgValue: fearGreedMap[item.time]?.value || null,
          fgClassification: classification === 'Unknown' ? null : classification,
        });
      });

      const btcPriceTooltipDatasets = Object.keys(btcPriceTooltipGroups)
        .sort((a, b) => classificationOrder.indexOf(a) - classificationOrder.indexOf(b))
        .map(classification => ({
          x: btcPriceTooltipGroups[classification].map(d => d.time),
          y: btcPriceTooltipGroups[classification].map(d => d.value),
          customdata: btcPriceTooltipGroups[classification].map(d => [d.fgValue, d.fgClassification]),
          type: 'scattergl',
          mode: 'none',
          name: classification,
          showlegend: false,
          yaxis: 'y1',
          visible: true,
          hovertemplate:
            `<b>Classification:</b> ${classification === 'Unknown' ? 'N/A' : classification}<br>` +
            `<b>Value:</b> ${classification === 'Unknown' ? 'N/A' : '%{customdata[0]}'}<br>` +
            `<b>Price:</b> $%{y:,.0f}<br>` +
            `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
          hoverlabel: {
            bgcolor: classification === 'Unknown' ? '#D3D3D3' : getColor(classification),
            font: { color: '#000000' },
            bordercolor: '#FFFFFF',
            align: 'left',
            namelength: -1,
          },
        }));

      return [btcPriceLine, ...btcPriceTooltipDatasets, ...fearGreedDataset];
    } else {
      const fgData = btcFormattedData
        .map(item => ({
          time: item.time,
          value: fearGreedMap[item.time]?.value ?? null,
        }))
        .filter(d => d.value != null && !isNaN(d.value));

      console.log('fgData:', fgData);

      let fgValues = fgData.map(d => d.value);
      let traceName = 'Fear and Greed Index';
      if (smoothing === 'sma') {
        fgValues = calculateSMA(fgValues, smoothingPeriod);
        traceName = `Fear and Greed (SMA ${smoothingPeriod})`;
      } else if (smoothing === 'ema') {
        fgValues = calculateEMA(fgValues, smoothingPeriod);
        traceName = `Fear and Greed (EMA ${smoothingPeriod})`;
      }

      const fgLine = {
        x: fgData.map(d => d.time),
        y: fgValues,
        type: 'scattergl',
        mode: 'lines',
        line: { color: colors.greenAccent[500], width: 1.5 },
        name: traceName,
        yaxis: 'y2',
        visible: true,
        hovertemplate:
          `<b>${traceName}:</b> %{y:.0f}<br>` +
          `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`,
        hoverlabel: {
          bgcolor: colors.greenAccent[700],
          font: { color: '#FFFFFF' },
          bordercolor: '#FFFFFF',
          align: 'left',
          namelength: -1,
        },
      };

      return [btcPriceLine, fgLine];
    }
  }, [btcData, fearAndGreedData, viewMode, smoothing, smoothingPeriod, colors]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (btcData.length > 0 && fearAndGreedData.length > 0) return;
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          btcData.length === 0 && fetchBtcData(),
          fearAndGreedData.length === 0 && fetchFearAndGreedData(),
        ]);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData, fetchFearAndGreedData, btcData.length, fearAndGreedData.length]);

  const resetChartView = useCallback(() => {
    setLayoutState({
      xaxis: { ...baseLayout.xaxis, autorange: true },
      yaxis: { ...baseLayout.yaxis, autorange: true },
      ...(viewMode === 'line' && {
        yaxis2: { ...baseLayout.yaxis2, autorange: false, range: [0, 100] },
      }),
    });
  }, [baseLayout, viewMode]);

  const handleRelayout = useCallback((event) => {
    console.log('Relayout Event:', event);
    const update = {};
    if (event['xaxis.autorange']) {
      update.xaxis = { ...baseLayout.xaxis, autorange: true };
    } else if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
      update.xaxis = { ...baseLayout.xaxis, range: [event['xaxis.range[0]'], event['xaxis.range[1]']], autorange: false };
    }
    if (event['yaxis.autorange']) {
      update.yaxis = { ...baseLayout.yaxis, autorange: true };
    } else if (event['yaxis.range[0]'] && event['yaxis.range[1]']) {
      update.yaxis = { ...baseLayout.yaxis, range: [event['yaxis.range[0]'], event['yaxis.range[1]']], autorange: false };
    }
    if (viewMode === 'line') {
      if (event['yaxis2.autorange']) {
        update.yaxis2 = { ...baseLayout.yaxis2, autorange: false, range: [0, 100] };
      } else if (event['yaxis2.range[0]'] && event['yaxis2.range[1]']) {
        update.yaxis2 = { ...baseLayout.yaxis2, range: [event['yaxis2.range[0]'], event['yaxis2.range[1]']], autorange: false };
      }
    }
    if (Object.keys(update).length > 0) {
      setLayoutState(update);
    }
  }, [baseLayout, viewMode]);

  const toggleDataset = useCallback((index) => {
    if (plotRef.current?.el) {
      const visibility = datasets[index].visible ? 'legendonly' : true;
      Plotly.restyle(plotRef.current.el, { visible: visibility }, [index]);
      datasets[index].visible = !datasets[index].visible;
    }
  }, [datasets]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '10px',
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="view-mode-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              View Mode
            </InputLabel>
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              label="View Mode"
              labelId="view-mode-label"
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
              <MenuItem value="scatter">Scatter View</MenuItem>
              <MenuItem value="line">Line View</MenuItem>
            </Select>
          </FormControl>
          {viewMode === 'line' && (
            <>
              <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '150px' } }}>
                <InputLabel
                  id="smoothing-label"
                  shrink
                  sx={{
                    color: colors.grey[100],
                    '&.Mui-focused': { color: colors.greenAccent[500] },
                    top: 0,
                    '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                  }}
                >
                  Smoothing
                </InputLabel>
                <Select
                  value={smoothing}
                  onChange={(e) => setSmoothing(e.target.value)}
                  label="Smoothing"
                  labelId="smoothing-label"
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
                  <MenuItem value="none">No Smoothing</MenuItem>
                  <MenuItem value="sma">SMA</MenuItem>
                  <MenuItem value="ema">EMA</MenuItem>
                </Select>
              </FormControl>
              {(smoothing === 'sma' || smoothing === 'ema') && (
                <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '150px' } }}>
                  <InputLabel
                    id="period-label"
                    shrink
                    sx={{
                      color: colors.grey[100],
                      '&.Mui-focused': { color: colors.greenAccent[500] },
                      top: 0,
                      '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
                    }}
                  >
                    Period
                  </InputLabel>
                  <Select
                    value={smoothingPeriod}
                    onChange={(e) => setSmoothingPeriod(Number(e.target.value))}
                    label="Period"
                    labelId="period-label"
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
                    <MenuItem value={7}>7 Days</MenuItem>
                    <MenuItem value={14}>14 Days</MenuItem>
                    <MenuItem value={30}>30 Days</MenuItem>
                    <MenuItem value={90}>90 Days</MenuItem>
                    <MenuItem value={180}>180 Days</MenuItem>
                    <MenuItem value={365}>1 Year</MenuItem>
                  </Select>
                </FormControl>
              )}
            </>
          )}
          <Button
            onClick={resetChartView}
            sx={{
              backgroundColor: colors.primary[500],
              color: colors.grey[100],
              border: `1px solid ${colors.grey[300]}`,
              borderRadius: '8px',
              padding: '8px 16px',
              '&:hover': { backgroundColor: colors.primary[600], borderColor: colors.greenAccent[500] },
            }}
          >
            Reset Chart
          </Button>
        </Box>
      )}

      {!isDashboard && (
        <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="risk-filter">
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{ height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}
      >
        <Plot
          ref={plotRef}
          data={datasets}
          layout={layout}
          config={{ staticPlot: isDashboard, displayModeBar: false, responsive: true }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
          plotly={Plotly}
        />
      </div>

      <div className="under-chart">
        {!isDashboard && btcData.length > 0 && (
          <LastUpdated customDate={btcData[btcData.length - 1].time} />
        )}
        
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <p className="chart-info" style={{ marginTop: '10px', textAlign: 'left', width: '100%' }}>
          <b>Data only available starting from February 2018.</b>
          <br /><br />
          The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data,
          including surveys, social media, volatility, market momentum, and volume among others. This chart plots the fear and
          greed indicator over the corresponding bitcoin price.
          <br /> The information for this chart has been obtained from this source:
          <a href="https://alternative.me/crypto/fear-and-greed-index/">
            https://alternative.me/crypto/fear-and-greed-index/
          </a>
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(FearAndGreedChart);