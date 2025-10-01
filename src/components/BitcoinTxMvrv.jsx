// import React, { useRef, useEffect, useState, useContext } from 'react';
// import { createChart } from 'lightweight-charts';
// import '../styling/bitcoinChart.css';
// import { tokens } from "../theme";
// import { useTheme } from "@mui/material";
// import useIsMobile from '../hooks/useIsMobile';
// import LastUpdated from '../hooks/LastUpdated';
// import BitcoinFees from './BitcoinTransactionFees';
// import { Box, FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, useMediaQuery } from '@mui/material';
// import { DataContext } from '../DataContext';
// import restrictToPaidSubscription from '../scenes/RestrictToPaid';
// const BitcoinTxMvrvChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
//   const chartContainerRef = useRef();
//   const chartRef = useRef(null);
//   const txCountSeriesRef = useRef(null);
//   const mvrvSeriesRef = useRef(null);
//   const priceSeriesRef = useRef(null);
//   const ratioSeriesRef = useRef(null);
//   const bearTrendSeriesRef = useRef(null);
//   const [tooltipData, setTooltipData] = useState(null);
//   const [isInteractive, setIsInteractive] = useState(false);
//   const [displayMode, setDisplayMode] = useState('ratio');
//   const [smoothingMode, setSmoothingMode] = useState('ema-28');
//   const [showBearTrend, setShowBearTrend] = useState(false);
//   const theme = useTheme();
//   const colors = tokens(theme.palette.mode);
//   const isMobile = useIsMobile();
//   const { txMvrvData: contextTxMvrvData, fetchTxMvrvData, btcData, fetchBtcData, txMvrvLastUpdated } = useContext(DataContext);
//   const txMvrvData = propTxMvrvData || contextTxMvrvData;
//   const isNarrowScreen = useMediaQuery('(max-width:600px)');
//   // Min-max normalization
//   const normalizeData = (data, key) => {
//     const values = data.map(item => item[key]);
//     const min = Math.min(...values);
//     const max = Math.max(...values);
//     return data.map(item => ({
//       time: item.time,
//       value: (max - min) === 0 ? 0 : (item[key] - min) / (max - min),
//     }));
//   };
//   // Calculate EMA
//   const calculateEMA = (data, period, key = 'value') => {
//     const alpha = 2 / (period + 1);
//     const result = [{ time: data[0].time, value: data[0][key] }];
//     for (let i = 1; i < data.length; i++) {
//       const value = alpha * data[i][key] + (1 - alpha) * result[i - 1].value;
//       result.push({ time: data[i].time, value });
//     }
//     return result;
//   };
//   // Calculate SMA
//   const calculateSMA = (data, period, key = 'value') => {
//     const result = [];
//     for (let i = 0; i < data.length; i++) {
//       if (i < period - 1) {
//         result.push({ time: data[i].time, value: data[i][key] });
//       } else {
//         const window = data.slice(i - period + 1, i + 1);
//         const avg = window.reduce((sum, item) => sum + item[key], 0) / period;
//         result.push({ time: data[i].time, value: avg });
//       }
//     }
//     return result;
//   };
//   // Compute rolling maximum for dynamic normalization
//   const computeRollingMax = (data, windowDays = 365) => {
//     const result = [];
//     const msPerDay = 1000 * 60 * 60 * 24;
//     for (let i = 0; i < data.length; i++) {
//       const currentTime = new Date(data[i].time).getTime();
//       const windowStart = currentTime - (windowDays / 2) * msPerDay;
//       const windowEnd = currentTime + (windowDays / 2) * msPerDay;
//       const windowData = data.filter(item => {
//         const itemTime = new Date(item.time).getTime();
//         return itemTime >= windowStart && itemTime <= windowEnd;
//       });
//       const maxValue = Math.max(...windowData.map(item => item.value), 0.1);
//       result.push({ time: data[i].time, value: maxValue });
//     }
//     return result;
//   };
//   // Compute correction factor based on rolling maximum
//   const computePeakCorrection = (data) => {
//     const rollingMax = computeRollingMax(data);
//     const globalMax = Math.max(...data.map(item => item.value), 1);
//     return data.map((item, i) => ({
//       time: item.time,
//       value: item.value * (globalMax / rollingMax[i].value),
//     }));
//   };
//   // Calculate MVRV-to-transaction-count ratio
//   const calculateRatio = (mvrvData, txCountData, smoothing) => {
//     const normalizedMvrv = normalizeData(mvrvData, 'mvrv');
//     const normalizedTxCount = normalizeData(txCountData, 'value');
//     let ratio = normalizedMvrv.map((mvrvItem, i) => ({
//       time: mvrvItem.time,
//       value: normalizedTxCount[i].value === 0 ? 0 : mvrvItem.value / (normalizedTxCount[i].value + 0.0001),
//     }));
//     // Apply dynamic peak correction
//     ratio = computePeakCorrection(ratio);
//     // Apply smoothing if specified
//     if (smoothing === 'ema-7') {
//       return calculateEMA(ratio, 7);
//     } else if (smoothing === 'ema-28') {
//       return calculateEMA(ratio, 28);
//     } else if (smoothing === 'sma-7') {
//       return calculateSMA(ratio, 7);
//     } else if (smoothing === 'sma-28') {
//       return calculateSMA(ratio, 28);
//     }
//     return ratio;
//   };
//   const getIndicators = (mode, smoothing) => ({
//     'tx-count': {
//       color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
//       label: `Tx Count${smoothing === 'none' ? '' : ` (${smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'})`}`,
//       description: `The ${smoothing === 'none' ? 'daily' : smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'} of Bitcoin transaction counts, indicating network activity and usage over time.`,
//     },
//     'mvrv': {
//       color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
//       label: 'MVRV',
//       description: 'Market Value to Realized Value ratio, showing Bitcoin’s valuation relative to its realized capitalization.',
//     },
//     'ratio': {
//       color: theme.palette.mode === 'dark' ? 'rgba(147, 112, 219, 1)' : 'rgba(128, 0, 128, 1)',
//       label: `MVRV/Tx Ratio${smoothing === 'none' ? '' : ` (${smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'})`}`,
//       description: `The ratio of normalized MVRV to normalized transaction count${smoothing === 'none' ? '' : `, smoothed with a ${smoothing === 'ema-7' || smoothing === 'ema-28' ? 'exponential' : 'simple'} moving average`}, dynamically normalized to a rolling maximum. High values may indicate overvaluation (market tops), low values may suggest undervaluation (market bottoms).`,
//     },
//     'bear-trend': {
//       color: 'cyan',
//       label: 'Bear Market Bottom Trend',
//       description: 'Linear trend line through MVRV/Tx ratio at historical bear market bottoms (2015, 2019, 2022), projected forward.',
//     },
//   });
//   const setInteractivity = () => {
//     setIsInteractive(prev => !prev);
//   };
//   const toggleBearTrend = () => {
//     setShowBearTrend(prev => !prev);
//   };
//   const resetChartView = () => {
//     if (chartRef.current) {
//       chartRef.current.timeScale().fitContent();
//     }
//   };
//   const handleDisplayModeChange = (event, newMode) => {
//     if (newMode) {
//       setDisplayMode(newMode);
//       if (newMode !== 'ratio') {
//         setShowBearTrend(false); // Disable trend line when not in ratio mode
//       }
//     }
//   };
//   const handleSmoothingModeChange = (event) => {
//     setSmoothingMode(event.target.value);
//   };
//   const getBearMarketBottoms = (ratioData, bottomDates) => {
//     return bottomDates.map(date => {
//       const targetTime = new Date(date).getTime();
//       // Find the closest data point to the target date
//       const closestPoint = ratioData.reduce((closest, point) => {
//         const pointTime = new Date(point.time).getTime();
//         const closestTime = new Date(closest.time).getTime();
//         return Math.abs(pointTime - targetTime) < Math.abs(closestTime - targetTime) ? point : closest;
//       }, ratioData[0]);
//       return { time: date, value: closestPoint.value };
//     });
//   };
//   useEffect(() => {
//     fetchTxMvrvData();
//     fetchBtcData();
//   }, [fetchTxMvrvData, fetchBtcData]);
//   useEffect(() => {
//     if (txMvrvData.length === 0 || btcData.length === 0) return;
//     const cutoffDate = new Date('2014-10-21');
//     const filteredTxMvrvData = txMvrvData.filter(
//       item => {
//         const timeValid = new Date(item.time) >= cutoffDate;
//         const txValid = typeof item.tx_count === 'number' && !isNaN(item.tx_count);
//         const mvrvValid = typeof item.mvrv === 'number' && !isNaN(item.mvrv);
//         return timeValid && txValid && mvrvValid;
//       }
//     );
//     const filteredBtcData = btcData.filter(item => new Date(item.time) >= cutoffDate);
//     if (filteredTxMvrvData.length === 0 || filteredBtcData.length === 0) return;
//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       layout: {
//         background: { type: 'solid', color: colors.primary[700] },
//         textColor: colors.primary[100],
//       },
//       grid: {
//         vertLines: { color: colors.greenAccent[700] },
//         horzLines: { color: colors.greenAccent[700] },
//       },
//       timeScale: {
//         minBarSpacing: 0.001,
//       },
//       handleScroll: isInteractive && !isDashboard,
//       handleScale: isInteractive && !isDashboard,
//       leftPriceScale: {
//         mode: 1, // Logarithmic for Bitcoin price
//         borderVisible: false,
//         visible: true,
//       },
//       rightPriceScale: {
//         mode: 0, // Linear for tx count, MVRV, or ratio
//         borderVisible: false,
//         visible: true,
//       },
//     });
//     chart.priceScale('left').applyOptions({ mode: 1, borderVisible: false, visible: true });
//     chart.priceScale('right').applyOptions({ 
//       mode: 0, 
//       borderVisible: false, 
//       visible: true,
//       autoScale: displayMode !== 'ratio',
//     });
//     chart.timeScale().fitContent();
//     chart.subscribeCrosshairMove(param => {
//       if (
//         !param.point ||
//         !param.time ||
//         param.point.x < 0 ||
//         param.point.x > chartContainerRef.current.clientWidth ||
//         param.point.y < 0 ||
//         param.point.y > chartContainerRef.current.clientHeight
//       ) {
//         setTooltipData(null);
//       } else {
//         const dateStr = param.time;
//         const txCountData = param.seriesData.get(txCountSeriesRef.current);
//         const mvrvData = param.seriesData.get(mvrvSeriesRef.current);
//         const priceData = param.seriesData.get(priceSeriesRef.current);
//         const ratioData = param.seriesData.get(ratioSeriesRef.current);
//         setTooltipData({
//           date: dateStr,
//           txCount: txCountData?.value,
//           mvrv: mvrvData?.value,
//           price: priceData?.value,
//           ratio: ratioData?.value,
//           x: param.point.x,
//           y: param.point.y,
//         });
//       }
//     });
//     const resizeChart = () => {
//       if (chart && chartContainerRef.current) {
//         chart.applyOptions({
//           width: chartContainerRef.current.clientWidth,
//           height: chartContainerRef.current.clientHeight,
//         });
//       }
//     };
//     window.addEventListener('resize', resizeChart);
//     const lightThemeColors = {
//       txCount: { lineColor: 'rgba(255, 140, 0, 0.8)' },
//       mvrv: { lineColor: 'rgba(0, 128, 0, 1)' },
//       price: { lineColor: 'gray' },
//       ratio: { lineColor: 'rgba(128, 0, 128, 1)' },
//     };
//     const darkThemeColors = {
//       txCount: { lineColor: 'rgba(38, 198, 218, 1)' },
//       mvrv: { lineColor: 'rgba(255, 99, 71, 1)' },
//       price: { lineColor: 'gray' },
//       ratio: { lineColor: 'rgba(147, 112, 219, 1)' },
//     };
//     const { txCount: txCountColors, mvrv: mvrvColors, price: priceColors, ratio: ratioColors } =
//       theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;
//     // Transaction Count Series
//     const txCountSeries = chart.addLineSeries({
//       priceScaleId: 'right',
//       color: txCountColors.lineColor,
//       lineWidth: 2,
//       priceFormat: { type: 'custom', minMove: 1, formatter: value => value.toFixed(0) },
//       visible: displayMode === 'tx-mvrv',
//     });
//     txCountSeriesRef.current = txCountSeries;
//     let txCountData = filteredTxMvrvData.map(item => ({ time: item.time, value: item.tx_count }));
//     if (smoothingMode === 'ema-7') {
//       txCountData = calculateEMA(txCountData, 7);
//     } else if (smoothingMode === 'ema-28') {
//       txCountData = calculateEMA(txCountData, 28);
//     } else if (smoothingMode === 'sma-7') {
//       txCountData = calculateSMA(txCountData, 7);
//     } else if (smoothingMode === 'sma-28') {
//       txCountData = calculateSMA(txCountData, 28);
//     }
//     txCountSeries.setData(txCountData);
//     // Bitcoin Price Series
//     const priceSeries = chart.addLineSeries({
//       priceScaleId: 'left',
//       color: priceColors.lineColor,
//       lineWidth: 0.7,
//       priceFormat: {
//         type: 'custom',
//         formatter: value => (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)),
//       },
//     });
//     priceSeriesRef.current = priceSeries;
//     priceSeries.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));
//     // MVRV Series
//     const mvrvSeries = chart.addLineSeries({
//       priceScaleId: 'right',
//       color: mvrvColors.lineColor,
//       lineWidth: 2,
//       priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
//       visible: displayMode === 'tx-mvrv',
//     });
//     mvrvSeriesRef.current = mvrvSeries;
//     mvrvSeries.setData(
//       filteredTxMvrvData.map(item => ({ time: item.time, value: item.mvrv * 100000 }))
//     );
//     // MVRV/Tx Ratio Series
//     const ratioSeries = chart.addLineSeries({
//       priceScaleId: 'right',
//       color: ratioColors.lineColor,
//       lineWidth: 2,
//       priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
//       visible: displayMode === 'ratio',
//     });
//     ratioSeriesRef.current = ratioSeries;
//     const mvrvDataForRatio = filteredTxMvrvData.map(item => ({ time: item.time, mvrv: item.mvrv }));
//     const ratioData = calculateRatio(mvrvDataForRatio, txCountData, smoothingMode);
//     ratioSeries.setData(ratioData);
//     ratioSeries.applyOptions({
//       autoscaleInfoProvider: () => ({
//         priceRange: {
//           minValue: 0,
//           maxValue: 50,
//         },
//       }),
//     });
//     // Bear Market Bottom Trend Line (for any smoothing mode)
//     if (showBearTrend) {
//       const bottomDates = ['2015-04-27', '2019-02-07', '2022-10-02'];
//       const bearMarketBottoms = getBearMarketBottoms(ratioData, bottomDates);
//       const baseDate = new Date('2015-04-27').getTime();
//       const days = bearMarketBottoms.map(point => ({
//         x: (new Date(point.time).getTime() - baseDate) / (1000 * 60 * 60 * 24),
//         y: point.value,
//       }));
//       // Linear regression: y = mx + c
//       const n = days.length;
//       const sumX = days.reduce((sum, d) => sum + d.x, 0);
//       const sumY = days.reduce((sum, d) => sum + d.y, 0);
//       const sumXY = days.reduce((sum, d) => sum + d.x * d.y, 0);
//       const sumXX = days.reduce((sum, d) => sum + d.x * d.x, 0);
//       const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
//       const c = (sumY - m * sumX) / n;
//       // Generate line points from 2015-04-27 to 2028-12-31
//       const endDate = new Date('2028-12-31').getTime();
//       const trendData = [];
//       for (let t = new Date('2015-04-27'); t <= endDate; t.setDate(t.getDate() + 1)) {
//         const daysSinceStart = (t.getTime() - baseDate) / (1000 * 60 * 60 * 24);
//         const value = m * daysSinceStart + c;
//         if (value >= 0) {
//           trendData.push({ time: t.toISOString().split('T')[0], value });
//         }
//       }
//       const bearTrendSeries = chart.addLineSeries({
//         priceScaleId: 'right',
//         color: 'cyan',
//         lineWidth: 2,
//         lineStyle: 2,
//         priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
//         visible: displayMode === 'ratio',
//         crosshairMarkerVisible: false,
//         priceLineVisible: false,
//         lastValueVisible: false,
//       });
//       bearTrendSeries.applyOptions({
//         autoscaleInfoProvider: () => ({
//           priceRange: {
//             minValue: 0,
//             maxValue: 200,
//           },
//         }),
//       });
//       bearTrendSeriesRef.current = bearTrendSeries;
//       bearTrendSeries.setData(trendData);
//     }
//     // Adjust right price scale based on display mode
//     if (displayMode === 'ratio') {
//       chart.priceScale('right').applyOptions({
//         mode: 0,
//         autoScale: false,
//         scaleMargins: { top: 0.66, bottom: 0.05 },
//       });
//     } else {
//       chart.priceScale('right').applyOptions({
//         mode: 0,
//         autoScale: true,
//         scaleMargins: { top: 0.1, bottom: 0.1 },
//       });
//     }
//     // Set time scale based on trend line visibility
//     if (chartRef.current) {
//       if (showBearTrend && displayMode === 'ratio') {
//         const endDate = new Date('2028-12-31').getTime();
//         chart.timeScale().setVisibleRange({
//           from: new Date('2014-10-21').getTime() / 1000,
//           to: endDate / 1000,
//         });
//       } else {
//         chart.timeScale().fitContent();
//       }
//     }
//     chartRef.current = chart;
//     return () => {
//       chart.remove();
//       window.removeEventListener('resize', resizeChart);
//     };
//   }, [txMvrvData, btcData, isDashboard, theme.palette.mode, displayMode, smoothingMode, showBearTrend]);
//   useEffect(() => {
//     if (chartRef.current) {
//       chartRef.current.applyOptions({
//         handleScroll: isInteractive && !isDashboard,
//         handleScale: isInteractive && !isDashboard,
//       });
//     }
//   }, [isInteractive, isDashboard]);
//   const indicatorsForMode = getIndicators(displayMode, smoothingMode);
//   return (
//     <div style={{ height: '100%' }}>
//       {!isDashboard && (
//         <Box
//           sx={{
//             display: 'flex',
//             flexDirection: isMobile ? 'column' : 'row',
//             justifyContent: isMobile ? 'flex-start' : 'center',
//             alignItems: isMobile ? 'stretch' : 'center',
//             marginBottom: '20px',
//             marginTop: '20px',
//             gap: isMobile ? '10px' : '20px',
//             '& > *': {
//               width: isMobile ? '100%' : 'auto',
//               maxWidth: isMobile ? 'none' : '300px',
//             },
//           }}
//         >
//           <ToggleButtonGroup
//             value={displayMode}
//             exclusive
//             onChange={handleDisplayModeChange}
//             sx={{
//               backgroundColor: colors.primary[500],
//               '& .MuiToggleButton-root': {
//                 color: colors.grey[100],
//                 borderColor: colors.grey[300],
//                 '&.Mui-selected': {
//                   backgroundColor: colors.greenAccent[500],
//                   color: colors.primary[900],
//                 },
//                 '&:hover': {
//                   backgroundColor: colors.greenAccent[700],
//                 },
//               },
//             }}
//           >
//             <ToggleButton value="tx-mvrv">Tx Count & MVRV</ToggleButton>
//             <ToggleButton value="ratio">MVRV/Tx Ratio</ToggleButton>
//           </ToggleButtonGroup>
//           <FormControl sx={{ minWidth: isMobile ? '100%' : '200px' }}>
//             <InputLabel
//               id="smoothing-mode-label"
//               shrink
//               sx={{
//                 color: colors.grey[100],
//                 '&.Mui-focused': { color: colors.greenAccent[500] },
//                 top: 0,
//                 '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
//               }}
//             >
//               Smoothing
//             </InputLabel>
//             <Select
//               value={smoothingMode}
//               onChange={handleSmoothingModeChange}
//               labelId="smoothing-mode-label"
//               label="Smoothing"
//               sx={{
//                 color: colors.grey[100],
//                 backgroundColor: colors.primary[500],
//                 borderRadius: "8px",
//                 '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
//                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '& .MuiSelect-select': { py: 1.5, pl: 2 },
//               }}
//             >
//               <MenuItem value="none">None</MenuItem>
//               <MenuItem value="ema-7">7-day EMA</MenuItem>
//               <MenuItem value="ema-28">28-day EMA</MenuItem>
//               <MenuItem value="sma-7">7-day SMA</MenuItem>
//               <MenuItem value="sma-28">28-day SMA</MenuItem>
//             </Select>
//           </FormControl>
//           {displayMode === 'ratio' && (
//             <ToggleButton
//               value="trend"
//               selected={showBearTrend}
//               onChange={toggleBearTrend}
//               sx={{
//                 backgroundColor: colors.primary[500],
//                 color: colors.grey[100],
//                 borderColor: colors.grey[300],
//                 '&.Mui-selected': {
//                   backgroundColor: colors.greenAccent[500],
//                   color: colors.primary[900],
//                 },
//                 '&:hover': {
//                   backgroundColor: colors.greenAccent[700],
//                 },
//               }}
//             >
//               {showBearTrend ? 'Bottom Indicator' : 'Bottom Indicator'}
//             </ToggleButton>
//           )}
//         </Box>
//       )}
//       {!isDashboard && (
//         <div className='chart-top-div' style={{ display: 'flex', alignItems: 'center' }}>
//           <div style={{ flexGrow: 1 }}></div>
//           <div style={{ display: 'flex', gap: '10px' }}>
//             <button
//               onClick={setInteractivity}
//               className="button-reset"
//               style={{
//                 backgroundColor: isInteractive ? '#4cceac' : 'transparent',
//                 color: isInteractive ? 'black' : '#31d6aa',
//                 borderColor: isInteractive ? 'violet' : '#70d8bd',
//               }}
//             >
//               {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
//             </button>
//             <button onClick={resetChartView} className="button-reset extra-margin">
//               Reset Chart
//             </button>
//           </div>
//         </div>
//       )}
//       <div
//         className="chart-container"
//         style={{
//           position: 'relative',
//           height: isDashboard ? '100%' : 'calc(100% - 40px)',
//           width: '100%',
//           border: '2px solid #a9a9a9',
//           zIndex: 1,
//         }}
//         onDoubleClick={() => setInteractivity(prev => !prev)}
//       >
//         <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
//         {!isDashboard && (
//           <div
//             style={{
//               position: 'absolute',
//               top: '10px',
//               left: '10px',
//               zIndex: 2,
//               backgroundColor: colors.primary[900],
//               padding: '5px 10px',
//               borderRadius: '4px',
//               color: colors.grey[100],
//               fontSize: isNarrowScreen ? '8px' : '12px',
//             }}
//           >
//             {displayMode === 'tx-mvrv' && (
//               <>
//                 <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
//                   <span
//                     style={{
//                       display: 'inline-block',
//                       width: '10px',
//                       height: '10px',
//                       backgroundColor: indicatorsForMode['tx-count'].color,
//                       marginRight: '5px',
//                     }}
//                   />
//                   {indicatorsForMode['tx-count'].label}
//                 </div>
//                 <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
//                   <span
//                     style={{
//                       display: 'inline-block',
//                       width: '10px',
//                       height: '10px',
//                       backgroundColor: indicatorsForMode['mvrv'].color,
//                       marginRight: '5px',
//                     }}
//                   />
//                   {indicatorsForMode['mvrv'].label}
//                 </div>
//               </>
//             )}
//             {displayMode === 'ratio' && (
//               <>
//                 <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
//                   <span
//                     style={{
//                       display: 'inline-block',
//                       width: '10px',
//                       height: '10px',
//                       backgroundColor: indicatorsForMode['ratio'].color,
//                       marginRight: '5px',
//                     }}
//                   />
//                   {indicatorsForMode['ratio'].label}
//                 </div>
//                 {smoothingMode === 'ema-28' && showBearTrend && (
//                   <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
//                     <span
//                       style={{
//                         display: 'inline-block',
//                         width: '10px',
//                         height: '10px',
//                         backgroundColor: indicatorsForMode['bear-trend'].color,
//                         marginRight: '5px',
//                       }}
//                     />
//                     {indicatorsForMode['bear-trend'].label}
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         )}
//       </div>
//       <div className='under-chart'>
//         {!isDashboard && (
//           <LastUpdated customDate={txMvrvLastUpdated} />
//         )}
//         {!isDashboard && <BitcoinFees />}
//       </div>
//       {!isDashboard && (
//         <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
//           {Object.entries(indicatorsForMode).map(([key, { label, color, description }]) => (
//             (displayMode === 'tx-mvrv' ? (key === 'tx-count' || key === 'mvrv') :
//             (key === 'ratio' || (key === 'bear-trend' && smoothingMode === 'ema-28' && showBearTrend))) && (
//               <p key={key} style={{ margin: '5px 0' }}>
//                 <strong style={{ color }}>{label}:</strong> {description}
//               </p>
//             )
//           ))}
//         </Box>
//       )}
//       {!isDashboard && tooltipData && (
//         <div
//           className="tooltip"
//           style={{
//             position: 'fixed',
//             left: (() => {
//               const sidebarWidth = isMobile ? -80 : -320;
//               const cursorX = tooltipData.x - sidebarWidth;
//               const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
//               const tooltipWidth = 200;
//               const offset = 10000 / (chartWidth + 300);
//               const rightPosition = cursorX + offset;
//               const leftPosition = cursorX - tooltipWidth - offset;
//               if (rightPosition + tooltipWidth <= chartWidth) return `${rightPosition}px`;
//               if (leftPosition >= 0) return `${leftPosition}px`;
//               return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
//             })(),
//             top: `${tooltipData.y + 100}px`,
//             zIndex: 1000,
//           }}
//         >
//           <div style={{ fontSize: '15px', color: 'gray' }}>
//             BTC price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
//           </div>
//           {displayMode === 'tx-mvrv' && (
//             <>
//               <div style={{ color: indicatorsForMode['tx-count'].color }}>
//                 {indicatorsForMode['tx-count'].label}: {tooltipData.txCount?.toFixed(0) ?? 'N/A'}
//               </div>
//               <div style={{ color: indicatorsForMode['mvrv'].color }}>
//                 MVRV: {(tooltipData.mvrv / 100000)?.toFixed(2) ?? 'N/A'}
//               </div>
//             </>
//           )}
//           {displayMode === 'ratio' && (
//             <div style={{ color: indicatorsForMode['ratio'].color }}>
//               {indicatorsForMode['ratio'].label}: {tooltipData.ratio?.toFixed(2) ?? 'N/A'}
//             </div>
//           )}
//           <div>{tooltipData.date?.toString()}</div>
//         </div>
//       )}
//       {!isDashboard && (
//         <p className='chart-info'>
//           The Bitcoin Tx Count, Price & MVRV chart shows the {displayMode === 'tx-mvrv' ? `${smoothingMode === 'none' ? 'daily transaction count' : smoothingMode === 'ema-7' ? '7-day EMA' : smoothingMode === 'ema-28' ? '28-day EMA' : smoothingMode === 'sma-7' ? '7-day SMA' : '28-day SMA'} of transaction count and scaled MVRV` : `MVRV-to-transaction-count ratio${smoothingMode === 'none' ? '' : ` with ${smoothingMode === 'ema-7' || smoothingMode === 'ema-28' ? 'exponential' : 'simple'} moving average`}`} and Bitcoin price starting from October 21, 2014, illustrating network activity, price trends, and valuation. {displayMode === 'ratio' ? `The MVRV/Tx Ratio is the normalized MVRV divided by normalized transaction count, dynamically normalized to a rolling maximum and optionally smoothed with a moving average.${smoothingMode === 'ema-28' && showBearTrend ? ' The Bear Market Bottom Trend line projects historical ratio lows forward.' : ''}` : 'MVRV is scaled by 100,000 to fit the linear axis.'}
//           <br />
//           <br />
//           This chart shows the Bitcoin transaction count, Bitcoin price, MVRV ratio, or MVRV/Tx ratio, providing a snapshot of how Bitcoin’s network and value interact over time.
//           The transaction count reflects activity on the Bitcoin network, and potential hype cycles that see an influx of new investors, and conversely bear markets where interest has decreased.
//           The MVRV (market value to realised value) ratio shows the difference between the current market value of bitcoin and the realised value (the average value of all Bitcoin when last transacted). <br/><br/>
        
//           The MVRV/Tx ratio compares the MVRV to network activity. One interpretation of the spikes of this ratio is that the price has increased speculatively without corresponding network activity that would have led to a "natural" increase of value.
//           There is currently a monotonically increasing trendline under the lows in the MVRV/Tx ratio that has held for 10 years and has indicated relatively low risk entry points.
//           <br /><br /><br />
//         </p>
//       )}
//     </div>
//   );
// };
// export default restrictToPaidSubscription(BitcoinTxMvrvChart);



















import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, useMediaQuery } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinTxMvrvChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const txCountSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const ratioSeriesRef = useRef(null);
  const bearTrendSeriesRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [displayMode, setDisplayMode] = useState('ratio');
  const [smoothingMode, setSmoothingMode] = useState('sma-7');
  const [showBearTrend, setShowBearTrend] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const isNarrowScreen = useMediaQuery('(max-width:600px)');
  const { txMvrvData: contextTxMvrvData, fetchTxMvrvData, btcData, fetchBtcData, txMvrvLastUpdated } = useContext(DataContext);
  const txMvrvData = propTxMvrvData || contextTxMvrvData;

  // Min-max normalization
  const normalizeData = (data, key) => {
    const values = data.map(item => item[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return data.map(item => ({
      time: item.time,
      value: (max - min) === 0 ? 0 : (item[key] - min) / (max - min),
    }));
  };

  // Calculate EMA
  const calculateEMA = (data, period, key = 'value') => {
    const alpha = 2 / (period + 1);
    const result = [{ time: data[0].time, value: data[0][key] }];
    for (let i = 1; i < data.length; i++) {
      const value = alpha * data[i][key] + (1 - alpha) * result[i - 1].value;
      result.push({ time: data[i].time, value });
    }
    return result;
  };

  // Calculate SMA
  const calculateSMA = (data, period, key = 'value') => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: data[i][key] });
      } else {
        const window = data.slice(i - period + 1, i + 1);
        const avg = window.reduce((sum, item) => sum + item[key], 0) / period;
        result.push({ time: data[i].time, value: avg });
      }
    }
    return result;
  };

  // Compute rolling maximum for dynamic normalization
  const computeRollingMax = (data, windowDays = 365) => {
    const result = [];
    const msPerDay = 1000 * 60 * 60 * 24;
    for (let i = 0; i < data.length; i++) {
      const currentTime = new Date(data[i].time).getTime();
      const windowStart = currentTime - (windowDays / 2) * msPerDay;
      const windowEnd = currentTime + (windowDays / 2) * msPerDay;
      const windowData = data.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= windowStart && itemTime <= windowEnd;
      });
      const maxValue = Math.max(...windowData.map(item => item.value), 0.1);
      result.push({ time: data[i].time, value: maxValue });
    }
    return result;
  };

  // Compute correction factor based on rolling maximum
  const computePeakCorrection = (data) => {
    const rollingMax = computeRollingMax(data);
    const globalMax = Math.max(...data.map(item => item.value), 1);
    return data.map((item, i) => ({
      time: item.time,
      value: item.value * (globalMax / rollingMax[i].value),
    }));
  };

  // Calculate MVRV-to-transaction-count ratio
  const calculateRatio = (mvrvData, txCountData, smoothing) => {
    const normalizedMvrv = normalizeData(mvrvData, 'mvrv');
    const normalizedTxCount = normalizeData(txCountData, 'value');
    let ratio = normalizedMvrv.map((mvrvItem, i) => ({
      time: mvrvItem.time,
      value: normalizedTxCount[i].value === 0 ? 0 : (mvrvItem.value / (normalizedTxCount[i].value + 0.0001)),
    }));
    ratio = computePeakCorrection(ratio);
    if (smoothing === 'ema-7') {
      return calculateEMA(ratio, 7);
    } else if (smoothing === 'ema-28') {
      return calculateEMA(ratio, 28);
    } else if (smoothing === 'sma-7') {
      return calculateSMA(ratio, 7);
    } else if (smoothing === 'sma-28') {
      return calculateSMA(ratio, 28);
    }
    return ratio;
  };

  const getIndicators = (mode, smoothing) => ({
    'tx-count': {
      color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
      label: `Tx Count${smoothing === 'none' ? '' : ` (${smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'})`}`,
      description: `The ${smoothing === 'none' ? 'daily' : smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'} of Bitcoin transaction counts, indicating network activity and usage over time.`,
    },
    'mvrv': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
      label: 'MVRV',
      description: 'Market Value to Realized Value ratio, showing Bitcoin’s valuation relative to its realized capitalization.',
    },
    'ratio': {
      color: theme.palette.mode === 'dark' ? 'rgba(147, 112, 219, 1)' : 'rgba(128, 0, 128, 1)',
      label: `MVRV/Tx Ratio${smoothing === 'none' ? '' : ` (${smoothing === 'ema-7' ? '7-day EMA' : smoothing === 'ema-28' ? '28-day EMA' : smoothing === 'sma-7' ? '7-day SMA' : '28-day SMA'})`}`,
      description: `The ratio of normalized MVRV to normalized transaction count${smoothing === 'none' ? '' : `, smoothed with a ${smoothing === 'ema-7' || smoothing === 'ema-28' ? 'exponential' : 'simple'} moving average`}, dynamically normalized to a rolling maximum. High values may indicate overvaluation (market tops), low values may suggest undervaluation (market bottoms).`,
    },
    'bear-trend': {
      color: 'cyan',
      label: 'Bear Market Bottom Trend',
      description: 'Linear trend line through MVRV/Tx ratio at historical bear market bottoms (2015, 2019, 2022), projected forward.',
    },
  });

  const setInteractivity = () => {
    setIsInteractive(prev => !prev);
  };

  const toggleBearTrend = () => {
    setShowBearTrend(prev => !prev);
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const handleDisplayModeChange = (event, newMode) => {
    if (newMode) {
      setDisplayMode(newMode);
      if (newMode !== 'ratio') {
        setShowBearTrend(false);
      }
    }
  };

  const handleSmoothingModeChange = (event) => {
    setSmoothingMode(event.target.value);
  };

  const getBearMarketBottoms = (ratioData, bottomDates) => {
    return bottomDates.map(date => {
      const targetTime = new Date(date).getTime();
      const closestPoint = ratioData.reduce((closest, point) => {
        const pointTime = new Date(point.time).getTime();
        const closestTime = new Date(closest.time).getTime();
        return Math.abs(pointTime - targetTime) < Math.abs(closestTime - targetTime) ? point : closest;
      }, ratioData[0]);
      return { time: date, value: closestPoint.value };
    });
  };

  useEffect(() => {
    fetchTxMvrvData();
    fetchBtcData();
  }, [fetchTxMvrvData, fetchBtcData]);

  useEffect(() => {
    if (txMvrvData.length === 0 || btcData.length === 0) return;
    const cutoffDate = new Date('2014-10-21');
    const filteredTxMvrvData = txMvrvData.filter(
      item => {
        const timeValid = new Date(item.time) >= cutoffDate;
        const txValid = typeof item.tx_count === 'number' && !isNaN(item.tx_count);
        const mvrvValid = typeof item.mvrv === 'number' && !isNaN(item.mvrv);
        return timeValid && txValid && mvrvValid;
      }
    );
    const filteredBtcData = btcData.filter(item => new Date(item.time) >= cutoffDate);
    if (filteredTxMvrvData.length === 0 || filteredBtcData.length === 0) return;

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
      timeScale: {
        minBarSpacing: 0.001,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: isInteractive && !isDashboard,
      handleScale: isInteractive && !isDashboard,
      leftPriceScale: {
        mode: 0,
        borderVisible: false,
        scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 }, // Adjust for ratio mode
      },
      rightPriceScale: {
        mode: 1,
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 }, // Adjust for ratio mode
      },
    });

    chart.priceScale('left').applyOptions({ 
      mode: 0, 
      borderVisible: false,
      scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 },
    });
    chart.priceScale('right').applyOptions({ 
      mode: 1, 
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 },
    });

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
        const dateStr = param.time;
        const txCountData = param.seriesData.get(txCountSeriesRef.current);
        const mvrvData = param.seriesData.get(mvrvSeriesRef.current);
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const ratioData = param.seriesData.get(ratioSeriesRef.current);
        const bearTrendData = showBearTrend && displayMode === 'ratio' ? param.seriesData.get(bearTrendSeriesRef.current) : null;
        setTooltipData({
          date: dateStr,
          txCount: txCountData?.value,
          mvrv: mvrvData?.value,
          price: priceData?.value,
          ratio: ratioData?.value,
          bearTrend: bearTrendData?.value,
          x: param.point.x,
          y: param.point.y,
        });
      }
    });

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', resizeChart);

    const lightThemeColors = {
      txCount: { lineColor: 'rgba(255, 140, 0, 0.8)' },
      mvrv: { lineColor: 'rgba(0, 128, 0, 1)' },
      price: { lineColor: 'gray' },
      ratio: { lineColor: 'rgba(128, 0, 128, 1)' },
    };
    const darkThemeColors = {
      txCount: { lineColor: 'rgba(38, 198, 218, 1)' },
      mvrv: { lineColor: 'rgba(255, 99, 71, 1)' },
      price: { lineColor: 'gray' },
      ratio: { lineColor: 'rgba(147, 112, 219, 1)' },
    };
    const { txCount: txCountColors, mvrv: mvrvColors, price: priceColors, ratio: ratioColors } =
      theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

    // Transaction Count Series
    const txCountSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: txCountColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'custom', minMove: 1, formatter: value => value.toFixed(0) },
      visible: displayMode === 'tx-mvrv',
    });
    txCountSeriesRef.current = txCountSeries;
    let txCountData = filteredTxMvrvData.map(item => ({ time: item.time, value: item.tx_count }));
    if (smoothingMode === 'ema-7') {
      txCountData = calculateEMA(txCountData, 7);
    } else if (smoothingMode === 'ema-28') {
      txCountData = calculateEMA(txCountData, 28);
    } else if (smoothingMode === 'sma-7') {
      txCountData = calculateSMA(txCountData, 7);
    } else if (smoothingMode === 'sma-28') {
      txCountData = calculateSMA(txCountData, 28);
    }
    txCountSeries.setData(txCountData);

    // Bitcoin Price Series
    const priceSeries = chart.addLineSeries({
      priceScaleId: 'right',
      color: priceColors.lineColor,
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: value => (value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)),
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(filteredBtcData.map(data => ({ time: data.time, value: data.value })));

    // MVRV Series
    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: mvrvColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: displayMode === 'tx-mvrv',
    });
    mvrvSeriesRef.current = mvrvSeries;
    mvrvSeries.setData(
      filteredTxMvrvData.map(item => ({ time: item.time, value: item.mvrv * 100000 }))
    );

    // MVRV/Tx Ratio Series
    const ratioSeries = chart.addLineSeries({
      priceScaleId: 'left', // Use left scale for ratio
      color: ratioColors.lineColor,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      visible: displayMode === 'ratio',
    });
    ratioSeriesRef.current = ratioSeries;
    const mvrvDataForRatio = filteredTxMvrvData.map(item => ({ time: item.time, mvrv: item.mvrv }));
    const ratioData = calculateRatio(mvrvDataForRatio, txCountData, smoothingMode);
    ratioSeries.setData(ratioData);

    // Bear Market Bottom Trend Line
    if (showBearTrend) {
      const bottomDates = ['2015-04-27', '2019-02-07', '2022-10-02'];
      const bearMarketBottoms = getBearMarketBottoms(ratioData, bottomDates);
      const baseDate = new Date('2015-04-27').getTime();
      const days = bearMarketBottoms.map(point => ({
        x: (new Date(point.time).getTime() - baseDate) / (1000 * 60 * 60 * 24),
        y: point.value,
      }));
      const n = days.length;
      const sumX = days.reduce((sum, d) => sum + d.x, 0);
      const sumY = days.reduce((sum, d) => sum + d.y, 0);
      const sumXY = days.reduce((sum, d) => sum + d.x * d.y, 0);
      const sumXX = days.reduce((sum, d) => sum + d.x * d.x, 0);
      const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const c = (sumY - m * sumX) / n;
      const endDate = new Date('2028-12-31').getTime();
      const trendData = [];
      for (let t = new Date('2015-04-27'); t <= endDate; t.setDate(t.getDate() + 1)) {
        const daysSinceStart = (t.getTime() - baseDate) / (1000 * 60 * 60 * 24);
        const value = m * daysSinceStart + c;
        if (value >= 0) {
          trendData.push({ time: t.toISOString().split('T')[0], value });
        }
      }
      const bearTrendSeries = chart.addLineSeries({
        priceScaleId: 'left', // Use left scale for bear trend
        color: 'cyan',
        lineWidth: 2,
        lineStyle: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        visible: displayMode === 'ratio',
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bearTrendSeries.applyOptions({
        autoscaleInfoProvider: () => null,
      });
      bearTrendSeriesRef.current = bearTrendSeries;
      bearTrendSeries.setData(trendData);
    }

    if (showBearTrend && displayMode === 'ratio') {
      const endDate = new Date('2028-12-31').getTime();
      chart.timeScale().setVisibleRange({
        from: new Date('2014-10-21').getTime() / 1000,
        to: endDate / 1000,
      });
    } else {
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;
    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [txMvrvData, btcData, isDashboard, theme.palette.mode, displayMode, smoothingMode, showBearTrend]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
      // Update price scale margins based on display mode
      chartRef.current.priceScale('left').applyOptions({
        scaleMargins: { top: displayMode === 'ratio' ? 0.5 : 0.05, bottom: 0.05 },
      });
      chartRef.current.priceScale('right').applyOptions({
        scaleMargins: { top: 0.05, bottom: displayMode === 'ratio' ? 0.5 : 0.05 },
      });
    }
  }, [isInteractive, isDashboard, displayMode]);

  const indicatorsForMode = getIndicators(displayMode, smoothingMode);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: isMobile ? 'flex-start' : 'center',
            alignItems: isMobile ? 'stretch' : 'center',
            marginBottom: '20px',
            marginTop: '20px',
            gap: isMobile ? '10px' : '20px',
            '& > *': {
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? 'none' : '300px',
            },
          }}
        >
          <ToggleButtonGroup
            value={displayMode}
            exclusive
            onChange={handleDisplayModeChange}
            sx={{
              backgroundColor: colors.primary[500],
              '& .MuiToggleButton-root': {
                color: colors.grey[100],
                borderColor: colors.grey[300],
                '&.Mui-selected': {
                  backgroundColor: colors.greenAccent[500],
                  color: colors.primary[900],
                },
                '&:hover': {
                  backgroundColor: colors.greenAccent[700],
                },
              },
            }}
          >
            <ToggleButton value="tx-mvrv">Tx Count & MVRV</ToggleButton>
            <ToggleButton value="ratio">MVRV/Tx Ratio</ToggleButton>
          </ToggleButtonGroup>
          <FormControl sx={{ minWidth: isMobile ? '100%' : '200px' }}>
            <InputLabel
              id="smoothing-mode-label"
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
              value={smoothingMode}
              onChange={handleSmoothingModeChange}
              labelId="smoothing-mode-label"
              label="Smoothing"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="ema-7">7-day EMA</MenuItem>
              <MenuItem value="ema-28">28-day EMA</MenuItem>
              <MenuItem value="sma-7">7-day SMA</MenuItem>
              <MenuItem value="sma-28">28-day SMA</MenuItem>
            </Select>
          </FormControl>
          {displayMode === 'ratio' && (
            <ToggleButton
              value="trend"
              selected={showBearTrend}
              onChange={toggleBearTrend}
              sx={{
                backgroundColor: colors.primary[500],
                color: colors.grey[100],
                borderColor: colors.grey[300],
                '&.Mui-selected': {
                  backgroundColor: colors.greenAccent[500],
                  color: colors.primary[900],
                },
                '&:hover': {
                  backgroundColor: colors.greenAccent[700],
                },
              }}
            >
              {showBearTrend ? 'Bottom Indicator' : 'Bottom Indicator'}
            </ToggleButton>
          )}
        </Box>
      )}
      {!isDashboard && (
        <div className='chart-top-div' style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexGrow: 1 }}></div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
          zIndex: 1,
        }}
        onDoubleClick={() => setInteractivity(prev => !prev)}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {!isDashboard && (
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
              fontSize: isNarrowScreen ? '8px' : '12px',
            }}
          >
            {displayMode === 'tx-mvrv' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['tx-count'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['tx-count'].label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['mvrv'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['mvrv'].label}
                </div>
              </>
            )}
            {displayMode === 'ratio' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      backgroundColor: indicatorsForMode['ratio'].color,
                      marginRight: '5px',
                    }}
                  />
                  {indicatorsForMode['ratio'].label}
                </div>
                {smoothingMode === 'ema-28' && showBearTrend && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        backgroundColor: indicatorsForMode['bear-trend'].color,
                        marginRight: '5px',
                      }}
                    />
                    {indicatorsForMode['bear-trend'].label}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className='under-chart'>
        {!isDashboard && (
          <LastUpdated customDate={txMvrvLastUpdated} />
        )}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {Object.entries(indicatorsForMode).map(([key, { label, color, description }]) => (
            (displayMode === 'tx-mvrv' ? (key === 'tx-count' || key === 'mvrv') :
            (key === 'ratio' || (key === 'bear-trend' && smoothingMode === 'ema-28' && showBearTrend))) && (
              <p key={key} style={{ margin: '5px 0' }}>
                <strong style={{ color }}>{label}:</strong> {description}
              </p>
            )
          ))}
        </Box>
      )}
      {!isDashboard && tooltipData && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
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
            zIndex: 1000,
          }}
        >
          <div style={{ fontSize: '15px', color: 'gray' }}>
            BTC price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
          </div>
          {displayMode === 'tx-mvrv' && (
            <>
              <div style={{ color: indicatorsForMode['tx-count'].color }}>
                {indicatorsForMode['tx-count'].label}: {tooltipData.txCount?.toFixed(0) ?? 'N/A'}
              </div>
              <div style={{ color: indicatorsForMode['mvrv'].color }}>
                MVRV: {(tooltipData.mvrv / 100000)?.toFixed(2) ?? 'N/A'}
              </div>
            </>
          )}
          {displayMode === 'ratio' && (
            <>
              <div style={{ color: indicatorsForMode['ratio'].color }}>
                {indicatorsForMode['ratio'].label}: {tooltipData.ratio?.toFixed(2) ?? 'N/A'}
              </div>
              {showBearTrend && smoothingMode === 'ema-28' && (
                <div style={{ color: indicatorsForMode['bear-trend'].color }}>
                  {indicatorsForMode['bear-trend'].label}: {tooltipData.bearTrend?.toFixed(2) ?? 'N/A'}
                </div>
              )}
            </>
          )}
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          The Bitcoin Tx Count, Price & MVRV chart shows the {displayMode === 'tx-mvrv' ? `${smoothingMode === 'none' ? 'daily transaction count' : smoothingMode === 'ema-7' ? '7-day EMA' : smoothingMode === 'ema-28' ? '28-day EMA' : smoothingMode === 'sma-7' ? '7-day SMA' : '28-day SMA'} of transaction count and scaled MVRV` : `MVRV-to-transaction-count ratio${smoothingMode === 'none' ? '' : ` with ${smoothingMode === 'ema-7' || smoothingMode === 'ema-28' ? 'exponential' : 'simple'} moving average`}`} and Bitcoin price starting from October 21, 2014, illustrating network activity, price trends, and valuation. {displayMode === 'ratio' ? `The MVRV/Tx Ratio is the normalized MVRV divided by normalized transaction count, dynamically normalized to a rolling maximum and optionally smoothed with a moving average.${smoothingMode === 'ema-28' && showBearTrend ? ' The Bear Market Bottom Trend line projects historical ratio lows forward.' : ''}` : 'MVRV is scaled by 100,000 to fit the linear axis.'}
          <br />
          <br />
          This chart shows the Bitcoin transaction count, Bitcoin price, MVRV ratio, or MVRV/Tx ratio, providing a snapshot of how Bitcoin’s network and value interact over time.
          The transaction count reflects activity on the Bitcoin network, and potential hype cycles that see an influx of new investors, and conversely bear markets where interest has decreased.
          The MVRV (market value to realised value) ratio shows the difference between the current market value of bitcoin and the realised value (the average value of all Bitcoin when last transacted). <br/><br/>
          The MVRV/Tx ratio compares the MVRV to network activity. One interpretation of the spikes of this ratio is that the price has increased speculatively without corresponding network activity that would have led to a "natural" increase of value.
          There is currently a monotonically increasing trendline under the lows in the MVRV/Tx ratio that has held for 10 years and has indicated relatively low risk entry points.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinTxMvrvChart);