import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { Stack, Select, MenuItem, FormControl, FormControlLabel, InputLabel, Box, Checkbox, Button } from '@mui/material';

const BitcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const priceSeriesRef = useRef(null);
    const smaSeriesRefs = useRef({}).current;
    const [fedBalanceData, setFedBalanceData] = useState([]); // State for Fed balance data
    const fedBalanceSeriesRef = useRef(null); // Ref for Fed balance series
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1); // 1 for logarithmic, 0 for linear
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [activeIndicators, setActiveIndicators] = useState([]);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const isMobile = useIsMobile();

    const indicators = {
        '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
        '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
        '50w-sma': { period: 50 * 7, color: 'magenta', label: '50 Week SMA' },
        '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
        '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
        'fed-balance': { color: 'purple', label: 'Fed Balance (Trillions)' }, // New Fed balance indicator
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
                value: sum / period
            });
        }
        return movingAverages;
    };

    const handleIndicatorChange = (event) => {
        setActiveIndicators(event.target.value);
    };

    // Fetch chart data
    useEffect(() => {
        const cacheKeyBtc = 'btcData';
        const cachedDataBtc = localStorage.getItem(cacheKeyBtc);
        const today = new Date();

        if (cachedDataBtc) {
            const parsedDataBtc = JSON.parse(cachedDataBtc);
            const lastCachedDateBtc = new Date(parsedDataBtc[parsedDataBtc.length - 1].time);
            
            if (lastCachedDateBtc.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setChartData(parsedDataBtc);
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }

        function fetchBtcData() {
            fetch('https://vercel-dataflow.vercel.app/api/btc/price/')
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: item.date,
                        value: parseFloat(item.close)
                    }));
                    setChartData(formattedData);
                    localStorage.setItem(cacheKeyBtc, JSON.stringify(formattedData));
                })
                .catch(error => console.error('Error fetching data: ', error));
        }
    }, []);

    // Fetch Federal Reserve balance data
        useEffect(() => {
            const cacheKeyFed = 'fedBalanceData';
            const cachedFedData = localStorage.getItem(cacheKeyFed);
            const today = new Date();
    
            if (cachedFedData) {
                const parsedFedData = JSON.parse(cachedFedData);
                const lastCachedDateFed = new Date(parsedFedData[parsedFedData.length - 1].observation_date);
    
                // Compare dates (ignoring time)
                if (lastCachedDateFed.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                    setFedBalanceData(parsedFedData);
                } else {
                    fetchFedBalanceData();
                }
            } else {
                fetchFedBalanceData();
            }
    
            function fetchFedBalanceData() {
                fetch('https://vercel-dataflow.vercel.app/api/fed-balance/')
                    .then(response => response.json())
                    .then(data => {
                        const formattedData = data.map(item => ({
                            time: item.observation_date, // Use observation_date as time
                            value: parseFloat(item.value) / 1000000 // Convert from millions to trillions for scaling
                        }));
                        setFedBalanceData(formattedData);
                        localStorage.setItem(cacheKeyFed, JSON.stringify(formattedData));
                    })
                    .catch(error => console.error('Error fetching Federal Reserve balance data: ', error));
            }
        }, []);

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

        // Add Federal Reserve balance series (initially hidden) on the left price scale
        const fedBalanceSeries = chart.addLineSeries({
            priceScaleId: 'left', // Fed balance on the left
            color: indicators['fed-balance'].color, // Use color from indicators
            lineWidth: 2,
            priceLineVisible: false,
            visible: activeIndicators.includes('fed-balance'), // Controlled by indicators selection
        });
        fedBalanceSeriesRef.current = fedBalanceSeries; // Store the series in the ref

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
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

    // Update scale mode
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({ mode: scaleMode, borderVisible: false });
        }
    }, [scaleMode]);

    // Update series data
    useEffect(() => {
        if (priceSeriesRef.current && chartData.length > 0) {
            priceSeriesRef.current.setData(chartData);
            chartRef.current.timeScale().fitContent();
        }
    }, [chartData]);

    // Update Fed balance series data (filtered to match Ethereum time range)
    useEffect(() => {
        if (fedBalanceSeriesRef.current && chartData.length > 0 && fedBalanceData.length > 0) {
            // Filter Fed balance data to only include dates within Ethereum data range
            const ethStartTime = new Date(chartData[0].time).getTime();
            const ethEndTime = new Date(chartData[chartData.length - 1].time).getTime();
            const filteredFedData = fedBalanceData.filter(item => {
                const itemTime = new Date(item.time).getTime();
                return itemTime >= ethStartTime && itemTime <= ethEndTime;
            });

            fedBalanceSeriesRef.current.setData(filteredFedData);
            fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
        }
    }, [fedBalanceData, chartData, activeIndicators]);

    // Update indicators
    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return;

        Object.keys(smaSeriesRefs).forEach(key => {
            if (smaSeriesRefs[key]) {
                chartRef.current.removeSeries(smaSeriesRefs[key]);
                delete smaSeriesRefs[key];
            }
        });

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
                    position: 'relative', // Ensure the container has position: relative for the legend
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
                                marginRight: '5px'
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
                        <>
                            <div style={{ color: 'purple' }}>
                                Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T
                            </div>
                        </>
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