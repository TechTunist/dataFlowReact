import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from "@mui/material";
import { tokens } from "../theme"; // Ensure the path matches your project structure

const BitcoinPrice = ({ isDashboard = false }) => {
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState('log'); // 'log' for logarithmic, 'linear' for linear
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    useEffect(() => {
        // Replace the fetch URL with your API endpoint
        fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    x: item.date,
                    y: parseFloat(item.close)
                }));
                setChartData(formattedData);
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
    }, []);

    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 'log' ? 'linear' : 'log'));
    };

    // Adjust the size and margin of the chart based on the dashboard context
    const chartSize = isDashboard ? { width: 720, height: 310 } : { width: '100%', height: 600 };
    const chartMargin = isDashboard ? { l: 50, r: 50, t: 20, b: 50 } : { l: 60, r: 10, t: 45, b: 60 };

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div style={{ marginBottom: '20px' }}>
                    <button onClick={toggleScaleMode}>
                        {scaleMode === 'log' ? 'Switch to Linear Scale' : 'Switch to Logarithmic Scale'}
                    </button>
                </div>
            )}
            <Plot
                data={[
                    {
                        x: chartData.map(data => data.x),
                        y: chartData.map(data => data.y),
                        type: 'scatter',
                        mode: 'lines+markers',
                        line: {
                            color: '#FF5733', // Example: orange color for the line
                        },
                        marker: {
                            color: '#33C3F0', // Example: blue color for the markers
                        },
                    },
                ]}
                layout={{
                    title: isDashboard ? '' : 'Bitcoin Price', // Hide title in dashboard mode
                    xaxis: { title: 'Date' },
                    yaxis: { title: 'Price (USD)', type: scaleMode },
                    font: { color: colors.text },
                    autosize: true,
                    margin: chartMargin,
                    plot_bgcolor: '#0c101b',
                    paper_bgcolor: '#0c101b',
                    font: {
                        color: '#ffffff'
                    },
                }}
                config={{
                    displayModeBar: !isDashboard, // Optionally hide the mode bar in dashboard mode
                    responsive: true
                }}
                useResizeHandler={true}
                style={chartSize}
            />
            <LastUpdated storageKey="btcData" />
        </div>
    );
};

export default BitcoinPrice;