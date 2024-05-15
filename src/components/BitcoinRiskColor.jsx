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

    const [datasets, setDatasets] = useState([
        { data: [], visible: true, label: "0.0 - 0.19" },
        { data: [], visible: true, label: "0.2 - 0.39" },
        { data: [], visible: true, label: "0.4 - 0.59" },
        { data: [], visible: true, label: "0.6 - 0.79" },
        { data: [], visible: true, label: "0.8 - 1.0" }
    ]);

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
            const riskBands = [0.19, 0.39, 0.59, 0.79, 1.0]; // Upper limits of each risk band
            let newDatasets = riskBands.map((upperLimit, index) => {
                const filteredData = data.filter(d => d.Risk <= upperLimit && (index === 0 || d.Risk > riskBands[index - 1]));
        
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
                    name: `${index === 0 ? '0.0' : (riskBands[index - 1] + 0.01).toFixed(2)} - ${upperLimit.toFixed(2)}`
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
                        hoverinfo: 'text'
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
                        <br />
                        Initial Bottom: 2011-11-22 (0.22) - Major Top: 2013-04-10 (0.89) <br /> <br />
                        Mid Cycle Bottom: 2013-07-07 (0.46) - Major Top: 2013-11-30 (0.91) <br /> <br />
                        Bear Market Low: 2015-01-15 (0.22) - Bull Market Peak: 2017-12-17 (1.0) <br /> <br />
                        Bear Market Low: 2018-12-16 (0.00) - Mid-Cycle High: 2019-06-26 (0.69) <br /> <br />
                        Black Swan Crash: 2020-03-12 (0.15) - Bull Market Peak: 2021-02-21 (0.93) <br /> <br />
                        MidCycle Low: 2021-07-20 (0.36) - Second Bull Market Peak: 2021-10-20 (0.59) <br /> <br />
                        Bear Market Low: 2022-11-09 (0.02) - Local Top So Far: 2024-03-13 (0.73) <br /> <br />
                    </p>
                        
                )   
            }
        </div>
        </div>
    );
};

export default BitcoinRiskColor;