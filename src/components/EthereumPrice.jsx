import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Select, MenuItem, FormControl, InputLabel, Box, Button, Checkbox } from '@mui/material';
import LastUpdated from '../hooks/LastUpdated';

const EthereumPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const priceSeriesRef = useRef(null);
    const smaSeriesRefs = useRef({}).current;
    const fedBalanceSeriesRef = useRef(null);
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { ethData, fetchEthData, fedBalanceData, fetchFedBalanceData } = useContext(DataContext);

    const [scaleMode, setScaleMode] = useState(1); // 1 for logarithmic, 0 for linear
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const [activeIndicators, setActiveIndicators] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const indicators = useMemo(() => ({
        '8w-sma': { period: 8 * 7, color: 'blue', label: '8 Week SMA' },
        '20w-sma': { period: 20 * 7, color: 'limegreen', label: '20 Week SMA' },
        '50w-sma': { period: 50 * 7, color: 'magenta', label: '50 Week SMA' },
        '100w-sma': { period: 100 * 7, color: 'white', label: '100 Week SMA' },
        '200w-sma': { period: 200 * 7, color: 'yellow', label: '200 Week SMA' },
        'fed-balance': { color: 'purple', label: 'Fed Balance (Trillions)' },
    }), []);

    // Fetch data only if not present in context
    useEffect(() => {
        const fetchData = async () => {
            if (ethData.length > 0 && fedBalanceData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await Promise.all([
                    ethData.length === 0 && fetchEthData(),
                    fedBalanceData.length === 0 && fetchFedBalanceData()
                ]);
            } catch (err) {
                setError('Failed to fetch data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchEthData, fetchFedBalanceData, ethData.length, fedBalanceData.length]);

    const calculateMovingAverage = useCallback((data, period) => {
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
    }, []);

    const setInteractivity = useCallback(() => setIsInteractive(prev => !prev), []);
    const toggleScaleMode = useCallback(() => setScaleMode(prev => (prev === 1 ? 0 : 1)), []);
    const resetChartView = useCallback(() => chartRef.current?.timeScale().fitContent(), []);
    const handleIndicatorChange = useCallback((event) => setActiveIndicators(event.target.value), []);

    // Initialize chart
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
            priceFormat: {
                type: 'custom',
                minMove: 1,
                formatter: (price) => price >= 1000 ? `${(price / 1000).toFixed(1)}K` : (price >= 100 ? price.toFixed(0) : price.toFixed(1)),
            },
        });
        priceSeriesRef.current = priceSeries;

        const fedBalanceSeries = chart.addLineSeries({
            priceScaleId: 'left',
            color: indicators['fed-balance'].color,
            lineWidth: 2,
            priceLineVisible: false,
            visible: false,
        });
        fedBalanceSeriesRef.current = fedBalanceSeries;

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}` },
        });

        chart.priceScale('left').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
            priceFormat: { type: 'custom', formatter: value => `$${value.toFixed(2)}T` },
        });

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const priceData = param.seriesData.get(priceSeriesRef.current);
                const fedSeriesData = fedBalanceSeriesRef.current.data();
                const currentTime = new Date(param.time).getTime();
                const nearestFedData = fedSeriesData.reduce((prev, curr) => {
                    const currTime = new Date(curr.time).getTime();
                    return currTime <= currentTime && (!prev || currTime > new Date(prev.time).getTime()) ? curr : prev;
                }, null);

                setTooltipData({
                    date: param.time,
                    price: priceData?.value,
                    fedBalance: nearestFedData?.value,
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
    }, [colors]);

    // Update chart data
    useEffect(() => {
        if (priceSeriesRef.current && ethData.length > 0) {
            priceSeriesRef.current.setData(ethData);
            resetChartView();
        }
    }, [ethData, resetChartView]);

    useEffect(() => {
        if (fedBalanceSeriesRef.current && ethData.length > 0 && fedBalanceData.length > 0) {
            const ethStartTime = new Date(ethData[0].time).getTime();
            const ethEndTime = new Date(ethData[ethData.length - 1].time).getTime();
            const filteredFedData = fedBalanceData.filter(item => {
                const itemTime = new Date(item.time).getTime();
                return itemTime >= ethStartTime && itemTime <= ethEndTime;
            });
            fedBalanceSeriesRef.current.setData(filteredFedData);
            fedBalanceSeriesRef.current.applyOptions({ visible: activeIndicators.includes('fed-balance') });
        }
    }, [fedBalanceData, ethData, activeIndicators]);

    // Update indicators
    useEffect(() => {
        if (!chartRef.current || ethData.length === 0) return;
        Object.keys(smaSeriesRefs).forEach(key => {
            if (smaSeriesRefs[key]) {
                chartRef.current.removeSeries(smaSeriesRefs[key]);
                delete smaSeriesRefs[key];
            }
        });

        activeIndicators.forEach(key => {
            if (key === 'fed-balance') return;
            const indicator = indicators[key];
            const series = chartRef.current.addLineSeries({
                color: indicator.color,
                lineWidth: 2,
                priceLineVisible: false,
                priceScaleId: 'right',
            });
            smaSeriesRefs[key] = series;
            const data = calculateMovingAverage(ethData, indicator.period);
            series.setData(data);
        });
    }, [activeIndicators, ethData, calculateMovingAverage, indicators]);

    // Update scale mode and interactivity
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({ mode: scaleMode });
            chartRef.current.priceScale('left').applyOptions({ mode: scaleMode });
            chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
        }
    }, [scaleMode, isInteractive]);

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
    }, [colors, theme.palette.mode]);

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
                        Ethereum Price
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
                        // maxWidth: '800px',
                        flexWrap: 'wrap',
                        gap: '10px',
                        alignItems: 'center', // Optional: ensures vertical alignment if components have different heights
                    }}>
                        <LastUpdated storageKey="ethData"/>
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
                    <div style={{ fontSize: '15px' }}>Ethereum</div>
                    {tooltipData.price && <div style={{ fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>}
                    {activeIndicators.includes('fed-balance') && tooltipData.fedBalance && <div style={{ color: 'purple' }}>Fed Balance: ${tooltipData.fedBalance.toFixed(2)}T</div>}
                    {tooltipData.date && <div>{tooltipData.date.toString()}</div>}
                </div>
            )}
            {!isDashboard && (
                <p className='chart-info'>
                    Ethereum is the second-largest cryptocurrency by market cap, launched in 2015 by Vitalik Buterin.
                    It’s a decentralized blockchain platform that goes beyond simple transactions, enabling smart contracts—self-executing
                    agreements coded on the blockchain—and decentralized applications (dApps). Powered by its native currency, Ether (ETH),
                    Ethereum supports a vast ecosystem of developers and projects, making it the most actively used blockchain for innovation
                    in finance, NFTs, gaming, and more.
                    This description highlights Ethereum’s key features and significance, fitting nicely into your app’s context alongside
                    the price chart. Let me know if you'd like it adjusted further!
                    <br /><br /><br />
                </p>
            )}
        </div>
    );
};

export default EthereumPrice;