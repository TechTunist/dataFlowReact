// EthereumChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";

const EthereumPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

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
        const cacheKey = 'ethData';
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
            fetch('https://tunist.pythonanywhere.com/api/eth/price/')
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
                textColor: 'white',
            },
            grid: {
                vertLines: {
                    color: 'rgba(70, 70, 70, 0.5)',
                },
                horzLines: {
                    color: 'rgba(70, 70, 70, 0.5)',
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
    
        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            topColor: 'rgba(38, 198, 218, 0.56)', 
            bottomColor: 'rgba(38, 198, 218, 0.04)', 
            lineColor: 'rgba(38, 198, 218, 1)', 
            lineWidth: 2, 
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
        };
    }, [chartData, scaleMode, isDashboard]);

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
                {
                    !isDashboard && (
                        <button onClick={resetChartView} style={{ marginRight: '0px' }}>
                            Reset Chart
                        </button>
                    )   
                }
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid white' }}>
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
        </div>
    );
    
    
};

export default EthereumPrice;