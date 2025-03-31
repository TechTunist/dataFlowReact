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

        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.time || param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const data = param.seriesData.get(priceSeriesRef.current);
                setTooltipData({ date: dateStr, price: data?.value, x: param.point.x, y: param.point.y });
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
                        marginBottom: '10px',
                        marginTop: '20px',
                    }}
                >
                    <FormControl sx={{ width: { xs: '100%', sm: '150px' } }}>
                        <InputLabel sx={{ color: colors.grey[100] }}>Scale Mode</InputLabel>
                        <Select
                            value={scaleMode}
                            onChange={(e) => setScaleMode(e.target.value)}
                            label="Scale Mode"
                            sx={{
                                color: colors.grey[100],
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                            }}
                        >
                            <MenuItem value={0}>Linear</MenuItem>
                            <MenuItem value={1}>Logarithmic</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: '100px', width: { xs: '100%', sm: '300px' } }}>
                        <InputLabel sx={{ color: colors.grey[100] }}>Indicators</InputLabel>
                        <Select
                            multiple
                            value={activeIndicators}
                            onChange={handleIndicatorChange}
                            label="Indicators"
                            renderValue={(selected) => (selected.length > 0 ? selected.map((key) => indicators[key].label).join(', ') : null)}
                            sx={{
                                color: colors.grey[100],
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
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
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0} alignItems="right">
                        <FormControl sx={{ minWidth: '20px', width: { xs: '100%', sm: '100px' } }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isInteractive}
                                        onChange={(e) => setInteractivity(e.target.checked)}
                                        sx={{
                                            color: colors.grey[300],
                                            '&.Mui-checked': { color: colors.greenAccent[500] },
                                        }}
                                    />
                                }
                                label="Zoom"
                                sx={{
                                    color: colors.grey[100],
                                    '& .MuiFormControlLabel-label': { color: colors.grey[100] },
                                }}
                            />
                        </FormControl>
                        <FormControl>
                            <Button
                                onClick={resetChartView}
                                variant="contained"
                                sx={{
                                    backgroundColor: colors.greenAccent[500],
                                    color: colors.grey[900],
                                    '&:hover': { backgroundColor: colors.greenAccent[100] },
                                }}
                            >
                                Reset Chart
                            </Button>
                        </FormControl>
                    </Stack>
                </Box>
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