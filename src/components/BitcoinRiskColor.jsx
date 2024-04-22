import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css'

const BitcoinRiskColor = ({ isDashboard = false }) => {
    const [chartData, setChartData] = useState([]);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [layout, setLayout] = useState({
        title: 'Bitcoin Price vs. Risk Level',
        autosize: true,
        margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
        plot_bgcolor: 'colors.primary[700]',
        paper_bgcolor: 'colors.primary[700]',
        font: { color: 'colors.primary[100]' },
        xaxis: { title: '' },
        yaxis: { title: 'Price (USD)', type: 'log' }
    });

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

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
    const chartSize = isDashboard ? { width: 720, height: 310 } : { width: 1200, height: 600 };
    const chartMargin = isDashboard ? { l: 50, r: 10, t: 45, b: 50 } : { l: 60, r: 10, t: 45, b: 60 };

    return (
        <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
        <div className='chart-top-div' >
            <div>
                {/* placeholder for styling */}
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
            {/* <div style={{ height: '100%', width: '100%', zIndex: 1 }} /> */}
            <Plot
            data={[
                {
                    type: 'scatter',
                    mode: 'markers',
                    x: chartData.map(d => d.date),
                    y: chartData.map(d => d.value),
                    marker: {
                        color: chartData.map(d => d.Risk),
                        colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
                        cmin: 0,
                        cmax: 1,
                        size: 10,
                    },
                    text: chartData.map(d => `Date: ${d.date}<br>Price: ${d.value.toLocaleString()} USD<br>Risk: ${d.Risk.toFixed(2)}`),
                    hoverinfo: 'text', // Tells Plotly to show the text content on hover
                },
            ]}
            layout={{
                title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level',
                xaxis: { title: isDashboard ? '' : '' },
                yaxis: { title: isDashboard ? '' : 'Price (USD)', type: 'log' },
                autosize: true, // Make the plot responsive
                margin: {
                    l: 50,
                    r: 50,
                    b: 30,
                    t: 30,
                    pad: 4
                },
                plot_bgcolor: colors.primary[700],
                paper_bgcolor: colors.primary[700],
                font: {
                    color: colors.primary[100]
                },
            }}
            config={{
                staticPlot: isDashboard, // Disable interaction when on the dashboard
                displayModeBar: !isDashboard, // Optionally hide the mode bar when on the dashboard
                displayModeBar: false,
                responsive: true
            }}
            useResizeHandler={true} // Enable resize handler
            style={{ width: "100%", height: "100%" }} // Dynamically adjust size
        />
        </div>
        <div>
            {
                !isDashboard && (
                    <p className='chart-info'>
                        The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                        It does so by calculating the normalized logarithmic difference between the price and the moving average,
                        producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                        This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
                        <br />
                        <br />
                        Initial Bottom: 2011-11-22 (0.22) - Major Top: 2013-04-10 (0.89) <br /> <br />
                        Mid Cycle Bottom: 2013-07-07 (0.46) - Second Major Top: 2013-11-30 (0.91) <br /> <br />
                        2015-01-15 (0.22) - 2017-12-17 (1.0) <br />
                        2018-12-16 (0.00) - 2019-06-26 (0.69) <br />
                        2020-03-12 (0.15) - 2021-02-21 (0.93) <br />
                        2021-07-20 (0.36) - 2021-10-20 (0.59) <br />
                        2022-11-09 (0.02) - 2024-03-13 (0.73) <br />
                    </p>
                        
                )   
            }
        </div>
    </div>
        
    );
};

export default BitcoinRiskColor;