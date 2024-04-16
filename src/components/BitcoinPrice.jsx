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

    // Function to toggle scale mode
    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
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
        });
        areaSeries.setData(chartData);

        // Calculate and plot the 8-week moving average
        const movingAverage8Week = calculateMovingAverage(chartData, (8*6));
        const movingAverage20Week = calculateMovingAverage(chartData, (20*7));
        const movingAverage100Week = calculateMovingAverage(chartData, (100*7));

        const ma8WeekSeries = chart.addLineSeries({
            priceScaleId: 'right',
            color: 'blue', 
            lineWidth: 2,
        });

        const ma20WeekSeries = chart.addLineSeries({
            priceScaleId: 'right',
            color: 'green', 
            lineWidth: 2,
        });

        const ma100WeekSeries = chart.addLineSeries({
            priceScaleId: 'right',
            color: 'white', 
            lineWidth: 2,
        });

        if (show8Week) {
            ma8WeekSeries.setData(movingAverage8Week);
        } else {
            ma8WeekSeries.setData([]);
        }

        if (show20Week) {
            ma20WeekSeries.setData(movingAverage20Week);
        } else {
            ma20WeekSeries.setData([]);
        }

        if (show100Week) {
            ma100WeekSeries.setData(movingAverage100Week);
        } else {
            ma100WeekSeries.setData([]);
        }
    
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
    }, [chartData, scaleMode, isDashboard, theme.palette.mode, show8Week, show20Week, show100Week]);

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
                    {/* The switch and label go here */}
                    <label className="switch">
                        <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                        <span className="slider round"></span>
                    </label>
                    <span className="scale-mode-label" style={{color: colors.primary[100]}}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                </div>
                <div>
                    {/* Button to toggle markers */}
                    {
                        !isDashboard && (
                        <button onClick={toggle8Week} className="button-reset">
                                    {show8Week ? 'Disable 8 Week MA' : 'Show 8 Week MA'}
                        </button>)
                    }
                </div>
                <div>
                    {/* Button to toggle markers */}
                    {
                        !isDashboard && (
                        <button onClick={toggle20Week} className="button-reset">
                                    {show20Week ? 'Disable 20 Week SMA' : 'Show 20 Week SMA'}
                        </button>)
                    }
                </div>
                <div>
                    {/* Button to toggle markers */}
                    {
                        !isDashboard && (
                        <button onClick={toggle100Week} className="button-reset">
                                    {show20Week ? 'Disable 100 Week SMA' : 'Show 100 Week SMA'}
                        </button>)
                    }
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


