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

    // Function to calculate the log regression lines
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

    // Function to extend data for future dates
    const extendDataForFuture = (data, weeks) => {
        const lastDate = new Date(data[data.length - 1].time);
        const extendedData = [...data];
        for (let i = 1; i <= weeks; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + (i * 7)); // Extend by weeks
            extendedData.push({ time: nextDate.toISOString().split('T')[0], value: null });
        }
        return extendedData;
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
            const lastCachedDate = new Date(parsedMarketCap[parsedMarketCap.length - 1].time);
    
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                // if cached data is found, parse it and set it to the state
                setChartData(parsedMarketCap);
            } else {
                fetchData();
            }
    
        } else {
            fetchData();
        }
    
        function fetchData() {
            // Fetch new data from the API
            // fetch('https://tunist.pythonanywhere.com/api/total/marketcap/')
            fetch('https://vercel-dataflow.vercel.app/api/total/marketcap/')
                .then(response => response.json())
                .then(data => {
                    // Format the data for the chart
                    const formattedData = data.map(item => ({
                        time: item.date,
                        value: parseFloat(item.market_cap)
                    }));
                    
                    setChartData(formattedData);
    
                    // Save the entire dataset to local storage
                    localStorage.setItem(marketCapCacheKey, JSON.stringify(formattedData));
                })
                .catch(error => {
                    console.error('Error fetching data: ', error);
                });
        }
    }, []);
    
    
    useEffect(() => {
        if (chartData.length === 0) return;

        const extendedData = extendDataForFuture(chartData, 156); // Extend by 3 years (52 weeks per year * 3 years)
        const { slope, intercept } = calculateLogarithmicRegression(chartData);

        const calculateRegressionPoints = (scale, color, shiftDays = 0, curveAdjustment = 1) => {
            const points = extendedData.map(({ time }, index) => {
                const x = Math.log(index + 1 - shiftDays + 1); // subtract shiftDays to shift left
                const adjustedX = Math.pow(x, curveAdjustment);
                const delta = intercept - 11.5;
                const adjustedSlope = slope + 2;
                const y = Math.exp(adjustedSlope * adjustedX + delta) * scale;
                return { time, value: y };
            });
            const regressionSeries = chart.addLineSeries({
                color: color,
                lineWidth: 2,
                lineStyle: 1,
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
                const logBase2Data = param.seriesData.get(logRegressionBase2Series);
                const logMidData = param.seriesData.get(logRegressionMidSeries);
                const logTopData = param.seriesData.get(logRegressionTopSeries);
                const logTop2Data = param.seriesData.get(logRegression2TopSeries);

                setTooltipData({
                    date: dateStr,
                    price: price ? compactNumberFormatter(price) : undefined,
                    logBase: logBaseData?.value ? compactNumberFormatter(logBaseData.value) : undefined,
                    logBase2: logBase2Data?.value ? compactNumberFormatter(logBase2Data.value) : undefined,
                    logMid: logMidData?.value ? compactNumberFormatter(logMidData.value) : undefined,
                    logTop: logTopData?.value ? compactNumberFormatter(logTopData.value) : undefined,
                    logTop2: logTop2Data?.value ? compactNumberFormatter(logTop2Data.value) : undefined,
                    x: param.point.x,
                    y: param.point.y,
                });
            }
        });
    
        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
            scaleMargins: {
                top: 0.1, // 10% empty space at the top
                bottom: 0.1 // 10% empty space at the bottom
            },
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

        const logRegression2TopSeries = calculateRegressionPoints(20, 'lime', -320, 0.91);
        const logRegressionTopSeries = calculateRegressionPoints(15, 'green', -300, 0.907);
        const logRegressionMidSeries = calculateRegressionPoints(0.05, 'violet', -310, 0.9845);
        const logRegressionBaseSeries = calculateRegressionPoints(0.01, 'red', -310, 0.995);
        const logRegressionBase2Series = calculateRegressionPoints(0.005, 'maroon', -255, 0.996);

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
                    border: '2px solid #a9a9a9'
                    }}>
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    onDoubleClick={() => {
                        if (!isInteractive && !isDashboard) {
                            setInteractivity();
                        } else {
                            setInteractivity();
                        }
                    }}/>
            </div>
            <div className='under-chart'>
                {!isDashboard && (
                    <LastUpdated storageKey="totalMarketCap" />
                )}
                {!isDashboard && (
                    <BitcoinFees />
                )}
            </div>
            {!isDashboard && tooltipData && (
                <div
                className="tooltip"
                style={{
                    left: (() => {
                        const sidebarWidth = isMobile ? -80 : -300;
                        const cursorX = tooltipData.x - sidebarWidth;
                        const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
                        const tooltipWidth = 200;
                        const K = 10000;
                        const C = 300;
                        const offset = K / (chartWidth + C);
                        const rightPosition = cursorX + offset;
                        const leftPosition = cursorX - tooltipWidth - offset;
                        if (rightPosition + tooltipWidth <= chartWidth) {
                            return `${rightPosition}px`;
                        } else if (leftPosition >= 0) {
                            return `${leftPosition}px`;
                        } else {
                            return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
                        }
                    })(),
                    top: `${tooltipData.y + 100}px`,
                }}
            >
                <b>
                    {tooltipData.price && <div>Market Cap: ${tooltipData.price}</div>}
                    {tooltipData.logTop2 && <div style={{color: 'lime'}}>Upper Band 2: ${tooltipData.logTop2}</div>}
                    {tooltipData.logTop && <div style={{color: 'green'}}>Upper Band: ${tooltipData.logTop}</div>}
                    {tooltipData.logMid && <div style={{color: 'violet'}}>Mid Band: ${tooltipData.logMid}</div>}
                    {tooltipData.logBase && <div style={{color: 'red'}}>Lower Band: ${tooltipData.logBase}</div>}
                    {tooltipData.logBase2 && <div style={{color: 'maroon'}}>Lower Band 2: ${tooltipData.logBase2}</div>}
                    {tooltipData.date && <div style={{fontSize: '13px'}}>{tooltipData.date}</div>}
                </b>
            </div>
            
            )}
            <div>
            {
                    !isDashboard && (
                        <p className='chart-info'>
                            The total market cap of every crypto asset combined. The regression bands have been fitted to the absolute lows, highs and other significant 
                            levels over the total history of the asset class. The bands are calculated using a logarithmic regression model.
                            <br />
                            <br />
                            The core calculation involves determining the slope (m) and intercept (b) of the best-fit line.
                            These are derived using the following formulas:<br />
                            <ul>
                                <li><b>m = (n * sum(ln(x) * ln(y)) - sum(ln(x)) * sum(ln(y))) / (n * sum(ln(x)^2) - (sum(ln(x)))^2)</b><br /></li>
                                <li><b>b = (sum(ln(y)) - m * sum(ln(x))) / n</b><br /></li>
                            </ul>
                            <br />n = the total number of data points, <br />x = the time index (after taking the natural logarithm),
                            and <br />y = the data value (after taking the natural logarithm) <br /><br />
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default TotalMarketCap;