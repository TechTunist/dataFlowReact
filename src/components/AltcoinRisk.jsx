import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { UnderChartRow, UnderChartValue } from './ChartUnderSection';
import { Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartInfoSections from './ChartInfoSections';

const AltcoinRisk = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [denominator, setDenominator] = useState('USD');
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAltcoinPrice, setCurrentAltcoinPrice] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const { altcoinData, fetchAltcoinData, btcData, fetchBtcData } = useContext(DataContext);

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

  const handleSelectChange = (event) => {
    setSelectedCoin(event.target.value);
  };

  const handleDenominatorChange = (event) => {
    setDenominator(event.target.value);
  };

  const setInteractivity = () => {
    setIsInteractive(!isInteractive);
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k';
    } else {
      return value.toFixed(2);
    }
  };

  const calculateRiskMetric = (data) => {
    const maWindow = Math.min(373, Math.floor(data.length / 2));
    const movingAverage = data.map((item, index) => {
      const start = Math.max(index - maWindow, 0);
      const subset = data.slice(start, index + 1);
      const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
      return { ...item, MA: avg };
    });
    let consecutiveDeclineDays = 0;
    movingAverage.forEach((item, index) => {
      const changeFactor = index ** 0.395;
      let preavg = (Math.log(item.value) - Math.log(item.MA)) * changeFactor;
      if (index > 0) {
        const previousItem = movingAverage[index - 1];
        const priceChange = item.value / previousItem.value;
        if (priceChange > 1.5) {
          const dampingFactor = 1 / priceChange;
          preavg *= dampingFactor;
          consecutiveDeclineDays = 0;
        }
        if (priceChange < 1) {
          consecutiveDeclineDays++;
          const declineFactor = Math.min(consecutiveDeclineDays / 30, 1);
          preavg *= (1 + declineFactor);
        } else {
          consecutiveDeclineDays = 0;
        }
      }
      item.Preavg = preavg;
    });
    const preavgValues = movingAverage.map(item => item.Preavg);
    const preavgMin = Math.min(...preavgValues);
    const preavgMax = Math.max(...preavgValues);
    const normalizedRisk = movingAverage.map(item => ({
      ...item,
      Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
    }));
    return normalizedRisk;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!altcoinData[selectedCoin]) {
          await fetchAltcoinData(selectedCoin);
        }
        if (denominator === 'BTC' && btcData.length === 0) {
          await fetchBtcData();
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${selectedCoin}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCoin, denominator, altcoinData, btcData, fetchAltcoinData, fetchBtcData]);

  useEffect(() => {
    if (altcoinData[selectedCoin] && altcoinData[selectedCoin].length > 0) {
      let baseData = altcoinData[selectedCoin];
      if (denominator === 'BTC' && btcData && btcData.length > 0) {
        const btcMap = new Map(btcData.map(item => [item.time, item.value]));
        baseData = altcoinData[selectedCoin]
          .map(altItem => {
            const btcPrice = btcMap.get(altItem.time);
            if (btcPrice) {
              return { time: altItem.time, value: altItem.value / btcPrice };
            }
            return null;
          })
          .filter(Boolean);
      }
      if (baseData.length > 0) {
        const withRiskMetric = calculateRiskMetric(baseData);
        setChartData(withRiskMetric);
      } else {
        setChartData([]);
      }
    } else {
      setChartData([]);
    }
  }, [altcoinData, selectedCoin, denominator, btcData]);

  useEffect(() => {
    if (chartData.length === 0) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: colors.greenAccent[700] },
        horzLines: { color: colors.greenAccent[700] },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.01, bottom: 0.01 },
        borderVisible: false,
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { minBarSpacing: 0.001 },
      handleScroll: isInteractive,
      handleScale: isInteractive,
    });
    const riskSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
    });
    riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));
    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: value => denominator === 'BTC' ? value.toFixed(8) : value.toFixed(2)
      },
    });
    priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));
    chart.priceScale('left').applyOptions({
      mode: 1,
      borderVisible: false,
      priceFormat: {
        type: 'custom',
        formatter: value => denominator === 'BTC' ? value.toFixed(8) : value.toFixed(2)
      },
    });
    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        chart.timeScale().fitContent();
      }
    };
    if (chartData.length > 0) {
      const price = denominator === 'BTC' ? chartData[chartData.length - 1].value.toFixed(8) : compactNumberFormatter(chartData[chartData.length - 1].value);
      setCurrentAltcoinPrice(price);
      try {
        const riskLevel = chartData[chartData.length - 1].Risk.toFixed(2);
        setCurrentRiskLevel(riskLevel);
      } catch (error) {
        console.error('Failed to set risk level:', error);
      }
    }
    window.addEventListener('resize', resizeChart);
    window.addEventListener('resize', resetChartView);
    resizeChart();
    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
      window.removeEventListener('resize', resetChartView);
    };
  }, [chartData, theme.palette.mode, isDashboard, colors, denominator, isInteractive]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '30px', marginTop: '30px' }}>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel id="altcoin-label" shrink sx={{ color: colors.grey[100], '&.Mui-focused': { color: colors.greenAccent[500] }, top: 0, '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' } }}>Altcoin</InputLabel>
            <Select
              value={selectedCoin}
              onChange={handleSelectChange}
              label="Altcoin"
              labelId='altcoin-label'
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 }
              }}
            >
              {altcoins.map((coin) => (
                <MenuItem key={coin.value} value={coin.value}>{coin.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel id="denominator-label" shrink sx={{ color: colors.grey[100], '&.Mui-focused': { color: colors.greenAccent[500] }, top: 0, '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' } }}>Denominator</InputLabel>
            <Select
              value={denominator}
              onChange={handleDenominatorChange}
              label="Denominator"
              labelId='denominator-label'
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 }
              }}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="BTC">BTC</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className='chart-top-div'>
          <div className='span-container'>
            <span style={{ marginRight: '20px', display: 'inline-block' }}><span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>Altcoin Price {denominator === 'BTC' ? '(BTC)' : '(USD)'}</span>
            <span style={{ display: 'inline-block' }}><span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>Risk Metric</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!isDashboard && (
              <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
              </button>
            )}
            {!isDashboard && (
              <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
            )}
          </div>
        </div>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? "100%" : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9'
        }}
        onDoubleClick={() => { if (!isInteractive && !isDashboard) setInteractivity(); else setInteractivity(); }}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.grey[100],
              zIndex: 2,
            }}
          >
            Loading...
          </div>
        )}
      </div>
      <UnderChartRow>
        {!isDashboard && <LastUpdated storageKey={`${selectedCoin.toLowerCase()}Data`} />}
      </UnderChartRow>
      {!isDashboard && (
        <div style={{ paddingBottom: '20px' }}>
          <UnderChartValue>
            <span style={{ fontSize: '1.15rem', color: colors.primary[100] }}>
              Current Risk level: <b style={{ color: colors.greenAccent[500] }}>{currentRiskLevel}</b> ({denominator === 'BTC' ? '₿' : '$'}{currentAltcoinPrice})
            </span>
          </UnderChartValue>
          <ChartInfoSections
            sections={[
              {
                title: 'What it is',
                content:
                  'The altcoin market faces regulatory uncertainty, scams, extreme volatility, and the tendency to lose 70-99% of a token\'s value in a bear market, with no guarantee of recovery. A core of projects driven by respected developers implements smart-contract functionality (permissionless, immutable code on the blockchain) and distributed ledger technology to power the next generation of the internet.',
              },
              {
                title: 'What this chart shows',
                content: 'Risk levels for various altcoins relative to Bitcoin, with optional USD denomination.',
              },
              {
                title: 'How to interpret',
                content:
                  'Bitcoin is the lowest-risk crypto asset, so altcoins should be valued against their BTC pair as well as USD. If an altcoin underperforms BTC, holding the far riskier asset makes little sense. During certain business-cycle phases (sharp drops in Bitcoin dominance paired with looser monetary policy), altcoins have historically offered greater returns than traditional markets and the two blue-chips, Bitcoin and Ethereum.',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(AltcoinRisk);