import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";

const BitcoinRiskColor = ({ isDashboard = false }) => {
    const [chartData, setChartData] = useState([]);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', marginBottom: '0px', height: '30px' }}>
            
            {/* {
                !isDashboard && (
                    <button onClick={resetChartView} className="button-reset">
                        Reset Chart
                    </button>
                )   
            } */}
        </div>
        <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%' }}>
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
                },
            ]}
            layout={{
                title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level', // Title only if not on the dashboard
                xaxis: { title: isDashboard ? '' : 'Date' },
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
                responsive: true
            }}
            useResizeHandler={true} // Enable resize handler
            style={{ width: "100%", height: isDashboard ? "100%" : "600px" }} // Dynamically adjust size
        />
        </div>
        <div>
            {
                !isDashboard && (
                    <h3>
                        The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                        It does so by calculating the normalized logarithmic difference between the price and the moving average,
                        producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                        This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
                    </h3>
                )   
            }
        </div>
    </div>
        
    );
};

export default BitcoinRiskColor;