// BitcoinChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const BitcoinLogRegression = ({ isDashboard = false }) => {
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

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // Function to format numbers to 'k', 'M', etc.
    function compactNumberFormatter(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M'; // Millions
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k'; // Thousands
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
        const cacheKey = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);

            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                // if cached data is found, parse it and set it to the state
                setChartData(JSON.parse(cachedData));
            } else {
                fetchData();
            }
            
        } else {
            fetchData();
        }

    
        function fetchData() {
            // if no cached data is found, fetch new data
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                setChartData(formattedData);

                // save the data to local storage
                localStorage.setItem(cacheKey, JSON.stringify(formattedData));

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }
    }, []);

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
                // Safely attempt to access price data
                const priceData = param.seriesData.get(priceSeries);
                const price = priceData?.value; // Use optional chaining to avoid errors when priceData is undefined
        
                const logBaseData = param.seriesData.get(logRegressionBaseSeries);
                const logMidData = param.seriesData.get(logRegressionMidSeries);
                const logTopData = param.seriesData.get(logRegressionTopSeries);
        
                // Even if price data is undefined, we can still set tooltip data for the regression lines
                setTooltipData({
                    date: dateStr,
                    price, // May be undefined, which is handled in rendering
                    logBase: logBaseData?.value, // Assuming logBaseData could also potentially be undefined
                    logMid: logMidData?.value,
                    logTop: logTopData?.value,
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
            topColor: topColor, 
            bottomColor: bottomColor, 
            lineColor: lineColor, 
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
            priceFormat: {
                type: 'custom',
                formatter: compactNumberFormatter, // Use the custom formatter
            },
        });
        priceSeries.setData(chartData);

        ////////////////////// Plot Base Logarithmic Trend Line ////////////////////////////

        // Assuming the last date in your dataset is in chartData[chartData.length - 1].time
        const lastDataPointDate = new Date(chartData[chartData.length - 1].time);
        const oneYearLater = new Date(lastDataPointDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1); // Project one year into the future

        const additionalDays = (oneYearLater - lastDataPointDate) / (24 * 3600 * 1000); // Calculate the additional days to project

        // Calculate Logarithmic Regression Points
        const [a, b] = [6.31733286, 2.04640918]; // Given parameters

        // Calculate Base Logarithmic Regression Points
        const startDateBase = new Date("2008-06-19").getTime();
        let logRegressionBasePoints = chartData.map(({ time, value }) => {
            const currentTime = new Date(time).getTime();
            // Calculate x as the number of days since the start date
            const x = (currentTime - startDateBase) / (21 * 3200000 * 2000);
            // Calculate y using the logarithmic regression formula
            const y = Math.exp(a * Math.log(x) + b);
            return { time, value: y };
        });

        // Extend Logarithmic Regression Points by 1 Year
        const lastX = (new Date(chartData[chartData.length - 1].time).getTime() - startDateBase) / (21 * 3200000 * 2000);
        const daysInYear = 730;
        for (let i = 1; i <= daysInYear; i++) {
            const futureTime = new Date(lastDataPointDate.getTime() + i * (24 * 3600 * 1000));
            const x = (futureTime.getTime() - startDateBase) / (21 * 3200000 * 2000);
            const y = Math.exp(a * Math.log(x) + b);
            // Format the date to "yyyy-mm-dd"
            const formattedTime = futureTime.toISOString().split('T')[0];
            logRegressionBasePoints.push({ time: formattedTime, value: y });
        }

        // Plot Logarithmic Regression Line
        const logRegressionBaseSeries = chart.addLineSeries({
            color: 'rgba(255, 0, 0, 1)', // Red for visibility
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        logRegressionBaseSeries.setData(logRegressionBasePoints);
        ///////////////////////////////////////////////////////////////

        /////// Calculate Mid Logarithmic Regression Points ///////////
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1); // Project one year into the future

        // Calculate Mid Logarithmic Regression Points
        const [aa, bb] = [6.31733286, 2.04640918]; // Given parameters
        const startDateMid = new Date("2007-06-19").getTime();
        let logRegressionMidPoints = chartData.map(({ time, value }) => {
            const currentTime = new Date(time).getTime();
            // Calculate x as the number of days since the start date
            const x = (currentTime - startDateMid) / (14 * 4000000 * 2200);
            // Calculate y using the logarithmic regression formula
            const y = Math.exp(aa * Math.log(x) + bb);
            // Format the date to "yyyy-mm-dd"
            const formattedTime = new Date(time).toISOString().split('T')[0];
            return { time: formattedTime, value: y };
        });

        // Extend Mid Logarithmic Regression Points by 1 Year
        const lastDataPointTime = new Date(chartData[chartData.length - 1].time).getTime();
        for (let i = 1; i <= 730; i++) { // Assuming 365 days in a year
            const futureTime = new Date(lastDataPointDate.getTime() + i * (24 * 3600 * 1000));
            const x = (futureTime.getTime() - startDateMid) / (14 * 4000000 * 2200);
            const y = Math.exp(aa * Math.log(x) + bb);
            const formattedTime = futureTime.toISOString().split('T')[0];
            logRegressionMidPoints.push({ time: formattedTime, value: y });
        }

                // Plot Logarithmic Regression Line
                const logRegressionMidSeries = chart.addLineSeries({
                    color: 'rgba(255, 0, 255, 1)', // Red for visibility
                    lineWidth: 2,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

        // Plot Extended Mid Logarithmic Regression Line
        logRegressionMidSeries.setData(logRegressionMidPoints);
        ///////////////////////////////////////////////////////////////

        /////// Calculate Top Logarithmic Regression Points ///////////
        // Given parameters for top logarithmic regression
        const [aaa, bbb] = [6.91733286, 0.74640918];
        const startDateTop = new Date("2006-05-19").getTime();

        // Calculate current top logarithmic regression points
        let logRegressionTopPoints = chartData.map(({ time, value }) => {
            const currentTime = new Date(time).getTime();
            // Calculate x as the number of days since the start date
            const x = (currentTime - startDateTop) / (22 * 3700000 * 1300);
            // Calculate y using the logarithmic regression formula
            const y = Math.exp(aaa * Math.log(x) + bbb);
            // Format the date to "yyyy-mm-dd"
            const formattedTime = new Date(time).toISOString().split('T')[0];
            return { time: formattedTime, value: y };
        });

        for (let i = 1; i <= 730; i++) { // Assuming 365 days in a year
            const futureTime = new Date(lastDataPointDate.getTime() + i * (24 * 3600 * 1000));
            const x = (futureTime.getTime() - startDateTop) / (22 * 3700000 * 1300);
            const y = Math.exp(aaa * Math.log(x) + bbb);
            const formattedTime = futureTime.toISOString().split('T')[0];
            logRegressionTopPoints.push({ time: formattedTime, value: y });
        }

        // Plot Extended Top Logarithmic Regression Line
        const logRegressionTopSeries = chart.addLineSeries({
            color: 'rgba(0, 255, 255, 1)', // Green for the top series
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        logRegressionTopSeries.setData(logRegressionTopPoints);
        ///////////////////////////////////////////////////////////////

        /////// Calculate XTop Logarithmic Regression Points ///////////
        // Given parameters for top logarithmic regression
        const [aaaa, bbbb] = [6.71733286, 2.34640918];
        const startDateXTop = new Date("2006-05-19").getTime();

        // Calculate current top logarithmic regression points
        let logRegressionXTopPoints = chartData.map(({ time, value }) => {
            const currentTime = new Date(time).getTime();
            // Calculate x as the number of days since the start date
            const x = (currentTime - startDateTop) / (24 * 3900000 * 1300);
            // Calculate y using the logarithmic regression formula
            const y = Math.exp(aaaa * Math.log(x) + bbbb);
            // Format the date to "yyyy-mm-dd"
            const formattedTime = new Date(time).toISOString().split('T')[0];
            return { time: formattedTime, value: y };
        });

        for (let i = 1; i <= 730; i++) { // Assuming 365 days in a year
            const futureTime = new Date(lastDataPointDate.getTime() + i * (24 * 3600 * 1000));
            const x = (futureTime.getTime() - startDateXTop) / (24 * 3900000 * 1300);
            const y = Math.exp(aaaa * Math.log(x) + bbbb);
            const formattedTime = futureTime.toISOString().split('T')[0];
            logRegressionXTopPoints.push({ time: formattedTime, value: y });
        }

        // Plot Extended Top Logarithmic Regression Line
        const logRegressionXTopSeries = chart.addLineSeries({
            color: 'rgba(0, 255, 0, 1)', // Green for the top series
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        logRegressionXTopSeries.setData(logRegressionXTopPoints);
        ///////////////////////////////////////////////////////////////

        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
            handleScroll: isInteractive,
            handleScale: isInteractive
        });

        const priceScaleOptions = {
            // Example option, adjust as per actual API and needs
            scaleMargins: {
                top: 0.1, // Reduces space at the top; adjust the value as needed
                bottom: 0.1, // Adjusts space at the bottom
            },
        };

        // Apply the options to the price scale
        chart.priceScale('right').applyOptions(priceScaleOptions);
    
        resizeChart(); // Ensure initial resize and fitContent call
        chart.timeScale().fitContent(); // Additional call to fitContent to ensure coverage
        chartRef.current = chart; // Store the chart instance
    
        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, scaleMode, isDashboard, theme.palette.mode ]);

    useEffect(() => {
        if (chartRef.current) {
            // Disable all interactions if the chart is displayed on the dashboard
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
                    <LastUpdated storageKey="btcData" />
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
                    <b>{tooltipData.price && <div>Actual Price: ${tooltipData.price.toFixed(2)}</div>}
                    {tooltipData.logBase && <div style={{color: 'lime'}}>Upper Band: ${tooltipData.logTop.toFixed(2)}</div>}
                    {tooltipData.logMid && <div style={{color: 'violet'}}>Mid Band: ${tooltipData.logMid.toFixed(2)}</div>}
                    {tooltipData.logTop && <div style={{color: 'red'}}>Lower Band: ${tooltipData.logBase.toFixed(2)}</div>}
                    {tooltipData.date && <div style={{fontSize: '13px'}}>{tooltipData.date}</div>}</b>
                </div>
            )}
            <div>
            {
                    !isDashboard && (
                        <p className='chart-info'>
                            The logarithmic regression of Bitcoin's price history captures the essence of its volatile yet upward-trending journey through upper,
                            mid, and lower range trendlines. These trendlines illustrate the expansive growth potential, the average trajectory,
                            and the foundational support levels of Bitcoin's price action over time.
                            The upper range highlights periods of exuberant market optimism and speculative peaks, while the lower range marks significant buying
                            opportunities during market corrections. The mid-range trendline serves as a more stable reference point, indicating the long-term growth
                            path of Bitcoin amidst its cyclical price movements. Together, these logarithmic regression lines offer a comprehensive view of Bitcoin's
                            historical and potential future price behavior, emphasizing its resilience and the increasing adoption curve.
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default BitcoinLogRegression;