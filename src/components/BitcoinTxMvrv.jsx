import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinTxMvrvChart = ({ isDashboard = false, txMvrvData: propTxMvrvData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const txCountSeriesRef = useRef(null);
  const mvrvSeriesRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const ratioSeriesRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [txCountMode, setTxCountMode] = useState('28-day');
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();

  const { txMvrvData: contextTxMvrvData, fetchTxMvrvData, btcData, fetchBtcData } = useContext(DataContext);
  const txMvrvData = propTxMvrvData || contextTxMvrvData;
  const { txMvrvLastUpdated } = useContext(DataContext);

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
  const calculateMovingAverage = (data, period, key = 'value') => {
    const alpha = 2 / (period + 1);
    const result = [{ time: data[0].time, value: data[0][key] }];
    for (let i = 1; i < data.length; i++) {
      const value = alpha * data[i][key] + (1 - alpha) * result[i - 1].value;
      result.push({ time: data[i].time, value });
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
      const maxValue = Math.max(...windowData.map(item => item.value), 0.1); // Avoid zero
      result.push({ time: data[i].time, value: maxValue });
    }
    return result;
  };

  // Compute correction factor based on rolling maximum
  const computePeakCorrection = (data) => {
    const rollingMax = computeRollingMax(data);
    const globalMax = Math.max(...data.map(item => item.value), 1); // Reference peak
    return data.map((item, i) => ({
      time: item.time,
      value: item.value * (globalMax / rollingMax[i].value),
    }));
  };

  // Calculate MVRV-to-transaction-count ratio
  const calculateRatio = (mvrvData, txCountData, mode) => {
    const normalizedMvrv = normalizeData(mvrvData, 'mvrv');
    const normalizedTxCount = normalizeData(txCountData, 'value');
    let ratio = normalizedMvrv.map((mvrvItem, i) => ({
      time: mvrvItem.time,
      value: normalizedTxCount[i].value === 0 ? 0 : mvrvItem.value / (normalizedTxCount[i].value + 0.0001),
    }));

    // Apply dynamic peak correction
    ratio = computePeakCorrection(ratio);

    // Apply EMA if specified
    if (mode === 'ratio-7-day') {
      return calculateMovingAverage(ratio, 7);
    } else if (mode === 'ratio-28-day') {
      return calculateMovingAverage(ratio, 28);
    }
    return ratio;
  };

  const getIndicators = (mode) => ({
    'tx-count': {
      color: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
      label: `Tx Count (${mode === 'daily' ? 'Daily' : mode === '7-day' ? '7-day Avg' : '28-day Avg'})`,
      description: `The ${mode === 'daily' ? 'daily' : mode === '7-day' ? '7-day' : '28-day'} moving average of Bitcoin transaction counts, indicating network activity and usage over time.`,
    },
    'price': {
      color: 'gray',
      label: 'Bitcoin Price',
      description: 'The market price of Bitcoin in USD, plotted on a logarithmic scale to highlight long-term trends.',
    },
    'mvrv': {
      color: theme.palette.mode === 'dark' ? 'rgba(255, 99, 71, 1)' : 'rgba(0, 128, 0, 1)',
      label: 'MVRV',
      description: 'Market Value to Realized Value ratio, showing Bitcoin’s valuation relative to its realized capitalization.',
    },
    'ratio': {
      color: theme.palette.mode === 'dark' ? 'rgba(147, 112, 219, 1)' : 'rgba(128, 0, 128, 1)',
      label: `MVRV/Tx Ratio${mode === 'ratio-7-day' ? ' (7-day EMA)' : mode === 'ratio-28-day' ? ' (28-day EMA)' : ''}`,
      description: `The ratio of normalized MVRV to normalized transaction count${mode === 'ratio-7-day' || mode === 'ratio-28-day' ? ', smoothed with an exponential moving average,' : ''} dynamically normalized to a rolling maximum. High values may indicate overvaluation (market tops), low values may suggest undervaluation (market bottoms).`,
    },
  });

  const setInteractivity = () => {
    setIsInteractive(prev => !prev);
  };

  const resetChartView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const handleTxCountModeChange = (event) => {
    setTxCountMode(event.target.value);
  };

  useEffect(() => {
    fetchTxMvrvData();
    fetchBtcData();
  }, [fetchTxMvrvData, fetchBtcData]);

  useEffect(() => {
    if (txMvrvData.length === 0 || btcData.length === 0) return;

    const cutoffDate = new Date('2014-10-21'); // Updated cutoff date
    const filteredTxMvrvData = txMvrvData.filter(item => new Date(item.time) >= cutoffDate);
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
      },
      handleScroll: isInteractive && !isDashboard,
      handleScale: isInteractive && !isDashboard,
    });

    chart.priceScale('left').applyOptions({
      mode: 0,
      borderVisible: false,
    });

    chart.priceScale('right').applyOptions({
      mode: 1,
      borderVisible: false,
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
        setTooltipData({
          date: dateStr,
          txCount: txCountData?.value,
          mvrv: mvrvData?.value,
          price: priceData?.value,
          ratio: ratioData?.value,
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
      priceFormat: {
        type: 'custom',
        minMove: 1,
        formatter: value => value.toFixed(0),
      },
      visible: !txCountMode.startsWith('ratio'),
    });
    txCountSeriesRef.current = txCountSeries;
    const txCountData = txCountMode === 'daily'
      ? filteredTxMvrvData.map(item => ({ time: item.time, value: item.tx_count }))
      : txCountMode === '7-day'
      ? calculateMovingAverage(filteredTxMvrvData, 7, 'tx_count')
      : calculateMovingAverage(filteredTxMvrvData, 28, 'tx_count');
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
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      visible: !txCountMode.startsWith('ratio'),
    });
    mvrvSeriesRef.current = mvrvSeries;
    mvrvSeries.setData(
      filteredTxMvrvData.map(item => ({ time: item.time, value: item.mvrv * 100000 }))
    );

    // MVRV/Tx Ratio Series
    const ratioSeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: ratioColors.lineColor,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      visible: txCountMode.startsWith('ratio'),
    });
    ratioSeriesRef.current = ratioSeries;
    const ratioData = calculateRatio(
      filteredTxMvrvData.map(item => ({ time: item.time, mvrv: item.mvrv })),
      txCountData,
      txCountMode
    );
    ratioSeries.setData(ratioData);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [txMvrvData, btcData, isDashboard, theme.palette.mode, txCountMode]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: isInteractive && !isDashboard,
        handleScale: isInteractive && !isDashboard,
      });
    }
  }, [isInteractive, isDashboard]);

  const indicatorsForMode = getIndicators(txCountMode);

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
            marginTop: '20px',
          }}
        >
          <FormControl sx={{ minWidth: '200px' }}>
            <InputLabel
              id="tx-count-mode-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Display Mode
            </InputLabel>
            <Select
              value={txCountMode}
              onChange={handleTxCountModeChange}
              labelId="tx-count-mode-label"
              label="Display Mode"
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
              <MenuItem value="daily">Daily Tx Count</MenuItem>
              <MenuItem value="7-day">7-day Tx EMA</MenuItem>
              <MenuItem value="28-day">28-day Tx EMA</MenuItem>
              <MenuItem value="ratio">MVRV/Tx Ratio</MenuItem>
              <MenuItem value="ratio-7-day">MVRV/Tx Ratio (7-day EMA)</MenuItem>
              <MenuItem value="ratio-28-day">MVRV/Tx Ratio (28-day EMA)</MenuItem>
            </Select>
          </FormControl>
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
              fontSize: '12px',
            }}
          >
            {!txCountMode.startsWith('ratio') && (
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
            {txCountMode.startsWith('ratio') && (
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
            )}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: indicatorsForMode['price'].color,
                  marginRight: '5px',
                }}
              />
              {indicatorsForMode['price'].label}
            </div>
          </div>
        )}
      </div>

      <div className='under-chart'>
        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {txMvrvLastUpdated}</span>
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <Box sx={{ margin: '10px 0', color: colors.grey[100] }}>
          {Object.entries(indicatorsForMode).map(([key, { label, color, description }]) => (
            (!txCountMode.startsWith('ratio') || key === 'ratio' || key === 'price') && (
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
          <div style={{ fontSize: '15px', color: indicatorsForMode['price'].color }}>
            BTC price: ${tooltipData.price ? (tooltipData.price / 1000).toFixed(1) + 'k' : 'N/A'}
          </div>
          {!txCountMode.startsWith('ratio') && (
            <>
              <div style={{ color: indicatorsForMode['tx-count'].color }}>
                {indicatorsForMode['tx-count'].label}: {tooltipData.txCount?.toFixed(0) ?? 'N/A'}
              </div>
              <div style={{ color: indicatorsForMode['mvrv'].color }}>
                MVRV: {(tooltipData.mvrv / 100000)?.toFixed(2) ?? 'N/A'}
              </div>
            </>
          )}
          {txCountMode.startsWith('ratio') && (
            <div style={{ color: indicatorsForMode['ratio'].color }}>
              {indicatorsForMode['ratio'].label}: {tooltipData.ratio?.toFixed(2) ?? 'N/A'}
            </div>
          )}
          <div>{tooltipData.date?.toString()}</div>
        </div>
      )}

      {!isDashboard && (
        <p className='chart-info'>
          The Bitcoin Tx Count, Price & MVRV chart shows the {txCountMode === 'daily' ? 'daily transaction count' : txCountMode === '7-day' ? '7-day EMA of transaction count' : txCountMode === '28-day' ? '28-day EMA of transaction count' : 'MVRV-to-transaction-count ratio with'} and scaled MVRV (left axis, linear) and Bitcoin price (right axis, logarithmic) starting from October 21, 2014, illustrating network activity, price trends, and valuation. {txCountMode.startsWith('ratio') ? 'The MVRV/Tx Ratio is the normalized MVRV divided by normalized transaction count, dynamically normalized to a rolling maximum and optionally smoothed with an exponential moving average.' : 'MVRV is scaled by 100,000 to fit the linear axis.'}
          <br />
          <br />
          This chart shows the Bitcoin transaction count, Bitcoin price, MVRV ratio, or MVRV/Tx ratio, providing a snapshot of how Bitcoin’s network and value interact over time.
          The transaction count shows how much people are using Bitcoin—more transactions often mean more activity or interest.
          The price, shown on a special scale to make big trends clearer, tells you what Bitcoin is worth in dollars.
          The MVRV ratio acts like a thermometer for whether Bitcoin is overpriced or underpriced compared to what people paid for it.
          The MVRV/Tx ratio compares valuation to network activity, where high values may suggest overvaluation (market tops) and low values may indicate undervaluation (market bottoms).
          Together, these indicators can hint at patterns: for example, a rising transaction count with a climbing price might suggest growing demand,
          while a high MVRV or MVRV/Tx ratio could warn that Bitcoin’s price is getting ahead of its "true" value, possibly signaling a market peak.
          <br /><br /><br />
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinTxMvrvChart);