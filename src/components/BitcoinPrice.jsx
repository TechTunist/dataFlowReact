// BitcoinChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";

const BitcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const [tooltipData, setTooltipData] = useState(null);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [show8Week, setShow8Week] = useState(false);
    const [show20Week, setShow20Week] = useState(false);
    const [show100Week, setShow100Week] = useState(false);
    const [show200Week, setShow200Week] = useState(false);
    const color8Week = 'blue';
    const color20Week = 'green';
    const color100Week = 'white';
    const color200Week = 'yellow';

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

    // Function to toggle the visibility of markers
    const toggle8Week = () => {
        setShow8Week(!show8Week);
    };
    
    // Function to toggle the visibility of markers
    const toggle20Week = () => {
        setShow20Week(!show20Week);
    };

    // Function to toggle the visibility of markers
    const toggle100Week = () => {
        setShow100Week(!show100Week);
    };

    // Function to toggle the visibility of markers
    const toggle200Week = () => {
        setShow200Week(!show200Week);
    };

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

    // Test function to calculate the EMA for the bull market support band
      const calculateEMA = (data, period) => {
        let emaArray = [];
        let multiplier = 2 / (period + 1);
        
        // Start by calculating the initial EMA value which can be the first data point or an SMA of the first few points
        let initialSMA = 0;
        for (let i = 0; i < period; i++) {
            initialSMA += data[i].value;
        }
        initialSMA /= period;
        emaArray.push({ time: data[period-1].time, value: initialSMA });
    
        // Calculate the rest of the EMA values
        for (let i = period; i < data.length; i++) {
            let todayPrice = data[i].value;
            let yesterdayEMA = emaArray[emaArray.length - 1].value;
            let todayEMA = (todayPrice - yesterdayEMA) * multiplier + yesterdayEMA;
            emaArray.push({ time: data[i].time, value: todayEMA });
        }
    
        return emaArray;
    };

    // Function to toggle scale mode
    const toggleScaleMode = () => {
        // Toggle the scaleMode state
        const newScaleMode = scaleMode === 1 ? 0 : 1;
        setScaleMode(newScaleMode);

        // Directly apply the new scale mode to the price scale of the chart
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({
                mode: newScaleMode,
                borderVisible: false,
            });
        }
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
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current.clientHeight
            ) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const data = param.seriesData.get(areaSeries);
                setTooltipData({
                    date: dateStr,
                    price: data.value,
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

        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            topColor: topColor, 
            bottomColor: bottomColor, 
            lineColor: lineColor, 
            lineWidth: 2,
            priceFormat: {
                type: 'custom',
                formatter: compactNumberFormatter, // Use the custom formatter
            },
        });
        areaSeries.setData(chartData);
        

        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
        });
    
        resizeChart(); // Ensure initial resize and fitContent call
        chart.timeScale().fitContent(); // Additional call to fitContent to ensure coverage
        chartRef.current = chart; // Store the chart instance
    
        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, isDashboard, theme.palette.mode]);

    // Initialize state for series references
    const [maSeries, setMaSeries] = useState({
        ma8Week: null,
        ma20Week: null,
        ma100Week: null,
        ma200Week: null,
    });

    useEffect(() => {
        if (chartData.length === 0 || !chartRef.current) return;

        // Only create series once and store their references
        if (!maSeries.ma8Week) {
            const series = {
                ma8Week: chartRef.current.addLineSeries({
                    priceScaleId: 'right',
                    color: color8Week,
                    lineWidth: 2,
                    priceLineVisible: false,
                }),
                ma20Week: chartRef.current.addLineSeries({
                    priceScaleId: 'right',
                    color: color20Week,
                    lineWidth: 2,
                    priceLineVisible: false,
                }),
                ma100Week: chartRef.current.addLineSeries({
                    priceScaleId: 'right',
                    color: color100Week,
                    lineWidth: 2,
                    priceLineVisible: false,
                }),
                ma200Week: chartRef.current.addLineSeries({
                    priceScaleId: 'right',
                    color: color200Week,
                    lineWidth: 2,
                    priceLineVisible: false,
                }),
            };
            setMaSeries(series);
        }

        // Update data and visibility based on toggles
        const updateSeries = (series, data, show) => {
            if (show) {
                series.setData(data);
                series.applyOptions({ visible: true });
            } else {
                series.setData([]);
                series.applyOptions({ visible: false });
            }
        };

        // Calculate SMAs
        const movingAverage8Week = calculateMovingAverage(chartData, 8 * 7);
        const movingAverage20Week = calculateMovingAverage(chartData, 20 * 7);
        const movingAverage100Week = calculateMovingAverage(chartData, 100 * 7);
        const movingAverage200Week = calculateMovingAverage(chartData, 200 * 7);

        // Apply data and visibility
        if (maSeries.ma8Week) updateSeries(maSeries.ma8Week, movingAverage8Week, show8Week);
        if (maSeries.ma20Week) updateSeries(maSeries.ma20Week, movingAverage20Week, show20Week);
        if (maSeries.ma100Week) updateSeries(maSeries.ma100Week, movingAverage100Week, show100Week);
        if (maSeries.ma200Week) updateSeries(maSeries.ma200Week, movingAverage200Week, show200Week);

        return () => {
            chartRef.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };

    }, [chartData, show8Week, show20Week, show100Week, show200Week, maSeries, color8Week, color20Week, color100Week, color200Week]);


    return (
        <div style={{ height: '100%' }}>
            <div className='chart-top-div'>
                <div>
                    {/* The switch and label go here */}
                    <label className="switch">
                        <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                        <span className="slider round"></span>
                    </label>
                    <span className="scale-mode-label" style={{color: colors.primary[100]}}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                </div>
                <div>
                    {/* placeholder for styling */}
                </div>
                
                {
                    !isDashboard && (
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    )   
                }
            </div>
            <div className="chart-container" style={{ 
                    position: 'relative', 
                    height: 'calc(100% - 40px)', 
                    width: '100%', 
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
                    }}> 
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
            
            <div style={{
                display: 'flex', // Use flex display for the container
                justifyContent: 'center', // Center the child elements horizontally
                alignItems: 'center', // This vertically centers the children
                marginBottom: '20px', // Space after the container to avoid overlap with the paragraph
                height: 'auto', // Adjust height automatically based on content
                flexWrap: 'wrap', // Allows items to wrap onto the next line
                gap: '10px 20px', // Sets vertical and horizontal gaps between items
                padding: '10px' // Adds padding inside the flex container
            }}>
            {!isDashboard && (
                <>
                    <button
                        onClick={toggle8Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '130px',
                            minWidth: '130px',
                            backgroundColor: show8Week ? '#4cceac' : 'transparent', // Highlight background when active
                            color: show8Week ? color8Week : '#70d8bd', // Change text color when active
                            borderColor: show8Week ? '#fff' : '#70d8bd' // Change border color when active
                        }}
                    >
                        8 Week SMA
                    </button>
                    <button
                        onClick={toggle20Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '130px',
                            minWidth: '130px',
                            backgroundColor: show20Week ? '#4cceac' : 'transparent',
                            color: show20Week ? color20Week : '#70d8bd',
                            borderColor: show20Week ? '#fff' : '#70d8bd'
                        }}
                    >
                        20 Week SMA
                    </button>
                    <button
                        onClick={toggle100Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '130px',
                            minWidth: '130px',
                            backgroundColor: show100Week ? '#4cceac' : 'transparent',
                            color: show100Week ? color100Week : '#70d8bd',
                            borderColor: show100Week ? '#fff' : '#70d8bd'
                        }}
                    >
                        100 Week SMA
                    </button>
                    <button
                        onClick={toggle200Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '130px',
                            minWidth: '130px',
                            backgroundColor: show200Week ? '#4cceac' : 'transparent',
                            color: show200Week ? color200Week : '#70d8bd',
                            borderColor: show200Week ? '#fff' : '#70d8bd'
                        }}
                    >
                        200 Week SMA
                    </button>
                </>
            )}
            </div>

            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        left: `${tooltipData.x > (chartContainerRef.current.clientWidth / 2) ? tooltipData.x + (chartContainerRef.current.clientWidth / 10) : tooltipData.x + (chartContainerRef.current.clientWidth / 5)}px`,
                        top: `${tooltipData.y + 100}px`,                        
                    }}
                >
                    <div style={{fontSize: '15px' }}>Bitcoin</div>
                    <div style={{fontSize: '20px' }}>${tooltipData.price.toFixed(2)}</div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {
                !isDashboard && (
                    <p className='chart-info'>
                        Bitcoin is a cryptographic marvel, a masterpiece of computer science.
                        Here we have a globally distributed, permissionless ledger, secured by an army of miners – a system that's incorruptible,
                        transparent, and nearly impossible to shut down. It's a revolution in value transfer, a store of value unlike anything the world has ever seen.
                        Bitcoin is a technological breakthrough, a finite digital asset that can be transferred instantly anywhere on the planet.
                        It's a game-changer for finance, a store of value that transcends borders and bureaucracy.
                    </p>
                )   
            }
        </div>
    );
};

export default BitcoinPrice;


