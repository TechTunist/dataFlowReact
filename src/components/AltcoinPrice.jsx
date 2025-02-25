import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';

const AltcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const priceSeriesRef = useRef(null);
    const smaSeriesRefs = useRef({}).current; // Object to store SMA series references
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(0); // 0: linear, 1: logarithmic
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [selectedCoin, setSelectedCoin] = useState('SOL');
    const [denominator, setDenominator] = useState('USD');
    const [btcData, setBtcData] = useState([]);
    const [altData, setAltData] = useState([]);
    const [activeIndicators, setActiveIndicators] = useState([]); // Array for selected indicators
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const isMobile = useIsMobile();

    // Define available indicators
    const indicators = {
        '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
        '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
        '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
        '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
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
        setActiveIndicators(event.target.value);
    };

    // Fetch data for altcoin and BTC
    useEffect(() => {
        const cacheKey = `${selectedCoin.toLowerCase()}Data`;
        const cacheKeyBtc = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const cachedDataBtc = localStorage.getItem(cacheKeyBtc);
        const today = new Date();

        const fetchAltData = () => {
            fetch(`https://tunist.pythonanywhere.com/api/${selectedCoin.toLowerCase()}/price/`)
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: item.date,
                        value: parseFloat(item.close)
                    }));
                    setAltData(formattedData);
                    localStorage.setItem(cacheKey, JSON.stringify(formattedData));
                })
                .catch(error => console.error('Error fetching altcoin data: ', error));
        };

        const fetchBtcData = () => {
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: item.date,
                        value: parseFloat(item.close)
                    }));
                    setBtcData(formattedData);
                    localStorage.setItem(cacheKeyBtc, JSON.stringify(formattedData));
                })
                .catch(error => console.error('Error fetching BTC data: ', error));
        };

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.length > 0) {
                const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
                if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                    setAltData(parsedData);
                } else {
                    fetchAltData();
                }
            } else {
                fetchAltData();
            }
        } else {
            fetchAltData();
        }

        if (cachedDataBtc) {
            const parsedDataBtc = JSON.parse(cachedDataBtc);
            const lastCachedDateBtc = new Date(parsedDataBtc[parsedDataBtc.length - 1].time);
            if (lastCachedDateBtc.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setBtcData(parsedDataBtc);
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }
    }, [selectedCoin]);

    // Compute chart data based on denominator
    useEffect(() => {
        if (denominator === 'USD') {
            setChartData(altData);
        } else if (denominator === 'BTC' && btcData.length > 0) {
            const newDataset = altData.map(altEntry => {
                const btcEntry = btcData.find(btc => btc.time === altEntry.time);
                return btcEntry ? { ...altEntry, value: altEntry.value / btcEntry.value } : null;
            }).filter(Boolean);
            setChartData(newDataset);
        }
    }, [denominator, altData, btcData]);

    // Initialize chart once on mount
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
            priceFormat: { type: 'price', precision: denominator === 'BTC' ? 8 : 2, minMove: denominator === 'BTC' ? 0.00000001 : 0.01 },
        });
        priceSeriesRef.current = priceSeries;

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const data = param.seriesData.get(priceSeries);
                setTooltipData({ date: dateStr, price: data?.value, x: param.point.x, y: param.point.y });
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
    }, []); // Empty dependency array ensures chart is created only once

    // Update scale mode
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({ mode: scaleMode, borderVisible: false });
        }
    }, [scaleMode]);

    // Update price series data
    useEffect(() => {
        if (priceSeriesRef.current && chartData.length > 0) {
            priceSeriesRef.current.setData(chartData);
            chartRef.current.timeScale().fitContent();
        }
    }, [chartData]);

    // Update indicators
    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return;

        // Remove all existing SMA series
        Object.keys(smaSeriesRefs).forEach(key => {
            if (smaSeriesRefs[key]) {
                chartRef.current.removeSeries(smaSeriesRefs[key]);
                delete smaSeriesRefs[key];
            }
        });

        // Add active indicators
        activeIndicators.forEach(key => {
            const indicator = indicators[key];
            const series = chartRef.current.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                priceLineVisible: false,
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
    }, [theme.palette.mode]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <label className="switch">
                            <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                            <span className="slider round"></span>
                        </label>
                        <span style={{ color: colors.primary[100] }}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            onClick={setInteractivity}
                            className="button-reset"
                            style={{
                                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                color: isInteractive ? 'black' : '#31d6aa',
                                borderColor: isInteractive ? 'violet' : '#70d8bd'
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
                    border: '2px solid #a9a9a9'
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
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
                                marginRight: '5px'
                            }}
                        />
                        {selectedCoin} Price
                    </div>
                    {activeIndicators.map(key => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: indicators[key].color,
                                    marginRight: '5px'
                                }}
                            />
                            {indicators[key].label}
                        </div>
                    ))}
                </div>
            </div>
            {!isDashboard && (
                <div className='under-chart' style={{ padding: '10px 0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '800px', margin: '0 auto', flexWrap: 'wrap', gap: '10px' }}>
                        <LastUpdated storageKey={`${selectedCoin.toLowerCase()}Data`} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '20px' }}>
                        <FormControl sx={{ width: { xs: '100%', sm: '300px' }, maxWidth: '800px' }} key={activeIndicators.join('-')}>
                            <InputLabel sx={{ color: colors.grey[100] }}>Indicators</InputLabel>
                            <Select
                                multiple
                                value={activeIndicators}
                                onChange={handleIndicatorChange}
                                label="Indicators"
                                sx={{
                                    color: colors.grey[100],
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                                }}
                            >
                                {Object.entries(indicators).map(([key, { label }]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </div>
            )}
            <div className="chart-bottom-div">
                <div>
                    {!isDashboard && (
                        <button className="select-reset" onClick={() => setDenominator(denominator === 'USD' ? 'BTC' : 'USD')}>
                            {selectedCoin} / {denominator}
                        </button>
                    )}
                </div>
                <div>
                    {!isDashboard && (
                        <div className="select-reset-wrapper">
                            <select className="select-reset" value={selectedCoin} onChange={(e) => setSelectedCoin(e.target.value)}>
                                {altcoins.map((coin) => (
                                    <option key={coin.value} value={coin.value}>{coin.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
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
                    <div style={{ fontSize: '20px' }}>
                        {denominator === 'BTC' ? '₿' : '$'}
                        {denominator === 'BTC' ? tooltipData.price.toFixed(8) : tooltipData.price.toFixed(3)}
                    </div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {!isDashboard && (
                <p className='chart-info'>
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

export default AltcoinPrice;