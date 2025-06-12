import React, { useRef, useEffect, useState, useContext, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const AltcoinPrice = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({}).current; // Object to store SMA series references
  const fedBalanceSeriesRef = useRef(null); // Ref for Fed balance series
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scaleMode, setScaleMode] = useState(0); // 0: linear, 1: logarithmic
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [denominator, setDenominator] = useState('USD');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();

  // Access DataContext
  const {
    altcoinData,
    fetchAltcoinData,
    altcoinLastUpdated,
    btcData,
    fetchBtcData,
    fedBalanceData,
    fetchFedBalanceData,
    fedLastUpdated,
  } = useContext(DataContext);

  // Define available indicators
  const indicators = {
    '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
    '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
    '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
    '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
    'fed-balance': { color: 'purple', label: 'Fed Balance (Trillions)' },
  };

  // Hardcoded list of altcoins
  const altcoins = [
    { label: 'Solana', value: 'SOL' },
    { label: 'Ethereum', value: 'ETH' },
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

  // Utility functions
  const setInteractivity = () => setIsInteractive(!isInteractive);
  const toggleScaleMode = () => setScaleMode(prev => (prev === 1 ? 0 : 1));
  const resetChartView = () => chartRef.current?.timeScale().fitContent();

  const calculateMovingAverage = (data, period) => {
    let movingAverages = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].value;
      }
      movingAverages.push({
        time: data[i].time,
        value: sum / period
      });
    }
    return movingAverages;
  };

  const handleIndicatorChange = (event) => {
    const newIndicators = event.target.value;
    setActiveIndicators(newIndicators);
  };

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      const promises = [];
      // Fetch altcoin data
      if (!altcoinData[selectedCoin]) {
        promises.push(fetchAltcoinData(selectedCoin));
      }
      // Fetch BTC data if needed
      if (denominator === 'BTC' && btcData.length === 0) {
        promises.push(fetchBtcData());
      }
      // Fetch Fed balance data if needed
      if (activeIndicators.includes('fed-balance') && fedBalanceData.length === 0) {
        promises.push(fetchFedBalanceData());
      }

      if (promises.length > 0) {
        setIsLoading(true);
        await Promise.all(promises);
      }
    };

    fetchData();
  }, [selectedCoin, altcoinData, btcData, denominator, activeIndicators, fedBalanceData, fetchAltcoinData, fetchBtcData, fetchFedBalanceData]);

  // Compute chart data and manage loading state
  useEffect(() => {
    const altData = altcoinData[selectedCoin] || [];
    
    // Check if all required data is loaded
    const isAltcoinDataLoaded = altData.length > 0;
    const isBtcDataLoaded = denominator === 'BTC' ? btcData.length > 0 : true;
    const isFedBalanceDataLoaded = activeIndicators.includes('fed-balance') ? fedBalanceData.length > 0 : true;

    if (isAltcoinDataLoaded && isBtcDataLoaded && isFedBalanceDataLoaded) {
      // Compute chart data
      let newChartData = [];
      if (denominator === 'USD') {
        newChartData = altData;
      } else if (denominator === 'BTC' && btcData.length > 0) {
        newChartData = altData
          .map(altEntry => {
            const btcEntry = btcData.find(btc => btc.time === altEntry.time);
            return btcEntry ? { ...altEntry, value: altEntry.value / btcEntry.value } : null;
          })
          .filter(Boolean);
      }
      setChartData(newChartData);
      setIsLoading(false); // All data is loaded, hide loading message
    }
  }, [denominator, altcoinData, selectedCoin, btcData, activeIndicators, fedBalanceData]);

  // Initialize chart once on mount (removed dependency on colors)
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
    });

    const priceSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      lineWidth: 2,
    });
    priceSeriesRef.current = priceSeries;

    const fedBalanceSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: indicators['fed-balance'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: activeIndicators.includes('fed-balance'),
    });
    fedBalanceSeriesRef.current = fedBalanceSeries;

    chart.priceScale('right').applyOptions({
      mode: scaleMode,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    chart.priceScale('left').applyOptions({
      mode: scaleMode,
      borderVisible: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
      priceFormat: {
        type: 'custom',
        formatter: (value) => `$${value.toFixed(2)}T`,
      },
    });

    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const dateStr = param.time;
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const fedSeriesData = fedBalanceSeriesRef.current.data();
        const currentTime = new Date(param.time).getTime();
        const nearestFedData = fedSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          if (currTime <= currentTime && (prev === null || currTime > new Date(prev.time).getTime())) {
            return curr;
          }
          return prev;
        }, null);
        const fedBalanceValue = nearestFedData ? nearestFedData.value : null;

        setTooltipData({
          date: dateStr,
          price: priceData?.value,
          fedBalance: fedBalanceValue,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Removed [colors] dependency

  // Update price series format based on denominator
  useEffect(() => {
    if (priceSeriesRef.current) {
      priceSeriesRef.current.applyOptions({
        priceFormat: {
          type: 'price',
          precision: denominator === 'BTC' ? 8 : 2,
          minMove: denominator === 'BTC' ? 0.00000001 : 0.01,
        },
        priceScaleId: 'right',
        priceFormat: {
          type: 'custom',
          formatter: (value) => {
            if (denominator === 'BTC') return `₿${value.toFixed(8)}`;
            return `$${value.toFixed(2)}`;
          },
        },
      });
    }
  }, [denominator]);

  // Update scale mode
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale('right').applyOptions({ mode: scaleMode, borderVisible: false });
      chartRef.current.priceScale('left').applyOptions({ mode: scaleMode, borderVisible: false });
    }
  }, [scaleMode]);

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && chartData.length > 0) {
      priceSeriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData]);

  // Update Fed balance series data
  useEffect(() => {
    if (fedBalanceSeriesRef.current && chartData.length > 0 && fedBalanceData.length > 0) {
      const altStartTime = new Date(chartData[0].time).getTime();
      const altEndTime = new Date(chartData[chartData.length - 1].time).getTime();
      const filteredFedData = fedBalanceData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= altStartTime && itemTime <= altEndTime;
      });
      fedBalanceSeriesRef.current.setData(filteredFedData);
      fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
    }
  }, [fedBalanceData, chartData, activeIndicators]);

  // Update indicators
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    Object.keys(smaSeriesRefs).forEach(key => {
      if (smaSeriesRefs[key]) {
        chartRef.current.removeSeries(smaSeriesRefs[key]);
        delete smaSeriesRefs[key];
      }
    });

    activeIndicators.forEach(key => {
      if (key === 'fed-balance') return;
      const indicator = indicators[key];
      const series = chartRef.current.addLineSeries({
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
        priceScaleId: 'right',
      });
      smaSeriesRefs[key] = series;
      const data = calculateMovingAverage(chartData, indicator.period);
      series.setData(data);
    });
  }, [activeIndicators, chartData]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  // Update theme colors
  useEffect(() => {
    if (priceSeriesRef.current) {
      const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark'
        ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)' }
        : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)' };
      priceSeriesRef.current.applyOptions({ topColor, bottomColor, lineColor });
    }
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
        grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      });
    }
  }, [theme.palette.mode, colors]);

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
            marginBottom: '30px',
            marginTop: '50px',
          }}
        >
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="altcoin-label"
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
              Altcoin
            </InputLabel>
            <Select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              label="Altcoin"
              labelId="altcoin-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {altcoins.map((coin) => (
                <MenuItem key={coin.value} value={coin.value}>
                  {coin.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '150px' } }}>
            <InputLabel
              id="denominator-label"
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
              Denominator
            </InputLabel>
            <Select
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
              label="Denominator"
              labelId="denominator-label"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="BTC">BTC</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="indicators-label"
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
              Indicators
            </InputLabel>
            <Select
              multiple
              value={activeIndicators}
              onChange={handleIndicatorChange}
              label="Indicators"
              labelId="indicators-label"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((key) => indicators[key].label).join(', ')
                  : 'Select Indicators'
              }
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
                '& .MuiSelect-select:empty': { color: colors.grey[500] },
              }}
            >
              {Object.entries(indicators).map(([key, { label }]) => (
                <MenuItem key={key} value={key}>
                  <Checkbox
                    checked={activeIndicators.includes(key)}
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
            <span style={{ color: colors.primary[100] }}>
              {scaleMode === 1 ? 'Logarithmic' : 'Linear'}
            </span>
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
            <button onClick={resetChartView} className="button-reset extra-margin">
              Reset Chart
            </button>
          </div>
        </div>
      )}
      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
        onDoubleClick={() => setInteractivity(!isInteractive)}
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
          {!isDashboard && <div>Active Indicators</div>}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(38, 198, 218, 1)'
                    : 'rgba(255, 140, 0, 0.8)',
                marginRight: '5px',
              }}
            />
            {selectedCoin} Price
          </div>
          {activeIndicators.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: indicators[key].color,
                  marginRight: '5px',
                }}
              />
              {indicators[key].label}
            </div>
          ))}
        </div>
      </div>
      {!isDashboard && (
        <div className="under-chart">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'left',
              width: '100%',
              maxWidth: '800px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <LastUpdated storageKey={`${selectedCoin.toLowerCase()}Data`} />
            {activeIndicators.includes('fed-balance') && (
              <LastUpdated storageKey="fedBalanceData" />
            )}
          </Box>
        </div>
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            left: (() => {
              const sidebarWidth = isMobile ? -80 : -320;
              const cursorX = tooltipData.x - sidebarWidth;
              const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
              const tooltipWidth = 200;
              const offset = 10000 / (chartWidth + 300);
              const rightPosition = cursorX + offset;
              const leftPosition = cursorX - tooltipWidth - offset;
              if (rightPosition + tooltipWidth <= chartWidth) return `${rightPosition}px`;
              if (leftPosition >= 0) return `${leftPosition}px`;
              return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
            })(),
            top: `${tooltipData.y + 100}px`,
          }}
        >
          <div style={{ fontSize: '15px' }}>{selectedCoin}</div>
          {tooltipData.price !== undefined && (
            <div style={{ fontSize: '20px' }}>
              {denominator === 'BTC' ? '₿' : '$'}
              {denominator === 'BTC' ? tooltipData.price.toFixed(8) : tooltipData.price.toFixed(3)}
            </div>
          )}
          {activeIndicators.includes('fed-balance') && tooltipData.fedBalance !== undefined && (
            <div style={{ color: 'purple' }}>
              Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T
            </div>
          )}
          <div>{tooltipData.date ? tooltipData.date.split('-').reverse().join('-') : ''}</div>
        </div>
      )}
      {!isDashboard && (
        <p className="chart-info">
          The altcoin market is the wild-west of the crypto world. This asset class faces regulatory uncertainty, scams perpetuated by bad actors,
          extreme volatility and the tendency to lose anywhere between 70-99% of a token's value in a bear market, with no guarantee that the price will ever recover.
          There is however a core of projects that are being driven by some talented and respected developers and technologists that are implementing
          smart-contract functionality (permissionless and immutable executable code that is deployed on the blockchain) and are genuinely attempting
          to build the next generation of the internet through distributed ledger blockchain technology. These crypto assets are used to drive the
          functionality and security of their respective blockchain.
          These projects are far riskier, but during certain phases of the business cycle (severe drops in bitcoin dominance paired with looser monetary policy)
          they have historically offered far greater returns than that of traditional markets and the 2 crypto blue-chips; Bitcoin & Ethereum.
          Since Bitcoin is the lowest risk crypto asset, it makes sense to value these altcoins against not only their USD pair, but also their BTC pair.
          If the altcoin is underperforming against BTC, it makes no sense to hold the far riskier asset.
          This chart allows you to compare the performance of various altcoins against Bitcoin.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(AltcoinPrice);