import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Stack, Select, MenuItem, FormControl, FormControlLabel, InputLabel, Box, Checkbox, Button } from '@mui/material';
import { DataContext } from '../DataContext';

const BitcoinPrice = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRefs = useRef({}).current;
  const fedBalanceSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const [scaleMode, setScaleMode] = useState(1);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const {
    btcData,
    fedBalanceData,
    mvrvData,
    fetchBtcData,
    fetchFedBalanceData,
    fetchMvrvData,
  } = useContext(DataContext);

  const indicators = {
    '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
    '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
    '50w-sma': { period: 50 * 7, color: 'magenta', label: '50 Week SMA' },
    '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
    '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
    'fed-balance': { color: 'purple', label: 'Fed Balance (Trillions)' },
    'mvrv': { color: 'orange', label: 'MVRV Ratio' },
  };

  const setInteractivity = () => setIsInteractive(!isInteractive);
  const toggleScaleMode = () => setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
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
        value: sum / period,
      });
    }
    return movingAverages;
  };

  const handleIndicatorChange = (event) => {
    setActiveIndicators(event.target.value);
  };

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  // Fetch Fed balance data only if the indicator is active
  useEffect(() => {
    if (activeIndicators.includes('fed-balance')) {
      fetchFedBalanceData();
    }
  }, [activeIndicators, fetchFedBalanceData]);

  // Fetch MVRV data only if the indicator is active
  useEffect(() => {
    if (activeIndicators.includes('mvrv')) {
      fetchMvrvData();
    }
  }, [activeIndicators, fetchMvrvData]);

  // Create chart once on mount
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        width: 50,
      },
      additionalPriceScales: {
        'mvrv-scale': {
          mode: 0,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
      },
    });

    const priceSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        minMove: 1,
        formatter: (price) => {
          if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'K';
          } else if (price >= 100) {
            return price.toFixed(0);
          } else {
            return price.toFixed(1);
          }
        },
      },
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

    const mvrvSeries = chart.addLineSeries({
      priceScaleId: 'mvrv-scale',
      color: indicators['mvrv'].color,
      lineWidth: 2,
      priceLineVisible: false,
      visible: activeIndicators.includes('mvrv'),
    });
    mvrvSeriesRef.current = mvrvSeries;

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

        const mvrvSeriesData = mvrvSeriesRef.current.data();
        const nearestMvrvData = mvrvSeriesData.reduce((prev, curr) => {
          const currTime = new Date(curr.time).getTime();
          if (currTime <= currentTime && (prev === null || currTime > new Date(prev.time).getTime())) {
            return curr;
          }
          return prev;
        }, null);
        const mvrvValue = nearestMvrvData ? nearestMvrvData.value : null;

        setTooltipData({
          date: dateStr,
          price: priceData?.value,
          fedBalance: fedBalanceValue,
          mvrv: mvrvValue,
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
        chart.timeScale().fitContent();
      }
    };
    window.addEventListener('resize', resizeChart);

    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

  // Update scale mode for the Bitcoin price scale
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale('right').applyOptions({ mode: scaleMode, borderVisible: false });
    }
  }, [scaleMode]);

  // Update Bitcoin price series data
  useEffect(() => {
    if (priceSeriesRef.current && btcData.length > 0) {
      priceSeriesRef.current.setData(btcData);
      chartRef.current.timeScale().fitContent();
    }
  }, [btcData]);

  // Update Fed balance series data
  useEffect(() => {
    if (fedBalanceSeriesRef.current && btcData.length > 0 && fedBalanceData.length > 0) {
      const btcStartTime = new Date(btcData[0].time).getTime();
      const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
      const filteredFedData = fedBalanceData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= btcStartTime && itemTime <= btcEndTime;
      });

      fedBalanceSeriesRef.current.setData(filteredFedData);
      fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
    }
  }, [fedBalanceData, btcData, activeIndicators]);

  // Update MVRV series data
  useEffect(() => {
    if (mvrvSeriesRef.current && btcData.length > 0 && mvrvData.length > 0) {
      const btcStartTime = new Date(btcData[0].time).getTime();
      const btcEndTime = new Date(btcData[btcData.length - 1].time).getTime();
      const filteredMvrvData = mvrvData.filter(item => {
        const itemTime = new Date(item.time).getTime();
        return itemTime >= btcStartTime && itemTime <= btcEndTime;
      });

      mvrvSeriesRef.current.setData(filteredMvrvData);
      mvrvSeriesRef.current.applyOptions({ visible: activeIndicators.includes('mvrv') });
    }
  }, [mvrvData, btcData, activeIndicators]);

  // Update SMA indicators
  useEffect(() => {
    if (!chartRef.current || btcData.length === 0) return;

    Object.keys(smaSeriesRefs).forEach(key => {
      if (smaSeriesRefs[key]) {
        chartRef.current.removeSeries(smaSeriesRefs[key]);
        delete smaSeriesRefs[key];
      }
    });

    activeIndicators.forEach(key => {
      if (key.includes('sma')) {
        const indicator = indicators[key];
        const series = chartRef.current.addLineSeries({
          color: indicator.color,
          lineWidth: 2,
          priceLineVisible: false,
        });
        smaSeriesRefs[key] = series;
        const data = calculateMovingAverage(btcData, indicator.period);
        series.setData(data);
      }
    });
  }, [activeIndicators, btcData]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive,
        handleScale: isInteractive,
      });
    }
  }, [isInteractive]);

  // Update colors based on theme
  useEffect(() => {
    if (priceSeriesRef.current) {
      const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark'
        ? { topColor: 'rgba(38, 198, 218, 0.56)', bottomColor: 'rgba(38, 198, 218, 0.04)', lineColor: 'rgba(38, 198, 218, 1)' }
        : { topColor: 'rgba(255, 165, 0, 0.56)', bottomColor: 'rgba(255, 165, 0, 0.2)', lineColor: 'rgba(255, 140, 0, 0.8)' };
      priceSeriesRef.current.applyOptions({
        topColor,
        bottomColor,
        lineColor,
      });
    }
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: 'solid', color: colors.primary[700] },
          textColor: colors.primary[100],
        },
        grid: {
          vertLines: { color: colors.greenAccent[700] },
          horzLines: { color: colors.greenAccent[700] },
        },
      });
    }
  }, [theme.palette.mode]);


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
              labelId="indicators-label"
              label="Indicators"
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
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          position: 'relative',
          zIndex: 1,
        }}
        onDoubleClick={() => setInteractivity(!isInteractive)}
      >
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
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
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
                marginRight: '5px',
              }}
            />
            Bitcoin Price
          </div>
          {activeIndicators.map(key => (
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
        <div className='under-chart' style={{ padding: '10px 0' }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
          }}>
            <LastUpdated storageKey="btcData" />
            <BitcoinFees />
          </Box>
        </div>
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
          <div style={{ fontSize: '15px' }}>Bitcoin</div>
          <div style={{ fontSize: '20px' }}>${tooltipData.price?.toFixed(2)}</div>
          {activeIndicators.includes('fed-balance') && tooltipData.fedBalance !== undefined && (
            <div style={{ color: 'purple' }}>
              Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T
            </div>
          )}
          {activeIndicators.includes('mvrv') && tooltipData.mvrv !== undefined && (
            <div style={{ color: indicators['mvrv'].color }}>
              MVRV Ratio: {tooltipData.mvrv.toFixed(2)}
            </div>
          )}
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}
      {!isDashboard && (
        <p className='chart-info'>
          Bitcoin represents a significant advancement in digital finance. It operates on a globally distributed and permissionless ledger,
          secured by a network of miners. This system is designed to be transparent, secure, and resilient. Bitcoin enables the transfer of
          value without intermediaries, offering a unique digital asset that can be sent anywhere in the world almost instantly.
          As a finite digital currency, it provides a novel way to store and transfer wealth, with potential implications for global finance and value exchange.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

export default BitcoinPrice;