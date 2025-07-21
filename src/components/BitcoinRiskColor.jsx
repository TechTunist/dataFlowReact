import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

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

const BitcoinRiskColor = ({ isDashboard = false, riskData: propRiskData }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const { btcData, fetchBtcData, altcoinData, fetchAltcoinData } = useContext(DataContext);
  const plotRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState('BTC');

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
    return chartSourceData.length > 0 ? calculateRiskMetric(chartSourceData) : [];
  }, [chartSourceData]);

  const currentRisk = chartData.length > 0 ? chartData[chartData.length - 1].Risk : null;

  const [layout, setLayout] = useState({
    title: `${selectedAssetLabel} Price vs. Risk Level`,
    autosize: true,
    margin: { l: 60, r: 50, b: 30, t: 30, pad: 4 },
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
    legend: {
      title: { text: 'Select Risk Bands' },
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.2,
      yanchor: 'top',
    },
  });

  const [datasets, setDatasets] = useState(
    Array.from({ length: 10 }, (_, index) => ({
      data: [],
      visible: true,
      label: `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`,
    }))
  );

  useEffect(() => {
    if (selectedAsset === 'BTC') {
      fetchBtcData();
    } else {
      fetchAltcoinData(selectedAsset);
    }
  }, [selectedAsset, fetchBtcData, fetchAltcoinData]);

  useEffect(() => {
    if (chartData.length === 0) return;

    const updateDatasets = (data) => {
      const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
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

      newDatasets.push({
        x: data.map(d => d.time),
        y: data.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        line: {
          color: 'grey',
          width: 1.5,
        },
        name: `${selectedAssetLabel} Price`,
        visible: true,
      });

      setDatasets(newDatasets);
    };

    updateDatasets(chartData);
  }, [chartData, theme, selectedAssetLabel]);

  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      margin: { l: 60, r: 50, b: 30, t: 30, pad: 4 },
      title: isDashboard ? '' : `${selectedAssetLabel} Price vs. Risk Level`,
      yaxis: {
        ...prevLayout.yaxis,
        title: {
          text: 'Price ($)',
          font: { color: colors.primary[100], size: 14 },
          standoff: 5,
        },
        automargin: true,
      },
    }));
  }, [colors, selectedAssetLabel, isDashboard]);

  const resetChartView = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
    }));
    setDatasets(prevDatasets =>
      prevDatasets.map(dataset => ({ ...dataset, visible: true }))
    );
  };

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

  const handleLegendDoubleClick = (event) => {
    const curveNumber = event.curveNumber;
    setDatasets(prevDatasets => {
      const newDatasets = prevDatasets.map((dataset, index) => {
        if (curveNumber >= 0 && curveNumber < 10) {
          if (index === curveNumber || index === 10) {
            return { ...dataset, visible: true };
          } else {
            return { ...dataset, visible: false };
          }
        } else if (curveNumber === 10) {
          if (index === 10) {
            return { ...dataset, visible: !dataset.visible };
          } else {
            return dataset;
          }
        }
        return dataset;
      });
      return newDatasets;
    });
    return false;
  };

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

  const handleAssetChange = (event) => {
    setSelectedAsset(event.target.value);
    setDatasets(
      Array.from({ length: 10 }, (_, index) => ({
        data: [],
        visible: true,
        label: `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`,
      }))
    );
    resetChartView(); // Reset the chart view when a new asset is selected
  };

  return (
  <div style={{ height: '100%' }}>
    {!isDashboard && (
      <div className="chart-top-div"
          style={{
            paddingTop: '30px',
            paddingBottom: '30px'
          }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'space-between' },
            gap: '20px',
            marginTop: '30px', // Buffer above the dropdown
            marginBottom: '20px', // Buffer below the dropdown
            width: '100%',
            padding: '0 0px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
          <InputLabel
                id="asset-label"
                shrink
                sx={{
                  color: colors.grey[100],
                  '&.Mui-focused': { color: colors.greenAccent[500] },
                  top: 0,
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)',
                  },
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
                  color: '#selectedColor: colors.grey[100]',
                  backgroundColor: '#bcolors.primary[500]',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  '& .MuiSelect-select': { py: 1.5, pl: 2 },
                  '& .MuiSelect-select:empty': { color: colors.grey[500] },
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
              }}
            >
              Reset Chart
            </button>
          </Box>
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
            visible: dataset.visible ? true : 'legendonly',
          }))}
          layout={{
            ...layout,
            title: isDashboard ? '' : `${selectedAssetLabel} Price vs. Risk Level`,
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
          onLegendDoubleClick={handleLegendDoubleClick}
        />
      </div>

      <div className='under-chart'>
        {!isDashboard && <LastUpdated storageKey={`${selectedAsset.toLowerCase()}Data`} />}
        {!isDashboard && selectedAsset === 'BTC' && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <p
          className='current-risk'
          style={{
            fontSize: '1.3rem',
            color: colors.primary[100],
            display: 'block',
            marginTop: '5px',
          }}
        >
          Current Risk: {currentRisk !== null ? currentRisk.toFixed(2) : 'Loading...'}
        </p>
      )}

      {!isDashboard && (
        <div>
          <p className='chart-info'>
            The risk metric assesses {selectedAssetLabel}'s investment risk over time by comparing its daily prices to a 374-day moving average.
            It does so by calculating the normalized logarithmic difference between the price and the moving average,
            producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
            This method provides a simplified view of when it might be riskier or safer to invest in {selectedAssetLabel} based on historical price movements.
            <br />
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinRiskColor);