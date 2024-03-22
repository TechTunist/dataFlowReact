// Import necessary items from lightweight-charts and React
import React, { useRef, useEffect, useState } from 'react';
import { createChart, ISeriesApi } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { useTheme } from '@mui/material';
import { tokens } from '../theme';

// SMA calculation helper function
const calculateSMA = (data, windowSize) => {
  let sma = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += parseFloat(data[i - j].value);
    }
    sma.push({ time: data[i].time, value: sum / windowSize });
  }
  return sma;
};

const PiCycleTopChart = ({ isDashboard = false }) => {
  const chartContainerRef = useRef();
  const [chartData, setChartData] = useState([]);
  const [scaleMode, setScaleMode] = useState(1);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const chartRef = useRef(null);

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
        if (chartData.length > 0 && chartContainerRef.current && !chartRef.current) {
            // Create the chart instance and store it in the ref
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 350,
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
            chartRef.current = chart;

            // Add the series to the chart
            const bitcoinSeries = chart.addLineSeries({
                color: 'rgba(255, 207, 64, 1)',
                lineWidth: 2,
            });

            const sma111Series = chart.addLineSeries({
                color: 'rgba(76, 175, 80, 0.5)',
                lineWidth: 1,
            });

            const sma350Series = chart.addLineSeries({
                color: 'rgba(244, 67, 54, 0.5)',
                lineWidth: 1,
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
            bitcoinSeries.setData(chartData);
            sma111Series.setData(calculateSMA(chartData, 111));
            sma350Series.setData(calculateSMA(chartData, 350).map(point => ({
                time: point.time,
                value: point.value * 2,
            })));

            chart.applyOptions({
                handleScroll: !isDashboard,
                handleScale: !isDashboard,
            });
        
            resizeChart(); // Ensure initial resize and fitContent call
            chart.timeScale().fitContent(); // Additional call to fitContent to ensure coverage
            chartRef.current = chart; // Store the chart instance
        }

        // Cleanup function
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [chartData, colors, theme.palette.mode]);


  return (
    <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%' }}>
    <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
</div>
  );
};

export default PiCycleTopChart;
