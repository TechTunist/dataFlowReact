// EthereumChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'

const EthereumPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);

    // Function to toggle scale mode
    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 1 ? 2 : 1));
    };


    useEffect(() => {
        // Replace with your API call function
        fetch('http://127.0.0.1:8000/api/eth/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                setChartData(formattedData);

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
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

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData, scaleMode]);

    return (
        <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
            <div style={{ textAlign: 'left', marginBottom: '0px', height: '30px'}}>
                <label className="switch">
                    <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                    <span className="slider round"></span>
                </label>
                <span className="scale-mode-label">{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid white' }}>
                {/* Adjust the height calculation based on the height of your button and margin */}
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
        </div>
    );
    
    
};

export default EthereumPrice;
