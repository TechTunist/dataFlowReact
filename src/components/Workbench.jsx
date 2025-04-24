import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox } from '@mui/material';

// Color mapping for named colors to RGB
const colorMap = {
  orange: '255, 165, 0',
  blue: '0, 0, 255',
  purple: '128, 0, 128',
  green: '50, 128, 50',
  red: '255, 0, 0',
  cyan: '0, 255, 255',
  magenta: '255, 0, 255',
  gray: '128, 128, 128',
  yellow: '255, 255, 0',
  teal: '0, 128, 128',
  pink: '255, 141, 161',
  white: '255, 255, 255',
  rec: '200, 200, 200',
  gold: '255, 215, 0',
};

// Available FRED series for selection
const availableFredSeries = {
  UMCSENT: { label: 'Consumer Sentiment (UMCSI)', color: 'orange', chartType: 'area', scaleId: 'umcsent-scale', allowLogScale: true },
  SP500: { label: 'S&P 500 Index', color: 'blue', chartType: 'area', scaleId: 'sp500-scale', allowLogScale: true },
  DFF: { label: 'Federal Funds Rate', color: 'purple', chartType: 'line', scaleId: 'dff-scale', allowLogScale: true },
  CPIAUCSL: { label: 'Consumer Price Index (CPI)', color: 'green', chartType: 'area', scaleId: 'cpi-scale', allowLogScale: true },
  UNRATE: { label: 'Unemployment Rate', color: 'red', chartType: 'area', scaleId: 'unrate-scale', allowLogScale: true },
  DGS10: { label: '10-Year Treasury Yield', color: 'cyan', chartType: 'line', scaleId: 'dgs10-scale', allowLogScale: true },
  T10Y2Y: { label: '10Y-2Y Treasury Spread', color: 'magenta', chartType: 'line', scaleId: 't10y2y-scale', allowLogScale: true }, // Can be negative
  USRECD: { label: 'U.S. Recession Indicator', color: 'rgba(28, 28, 28, 0.1)', chartType: 'histogram', scaleId: 'usrecd-scale', allowLogScale: true }, // Contains zeros
  M2SL: { label: 'M2 Money Supply', color: 'yellow', chartType: 'area', scaleId: 'm2sl-scale', allowLogScale: true },
  GDPC1: { label: 'U.S. GDP', color: 'white', chartType: 'area', scaleId: 'gdpc1-scale', allowLogScale: true },
  PAYEMS: { label: 'Nonfarm Payrolls', color: 'gray', chartType: 'area', scaleId: 'payems-scale', allowLogScale: true },
  HOUST: { label: 'Housing Starts', color: 'pink', chartType: 'area', scaleId: 'houst-scale', allowLogScale: true },
  VIXCLS: { label: 'VIX Volatility Index', color: 'teal', chartType: 'line', scaleId: 'vixcls-scale', allowLogScale: true },
};

// Available Crypto series for selection (all share the same scale)
const availableCryptoSeries = {
  BTC: { label: 'Bitcoin (BTC)', color: 'gold', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'btcData', fetchFunction: 'fetchBtcData', allowLogScale: true },
  ETH: { label: 'Ethereum (ETH)', color: 'purple', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'ethData', fetchFunction: 'fetchEthData', allowLogScale: true },
  LTC: { label: 'Litecoin (LTC)', color: 'gray', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'LTC', allowLogScale: true },
  XRP: { label: 'Ripple (XRP)', color: 'blue', chartType: 'line', scaleId: 'crypto-shared-scale', dataKey: 'altcoinData', fetchFunction: 'fetchAltcoinData', coin: 'XRP', allowLogScale: true },
};

const WorkbenchChart = ({
  seriesId,
  isDashboard = false,
  chartType = 'area',
  valueFormatter = value => value.toLocaleString(),
  explanation = '',
  scaleMode = 'linear',
}) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRefs = useRef({}); // Store references to all series
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { fredSeriesData, fetchFredSeriesData, btcData, fetchBtcData, ethData, fetchEthData, altcoinData, fetchAltcoinData } = useContext(DataContext);

  const initialScaleMode = scaleMode === 'logarithmic' ? 1 : 0;
  const [scaleModeState, setScaleModeState] = useState(initialScaleMode);
  const [tooltipData, setTooltipData] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFredSeries, setActiveFredSeries] = useState([]); // FRED series
  const [activeCryptoSeries, setActiveCryptoSeries] = useState([]); // Crypto series
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
  const toggleScaleMode = useCallback(() => setScaleModeState(prev => (prev === 1 ? 0 : 1)), []);
  const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);

  // Handle FRED series selection change
  const handleFredSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveFredSeries(selected);
    selected.forEach(id => {
      if (!fredSeriesData[id]) {
        setIsLoading(true);
        setError(null);
        fetchFredSeriesData(id)
          .catch(err => {
            setError(`Failed to fetch data for ${id}. Please try again later.`);
            console.error(`Error fetching ${id}:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };

  // Handle Crypto series selection change
  const handleCryptoSeriesChange = (event) => {
    const selected = event.target.value;
    setActiveCryptoSeries(selected);
    selected.forEach(id => {
      const seriesInfo = availableCryptoSeries[id];
      const fetchFunction = seriesInfo.fetchFunction;
      if (fetchFunction === 'fetchBtcData' && btcData.length === 0) {
        setIsLoading(true);
        setError(null);
        fetchBtcData()
          .catch(err => {
            setError(`Failed to fetch Bitcoin data. Please try again later.`);
            console.error(`Error fetching Bitcoin data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (fetchFunction === 'fetchEthData' && ethData.length === 0) {
        setIsLoading(true);
        setError(null);
        fetchEthData()
          .catch(err => {
            setError(`Failed to fetch Ethereum data. Please try again later.`);
            console.error(`Error fetching Ethereum data:`, err);
          })
          .finally(() => setIsLoading(false));
      } else if (fetchFunction === 'fetchAltcoinData' && (!altcoinData[seriesInfo.coin] || altcoinData[seriesInfo.coin].length === 0)) {
        setIsLoading(true);
        setError(null);
        fetchAltcoinData(seriesInfo.coin)
          .catch(err => {
            setError(`Failed to fetch ${seriesInfo.coin} data. Please try again later.`);
            console.error(`Error fetching ${seriesInfo.coin} data:`, err);
          })
          .finally(() => setIsLoading(false));
      }
    });
  };

  // Initialize chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart container is not available');
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
      grid: { vertLines: { color: colors.greenAccent[700] }, horzLines: { color: colors.greenAccent[700] } },
      timeScale: { minBarSpacing: 0.001 },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        visible: false,
      },
    });
    chartRef.current = chart;

    const resizeChart = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
      chart.timeScale().fitContent();
    };
    window.addEventListener('resize', resizeChart);

    return () => {
      chart.remove();
      window.removeEventListener('resize', resizeChart);
    };
  }, [colors, theme.palette.mode]);

  // Update chart when series or data changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Define price scales for all possible series (FRED + shared crypto scale)
    const priceScales = Object.keys(availableFredSeries).reduce((acc, id) => {
      const seriesInfo = availableFredSeries[id];
      const mode = seriesInfo.allowLogScale && scaleModeState === 1 ? 1 : 0;
      return {
        ...acc,
        [seriesInfo.scaleId]: {
          mode,
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.05 },
          position: 'right',
          width: 50,
        },
      };
    }, {});
    const cryptoMode = activeCryptoSeries.every(id => availableCryptoSeries[id].allowLogScale) && scaleModeState === 1 ? 1 : 0;
    priceScales['crypto-shared-scale'] = {
      mode: cryptoMode,
      borderVisible: false,
      scaleMargins: { top: 0.05, bottom: 0.05 },
      position: 'right',
      width: 50,
    };

    // Apply the price scales to the chart
    chartRef.current.applyOptions({
      additionalPriceScales: priceScales,
    });

    // Clear existing series
    Object.keys(seriesRefs.current).forEach(id => {
      chartRef.current.removeSeries(seriesRefs.current[id]);
      delete seriesRefs.current[id];
    });

    // Combine FRED and Crypto series, ensuring USRECD is at the back
    const allSeries = [
      ...activeFredSeries.map(id => ({ id, type: 'fred' })),
      ...activeCryptoSeries.map(id => ({ id, type: 'crypto' })),
    ];
    const sortedSeries = allSeries.sort((a, b) => {
      if (a.id === 'USRECD') return 1;
      if (b.id === 'USRECD') return -1;
      return 0;
    });

    // Add series to the chart
    sortedSeries.forEach(({ id, type }) => {
      const seriesInfo = type === 'fred' ? availableFredSeries[id] : availableCryptoSeries[id];
      const rgbColor = colorMap[seriesInfo.color] || seriesInfo.color;
      let series;
      if (seriesInfo.chartType === 'area') {
        series = chartRef.current.addAreaSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          topColor: `rgba(${rgbColor}, 0.56)`,
          bottomColor: `rgba(${rgbColor}, 0.04)`,
          lineColor: seriesInfo.color,
        });
      } else if (seriesInfo.chartType === 'line') {
        series = chartRef.current.addLineSeries({
          priceScaleId: seriesInfo.scaleId,
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesInfo.color,
        });
      } else if (seriesInfo.chartType === 'histogram') {
        series = chartRef.current.addHistogramSeries({
          priceScaleId: seriesInfo.scaleId,
          priceFormat: {
            type: 'custom',
            minMove: 0.01,
            formatter: valueFormatter,
          },
          color: seriesInfo.color,
        });
      }
      seriesRefs.current[id] = series;

      // Set data based on type
      let data = [];
      if (type === 'fred' && fredSeriesData[id]?.length > 0) {
        data = fredSeriesData[id]
          .filter(item => item.value != null && !isNaN(item.value))
          .sort((a, b) => new Date(a.time) - new Date(b.time));
      } else if (type === 'crypto') {
        if (seriesInfo.dataKey === 'btcData' && btcData.length > 0) {
          data = btcData;
        } else if (seriesInfo.dataKey === 'ethData' && ethData.length > 0) {
          data = ethData;
        } else if (seriesInfo.dataKey === 'altcoinData' && altcoinData[seriesInfo.coin]?.length > 0) {
          data = altcoinData[seriesInfo.coin];
        }
      }
      if (data.length > 0) {
        try {
          series.setData(data);
        } catch (err) {
          console.error(`Error setting data for series ${id}:`, err);
          setError(`Failed to display ${seriesInfo.label}. The data may be incompatible with the current scale.`);
          // If setting data fails due to scale incompatibility, force linear scale for this series
          chartRef.current.priceScale(seriesInfo.scaleId).applyOptions({ mode: 0 });
          // If this series cannot use logarithmic scale, update the global scaleModeState
          if (scaleModeState === 1 && !seriesInfo.allowLogScale) {
            setScaleModeState(0);
          }
        }
      }
    });

    // Set up the tooltip handler
    chartRef.current.subscribeCrosshairMove(param => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        setTooltipData(null);
        return;
      }

      const tooltip = {
        date: param.time,
        values: {},
        x: param.point.x,
        y: param.point.y,
      };

      sortedSeries.forEach(({ id }) => {
        const series = seriesRefs.current[id];
        const data = param.seriesData.get(series);
        tooltip.values[id] = data?.value ?? null;
      });

      setTooltipData(tooltip);
    });

    // Fit content if there are active series with data
    if (sortedSeries.some(({ id, type }) => {
      if (type === 'fred') return fredSeriesData[id]?.length > 0;
      const seriesInfo = availableCryptoSeries[id];
      if (seriesInfo.dataKey === 'btcData') return btcData.length > 0;
      if (seriesInfo.dataKey === 'ethData') return ethData.length > 0;
      if (seriesInfo.dataKey === 'altcoinData') return altcoinData[seriesInfo.coin]?.length > 0;
      return false;
    })) {
      chartRef.current.timeScale().fitContent();
    }

    return () => {
      chartRef.current?.unsubscribeCrosshairMove();
    };
  }, [fredSeriesData, btcData, ethData, altcoinData, activeFredSeries, activeCryptoSeries, chartType, valueFormatter, scaleModeState]);

  // Update scale mode when scaleModeState changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Check if any active series cannot use logarithmic scale
    const hasIncompatibleSeries = [
      ...activeFredSeries.map(id => availableFredSeries[id]),
      ...activeCryptoSeries.map(id => availableCryptoSeries[id]),
    ].some(seriesInfo => !seriesInfo.allowLogScale);

    // If there are incompatible series and scaleModeState is logarithmic, force it to linear
    if (hasIncompatibleSeries && scaleModeState === 1) {
      setScaleModeState(0);
      return;
    }

    // Update FRED series scales
    activeFredSeries.forEach(id => {
      const seriesInfo = availableFredSeries[id];
      const scaleId = seriesInfo?.scaleId || 'right';
      const mode = seriesInfo.allowLogScale && scaleModeState === 1 ? 1 : 0;
      try {
        chartRef.current.priceScale(scaleId).applyOptions({ mode });
      } catch (err) {
        console.error(`Failed to apply scale mode for ${id} (scale: ${scaleId}):`, err);
        setError(`Cannot apply ${scaleModeState === 1 ? 'logarithmic' : 'linear'} scale to ${seriesInfo.label}. Using linear scale instead.`);
        chartRef.current.priceScale(scaleId).applyOptions({ mode: 0 });
        // Update scaleModeState to reflect the fallback
        if (scaleModeState === 1) {
          setScaleModeState(0);
        }
      }
    });

    // Update shared crypto scale if any crypto series are active
    if (activeCryptoSeries.length > 0) {
      const cryptoCanUseLog = activeCryptoSeries.every(id => availableCryptoSeries[id].allowLogScale);
      const mode = cryptoCanUseLog && scaleModeState === 1 ? 1 : 0;
      try {
        chartRef.current.priceScale('crypto-shared-scale').applyOptions({ mode });
      } catch (err) {
        console.error(`Failed to apply scale mode for crypto-shared-scale:`, err);
        setError(`Cannot apply ${scaleModeState === 1 ? 'logarithmic' : 'linear'} scale to crypto series. Using linear scale instead.`);
        chartRef.current.priceScale('crypto-shared-scale').applyOptions({ mode: 0 });
        // Update scaleModeState to reflect the fallback
        if (scaleModeState === 1) {
          setScaleModeState(0);
        }
      }
    }
  }, [scaleModeState, activeFredSeries, activeCryptoSeries]);

  // Update interactivity
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
    }
  }, [isInteractive]);

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
          {/* FRED Series Dropdown */}
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="fred-series-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              FRED Series
            </InputLabel>
            <Select
              multiple
              value={activeFredSeries}
              onChange={handleFredSeriesChange}
              labelId="fred-series-label"
              label="FRED Series"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((id) => availableFredSeries[id]?.label || id).join(', ')
                  : 'Select FRED Series'
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
              {Object.entries(availableFredSeries).map(([id, { label }]) => (
                <MenuItem key={id} value={id}>
                  <Checkbox
                    checked={activeFredSeries.includes(id)}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{label}</span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Crypto Series Dropdown */}
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
            <InputLabel
              id="crypto-series-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Crypto Series
            </InputLabel>
            <Select
              multiple
              value={activeCryptoSeries}
              onChange={handleCryptoSeriesChange}
              labelId="crypto-series-label"
              label="Crypto Series"
              displayEmpty
              renderValue={(selected) =>
                selected.length > 0
                  ? selected.map((id) => availableCryptoSeries[id]?.label || id).join(', ')
                  : 'Select Crypto Series'
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
              {Object.entries(availableCryptoSeries).map(([id, { label }]) => (
                <MenuItem key={id} value={id}>
                  <Checkbox
                    checked={activeCryptoSeries.includes(id)}
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
        <div className='chart-top-div'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: colors.primary[100] }}>{scaleModeState === 1 ? 'Logarithmic' : 'Linear'}</span>
            {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={setInteractivity} className="button-reset" style={{ backgroundColor: isInteractive ? '#4cceac' : 'transparent', color: isInteractive ? 'black' : '#31d6aa', borderColor: isInteractive ? 'violet' : '#70d8bd' }}>
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button onClick={resetChartView} className="button-reset extra-margin">Reset Chart</button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {activeFredSeries.length === 0 && activeCryptoSeries.length === 0 && !isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: colors.grey[100],
              fontSize: '16px',
              zIndex: 2,
            }}
          >
            Select a series to display
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
          {!isDashboard && <div>Active Series</div>}
          {[...activeFredSeries, ...activeCryptoSeries].map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  backgroundColor: (availableFredSeries[id] || availableCryptoSeries[id])?.color || 'cyan',
                  marginRight: '5px',
                }}
              />
              {(availableFredSeries[id] || availableCryptoSeries[id])?.label || id}
            </div>
          ))}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && [...activeFredSeries, ...activeCryptoSeries].some(id => {
          if (activeFredSeries.includes(id)) return fredSeriesData[id]?.length > 0;
          const seriesInfo = availableCryptoSeries[id];
          if (seriesInfo.dataKey === 'btcData') return btcData.length > 0;
          if (seriesInfo.dataKey === 'ethData') return ethData.length > 0;
          if (seriesInfo.dataKey === 'altcoinData') return altcoinData[seriesInfo.coin]?.length > 0;
          return false;
        }) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...[...activeFredSeries, ...activeCryptoSeries].map(id => {
                    if (activeFredSeries.includes(id) && fredSeriesData[id]?.length > 0) {
                      return new Date(fredSeriesData[id][fredSeriesData[id].length - 1].time).getTime();
                    } else if (activeCryptoSeries.includes(id)) {
                      const seriesInfo = availableCryptoSeries[id];
                      if (seriesInfo.dataKey === 'btcData' && btcData.length > 0) {
                        return new Date(btcData[btcData.length - 1].time).getTime();
                      } else if (seriesInfo.dataKey === 'ethData' && ethData.length > 0) {
                        return new Date(ethData[ethData.length - 1].time).getTime();
                      } else if (seriesInfo.dataKey === 'altcoinData' && altcoinData[seriesInfo.coin]?.length > 0) {
                        return new Date(altcoinData[seriesInfo.coin][altcoinData[seriesInfo.coin].length - 1].time).getTime();
                      }
                    }
                    return 0;
                  })
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {!isDashboard && tooltipData && (activeFredSeries.length > 0 || activeCryptoSeries.length > 0) && (
        <div className="tooltip" style={{
          left: (() => {
            const sidebarWidth = isMobile ? -80 : -320;
            const cursorX = tooltipData.x - sidebarWidth;
            const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
            const tooltipWidth = 200;
            const offset = 10000 / (chartWidth + 300);
            const rightPosition = cursorX + offset;
            const leftPosition = cursorX - tooltipWidth - offset;
            return rightPosition + tooltipWidth <= chartWidth ? `${rightPosition}px` : (leftPosition >= 0 ? `${leftPosition}px` : `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`);
          })(),
          top: `${tooltipData.y + 100}px`,
        }}>
          {[...activeFredSeries, ...activeCryptoSeries].map(id => (
            <div key={id}>
              <div style={{ fontSize: '15px' }}>{(availableFredSeries[id] || availableCryptoSeries[id])?.label || id}</div>
              <div style={{ fontSize: '20px' }}>{tooltipData.values[id] != null ? valueFormatter(tooltipData.values[id]) : 'N/A'}</div>
            </div>
          ))}
          <div>{tooltipData.date.toString().substring(0, 4) === currentYear ? `${tooltipData.date} - latest` : tooltipData.date}</div>
        </div>
      )}
      {!isDashboard && explanation && (
        <p className='chart-info'>
          {explanation}
        </p>
      )}
    </div>
  );
};

export default WorkbenchChart;