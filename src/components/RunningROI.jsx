// src/components/RunningROI.js
import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const RunningROI = ({ isDashboard = false }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const roiSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData, ethData, fetchEthData, altcoinData, fetchAltcoinData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentRoi, setCurrentRoi] = useState(null);
  const [timeframe, setTimeframe] = useState('1y');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState([]);

  const timeframes = [
    { value: '30d', label: '30 Days', days: 30 },
    { value: '90d', label: '90 Days', days: 90 },
    { value: '180d', label: '180 Days', days: 180 },
    { value: '1y', label: '1 Year', days: 365 },
    { value: '2y', label: '2 Years', days: 730 },
    { value: '3y', label: '3 Years', days: 1095 },
    { value: '4y', label: '4 Years', days: 1460 },
  ];

  const altcoins = [
    { label: 'Bitcoin', value: 'BTC' },
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

  // Fetch data for the selected asset
  useEffect(() => {
    const fetchData = async () => {
      const promises = [];
      if (selectedAsset === 'BTC' && btcData.length === 0) {
        promises.push(fetchBtcData());
      } else if (selectedAsset === 'ETH' && ethData.length === 0) {
        promises.push(fetchEthData());
      } else if (selectedAsset !== 'BTC' && selectedAsset !== 'ETH' && !altcoinData[selectedAsset]) {
        promises.push(fetchAltcoinData(selectedAsset));
      }

      if (promises.length > 0) {
        setIsLoading(true);
        try {
          await Promise.all(promises);
        } catch (err) {
          console.error(`Error fetching data for ${selectedAsset}:`, err);
        }
      }
    };

    fetchData();
  }, [selectedAsset, btcData, ethData, altcoinData, fetchBtcData, fetchEthData, fetchAltcoinData]);

  // Compute chart data and manage loading state
  useEffect(() => {
    const assetData = selectedAsset === 'BTC' ? btcData :
                      selectedAsset === 'ETH' ? ethData :
                      altcoinData[selectedAsset] || [];

    const isAssetDataLoaded = assetData.length > 0;

    if (isAssetDataLoaded) {
      setChartData(assetData);
      setIsLoading(false);
    }
  }, [selectedAsset, btcData, ethData, altcoinData]);

  // Optimize ROI calculation
  const calculateRunningROI = useCallback((data, days) => {
    if (data.length === 0) return [];

    const result = [];
    const startDate = new Date(data[0].time).getTime();

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const currentDate = new Date(item.time).getTime();
      const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);

      if (daysPassed < days) continue;

      const estimatedStartIndex = Math.max(0, index - Math.floor(days));
      let startPrice = item.value;

      for (let j = estimatedStartIndex; j < index; j++) {
        const prevDate = new Date(data[j].time).getTime();
        const daysDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        if (daysDiff <= days) {
          startPrice = data[j].value;
          break;
        }
      }

      const rawRoiMultiplier = startPrice !== 0 ? item.value / startPrice : 1;

      result.push({
        time: item.time,
        value: item.value,
        roi: rawRoiMultiplier,
      });
    }

    return result;
  }, []);

  // Compute ROI data and max ROI
  const { roiData, maxRoi } = useMemo(() => {
    const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
    const days = selectedTimeframe ? selectedTimeframe.days : 365;
    const filteredData = calculateRunningROI(chartData, days);
    const maxRoi = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.roi)) : 200;
    const adjustedMax = Math.max(200, maxRoi * 1.1);

    return { roiData: filteredData, maxRoi: adjustedMax };
  }, [chartData, timeframe, calculateRunningROI]);

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // Initialize chart when container is available
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: colors.primary[700] },
        textColor: colors.primary[100],
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.01, bottom: 0.01 },
        borderVisible: false,
        mode: 1, // Logarithmic for ROI
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for price
      },
      timeScale: { minBarSpacing: 0.001 },
    });

    const roiSeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
    });
    roiSeriesRef.current = roiSeries;

    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;

    chart.subscribeCrosshairMove(param => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const roiData = param.seriesData.get(roiSeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          roi: roiData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Empty dependency array, but check ref inside

  // Update chart theme and options
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
          horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
        },
      });
    }
  }, [colors]);

  // Update price series data
  useEffect(() => {
    if (priceSeriesRef.current && chartData.length > 0) {
      priceSeriesRef.current.setData(chartData.map(data => ({ time: data.time, value: data.value })));
      chartRef.current?.timeScale().fitContent();
    } else if (priceSeriesRef.current) {
      priceSeriesRef.current.setData([]);
    }
  }, [chartData]);

  // Update ROI series data
  useEffect(() => {
    if (roiSeriesRef.current && roiData.length > 0) {
      roiSeriesRef.current.setData(roiData.map(data => ({ time: data.time, value: data.roi })));
      chartRef.current?.timeScale().fitContent();
    } else if (roiSeriesRef.current) {
      roiSeriesRef.current.setData([]);
    }
  }, [roiData]);

  // Update chart options for interactivity and scale
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('left').applyOptions({ mode: 1 });
      chartRef.current.priceScale('right').applyOptions({
        title: `ROI (${timeframe})`,
        mode: 1,
        minimum: 0.1,
        maximum: maxRoi,
      });
    }
  }, [isInteractive, timeframe, maxRoi]);

  // Update current price and ROI for display
  useEffect(() => {
    const latestPriceData = chartData[chartData.length - 1];
    const latestRoiData = roiData[roiData.length - 1];
    setCurrentPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentRoi(latestRoiData && latestRoiData.roi ? latestRoiData.roi.toFixed(2) : null);
  }, [chartData, roiData]);

  const handleTimeframeChange = (e) => setTimeframe(e.target.value);
  const handleAssetChange = (e) => setSelectedAsset(e.target.value);

  const calculateLeftPosition = () => {
    if (!tooltipData || !chartContainerRef.current) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 200;
    const offset = 10;
    const cursorX = tooltipData.x;

    if (cursorX + offset + tooltipWidth <= chartWidth) {
      return `${cursorX + offset}px`;
    } else if (cursorX - offset - tooltipWidth >= 0) {
      return `${cursorX - offset - tooltipWidth}px`;
    } else {
      return `${Math.max(0, Math.min(cursorX, chartWidth - tooltipWidth))}px`;
    }
  };

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

          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="asset-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
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
              {altcoins.map(asset => (
                <MenuItem key={asset.value} value={asset.value}>
                  {asset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' } }}>
            <InputLabel
              id="timeframe-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Timeframe
            </InputLabel>
            <Select
              value={timeframe}
              onChange={handleTimeframeChange}
              label="Timeframe"
              labelId="timeframe-label"
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
              {timeframes.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className='chart-top-div' style={{ marginBottom: '10px' }}>
          <div className="span-container" style={{ position: 'relative', top: 10, left: 0, zIndex: 2 }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {altcoins.find(asset => asset.value === selectedAsset)?.label} {isMobile ? '' : 'Price'}
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              {isMobile ? 'ROI' : 'Running ROI'}
            </span>
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <div
          ref={chartContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          onDoubleClick={() => {
            if (!isInteractive && !isDashboard) setIsInteractive(true);
            else setIsInteractive(false);
          }}
        />
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              color: colors.grey[100],
            }}
          >
            <span style={{ fontSize: '16px' }}>Loading data...</span>
          </Box>
        )}
        {!isLoading && chartData.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              color: colors.redAccent[500],
            }}
          >
            <span style={{ fontSize: '16px' }}>No data available</span>
          </Box>
        )}
        {!isDashboard && chartData.length > 0 && (
          <>

            {tooltipData && (
              <div
                className="tooltip"
                style={{
                  position: 'absolute',
                  left: calculateLeftPosition(),
                  top: `${tooltipData.y + 10}px`,
                  zIndex: 1000,
                  backgroundColor: colors.primary[900],
                  padding: '5px 10px',
                  borderRadius: '4px',
                  color: colors.grey[100],
                  fontSize: '12px',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: '15px' }}>{altcoins.find(asset => asset.value === selectedAsset)?.label}</div>
                {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
                {tooltipData.roi && <div style={{ color: '#ff0062' }}>ROI: {tooltipData.roi.toFixed(2)}x</div>}
                {tooltipData.date && <div>{tooltipData.date ? tooltipData.date.split('-').reverse().join('-') : ''}</div>}
              </div>
            )}
          </>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey={`${selectedAsset.toLowerCase()}Data`} />}
        {!isDashboard && selectedAsset === 'BTC' && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {timeframe} ROI: <b>{currentRoi}</b>x (${currentPrice.toFixed(0)}k)
          </div>
          <p className="chart-info">
            The running ROI is calculated as the return on investment over the selected timeframe, showing the multiplicative change in {altcoins.find(asset => asset.value === selectedAsset)?.label} price from the start of the period to each day (e.g., 1x for no change, 2x for 100% increase, 0.5x for 50% decrease). ROI data is only shown after the selected timeframe has passed from the start of the dataset. Select different assets and timeframes to analyze ROI over various periods.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(RunningROI);