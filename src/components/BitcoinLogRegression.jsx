// BitcoinChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";


const BitcoinLogRegression = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [tooltipContent, setTooltipContent] = useState('');
    const [tooltipVisible, setTooltipVisible] = useState(false);

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
    
        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
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
 
        const lineSeries = chart.addLineSeries({
            priceScaleId: 'right',
            topColor: topColor, 
            bottomColor: bottomColor, 
            lineColor: lineColor, 
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        lineSeries.setData(chartData);

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
        const [aaa, bbb] = [5.71733286, 2.44640918];
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
            color: 'rgba(0, 255, 0, 1)', // Green for the top series
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        logRegressionTopSeries.setData(logRegressionTopPoints);
        ///////////////////////////////////////////////////////////////

        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
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

    return (
        <div style={{ height: '100%' }}>
            <div style={{ 
                display: 'flex', // Use flex display for the container
                justifyContent: 'space-between', // This spreads out the child elements
                alignItems: 'center', // This vertically centers the children
                marginBottom: '0px', 
                height: '30px'
            }}>
                <div>
                    {/* Placeholder for styling */}
                </div>
                {
                    !isDashboard && (
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    )   
                }
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%' }}>
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
            <div>
            {
                    !isDashboard && (
                        <h3>
                            The logarithmic regression of Bitcoin's price history captures the essence of its volatile yet upward-trending journey through upper,
                            mid, and lower range trendlines. These trendlines illustrate the expansive growth potential, the average trajectory,
                            and the foundational support levels of Bitcoin's price action over time.
                            The upper range highlights periods of exuberant market optimism and speculative peaks, while the lower range marks significant buying
                            opportunities during market corrections. The mid-range trendline serves as a more stable reference point, indicating the long-term growth
                            path of Bitcoin amidst its cyclical price movements. Together, these logarithmic regression lines offer a comprehensive view of Bitcoin's
                            historical and potential future price behavior, emphasizing its resilience and the increasing adoption curve.
                        </h3>
                    )   
                }
            </div>
        </div>
    );
};

export default BitcoinLogRegression;