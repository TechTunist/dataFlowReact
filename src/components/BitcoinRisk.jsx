import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';

const BitcoinRisk = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null); // ref to store chart for use in return statement

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    // function to calculate the risk metric
    const calculateRiskMetric = (data) => {
        // Calculate 374-day moving average
        const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
            return { ...item, MA: avg };
        });

        // Calculate risk metric
        movingAverage.forEach((item, index) => {
            const preavg = (Math.log(item.value) - Math.log(item.MA)) * index**0.395;
            item.Preavg = preavg;
        });

        // Normalize the Preavg to 0-1 range
        const preavgValues = movingAverage.map(item => item.Preavg);
        const preavgMin = Math.min(...preavgValues);
        const preavgMax = Math.max(...preavgValues);
        const normalizedRisk = movingAverage.map(item => ({
            ...item,
            Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
        }));

        return normalizedRisk;
    };

    // Fetch and process data
    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const apiKey = '4O8RCM0Q1WYUC73J';

        if (cachedData) {
            setChartData(JSON.parse(cachedData));
        } else {
            // fetch('http://127.0.0.1:8000/api/btc/price/')
            // fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=full&symbol=BTCUSD&apikey=${apiKey}`)
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                const withRiskMetric = calculateRiskMetric(formattedData);

                localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
                setChartData(withRiskMetric);
            })
            .catch(error => console.error('Error fetching data: ', error));
        }
    }, []);

    // Render chart
    useEffect(() => {
        if (chartData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: {
                background: { type: 'solid', color: 'black' },
                textColor: 'white',
            },
            grid: {
                vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
                horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.01,
                    bottom: 0.01,
                },
                borderVisible: false,
            },
            leftPriceScale: {
                visible: true, // Show the left price scale
                borderColor: 'rgba(197, 203, 206, 1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                minBarSpacing: 0.001,
            },
        });
        
        // Series for Risk Metric
        const riskSeries = chart.addLineSeries({
            color: 'red',
            lastValueVisible: false,
            priceScaleId: 'right',
            lineWidth: 1
        });
        riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));
        
        // Series for Bitcoin Price on Logarithmic Scale
        const priceSeries = chart.addLineSeries({
            color: 'gray',
            priceScaleId: 'left',
            lineWidth: 0.7,
        });
        priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

        
        // Disable all interactions if the chart is displayed on the dashboard
        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
        });
        
        chart.priceScale('left').applyOptions({
            mode: 1, // Logarithmic scale
            borderVisible: false,
        });
        
        // Function to update chart size
        const resizeChart = () => {
            if (chart && chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', resizeChart);
        resizeChart();

        chart.timeScale().fitContent();
        chartRef.current = chart; // Store the chart instance

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData]);

    return (

        <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', marginBottom: '0px', height: '30px' }}>
                <div>
                    <span style={{ marginRight: '20px', display: 'inline-block' }}>
                        <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Bitcoin Price
                    </span>
                    <span style={{ display: 'inline-block' }}>
                        <span style={{ backgroundColor: 'red', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Risk Metric
                    </span>
                </div>
                
                <button onClick={resetChartView} style={{ marginRight: '0px' }}>
                    Reset Chart
                </button>
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid white' }}>
                {/* Adjust the height calculation based on the height of your button and margin */}
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
        </div>

      );
      
      
      
};

export default BitcoinRisk;
