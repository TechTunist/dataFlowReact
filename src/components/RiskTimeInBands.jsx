import React, { useEffect, useState, useContext, useMemo, useCallback, memo } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, useMediaQuery } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import ChartInfoSections from './ChartInfoSections';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { calculateRiskMetric } from '../utility/riskMetric';

const altcoins = [
  { label: 'Ethereum', value: 'ETH' },
  { label: 'Solana', value: 'SOL' },
  { label: 'Cardano', value: 'ADA' },
  { label: 'Dogecoin', value: 'DOGE' },
  { label: 'Chainlink', value: 'LINK' },
  { label: 'XRP', value: 'XRP' },
  { label: 'Avalanche', value: 'AVAX' },
  { label: 'Toncoin', value: 'TON' },
  { label: 'Binance-Coin', value: 'BNB' },
  { label: 'Aave', value: 'AAVE' },
  { label: 'Cronos', value: 'CRO' },
  { label: 'Sui', value: 'SUI' },
  { label: 'Hedera', value: 'HBAR' },
  { label: 'Stellar', value: 'XLM' },
  { label: 'Aptos', value: 'APT' },
  { label: 'Polkadot', value: 'DOT' },
  { label: 'VeChain', value: 'VET' },
  { label: 'Uniswap', value: 'UNI' },
  { label: 'Litecoin', value: 'LTC' },
  { label: 'Leo Utility Token', value: 'LEO' },
  { label: 'Hyperliquid', value: 'HYPE' },
  { label: 'Near Protocol', value: 'NEAR' },
  { label: 'Fetch.ai', value: 'FET' },
  { label: 'Ondo Finance', value: 'ONDO' },
  { label: 'Internet Computer', value: 'ICP' },
  { label: 'Monero', value: 'XMR' },
  { label: 'Polygon', value: 'POL' },
  { label: 'Algorand', value: 'ALGO' },
  { label: 'Render', value: 'RENDER' },
  { label: 'Arbitrum', value: 'ARB' },
  { label: 'Raydium', value: 'RAY' },
  { label: 'Move', value: 'MOVE' },
];

const AssetRiskBandDuration = ({ isDashboard = false, riskData: propRiskData }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData: contextBtcData, fetchBtcData, altcoinData: contextAltcoinData, fetchAltcoinData } = useContext(DataContext);

  // Memoize raw data for stable references (resilience to DataContext array/object churn)
  const btcData = useMemo(() => contextBtcData || [], [contextBtcData]);
  const altcoinData = useMemo(() => contextAltcoinData || {}, [contextAltcoinData]);

  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [riskBandDurations, setRiskBandDurations] = useState([]);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [riskBandMode, setRiskBandMode] = useState('0.1'); // Default to 0.1 increments
  const isNarrowScreen = useMediaQuery('(max-width:600px)');

  // Get the label for the selected asset
  const selectedAssetLabel = useMemo(() => {
    if (selectedAsset === 'BTC') return 'Bitcoin';
    const altcoin = altcoins.find(coin => coin.value === selectedAsset);
    return altcoin ? altcoin.label : 'Bitcoin';
  }, [selectedAsset]);

  // Determine the data to use based on the selected asset
  const chartSourceData = useMemo(() => {
    if (propRiskData) return propRiskData;
    if (selectedAsset === 'BTC') return btcData;
    return altcoinData[selectedAsset] || [];
  }, [propRiskData, selectedAsset, btcData, altcoinData]);

  const chartData = useMemo(() => {
    const formattedData = chartSourceData.map(item => ({
      time: new Date(item.time),
      value: parseFloat(item.value),
    }));
    return propRiskData || (formattedData.length > 0 ? calculateRiskMetric(formattedData) : []);
  }, [propRiskData, chartSourceData]);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : `${selectedAssetLabel} Price Risk Band Durations`,
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: isDashboard || isMobile ? '' : 'Risk Bands', autorange: true },
    yaxis: {
      title: 'Percentage',
      autorange: true,
      automargin: true,
    },
    showlegend: false,
  });

  const calculateRiskBandDurations = useCallback((data, bandSize) => {
    const numBands = Math.ceil(1.0 / bandSize);
    const bandCounts = Array(numBands).fill(0);
    for (let i = 0; i < data.length; i++) {
      const risk = data[i].Risk;
      const bandIndex = Math.min(Math.floor(risk / bandSize), numBands - 1);
      bandCounts[bandIndex]++;
    }
    const totalDays = bandCounts.reduce((sum, count) => sum + count, 0);
    return bandCounts.map((count, index) => {
      const bandStart = (index * bandSize).toFixed(2);
      const bandEnd = Math.min((index + 1) * bandSize, 1.0).toFixed(2);
      return {
        band: `${bandStart} - ${bandEnd}`,
        percentage: (count / totalDays * 100).toFixed(2),
        days: count,
      };
    });
  }, []);

  useEffect(() => {
    if (selectedAsset === 'BTC') {
      fetchBtcData();
    } else {
      fetchAltcoinData(selectedAsset);
    }
  }, [selectedAsset, fetchBtcData, fetchAltcoinData]);

  useEffect(() => {
    if (chartData.length === 0) return;
    const bandSize = parseFloat(riskBandMode);
    const durations = calculateRiskBandDurations(chartData, bandSize);
    setRiskBandDurations(durations);
    setCurrentRiskLevel(chartData[chartData.length - 1].Risk.toFixed(2));
  }, [chartData, riskBandMode]);

  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      title: isDashboard ? '' : `${selectedAssetLabel} Price Risk Band Durations`,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      xaxis: { 
        ...prevLayout.xaxis, 
        title: isDashboard || isMobile ? '' : 'Risk Bands',
        tickfont: {
          size: isNarrowScreen ? 8 : 12,
        },
      },
      yaxis: {
        ...prevLayout.yaxis,
        title: {
          text: 'Percentage',
          font: { color: colors.primary[100], size: 12 },
          standoff: 5,
        },
        automargin: true,
      },
    }));
  }, [colors, isDashboard, isMobile, selectedAssetLabel, isNarrowScreen]);

  const resetChartView = useCallback(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
    }));
  }, []);

  const handleRelayout = useCallback((event) => {
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
  }, []);

  const handleRiskBandModeChange = useCallback((event) => {
    setRiskBandMode(event.target.value);
  }, []);

  const handleAssetChange = useCallback((event) => {
    setSelectedAsset(event.target.value);
    resetChartView();
  }, [resetChartView]);

  const getBandColor = useCallback((index, numBands) => {
    const midPoint = Math.floor(numBands / 2);
    const blueShades = [colors.redAccent[100], colors.redAccent[300], colors.redAccent[500], colors.redAccent[700], colors.redAccent[800]];
    const redShades = [colors.blueAccent[800], colors.blueAccent[700], colors.blueAccent[500], colors.blueAccent[300], colors.blueAccent[100]];
    const maxShades = Math.min(redShades.length, blueShades.length);
    if (index === midPoint && numBands % 2 === 1) {
      return colors.grey[100]; // Near-white for odd-numbered midpoint
    }
    if (index < midPoint) {
      // Red side
      const shadeIndex = Math.floor((index / midPoint) * maxShades);
      return redShades[Math.min(shadeIndex, redShades.length - 1)];
    } else {
      // Blue side
      const adjustedIndex = index - (numBands % 2 === 1 ? midPoint + 1 : midPoint);
      const shadeIndex = Math.floor((adjustedIndex / (numBands - midPoint)) * maxShades);
      return blueShades[Math.min(shadeIndex, blueShades.length - 1)];
    }
  }, [colors]);

  // Memoize the Plotly bar trace data (derived from state but stable ref when inputs unchanged)
  // This reduces re-render work for the heavy Plotly component.
  const plotData = useMemo(() => ([
    {
      type: 'bar',
      x: riskBandDurations.map(risk => risk.band),
      y: riskBandDurations.map(risk => parseFloat(risk.percentage)),
      hoverinfo: 'text+x',
      hovertemplate: 'Risk Band: %{x}<br>Time in: %{y}%<br>Total Days: %{customdata} days<extra></extra>',
      customdata: riskBandDurations.map(risk => risk.days),
      marker: {
        color: riskBandDurations.map((risk, index) => {
          if (currentRiskLevel !== null && risk.band === currentRiskLevel) {
            return "#31d6aa";
          }
          return getBandColor(index, riskBandDurations.length);
        }),
      },
    },
  ]), [riskBandDurations, currentRiskLevel, getBandColor]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {!isDashboard && (
        <>
          {isNarrowScreen ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                marginTop: '30px',
                marginBottom: '20px',
                padding: '0 20px',
                width: '100%',
              }}
            >
              <FormControl sx={{ minWidth: '200px', width: '100%' }}>
                <InputLabel
                  id="asset-label"
                  sx={{
                    color: colors.grey[100],
                    '&.Mui-focused': { color: colors.greenAccent[500] },
                  }}
                >
                  Asset
                </InputLabel>
                <Select
                  value={selectedAsset}
                  onChange={handleAssetChange}
                  label="Asset"
                  labelId="asset-label"
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
                  <MenuItem value="BTC">Bitcoin</MenuItem>
                  {altcoins.map((coin) => (
                    <MenuItem key={coin.value} value={coin.value}>
                      {coin.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '20px',
                  width: '100%',
                }}
              >
                <FormControl sx={{ minWidth: '200px', flex: 2 }}>
                  <InputLabel
                    id="risk-band-mode-label"
                    sx={{
                      color: colors.grey[100],
                      '&.Mui-focused': { color: colors.greenAccent[500] },
                    }}
                  >
                    Risk Band Size
                  </InputLabel>
                  <Select
                    value={riskBandMode}
                    onChange={handleRiskBandModeChange}
                    labelId="risk-band-mode-label"
                    label="Risk Band Size"
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
                    <MenuItem value="0.05">0.05 (Half Bands)</MenuItem>
                    <MenuItem value="0.1">0.1 (Single Bands)</MenuItem>
                    <MenuItem value="0.2">0.2 (Double Bands)</MenuItem>
                  </Select>
                </FormControl>
                <button
                  onClick={resetChartView}
                  className="button-reset"
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: '#31d6aa',
                    border: '1px solid #70d8bd',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Reset Chart
                </button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                marginTop: '30px',
                marginBottom: '20px',
                padding: '0 20px',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '20px',
                  flexShrink: 0,
                }}
              >
                <FormControl sx={{ minWidth: '200px', width: '200px' }}>
                  <InputLabel
                    id="asset-label"
                    sx={{
                      color: colors.grey[100],
                      '&.Mui-focused': { color: colors.greenAccent[500] },
                    }}
                  >
                    Asset
                  </InputLabel>
                  <Select
                    value={selectedAsset}
                    onChange={handleAssetChange}
                    label="Asset"
                    labelId="asset-label"
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
                    <MenuItem value="BTC">Bitcoin</MenuItem>
                    {altcoins.map((coin) => (
                      <MenuItem key={coin.value} value={coin.value}>
                        {coin.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: '200px', width: '200px' }}>
                  <InputLabel
                    id="risk-band-mode-label"
                    sx={{
                      color: colors.grey[100],
                      '&.Mui-focused': { color: colors.greenAccent[500] },
                    }}
                  >
                    Risk Band Size
                  </InputLabel>
                  <Select
                    value={riskBandMode}
                    onChange={handleRiskBandModeChange}
                    labelId="risk-band-mode-label"
                    label="Risk Band Size"
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
                    <MenuItem value="0.05">0.05 (Half Bands)</MenuItem>
                    <MenuItem value="0.1">0.1 (Single Bands)</MenuItem>
                    <MenuItem value="0.2">0.2 (Double Bands)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <button onClick={resetChartView} className="button-reset extra-margin">
                Reset Chart
              </button>
            </Box>
          )}
        </>
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
          data={plotData}
          layout={layout}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          onRelayout={handleRelayout}
        />
      </div>
      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey={`${selectedAsset.toLowerCase()}Data`} />}
        {!isDashboard && selectedAsset === 'BTC' && <BitcoinFees />}
      </UnderChartRow>
      {!isDashboard && (
        <UnderChartValue>
          <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
            Current Risk Level: <b style={{ color: colors.greenAccent[500] }}>{currentRiskLevel !== null ? currentRiskLevel : 'Loading...'}</b>
          </span>
        </UnderChartValue>
      )}
      {!isDashboard && (
        <div>
          <ChartInfoSections
            sections={[
              {
                title: 'What this chart shows',
                content: <>The total amount of time {selectedAssetLabel} has spent in each risk band over its entire existence, adjustable by risk band size (0.05, 0.1, or 0.2 increments). This helps to understand the distribution of time spent across different risk levels.</>,
              },
              {
                title: 'How it is built',
                content: <>The risk metric assesses {selectedAssetLabel}&apos;s investment risk over time by comparing its daily prices to a 374-day moving average, incorporating a factor that accounts for sustained periods above the moving average.</>,
              },
              {
                title: 'How to interpret',
                content: 'It calculates a normalized score between 0 and 1, where a higher score indicates higher risk, particularly after prolonged bull markets amplified by higher price levels. A lower score indicates lower risk.',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

const MemoizedAssetRiskBandDuration = memo(AssetRiskBandDuration);
export default MemoizedAssetRiskBandDuration;