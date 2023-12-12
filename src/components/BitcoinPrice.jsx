// BitcoinChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';

const BitcoinPrice = () => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);

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

    useEffect(() => {
        // Replace with your API call function
        fetch('http://127.0.0.1:8000/api/btc/price/')
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

        const lineSeries = chart.addLineSeries();
        lineSeries.setData(chartData);

        // // // set visible range to last N data points
        // const N = 30; // Number of data points to display
        // const startIndex = Math.max(chartData.length - N, 0);
        // const endIndex = chartData.length - 1;
        // chart.timeScale().setVisibleRange({
        //     from: chartData[startIndex].time,
        //     to: chartData[endIndex].time,
        // });

        chart.timeScale().fitContent();

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData]);

    return <div ref={chartContainerRef} style={{ height: '100%', width: '100%' }} />;
};

export default BitcoinPrice;
