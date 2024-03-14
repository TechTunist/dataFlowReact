// EthereumChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'

const EthereumPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null); // ref to store chart for use in return statement

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
    
        if (cachedData) {
            // if cached data is found, parse it and set it to the state
            setChartData(JSON.parse(cachedData));
        } else {
            // if no cached data is found, fetch new data
            fetch('http://tunist.pythonanywhere.com/api/eth/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date, // Make sure 'time' is in a format accepted by your charting library
                    value: parseFloat(item.close) // Convert 'close' to a float
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
                background: {type: 'solid', color: 'black'},
                textColor: 'white',
            },
            grid: {
                vertLines: {
                    color: 'rgba(70, 70, 70, 0.5)', // Darker shade for vertical lines
                },
                horzLines: {
                    color: 'rgba(70, 70, 70, 0.5)', // Darker shade for horizontal lines
                },
            },
            timeScale: {
                minBarSpacing: 0.001,
            },
        });

        chart.priceScale('right').applyOptions({
            mode: scaleMode, // Logarithmic scale
            borderVisible: false,
        });

        // Function to update chart size
        const resizeChart = () => {
            if (chart && chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', resizeChart);
        resizeChart();

        const lineSeries = chart.addLineSeries({
            priceScaleId: 'right',
            lineWidth: 1
        });
        lineSeries.setData(chartData);

        // Disable all interactions
        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
        });

        chart.timeScale().fitContent();
        chartRef.current = chart; // Store the chart instance

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData, scaleMode]);

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
                    <span className="scale-mode-label">{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                </div>
                {/* The button is now in its own container div */}
                <button onClick={resetChartView} style={{ marginRight: '0px' }}>
                    Reset Chart
                </button>
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid white' }}>
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
        </div>
    );
    
    
};

export default EthereumPrice;
