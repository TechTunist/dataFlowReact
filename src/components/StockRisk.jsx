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
import {
  calculateStockRiskMetricByVersion,
  STOCK_RISK_METRIC_VERSIONS,
} from '../utility/stockRiskMetric';
import { stockLoadingMessage, stockRiskInsufficientHistoryMessage } from '../config/stocksConfig';
import StockGroupSelect from './StockGroupSelect';
import ChartInfoSections from './ChartInfoSections';

const STOCK_RISK_VERSION_STORAGE_KEY = 'stockRiskMetricVersion';

const StockRisk = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef(null);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedCoin, setSelectedCoin] = useState('TSLA');
  const [denominator, setDenominator] = useState('USD');
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();
  const [tooltipData, setTooltipData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStockPrice, setCurrentStockPrice] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [riskMetricVersion, setRiskMetricVersion] = useState(() => {
    try {
      const stored = localStorage.getItem(STOCK_RISK_VERSION_STORAGE_KEY);
      return stored === 'v2' ? 'v2' : 'v1';
    } catch {
      return 'v1';
    }
  });
  const { altcoinData, fetchAltcoinData, btcData, fetchBtcData, isAltcoinDataFetched } = useContext(DataContext);

  const handleSelectChange = (event) => {
    setSelectedCoin(event.target.value);
  };

  const handleDenominatorChange = (event) => {
    setDenominator(event.target.value);
  };

  const handleRiskMetricVersionChange = (event) => {
    const nextVersion = event.target.value;
    setRiskMetricVersion(nextVersion);
    try {
      localStorage.setItem(STOCK_RISK_VERSION_STORAGE_KEY, nextVersion);
    } catch {
      // ignore storage failures
    }
    resetChartView();
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!altcoinData[selectedCoin]?.length) {
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

  const chartSourceData = altcoinData[selectedCoin] ?? [];
  const isSourceDataReady = Boolean(
    isAltcoinDataFetched[selectedCoin] && altcoinData[selectedCoin] !== undefined
  );

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
        const withRiskMetric = calculateStockRiskMetricByVersion(baseData, riskMetricVersion);
        setChartData(withRiskMetric);
      } else {
        setChartData([]);
      }
    } else {
      setChartData([]);
    }
  }, [altcoinData, selectedCoin, denominator, btcData, riskMetricVersion]);

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
      setCurrentStockPrice(price);
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
            <InputLabel id="stock-label" shrink sx={{ color: colors.grey[100], '&.Mui-focused': { color: colors.greenAccent[500] }, top: 0, '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' } }}>Stock</InputLabel>
            <StockGroupSelect
              value={selectedCoin}
              onChange={handleSelectChange}
              label="Stock"
              labelId="stock-label"
              colors={colors}
            />
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
          <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '240px' } }}>
            <InputLabel id="risk-model-label" shrink sx={{ color: colors.grey[100], '&.Mui-focused': { color: colors.greenAccent[500] }, top: 0, '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' } }}>Risk Model</InputLabel>
            <Select
              value={riskMetricVersion}
              onChange={handleRiskMetricVersionChange}
              label="Risk Model"
              labelId="risk-model-label"
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
              {Object.entries(STOCK_RISK_METRIC_VERSIONS).map(([value, config]) => (
                <MenuItem key={value} value={value}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      {!isDashboard && (
        <div className='chart-top-div'>
          <div className='span-container'>
            <span style={{ marginRight: '20px', display: 'inline-block' }}><span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>Stock Price {denominator === 'BTC' ? '(BTC)' : '(USD)'}</span>
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
        {chartData.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.grey[100],
              zIndex: 2,
              padding: '1rem',
              textAlign: 'center',
            }}
          >
            {!isSourceDataReady || isLoading || chartSourceData.length === 0
              ? stockLoadingMessage(selectedCoin)
              : stockRiskInsufficientHistoryMessage(chartSourceData.length)}
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
              Current Risk level: <b style={{ color: colors.greenAccent[500] }}>{currentRiskLevel}</b> ({denominator === 'BTC' ? '₿' : '$'}{currentStockPrice})
            </span>
          </UnderChartValue>
          <ChartInfoSections
            sections={[
              {
                title: 'What it is',
                content:
                  'A dual-axis view of stock price (grey, left) and a 0-1 risk metric (pink, right) for the selected stock in USD or BTC terms. Stocks carry company-specific and sector risks (earnings misses, competition, regulation, macro cycles) on top of market beta. Unlike altcoins, established stocks have real cash flows and balance sheets, but can still experience sharp drawdowns.',
              },
              {
                title: 'How it is built',
                content:
                  riskMetricVersion === 'v2'
                    ? 'High-band resistance (v2) uses the same v1 pipeline but adds grind resistance above 0.5 before tail compression. Steady climbs are slowed, while genuine blow-offs (price far above the rolling upper band) can still spike toward 1.0 briefly, then fade as the band catches up. Switch back to Stable (v1) any time via the Risk Model selector.'
                    : 'Stable v1 compares price to its 200-day average, maps that ratio into a 0-1 band from 3-year history, smooths over 21 days, then applies log-odds tail compression so readings only reach the outer extremes when price is genuinely stretched beyond its normal range.',
              },
              {
                title: 'How to interpret',
                content:
                  'Mid-range scores (0.35-0.65) are typical. Readings near 0.8+ or below 0.2 require strong extension. Since Bitcoin often acts as a high-beta risk-on asset, comparing stock performance vs BTC can highlight relative strength or weakness. The current risk readout above summarizes the latest score alongside price.',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(StockRisk);