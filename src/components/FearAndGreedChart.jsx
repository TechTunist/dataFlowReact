import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';

const FearAndGreedChart = ({ isDashboard = false }) => {
    const theme = useTheme();
    const isMobile = useIsMobile();
    const colors = tokens(theme.palette.mode);
    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Bitcoin Price vs. Fear and Greed Index',
        autosize: true,
        margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { title: '' },
        yaxis: { title: 'Price (USD)', type: 'log' },
        showlegend: !isDashboard, // Add this line to control legend visibility
        legend: !isDashboard ? { // Configure legend only if not in dashboard view
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.2,
            yanchor: 'top',
        } : {}
    });

    const [datasets, setDatasets] = useState([]);

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    useEffect(() => {
        const fetchBitcoinData = async () => {
            try {
                const btcResponse = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
                if (!btcResponse.ok) {
                    throw new Error(`Error fetching Bitcoin data: ${btcResponse.statusText}`);
                }
                const btcData = await btcResponse.json();

                const startDate = new Date('2018-02-01');
                const btcFormattedData = btcData.filter(item => new Date(item.date) >= startDate)
                    .map(item => ({
                        time: item.date,
                        value: parseFloat(item.close)
                    }));

                // Fetch fear and greed data with error handling
                const fearGreedResponse = await fetch('https://tunist.pythonanywhere.com/api/fear-and-greed/');
                if (!fearGreedResponse.ok) {
                    throw new Error(`Error fetching Fear and Greed data: ${fearGreedResponse.statusText}`);
                }
                const fearGreedData = await fearGreedResponse.json();

                let fearGreedGroups = {};
                fearGreedData.forEach(item => {
                    const date = new Date(item.timestamp * 1000).toISOString().slice(0, 10);
                    const classification = item.value_classification;
                    if (!fearGreedGroups[classification]) {
                        fearGreedGroups[classification] = [];
                    }
                    fearGreedGroups[classification].push({
                        time: date,
                        value: item.value,
                        btcPrice: btcFormattedData.find(btc => btc.time === date)?.value || null
                    });
                });

                // Predefined order for fear and greed classifications
                const classificationOrder = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];

                let fearGreedDataset = Object.keys(fearGreedGroups)
                    .sort((a, b) => classificationOrder.indexOf(a) - classificationOrder.indexOf(b))
                    .map(classification => ({
                        x: fearGreedGroups[classification].map(d => d.time),
                        y: fearGreedGroups[classification].map(d => d.btcPrice),
                        customdata: fearGreedGroups[classification].map(d => [d.value]),  // array of arrays, each sub-array corresponds to one point
                        type: 'scatter',
                        mode: 'markers',
                        marker: {
                            size: 6,
                            color: getColor(classification),
                        },
                        name: classification,
                        hovertemplate:
                            `<b>Classification:</b> ${classification}<br>` +
                            `<b>Value:</b> %{customdata[0]}<br>` +  // Access the first element in the customdata array for each point
                            `<b>Price:</b> $%{y:,.0f}<br>` +
                            `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`
                    }));

                setDatasets([
                    {
                        x: btcFormattedData.map(d => d.time),
                        y: btcFormattedData.map(d => d.value),
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: 'grey', width: 1.5 },
                        name: 'Bitcoin Price'
                    },
                    ...fearGreedDataset
                ]);
            } catch (error) {
                console.error("Error fetching data:", error);
                // You can also display an error message to the user here
            }
        };

        fetchBitcoinData();
    }, []);

    const getColor = (classification) => {
        // Simplify by using classification directly
        switch (classification) {
            case 'Extreme Fear':
                return '#FF4500'; // Red
            case 'Fear':
                return '#FFA500'; // Orange
            case 'Neutral':
                return '#FFFF00'; // Yellow
            case 'Greed':
                return '#ADFF2F'; // Greenish yellow
            case 'Extreme Greed':
                return '#00FF00'; // Green
            default:
                return '#D3D3D3'; // Grey for unknown classifications
        }
    };

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    {/* Interactivity toggles for each dataset */}
                    <div className="risk-filter">
                    </div>
                    <div>
                        {/* placeholder for styling */}
                    </div>
                    <div>
                        {
                            !isDashboard && (
                                <button onClick={resetChartView} className="button-reset">
                                    Reset Chart
                                </button>
                            )
                        }
                    </div>
                </div>
            )}

            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    data={datasets}
                    layout={{
                        title: isDashboard ? '' : 'Bitcoin Price vs. Fear and Greed Index',
                        autosize: true,
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { title: '' },
                        yaxis: { title: 'Price (USD)', type: 'log' },
                        showlegend: !isDashboard, // Control legend visibility
                        legend: !isDashboard ? {
                            title: { text: isMobile ? '' : 'Select Risk Bands' }, // Add a title to the legend
                            orientation: 'h', // 'h' for horizontal layout
                            x: 0.5, // Center the legend in the x-axis
                            xanchor: 'center', // Use 'center' to center-align the legend based on x position
                            y: -0.2, // Position the legend below the x-axis (you might need to adjust this)
                            yanchor: 'top', // Anchor the legend to the top of its container
                        } : {}
                    }}
                    config={{
                        staticPlot: isDashboard,
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                />
            </div>
            <div className='under-chart'>
                {!isDashboard && (
                    <LastUpdated storageKey="btcData" />
                )}
                {!isDashboard && (
                    <BitcoinFees />
                )}
            </div>
            <div>
                {
                    !isDashboard && (
                        <p className='chart-info' style={{ marginTop: '10px', textAlign: 'left', width: '100%' }}> {/* Adjust width as necessary */}
                            <b>Data only available starting from February 2018.</b><br /><br />
                            The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data,
                            including surveys, social media, volatility, market momentum, and volume among others.
                            This chart plots the fear and greed indicator over the corresponding bitcoin price.
                            <br /> The information for this chart has been obtained from this source:
                            <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                        </p>
                    )
                }
            </div>
        </div>
    );
};

export default FearAndGreedChart;
