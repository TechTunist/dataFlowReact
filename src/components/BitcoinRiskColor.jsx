import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const BitcoinRiskColor = ({ isDashboard = false }) => {
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
        yaxis: { title: 'Price (USD)', type: 'log' },
        legend: {
          title: { text: 'Select Risk Bands' }, // Add a title to the legend
          orientation: 'h', // 'h' for horizontal layout
          x: 0.5, // Center the legend in the x-axis
          xanchor: 'center', // Use 'center' to center-align the legend based on x position
          y: -0.2, // Position the legend below the x-axis (you might need to adjust this)
          yanchor: 'top', // Anchor the legend to the top of its container
        }
      });
      

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    // Adjusted initial datasets for 10 bins
    const [datasets, setDatasets] = useState(
        Array.from({ length: 10 }, (_, index) => ({
            data: [],
            visible: true,
            label: `${(index * 0.1).toFixed(1)} - ${((index + 1) * 0.1).toFixed(1)}`
        }))
    );

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

    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        function fetchBtcData() {
            // if no cached data is found, fetch new data
            // Adjust the URL dynamically based on the selected altcoin
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                const withRiskMetric = calculateRiskMetric(formattedData);

                localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
                updateDatasets(withRiskMetric);

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }
    
        function updateDatasets(data) {
            const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]; // Upper limits for 10 bins
            let newDatasets = riskBands.map((upperLimit, index) => {
                const lowerLimit = index === 0 ? 0.0 : riskBands[index - 1];
                const filteredData = data.filter(d => d.Risk > lowerLimit && d.Risk <= upperLimit);

                return {
                    data: filteredData,
                    visible: true,
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        color: filteredData.map(d => d.Risk),
                        colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
                        cmin: 0,
                        cmax: 1,
                        size: 10,
                    },
                    name: `${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}`,
                    hovertemplate: `<b>Risk Band:</b> ${lowerLimit.toFixed(1)} - ${upperLimit.toFixed(1)}<br>` +
                                   `<b>Risk:</b> %{marker.color:.2f}<br>` +
                                   `<b>Price:</b> $%{y:,.0f}<br>` +
                                   `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`
                };
            });
        
            // Add the Bitcoin price line dataset
            newDatasets.push({
                x: data.map(d => d.time),
                y: data.map(d => d.value),
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: 'grey',
                    width: 1.5
                },
                name: 'Bitcoin Price',
                visible: true // Ensure this line is always visible
            });
        
            setDatasets(newDatasets);
        }
    
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                updateDatasets(JSON.parse(cachedData));
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }
    }, []);


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
                    data={datasets.filter(dataset => dataset.visible).map(dataset => ({
                        type: dataset.type,
                        mode: dataset.mode,
                        x: dataset.x || dataset.data.map(d => d.time), // Check for x property first, if not available then map over data
                        y: dataset.y || dataset.data.map(d => d.value), // Check for y property first, if not available then map over data
                        marker: dataset.marker || {},
                        line: dataset.line || {},
                        name: dataset.name,
                        hoverinfo: 'text',
                        hovertemplate: dataset.hovertemplate

                    }))}
                    layout={{
                        title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level',
                        autosize: true,
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { title: '' },
                        yaxis: { title: 'Price (USD)', type: 'log' },
                        showlegend: !isDashboard,
                        legend: isDashboard ? {} : { // Only add legend properties if not in dashboard view
                            title: { text: 'Select Risk Bands' },
                            orientation: 'h',
                            x: 0.5,
                            xanchor: 'center',
                            y: -0.2,
                            yanchor: 'top',
                          }
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
                    <p className='chart-info'>
                        The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                        It does so by calculating the normalized logarithmic difference between the price and the moving average,
                        producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                        This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
                        <br />
                    </p>
                        
                )   
            }
        </div>
        </div>
    );
};

export default BitcoinRiskColor;