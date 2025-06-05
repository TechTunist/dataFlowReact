// src/components/MonthlyAverageROI.js
import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const MonthlyAverageROI = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData, isBtcDataFetched, ethData, fetchEthData, isEthDataFetched, altcoinData, fetchAltcoinData, isAltcoinDataFetched } = useContext(DataContext);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [timeframe, setTimeframe] = useState('1y');
  const [monthlyRoiData, setMonthlyRoiData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);
  const [error, setError] = useState(null);
  const loadingTimeoutRef = useRef(null);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : `${selectedAsset} Average Monthly ROI`,
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: isDashboard ? 10 : 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: {
      title: isDashboard || isMobile ? '' : 'Month',
      tickvals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      ticktext: isMobile
        ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      autorange: false,
      range: [-0.5, 11.5], // Fix x-axis range to show all months
    },
    yaxis: {
      title: {
        text: 'ROI',
        font: { color: colors.primary[100], size: 12 },
        standoff: 5,
      },
      tickformat: '.2f', // 2 decimal places, no percentage
      autorange: true,
      automargin: true,
    },
    showlegend: false,
  });

  // Hardcoded list of altcoins (shared with AltcoinPrice)
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

  // Timeframe options with approximate months
  const timeframes = [
    { value: '30d', label: '30 Days', months: 1 },
    { value: '90d', label: '90 Days', months: 3 },
    { value: '180d', label: '180 Days', months: 6 },
    { value: '1y', label: '1 Year', months: 12 },
    { value: '2y', label: '2 Years', months: 24 },
    { value: '3y', label: '3 Years', months: 36 },
    { value: '4y', label: '4 Years', months: 48 },
  ];

  // Month names for tooltips
  const monthNames = isMobile
    ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch data only when necessary
  useEffect(() => {
    const fetchData = async () => {
      // Check if data is already available or being fetched
      if (
        (selectedAsset === 'BTC' && (isBtcDataFetched || btcData.length > 0)) ||
        (selectedAsset === 'ETH' && (isEthDataFetched || ethData.length > 0)) ||
        (selectedAsset !== 'BTC' && selectedAsset !== 'ETH' && (isAltcoinDataFetched[selectedAsset] || altcoinData[selectedAsset]))
      ) {
        setIsLoading(false);
        setShowLoadingMessage(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Set a timeout to show the loading message only if fetch takes longer than 50ms
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoadingMessage(true);
      }, 50);

      try {
        if (selectedAsset === 'BTC') {
          await fetchBtcData();
        } else if (selectedAsset === 'ETH') {
          await fetchEthData();
        } else {
          await fetchAltcoinData(selectedAsset);
        }
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error(`Error fetching data for ${selectedAsset}:`, err);
      } finally {
        setIsLoading(false);
        setShowLoadingMessage(false);
        clearTimeout(loadingTimeoutRef.current);
      }
    };

    fetchData();

    // Cleanup timeout on unmount or re-fetch
    return () => {
      clearTimeout(loadingTimeoutRef.current);
    };
  }, [selectedAsset, fetchBtcData, isBtcDataFetched, btcData, fetchEthData, isEthDataFetched, ethData, fetchAltcoinData, isAltcoinDataFetched, altcoinData]);

  // Calculate average monthly ROI as a multiplier
  const calculateMonthlyAverageROI = useMemo(() => {
    const data = selectedAsset === 'BTC' ? btcData : selectedAsset === 'ETH' ? ethData : altcoinData[selectedAsset] || [];
    if (data.length === 0) return [];

    const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
    const monthsAhead = selectedTimeframe ? selectedTimeframe.months : 12;

    // Group data by year and month, and calculate average price for each month
    const dataByYearMonth = data.reduce((acc, item) => {
      const date = new Date(item.time);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', item.time);
        return acc;
      }
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = { sum: 0, count: 0 };
      acc[year][month].sum += item.value;
      acc[year][month].count += 1;
      return acc;
    }, {});

    // Calculate average price for each month
    const averagePrices = {};
    for (let year in dataByYearMonth) {
      averagePrices[year] = {};
      for (let month = 0; month < 12; month++) {
        if (dataByYearMonth[year][month]) {
          averagePrices[year][month] = dataByYearMonth[year][month].sum / dataByYearMonth[year][month].count;
        }
      }
    }

    // Calculate ROI for each month in each year
    const monthlyRoisByMonth = Array(12).fill().map(() => []); // Array of ROIs for each month
    for (let startYear in averagePrices) {
      startYear = parseInt(startYear);
      for (let startMonth = 0; startMonth < 12; startMonth++) {
        if (!averagePrices[startYear][startMonth]) continue;

        const currentAvgPrice = averagePrices[startYear][startMonth];

        // Calculate the future year and month
        let futureYear = startYear;
        let futureMonth = startMonth + monthsAhead;
        while (futureMonth >= 12) {
          futureMonth -= 12;
          futureYear += 1;
        }

        // Skip if future data doesn't exist (e.g., for 2025 + 1 year)
        if (futureYear > 2025 || !averagePrices[futureYear] || !averagePrices[futureYear][futureMonth]) continue;

        const futureAvgPrice = averagePrices[futureYear][futureMonth];
        const roi = currentAvgPrice !== 0 ? futureAvgPrice / currentAvgPrice : 1;
        monthlyRoisByMonth[startMonth].push(roi);
      }
    }

    // Average ROI for each month across all years
    const monthAverages = monthlyRoisByMonth.map((rois, month) => {
      const avgRoi = rois.length > 0
        ? rois.reduce((sum, roi) => sum + roi, 0) / rois.length
        : 1; // Default to 1 if no data
      return { month, avgRoi: avgRoi.toFixed(2) };
    });

    return monthAverages;
  }, [btcData, ethData, altcoinData, selectedAsset, timeframe]);

  useEffect(() => {
    setMonthlyRoiData(calculateMonthlyAverageROI);
    setLayout(prev => ({
      ...prev,
      title: isDashboard ? '' : `${selectedAsset} Average Monthly ROI`,
    }));
  }, [calculateMonthlyAverageROI, selectedAsset, isDashboard]);

  // Dynamic bar colors based on ROI multiplier
  const getBarColor = (roi) => {
    const value = parseFloat(roi);
    if (value >= 1) {
      if (value > 2) return colors.greenAccent[300]; // Brighter for high ROI
      if (value > 1.5) return colors.greenAccent[400];
      return colors.greenAccent[500]; // Default green
    } else {
      if (value < 0.5) return colors.redAccent[300]; // Brighter for large decrease
      if (value < 0.75) return colors.redAccent[400];
      return colors.redAccent[500]; // Default red
    }
  };

  // Determine if data is available
  const hasData = useMemo(() => {
    if (selectedAsset === 'BTC') return btcData.length > 0;
    if (selectedAsset === 'ETH') return ethData.length > 0;
    return altcoinData[selectedAsset] && altcoinData[selectedAsset].length > 0;
  }, [selectedAsset, btcData, ethData, altcoinData]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '20px',
            marginTop: '20px',
            flexDirection: { xs: 'column', sm: 'row' },
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
              onChange={(e) => setSelectedAsset(e.target.value)}
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
              onChange={(e) => setTimeframe(e.target.value)}
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
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <div
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        {isLoading && showLoadingMessage ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <span style={{ color: colors.grey[100], fontSize: '16px' }}>Loading data...</span>
          </Box>
        ) : !isLoading && !hasData && error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <span style={{ color: colors.redAccent[500], fontSize: '16px' }}>{error}</span>
          </Box>
        ) : (
          <Plot
            data={[
              {
                type: 'bar',
                x: monthlyRoiData.map(data => data.month),
                y: monthlyRoiData.map(data => parseFloat(data.avgRoi)),
                hoverinfo: 'text',
                hovertemplate: 'Month: %{text}<br>Average ROI: %{y:.2f}<extra></extra>',
                text: monthlyRoiData.map(data => monthNames[data.month]),
                marker: {
                  color: monthlyRoiData.map(data => getBarColor(data.avgRoi)),
                },
              },
            ]}
            layout={layout}
            config={{
              displayModeBar: false,
              responsive: true,
              scrollZoom: false,
              doubleClick: false,
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey={`${selectedAsset.toLowerCase()}Data`} />}
        {!isDashboard && selectedAsset === 'BTC' && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <p className="chart-info" >
          This chart displays the average {selectedAsset} Return on Investment (ROI) for each month over the selected timeframe, averaged across all available years. For each month, the ROI is calculated as the ratio of the average price {timeframes.find(tf => tf.value === timeframe)?.label} ahead to the average price of the current month. An ROI of 1 means no change, above 1 indicates growth (e.g., 2 means the price doubled), and below 1 indicates a decline (e.g., 0.5 means the price halved). Positive ROIs are shown in green, negative in red.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(MonthlyAverageROI);