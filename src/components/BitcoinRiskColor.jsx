import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';

const BitcoinRiskColor = ({ isDashboard = false }) => {
    const [chartData, setChartData] = useState([]);

    // Function to calculate the risk metric
    const calculateRiskMetric = (data) => {
        const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
            return { ...item, MA: avg };
        });

        const movingAverageWithPreavg = movingAverage.map((item, index) => {
            const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
            return { ...item, Preavg: preavg };
        });

        const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
        const preavgMin = Math.min(...preavgValues);
        const preavgMax = Math.max(...preavgValues);

        const normalizedRisk = movingAverageWithPreavg.map(item => ({
            ...item,
            Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
        }));

        return normalizedRisk;
    };

    // Fetch and process data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
                const data = await response.json();
                const formattedData = data.map(item => ({
                    date: item.date,
                    value: parseFloat(item.close)
                }));
                const withRiskMetric = calculateRiskMetric(formattedData);
                setChartData(withRiskMetric);
            } catch (error) {
                console.error('Error fetching data: ', error);
            }
        };

        fetchData();
    }, []);

    // Adjust the size of the chart based on the context
    const chartSize = isDashboard ? { width: 720, height: 300 } : { width: 1200, height: 600 };
    const chartMargin = isDashboard ? { l: 50, r: 10, t: 45, b: 50 } : { l: 60, r: 10, t: 45, b: 60 };

    return (
        <Plot
            data={[
                {
                    type: 'scatter',
                    mode: 'markers',
                    x: chartData.map(d => d.date),
                    y: chartData.map(d => d.value),
                    marker: {
                        color: chartData.map(d => d.Risk),
                        colorscale: 'RdBu',
                        cmin: 0,
                        cmax: 1,
                        size: isDashboard ? 8 : 12,
                    },
                },
            ]}
            layout={{
                title: 'Bitcoin Price vs. Risk Level',
                xaxis: { title: 'Date' },
                yaxis: { title: 'Price (USD)', type: 'log' },
                ...chartSize,
                margin: chartMargin,
                plot_bgcolor: '#0c101b',
                paper_bgcolor: '#0c101b',
                font: {
                    color: '#ffffff'
                }
            }}
        />
    );
};

export default BitcoinRiskColor;