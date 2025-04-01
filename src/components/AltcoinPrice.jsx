import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { Select, MenuItem, FormControl, InputLabel, Box, Checkbox } from '@mui/material';

const AltcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const priceSeriesRef = useRef(null);
    const smaSeriesRefs = useRef({}).current; // Object to store SMA series references
    const fedBalanceSeriesRef = useRef(null); // Ref for Fed balance series
    const [fedBalanceData, setFedBalanceData] = useState([]); // State for Fed balance data
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

    // Define available indicators, including Fed balance
    const indicators = {
        '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
        '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
        '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
        '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
        'fed-balance': { color: 'purple', label: 'Fed Balance (Trillions)' }, // New Fed balance indicator
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
        const newIndicators = event.target.value;
        setActiveIndicators(newIndicators);
    };

    // Fetch data for altcoin and BTC
    useEffect(() => {
        const cacheKey = `${selectedCoin.toLowerCase()}Data`;
        const cacheKeyBtc = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const cachedDataBtc = localStorage.getItem(cacheKeyBtc);
        const today = new Date();

        const fetchAltData = () => {
            // fetch(`https://tunist.pythonanywhere.com/api/${selectedCoin.toLowerCase()}/price/`)
            fetch(`https://vercel-dataflow.vercel.app/api/${selectedCoin.toLowerCase()}/price/`)
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
            // fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            fetch('https://vercel-dataflow.vercel.app/api/btc/price/')
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

    // Fetch Federal Reserve balance data
    useEffect(() => {
        const cacheKeyFed = 'fedBalanceData';
        const cachedFedData = localStorage.getItem(cacheKeyFed);

        if (cachedFedData) {
            const parsedFedData = JSON.parse(cachedFedData);
            setFedBalanceData(parsedFedData);
        } else {
            fetchFedBalanceData();
        }

        function fetchFedBalanceData() {
            // fetch('https://tunist.pythonanywhere.com/api/fed-balance/')
            fetch('https://vercel-dataflow.vercel.app/api/fed-balance/')
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: item.observation_date, // Use observation_date as time
                        value: parseFloat(item.value) / 1000 // Convert from millions to trillions for scaling
                    }));
                    setFedBalanceData(formattedData);
                    localStorage.setItem(cacheKeyFed, JSON.stringify(formattedData));
                })
                .catch(error => console.error('Error fetching Federal Reserve balance data: ', error));
        }
    }, []);

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
            priceScaleId: 'right', // Altcoin price on the right
            lineWidth: 2,
            priceFormat: { type: 'price', precision: denominator === 'BTC' ? 8 : 2, minMove: denominator === 'BTC' ? 0.00000001 : 0.01 },
        });
        priceSeriesRef.current = priceSeries;

        // Add Federal Reserve balance series (initially hidden) on the left price scale
        const fedBalanceSeries = chart.addLineSeries({
            priceScaleId: 'left', // Fed balance on the left
            color: indicators['fed-balance'].color, // Use color from indicators
            lineWidth: 2,
            priceLineVisible: false,
            visible: activeIndicators.includes('fed-balance'), // Controlled by indicators selection
        });
        fedBalanceSeriesRef.current = fedBalanceSeries; // Store the series in the ref

        // Configure right price scale for altcoin price
        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: {
                type: 'custom',
                formatter: (value) => {
                    if (denominator === 'BTC') return `₿${value.toFixed(8)}`; // Format in BTC
                    return `$${value.toFixed(2)}`; // Format in USD
                },
            },
        });

        // Configure left price scale for Fed balance
        chart.priceScale('left').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: {
                type: 'custom',
                formatter: (value) => `$${value.toFixed(2)}T`, // Format Fed balance in trillions
            },
        });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const priceData = param.seriesData.get(priceSeriesRef.current);
                const fedData = param.seriesData.get(fedBalanceSeriesRef.current); // Use the ref here
                setTooltipData({
                    date: dateStr,
                    price: priceData?.value,
                    fedBalance: fedData?.value,
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
    }, []); // Empty dependency array ensures chart is created only once

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

    // Update Fed balance series data (filtered to match altcoin time range)
    useEffect(() => {
        if (fedBalanceSeriesRef.current && chartData.length > 0 && fedBalanceData.length > 0) {
            // Filter Fed balance data to only include dates within altcoin data range
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

        // Remove all existing SMA series
        Object.keys(smaSeriesRefs).forEach(key => {
            if (smaSeriesRefs[key]) {
                chartRef.current.removeSeries(smaSeriesRefs[key]);
                delete smaSeriesRefs[key];
            }
        });

        // Add active indicators (including Fed balance)
        activeIndicators.forEach(key => {
            if (key === 'fed-balance') {
                // Fed balance is handled separately in its own useEffect
                return;
            }
            const indicator = indicators[key];
            const series = chartRef.current.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                priceLineVisible: false,
                priceScaleId: 'right', // Ensure indicators use the right price scale
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
                            labelId="indicators-label"
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
                    position: 'relative',
                    height: isDashboard ? '100%' : 'calc(100% - 40px)',
                    width: '100%',
                    border: '2px solid #a9a9a9',
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
                    {tooltipData.date && <div>{tooltipData.date.toString()}</div>}
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

export default AltcoinPrice;