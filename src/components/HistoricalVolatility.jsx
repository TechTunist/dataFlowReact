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

const BitcoinHistoricalVolatility = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const volatilitySeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [isInteractive, setIsInteractive] = useState(false);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentVolatility, setCurrentVolatility] = useState(null);
  const [timeframe, setTimeframe] = useState('60d'); // Default to 60 days
  const [tooltipData, setTooltipData] = useState(null);
  const timeframes = [
    { value: '30d', label: '30 Days', days: 30 },
    { value: '60d', label: '60 Days', days: 60 },
    { value: '180d', label: '180 Days', days: 180 },
    { value: '1y', label: '1 Year', days: 365 },
  ];

  // **Calculate historical volatility**
  const calculateVolatility = useCallback((data, days) => {
    if (data.length === 0) return [];
    const result = [];
    const startDate = new Date(data[0].time);
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const currentDate = new Date(item.time);
      const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysPassed < days) continue;
      const startIndex = Math.max(0, index - days);
      const windowData = data.slice(startIndex, index + 1).map(d => d.value);
     
      const returns = [];
      for (let i = 1; i < windowData.length; i++) {
        if (windowData[i - 1] !== 0) {
          returns.push(Math.log(windowData[i] / windowData[i - 1]));
        }
      }
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const volatility = stdDev * Math.sqrt(365) * 100;
      result.push({
        time: item.time,
        value: item.value,
        volatility: volatility,
      });
    }
    return result;
  }, []);

  // **Memoize volatility data and max volatility**
  const { volatilityData, maxVolatility } = useMemo(() => {
    const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
    const days = selectedTimeframe ? selectedTimeframe.days : 60;
    const filteredData = calculateVolatility(btcData, days);
    const maxVolatility = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.volatility)) : 15;
    const adjustedMax = Math.max(15, maxVolatility * 1.1); // 10% buffer
    return { volatilityData: filteredData, maxVolatility: adjustedMax };
  }, [btcData, timeframe, calculateVolatility]);

  const setInteractivity = () => setIsInteractive(!isInteractive);

  const compactNumberFormatter = (value) => {
    if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value.toFixed(0);
  };

  const resetChartView = () => {
    if (chartRef.current) chartRef.current.timeScale().fitContent();
  };

  // **Fetch initial data**
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  // **Initialize chart once on mount**
  useEffect(() => {
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
        mode: 0, // Linear for volatility
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(197, 203, 206, 1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 1, // Logarithmic for price
      },
      timeScale: { minBarSpacing: 0.001 },
    });
    const volatilitySeries = chart.addLineSeries({
      color: '#ff0062',
      lastValueVisible: true,
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (value) => value.toFixed(1) + '%' },
    });
    volatilitySeriesRef.current = volatilitySeries;
    const priceSeries = chart.addLineSeries({
      color: 'blue',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    });
    priceSeriesRef.current = priceSeries;
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
      } else {
        const priceData = param.seriesData.get(priceSeriesRef.current);
        const volatilityData = param.seriesData.get(volatilitySeriesRef.current);
        setTooltipData({
          date: param.time,
          price: priceData?.value,
          volatility: volatilityData?.value,
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
    };
    window.addEventListener('resize', resizeChart);
    chartRef.current = chart;
    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []); // Empty dependencies: run once on mount

  // **Update chart colors on theme change**
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
      });
    }
  }, [colors.primary[700], colors.primary[100]]);

  // **Update price series data**
  useEffect(() => {
    if (priceSeriesRef.current && btcData.length > 0) {
      priceSeriesRef.current.setData(btcData.map(data => ({ time: data.time, value: data.value })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [btcData]);

  // **Update volatility series data**
  useEffect(() => {
    if (volatilitySeriesRef.current && volatilityData.length > 0) {
      volatilitySeriesRef.current.setData(volatilityData.map(data => ({ time: data.time, value: data.volatility })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [volatilityData]);

  // **Update chart options dynamically**
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
      chartRef.current.priceScale('left').applyOptions({ mode: 1 }); // Logarithmic for price
      chartRef.current.priceScale('right').applyOptions({
        title: `Volatility (${timeframe})`,
        minimum: 0,
        maximum: maxVolatility,
      });
    }
  }, [isInteractive, timeframe, maxVolatility]);

  // **Update current price and volatility**
  useEffect(() => {
    const latestPriceData = btcData[btcData.length - 1];
    const latestVolatilityData = volatilityData[volatilityData.length - 1];
    setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
    setCurrentVolatility(latestVolatilityData && latestVolatilityData.volatility ? latestVolatilityData.volatility.toFixed(1) : null);
  }, [btcData, volatilityData]);

  const handleTimeframeChange = (e) => setTimeframe(e.target.value);

  // **Calculate tooltip position**
  const calculateLeftPosition = () => {
    if (!tooltipData || !chartContainerRef.current) return '0px';
    const chartWidth = chartContainerRef.current.clientWidth;
    const tooltipWidth = 200;
    const offset = 100; // Distance when tooltip is on the right
    const leftOffset = -80; // Distance when tooltip is on the left
    const cursorX = tooltipData.x;
 
    if (cursorX + offset + tooltipWidth <= chartWidth) {
      // Tooltip on the right of the cursor
      return `${cursorX + offset}px`;
    } else if (cursorX - leftOffset - tooltipWidth >= 0) {
      // Tooltip on the left of the cursor
      return `${cursorX - leftOffset - tooltipWidth}px`;
    } else {
      // Fallback: clamp to chart boundaries
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
          <Box sx={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <Button
              onClick={setInteractivity}
              sx={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : '#31d6aa',
                border: `1px solid ${isInteractive ? 'violet' : '#70d8bd'}`,
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: colors.greenAccent[400],
                  color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                },
              }}
            >
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </Button>
            <Button
              onClick={resetChartView}
              sx={{
                backgroundColor: 'transparent',
                color: '#31d6aa',
                border: `1px solid ${colors.greenAccent[400]}`,
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: colors.greenAccent[400],
                  color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                },
              }}
            >
              Reset Chart
            </Button>
          </Box>
        </Box>
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
            if (!isInteractive && !isDashboard) setInteractivity(true);
            else setInteractivity(false);
          }}
        />
        {!isDashboard && (
          <div className="span-container" style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ marginRight: '20px', display: 'inline-block' }}>
              <span style={{ backgroundColor: 'blue', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Bitcoin Price
            </span>
            <span style={{ display: 'inline-block' }}>
              <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
              Volatility
            </span>
          </div>
        )}
        {!isDashboard && tooltipData && (
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
            <div style={{ fontSize: '15px' }}>Bitcoin</div>
            {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
            {tooltipData.volatility && <div style={{ color: '#ff0062' }}>Volatility: {tooltipData.volatility.toFixed(1)}%</div>}
            {tooltipData.date && <div>{tooltipData.date}</div>}
          </div>
        )}
      </div>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
            Current {timeframe} Volatility: <b>{currentVolatility}</b>% (${currentBtcPrice.toFixed(0)}k)
          </div>
          <p className="chart-info">
            The historical volatility is calculated as the annualized standard deviation of daily logarithmic returns over the selected timeframe, expressed as a percentage. Volatility data is only shown after the selected timeframe has passed from the start of the dataset. Select different timeframes to analyze volatility over various periods.
            The visual spikes in volatility indicate periods of significant price fluctuations, which can be useful for understanding market behavior and potential changes in price momentum after volatility peaks and changes direction.
            If the price is moving upwards and the volatility peaks, it may indicate a top and potential move downwards, while a peak in volatility during a downward price movement may indicate a potential bottom and reversal upwards.
          </p>
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinHistoricalVolatility);









// import React, { useRef, useEffect, useState, useContext, useCallback, useMemo } from 'react';
// import { createChart } from 'lightweight-charts';
// import { tokens } from '../theme';
// import { useTheme, Box, FormControl, InputLabel, Select, MenuItem, Typography, useMediaQuery } from '@mui/material';
// import '../styling/bitcoinChart.css';
// import useIsMobile from '../hooks/useIsMobile';
// import LastUpdated from '../hooks/LastUpdated';
// import BitcoinFees from './BitcoinTransactionFees';
// import { DataContext } from '../DataContext';
// import restrictToPaidSubscription from '../scenes/RestrictToPaid';

// // Helper function to calculate historical volatility
// const calculateVolatility = (data, days) => {
//   if (data.length === 0) return [];
//   const result = [];
//   const startDate = new Date(data[0].time);
//   for (let index = 0; index < data.length; index++) {
//     const item = data[index];
//     const currentDate = new Date(item.time);
//     const daysPassed = (currentDate - startDate) / (1000 * 60 * 60 * 24);
//     if (daysPassed < days) continue;
//     const startIndex = Math.max(0, index - days);
//     const windowData = data.slice(startIndex, index + 1).map(d => d.value);
//     const returns = [];
//     for (let i = 1; i < windowData.length; i++) {
//       if (windowData[i - 1] !== 0) {
//         returns.push(Math.log(windowData[i] / windowData[i - 1]));
//       }
//     }
//     const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
//     const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
//     const stdDev = Math.sqrt(variance);
//     const volatility = stdDev * Math.sqrt(365) * 100;
//     result.push({
//       time: item.time,
//       value: item.value,
//       volatility: volatility,
//     });
//   }
//   return result;
// };

// const BitcoinHistoricalVolatility = ({ isDashboard = false }) => {
//   const chartContainerRef = useRef();
//   const chartRef = useRef(null);
//   const volatilitySeriesRef = useRef(null);
//   const priceSeriesRef = useRef(null);
//   const theme = useTheme();
//   const colors = tokens(theme.palette.mode);
//   const isMobile = useIsMobile();
//   const { btcData, fetchBtcData } = useContext(DataContext);
//   const [isInteractive, setIsInteractive] = useState(false);
//   const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
//   const [currentVolatility, setCurrentVolatility] = useState(null);
//   const [timeframe, setTimeframe] = useState('60d');
//   const [tooltipData, setTooltipData] = useState(null);
//   const isNarrowScreen = useMediaQuery('(max-width:400px)');
//   const timeframes = [
//     { value: '30d', label: '30 Days', days: 30 },
//     { value: '60d', label: '60 Days', days: 60 },
//     { value: '180d', label: '180 Days', days: 180 },
//     { value: '1y', label: '1 Year', days: 365 },
//   ];

//   // Memoize volatility data and max volatility
//   const { volatilityData, maxVolatility } = useMemo(() => {
//     const selectedTimeframe = timeframes.find(tf => tf.value === timeframe);
//     const days = selectedTimeframe ? selectedTimeframe.days : 60;
//     const filteredData = calculateVolatility(btcData, days);
//     const maxVolatility = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.volatility)) : 15;
//     const adjustedMax = Math.max(15, maxVolatility * 1.1);
//     return { volatilityData: filteredData, maxVolatility: adjustedMax };
//   }, [btcData, timeframe]);

//   const setInteractivity = () => setIsInteractive(!isInteractive);

//   const compactNumberFormatter = (value) => {
//     if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
//     if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
//     return value.toFixed(0);
//   };

//   const resetChartView = () => {
//     if (chartRef.current) chartRef.current.timeScale().fitContent();
//   };

//   // Fetch initial data
//   useEffect(() => {
//     fetchBtcData();
//   }, [fetchBtcData]);

//   // Initialize chart
//   useEffect(() => {
//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       layout: {
//         background: { type: 'solid', color: colors.primary[700] },
//         textColor: colors.primary[100],
//       },
//       grid: {
//         vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
//         horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
//       },
//       rightPriceScale: {
//         scaleMargins: { top: 0.01, bottom: 0.01 },
//         borderVisible: false,
//         mode: 0,
//       },
//       leftPriceScale: {
//         visible: true,
//         borderColor: 'rgba(197, 203, 206, 1)',
//         scaleMargins: { top: 0.1, bottom: 0.1 },
//         mode: 1,
//       },
//       timeScale: { minBarSpacing: 0.001 },
//     });

//     const volatilitySeries = chart.addLineSeries({
//       color: '#ff0062',
//       lastValueVisible: true,
//       priceScaleId: 'right',
//       lineWidth: 2,
//       priceFormat: { type: 'custom', formatter: (value) => value.toFixed(1) + '%' },
//     });
//     volatilitySeriesRef.current = volatilitySeries;

//     const priceSeries = chart.addLineSeries({
//       color: 'blue',
//       priceScaleId: 'left',
//       lineWidth: 0.7,
//       priceFormat: { type: 'custom', formatter: compactNumberFormatter },
//     });
//     priceSeriesRef.current = priceSeries;

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
//         const priceData = param.seriesData.get(priceSeriesRef.current);
//         const volatilityData = param.seriesData.get(volatilitySeriesRef.current);
//         setTooltipData({
//           date: param.time,
//           price: priceData?.value,
//           volatility: volatilityData?.value,
//           x: param.point.x,
//           y: param.point.y,
//         });
//       }
//     });

//     const resizeChart = () => {
//       chart.applyOptions({
//         width: chartContainerRef.current.clientWidth,
//         height: chartContainerRef.current.clientHeight,
//       });
//     };
//     window.addEventListener('resize', resizeChart);

//     chartRef.current = chart;
//     return () => {
//       chart.remove();
//       window.removeEventListener('resize', resizeChart);
//     };
//   }, []); // Empty dependency array to run only once on mount

//   // Update chart colors on theme change
//   useEffect(() => {
//     if (chartRef.current) {
//       chartRef.current.applyOptions({
//         layout: {
//           background: { type: 'solid', color: colors.primary[700] },
//           textColor: colors.primary[100],
//         },
//       });
//     }
//   }, [colors.primary[700], colors.primary[100]]);

//   // Update chart dimensions on isNarrowScreen change
//   useEffect(() => {
//     if (chartRef.current && chartContainerRef.current) {
//       chartRef.current.applyOptions({
//         width: chartContainerRef.current.clientWidth,
//         height: chartContainerRef.current.clientHeight,
//       });
//     }
//   }, [isNarrowScreen]);

//   // Update price series data
//   useEffect(() => {
//     if (priceSeriesRef.current && btcData.length > 0) {
//       priceSeriesRef.current.setData(btcData.map(data => ({ time: data.time, value: data.value })));
//       chartRef.current?.timeScale().fitContent();
//     }
//   }, [btcData]);

//   // Update volatility series data
//   useEffect(() => {
//     if (volatilitySeriesRef.current && volatilityData.length > 0) {
//       volatilitySeriesRef.current.setData(volatilityData.map(data => ({ time: data.time, value: data.volatility })));
//       chartRef.current?.timeScale().fitContent();
//     }
//   }, [volatilityData]);

//   // Update chart options
//   useEffect(() => {
//     if (chartRef.current) {
//       chartRef.current.applyOptions({
//         handleScroll: isInteractive,
//         handleScale: isInteractive,
//       });
//       chartRef.current.priceScale('left').applyOptions({ mode: 1 });
//       chartRef.current.priceScale('right').applyOptions({
//         title: `Volatility (${timeframe})`,
//         minimum: 0,
//         maximum: maxVolatility,
//       });
//     }
//   }, [isInteractive, timeframe, maxVolatility]);

//   // Update current price and volatility
//   useEffect(() => {
//     const latestPriceData = btcData[btcData.length - 1];
//     const latestVolatilityData = volatilityData[volatilityData.length - 1];
//     setCurrentBtcPrice(latestPriceData ? Math.floor(latestPriceData.value / 1000) : 0);
//     setCurrentVolatility(latestVolatilityData && latestVolatilityData.volatility ? latestVolatilityData.volatility.toFixed(1) : null);
//   }, [btcData, volatilityData]);

//   const handleTimeframeChange = (e) => setTimeframe(e.target.value);

//   const calculateLeftPosition = () => {
//     if (!tooltipData) return '0px';
//     const chartWidth = chartContainerRef.current.clientWidth;
//     const tooltipWidth = isNarrowScreen ? 150 : 200;
//     const offset = -100;
//     const offsetRight = 100;
//     const cursorX = tooltipData.x;
//     if (cursorX < chartWidth / 2) {
//       return `${cursorX + offsetRight}px`;
//     }
//     return `${cursorX - offset - tooltipWidth}px`;
//   };

//   return (
//     <Box sx={{
//       backgroundColor: colors.primary[400],
//       borderRadius: '12px',
//       padding: '20px',
//       width: '100%',
//       maxWidth: '1400px',
//       margin: '0 auto',
//       boxSizing: 'border-box',
//       display: 'flex',
//       flexDirection: 'column',
//       position: 'relative',
//       boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
//       transition: 'transform 0.2s ease-in-out',
//       '&:hover': {
//         transform: 'translateY(-4px)',
//         boxShadow: `0 6px 16px ${theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
//       },
//     }}>
//       <Typography variant="h4" color={colors.grey[100]} gutterBottom sx={{ width: '100%', maxWidth: '100%' }}>
//         Bitcoin Historical Volatility
//       </Typography>
//       {!isDashboard && (
//         <Box
//           sx={{
//             display: 'flex',
//             flexDirection: { xs: 'column', sm: 'row' },
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             gap: '20px',
//             marginBottom: '10px',
//             marginTop: '10px',
//             width: '100%',
//             maxWidth: '100%',
//           }}
//         >
//           <div className="span-container" style={{ marginRight: 'auto' }}>
//             <span style={{ marginRight: '20px', display: 'inline-block' }}>
//               <span
//                 style={{
//                   backgroundColor: 'blue',
//                   height: '10px',
//                   width: '10px',
//                   display: 'inline-block',
//                   marginRight: '5px',
//                 }}
//               ></span>
//               {isMobile ? 'BTC' : 'Bitcoin Price'}
//             </span>
//             <span style={{ display: 'inline-block' }}>
//               <span
//                 style={{
//                   backgroundColor: '#ff0062',
//                   height: '10px',
//                   width: '10px',
//                   display: 'inline-block',
//                   marginRight: '5px',
//                 }}
//               ></span>
//               Volatility
//             </span>
//           </div>
//           <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '200px' }, margin: '0 auto' }}>
//             <InputLabel
//               id="timeframe-label"
//               shrink
//               sx={{
//                 color: colors.grey[100],
//                 '&.Mui-focused': { color: colors.greenAccent[500] },
//                 top: 0,
//                 '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
//               }}
//             >
//               Timeframe
//             </InputLabel>
//             <Select
//               value={timeframe}
//               onChange={handleTimeframeChange}
//               label="Timeframe"
//               labelId="timeframe-label"
//               sx={{
//                 color: colors.grey[100],
//                 backgroundColor: colors.primary[500],
//                 borderRadius: '8px',
//                 '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
//                 '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
//                 '& .MuiSelect-select': { py: 1.5, pl: 2 },
//               }}
//             >
//               {timeframes.map(({ value, label }) => (
//                 <MenuItem key={value} value={value}>{label}</MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginLeft: 'auto' }}>
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
//         </Box>
//       )}
//       <div
//         className="chart-container"
//         style={{
//           position: 'relative',
//           height: isDashboard ? '100%' : '60vh',
//           minHeight: isNarrowScreen ? '200px' : '400px',
//           maxHeight: isNarrowScreen ? '300px' : '600px',
//           width: '100%',
//           maxWidth: '100%',
//           border: '2px solid #a9a9a9',
//         }}
//       >
//         <div
//           ref={chartContainerRef}
//           style={{ height: '100%', width: '100%', zIndex: 1 }}
//           onDoubleClick={() => {
//             if (!isInteractive && !isDashboard) setIsInteractive(true);
//             else setIsInteractive(false);
//           }}
//         />
//         {!isDashboard && tooltipData && (
//           <div
//             className="tooltip"
//             style={{
//               position: 'absolute',
//               left: calculateLeftPosition(),
//               top: (() => {
//                 const offsetY = isNarrowScreen ? 20 : 20;
//                 return `${tooltipData.y + offsetY}px`;
//               })(),
//               zIndex: 1000,
//               backgroundColor: colors.primary[900],
//               padding: isNarrowScreen ? '6px 8px' : '8px 12px',
//               borderRadius: '4px',
//               color: colors.grey[100],
//               fontSize: isNarrowScreen ? '10px' : '12px',
//               pointerEvents: 'none',
//               width: isNarrowScreen ? '100px' : '50px',
//             }}
//           >
//             <div style={{ fontSize: '15px' }}>Bitcoin</div>
//             {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
//             {tooltipData.volatility && <div style={{ color: '#ff0062' }}>Volatility: {tooltipData.volatility.toFixed(1)}%</div>}
//             {tooltipData.date && <div>{tooltipData.date}</div>}
//           </div>
//         )}
//       </div>
//       <div className="under-chart" style={{ width: '100%', maxWidth: '100%' }}>
//         {!isDashboard && <LastUpdated storageKey="btcData" />}
//         {!isDashboard && <BitcoinFees />}
//       </div>
//       {!isDashboard && (
//         <div style={{ width: '100%', maxWidth: '100%' }}>
//           <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem', color: colors.primary[100] }}>
//             Current {timeframe} Volatility: <b>{currentVolatility}</b>% (${currentBtcPrice.toFixed(0)}k)
//           </div>
//           <p className="chart-info">
//             The historical volatility is calculated as the annualized standard deviation of daily logarithmic returns over the selected timeframe, expressed as a percentage. Volatility data is only shown after the selected timeframe has passed from the start of the dataset. Select different timeframes to analyze volatility over various periods.
//             The visual spikes in volatility indicate periods of significant price fluctuations, which can be useful for understanding market behavior and potential changes in price momentum after volatility peaks and changes direction.
//             If the price is moving upwards and the volatility peaks, it may indicate a top and potential move downwards, while a peak in volatility during a downward price movement may indicate a potential bottom and reversal upwards.
//           </p>
//         </div>
//       )}
//     </Box>
//   );
// };

// export default restrictToPaidSubscription(BitcoinHistoricalVolatility);