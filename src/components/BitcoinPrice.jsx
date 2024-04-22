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
    const color20Week = 'limegreen';
    const color100Week = 'white';
    const color200Week = 'yellow';
    // state to allow interactivity
    const [isInteractive, setIsInteractive] = useState(false);

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

    const toggleScaleMode = () => {
        const newScaleMode = scaleMode === 1 ? 0 : 1;
        setScaleMode(newScaleMode);
    };

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({
                mode: scaleMode,
                borderVisible: false,
            });
        }
    }, [scaleMode]);

    // This useEffect handles fetching data and updating the local storage cache. It’s self-contained and correctly handles data fetching independently.
    useEffect(() => {
        const cacheKey = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        const fetchData = async () => {
            try {
                const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
                const data = await response.json();
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));
                localStorage.setItem(cacheKey, JSON.stringify(formattedData));
                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
    
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setChartData(JSON.parse(cachedData));
            } else {
                fetchData();
            }
        } else {
            fetchData();
        }
    }, []);
    
    
    // This useEffect initializes the chart and updates it based on changes to the chartData,
    // theme.palette.mode, and isDashboard. It manages subscriptions and resizing.
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
                    color: colors.greenAccent[700]
                },
                horzLines: {
                    color: colors.greenAccent[700],
                },
            },
            timeScale: {
                minBarSpacing: 0.001
            },
        });
    
        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            topColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.56)' : 'rgba(255, 165, 0, 0.56)',
            bottomColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.04)' : 'rgba(255, 165, 0, 0.2)',
            lineColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
            lineWidth: 2,
            priceFormat: { type: 'custom', formatter: compactNumberFormatter },
        });

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            // borderVisible: false,
        });
    
        areaSeries.setData(chartData);
    
        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
            handleScroll: isInteractive,
            handleScale: isInteractive, });
    
        const resizeChart = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
            chart.timeScale().fitContent();
        };

        resizeChart();
    
        window.addEventListener('resize', resizeChart);

        chartRef.current = chart;
    
        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData, isDashboard, theme.palette.mode]);

    useEffect(() => {
        if (chartRef.current) {
            // Disable all interactions if the chart is displayed on the dashboard
        chartRef.current.applyOptions({
            handleScroll: isInteractive,
            handleScale: isInteractive,
        });
        }
    }, [isInteractive]);

    // useEffect for applying scaleMode changes
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.priceScale('right').applyOptions({
                mode: scaleMode,
                borderVisible: false,
            });
        }
    }, [scaleMode]);
    

    // Initialize state for series references
    const [maSeries, setMaSeries] = useState({
        ma8Week: null,
        ma20Week: null,
        ma100Week: null,
        ma200Week: null,
    });

    // This useEffect updates the SMA series based on toggles and chart data updates. It manages creating and updating line series for moving averages.
    useEffect(() => {
        if (chartData.length === 0 || !chartRef.current) return;
    
        const createOrUpdateSeries = (series, color, isVisible) => {
            if (!series) {
                series = chartRef.current.addLineSeries({
                    priceScaleId: 'right',
                    color: color,
                    lineWidth: 2,
                    priceLineVisible: false,
                });
            }
            return series;
        };
    
        const updateSeriesData = (series, data, show) => {
            series.setData(show ? data : []);
            series.applyOptions({ visible: show });
        };
    
        const movingAverage8Week = calculateMovingAverage(chartData, 8 * 7);
        const movingAverage20Week = calculateMovingAverage(chartData, 20 * 7);
        const movingAverage100Week = calculateMovingAverage(chartData, 100 * 7);
        const movingAverage200Week = calculateMovingAverage(chartData, 200 * 7);
    
        maSeries.ma8Week = createOrUpdateSeries(maSeries.ma8Week, color8Week, show8Week);
        maSeries.ma20Week = createOrUpdateSeries(maSeries.ma20Week, color20Week, show20Week);
        maSeries.ma100Week = createOrUpdateSeries(maSeries.ma100Week, color100Week, show100Week);
        maSeries.ma200Week = createOrUpdateSeries(maSeries.ma200Week, color200Week, show200Week);
    
        updateSeriesData(maSeries.ma8Week, movingAverage8Week, show8Week);
        updateSeriesData(maSeries.ma20Week, movingAverage20Week, show20Week);
        updateSeriesData(maSeries.ma100Week, movingAverage100Week, show100Week);
        updateSeriesData(maSeries.ma200Week, movingAverage200Week, show200Week);
    
    }, [chartData, show8Week, show20Week, show100Week, show200Week, color8Week, color20Week, color100Week, color200Week]);
    


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
                            width: '150px',
                            minWidth: '150px',
                            backgroundColor: show8Week ? '#4cceac' : 'transparent', // Highlight background when active
                            color: show8Week ? color8Week : '#00b685', // Change text color when active
                            borderColor: show8Week ? color8Week : '#70d8bd' // Change border color when active
                        }}
                    >
                        8 Week SMA
                    </button>
                    <button
                        onClick={toggle20Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '150px',
                            minWidth: '150px',
                            backgroundColor: show20Week ? '#4cceac' : 'transparent',
                            color: show20Week ? 'green' : '#00b685',
                            borderColor: show20Week ? color20Week : '#70d8bd'
                        }}
                    >
                        20 Week SMA
                    </button>
                    <button
                        onClick={toggle100Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '150px',
                            minWidth: '150px',
                            backgroundColor: show100Week ? '#4cceac' : 'transparent',
                            color: show100Week ? color100Week : '#00b685',
                            borderColor: show100Week ? color100Week : '#70d8bd'
                        }}
                    >
                        100 Week SMA
                    </button>
                    <button
                        onClick={toggle200Week}
                        className="button-reset"
                        style={{
                            marginTop: '10px',
                            width: '150px',
                            minWidth: '150px',
                            backgroundColor: show200Week ? '#4cceac' : 'transparent',
                            color: show200Week ? color200Week : '#00b685',
                            borderColor: show200Week ? color200Week : '#70d8bd'
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