import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const TotalMarketCap = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const isMobile = useIsMobile();
    const [setIsDashboard] = useState(isDashboard);

    // function to calculate the log regression lines
    const calculateLogarithmicRegression = (data) => {
        const n = data.length;
        const sumLogX = data.reduce((sum, point, index) => sum + Math.log(index + 1), 0);
        const sumY = data.reduce((sum, point) => sum + Math.log(point.value), 0);
        const sumLogXSquared = data.reduce((sum, point, index) => sum + Math.log(index + 1) ** 2, 0);
        const sumLogXLogY = data.reduce((sum, point, index) => sum + Math.log(index + 1) * Math.log(point.value), 0);
    
        const slope = (n * sumLogXLogY - sumLogX * sumY) / (n * sumLogXSquared - sumLogX ** 2);
        const intercept = (sumY - slope * sumLogX) / n;
    
        return { slope, intercept };
    }; 

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // Function to format numbers to 'k', 'M', 'B', 'T', etc.
    function compactNumberFormatter(value) {
        if (value >= 1e12) {
            return (value / 1e12).toFixed(2) + 'T'; // Trillions with 2 decimal places
        } else if (value >= 1e9) {
            return (value / 1e9).toFixed(0) + 'B'; // Billions without decimal places
        } else if (value >= 1e6) {
            return (value / 1e6).toFixed(0) + 'M'; // Millions without decimal places
        } else if (value >= 1e3) {
            return (value / 1e3).toFixed(0) + 'k'; // Thousands without decimal places
        } else {
            return value.toFixed(0); // For values less than 1000, show the full number
        }
    }

    // Function to toggle scale mode
    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 1 ? 2 : 1));
    };

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    useEffect(() => {
        const marketCapCacheKey = 'totalMarketCap';
        const cachedMarketCap = localStorage.getItem(marketCapCacheKey);
        const today = new Date();
    
        if (cachedMarketCap) {
            const parsedMarketCap = JSON.parse(cachedMarketCap);
            const lastCachedDate = new Date(parsedMarketCap.time);
    
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                // if cached data is found, parse it and set it to the state
                setChartData([{ time: parsedMarketCap.time, value: parsedMarketCap.value }]);
            } else {
                fetchData();
            }
            
        } else {
            fetchData();
        }
    
        function fetchData() {
            // if no cached data is found, fetch new data
            fetch('https://tunist.pythonanywhere.com/api/btc/dominance/')
            .then(response => response.json())
            .then(data => {
                // Calculate total market cap
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: item.btc + item.eth + item.usdt + item.bnb + item.sol + item.others
                }));
                
                setChartData(formattedData);
    
                // save the total market cap to local storage
                const latestData = formattedData[formattedData.length - 1];
                localStorage.setItem(marketCapCacheKey, JSON.stringify({ time: latestData.time, value: latestData.value }));
    
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }
    }, []);
    
    useEffect(() => {
        if (chartData.length === 0) return;

        const { slope, intercept } = calculateLogarithmicRegression(chartData);

        const calculateRegressionPoints = (scale, color, shiftDays = 0, curveAdjustment = 1) => {
            const points = chartData.map(({ time }, index) => {
                const x = Math.log(index + 1 - shiftDays + 1); // subtract shiftDays to shift left
        
                // Adjust curvature by applying a non-linear transformation to x
                const adjustedX = Math.pow(x, curveAdjustment);
        
                // Create delta to adjust y-intercept
                const delta = intercept - 11.5;
        
                // Create delta to adjust slope
                const adjustedSlope = slope + 2;
        
                const y = Math.exp(adjustedSlope * adjustedX + delta) * scale;
                return { time, value: y };
            });
            const regressionSeries = chart.addLineSeries({
                color: color,
                lineWidth: 2,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            regressionSeries.setData(points);
            return regressionSeries;
        };
    
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: {
                background: { type: 'solid', color: colors.primary[700] },
                textColor: colors.primary[100],
            },
            grid: {
                vertLines: {
                    color: colors.greenAccent[700],
                },
                horzLines: {
                    color: colors.greenAccent[700],
                },
            },
            timeScale: {
                minBarSpacing: 0.001,
            },
        });

        // update tooltip data on crosshairMove event
        chart.subscribeCrosshairMove(param => {
            if (
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current.clientHeight
            ) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const priceData = param.seriesData.get(priceSeries);
                const price = priceData?.value;

                const logBaseData = param.seriesData.get(logRegressionBaseSeries);
                const logMidData = param.seriesData.get(logRegressionMidSeries);
                const logTopData = param.seriesData.get(logRegressionTopSeries);

                setTooltipData({
                    date: dateStr,
                    price: price ? compactNumberFormatter(price) : undefined,
                    logBase: logBaseData?.value ? compactNumberFormatter(logBaseData.value) : undefined,
                    logMid: logMidData?.value ? compactNumberFormatter(logMidData.value) : undefined,
                    logTop: logTopData?.value ? compactNumberFormatter(logTopData.value) : undefined,
                    x: param.point.x,
                    y: param.point.y,
                });
            }
        });
    
        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            priceFormat: {
                type: 'custom',
                formatter: compactNumberFormatter,
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
    
        window.addEventListener('resize', resizeChart);
        window.addEventListener('resize', resetChartView);

        // Define your light and dark theme colors for the area series
        const lightThemeColors = {
            topColor: 'rgba(255, 165, 0, 0.56)', // Soft orange for the top gradient
            bottomColor: 'rgba(255, 165, 0, 0.2)', // Very subtle orange for the bottom gradient
            lineColor: 'rgba(255, 140, 0, 0.8)', // A vibrant, slightly deeper orange for the line
        };
        
        const darkThemeColors = {
            topColor: 'rgba(38, 198, 218, 0.56)', 
            bottomColor: 'rgba(38, 198, 218, 0.04)', 
            lineColor: 'rgba(38, 198, 218, 1)', 
        };

        // Select colors based on the theme mode
        const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;
 
        const priceSeries = chart.addLineSeries({
            priceScaleId: 'right',
            topColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.56)' : 'rgba(255, 165, 0, 0.56)', 
            bottomColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.04)' : 'rgba(255, 165, 0, 0.2)', 
            lineColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)', 
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            priceFormat: {
                type: 'custom',
                formatter: compactNumberFormatter,
            },
        });
        priceSeries.setData(chartData);

        const logRegressionBaseSeries = calculateRegressionPoints(2, 'red', -100, 0.95);
        const logRegressionMidSeries = calculateRegressionPoints(1, 'violet', -150, 1);
        const logRegressionTopSeries = calculateRegressionPoints(2, 'lime', -100, 0.99);

        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
            handleScroll: isInteractive,
            handleScale: isInteractive
        });

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
    }, [chartData, scaleMode, isDashboard, theme.palette.mode]);

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
                <div className='chart-top-div'>
                <div>
                    {/* Placeholder for styling */}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
                    {
                        !isDashboard && (
                            <button
                                onClick={setInteractivity}
                                className="button-reset"
                                style={{
                                    backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                    color: isInteractive ? 'black' : '#31d6aa',
                                    borderColor: isInteractive ? 'violet' : '#70d8bd'
                                }}>
                                {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                            </button>
                        )   
                    }
                    {
                        !isDashboard && (
                            <button onClick={resetChartView} className="button-reset extra-margin">
                                Reset Chart
                            </button>
                        )   
                    }
                </div>
            </div>
            )}
            
            <div className="chart-container" style={{ 
                    position: 'relative', 
                    height: 'calc(100% - 40px)', 
                    width: '100%', 
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
                    }}>
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    onDoubleClick={() => {
                        if (!isInteractive && !isDashboard) {  // Only set interactivity if it's currently disabled
                            setInteractivity();
                        } else {
                            setInteractivity();
                        }
                    }}/>
            </div>
            <div className='under-chart'>
                {!isDashboard && (
                    <LastUpdated storageKey="btcDominanceData" />
                )}
                {!isDashboard && (
                    <BitcoinFees />
                )}
            </div>
            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                className="tooltip"
                style={{
                    left: (() => {
                        const sidebarWidth = isMobile ? -80 : -300; // Adjust sidebarWidth based on isMobile
                        const cursorX = tooltipData.x - sidebarWidth; // Adjust cursorX for sidebar
                        const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth; // Adjust chartWidth for sidebar
                        const tooltipWidth = 200; // Your tooltip's actual width
                        const K = 10000; // Adjust this constant based on desired sensitivity
                        const C = 300; // Base addition to stabilize the calculation
            
                        // Calculate the inverse proportional offset
                        const offset = K / (chartWidth + C);
            
                        // Calculate potential left and right positions with dynamic offset
                        const rightPosition = cursorX + offset;
                        const leftPosition = cursorX - tooltipWidth - offset;
            
                        if (rightPosition + tooltipWidth <= chartWidth) {
                            return `${rightPosition}px`; // Fits on the right
                        } else if (leftPosition >= 0) {
                            return `${leftPosition}px`; // Fits on the left
                        } else {
                            return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`; // Adjust near edge
                        }
                    })(),
                    top: `${tooltipData.y + 100}px`, // Adjust as needed
                }}
            >
                <b>
                    {tooltipData.price && <div>Actual Price: ${tooltipData.price}</div>}
                    {tooltipData.logBase && <div style={{color: 'lime'}}>Upper Band: ${tooltipData.logTop}</div>}
                    {tooltipData.logMid && <div style={{color: 'violet'}}>Mid Band: ${tooltipData.logMid}</div>}
                    {tooltipData.logTop && <div style={{color: 'red'}}>Lower Band: ${tooltipData.logBase}</div>}
                    {tooltipData.date && <div style={{fontSize: '13px'}}>{tooltipData.date}</div>}
                </b>
            </div>
            
            )}
            <div>
            {
                    !isDashboard && (
                        <p className='chart-info'>
                            The total market cap of every crypto asset combined.
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default TotalMarketCap;