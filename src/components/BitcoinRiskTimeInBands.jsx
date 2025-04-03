// show the current risk level like the info under the risk metric chart

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';

const BitcoinRiskBandDuration = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [riskBandDurations, setRiskBandDurations] = useState([]);
    const isMobile = useIsMobile();
    const [layout, setLayout] = useState({});
    
    // State to store current risk level
    const [currentRiskLevel, setCurrentRiskLevel] = useState(null);

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);

        function fetchAndProcessBtcData() {
            // If no cached data is found, fetch new data
            // fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            fetch('https://vercel-dataflow.vercel.app/api/btc/price/')
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: new Date(item.date),
                        value: parseFloat(item.close)
                    }));
                    
                    const riskData = calculateRiskMetric(formattedData);
                    const durations = calculateRiskBandDurations(riskData);
                    setRiskBandDurations(durations);
                    setCurrentRiskLevel(riskData[riskData.length - 1].Risk.toFixed(2));
                    
                })
                .catch(error => {
                    console.error('Error fetching data: ', error);
                });
        }

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const today = new Date();
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                const durations = calculateRiskBandDurations(parsedData);
                setRiskBandDurations(durations);
                setCurrentRiskLevel(parsedData[parsedData.length - 1].Risk.toFixed(2));
            } else {
                fetchAndProcessBtcData();
            }
        } else {
            fetchAndProcessBtcData();
        }
    }, []);

    // Function to calculate risk metric (same as in the original component)
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

    const calculateRiskBandDurations = (data) => {
        // Define 10 discrete bins from 0 to 1 with 0.1 increments
        const riskBands = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
        const bandCounts = Array(10).fill(0); // Initialize counts for 10 bins

        for (let i = 0; i < data.length; i++) {
            const risk = data[i].Risk;
            // Find the bin index for the current risk value
            const bandIndex = Math.min(Math.floor(risk * 10), 9); // Multiply by 10 for 0.1 bins, cap at 9
            bandCounts[bandIndex]++;
        }

        // Convert counts to percentages and days
        const totalDays = bandCounts.reduce((sum, count) => sum + count, 0);
        return bandCounts.map((count, index) => ({
            band: `${(index * 0.1).toFixed(1)} - ${(index + 1) * 0.1 <= 1.0 ? ((index + 1) * 0.1).toFixed(1) : '1.0'}`,
            percentage: (count / totalDays * 100).toFixed(2),
            days: count
        }));
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>
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
            <Plot
                data={[
                    {
                        type: 'bar',
                        x: riskBandDurations.map(risk => risk.band),
                        y: riskBandDurations.map(risk => parseFloat(risk.percentage)),
                        hoverinfo: 'text+x',
                        hovertemplate: 'Risk Band: %{x}<br>Time in: %{y}%<br>Total Days: %{customdata} days<extra></extra>',
                        customdata: riskBandDurations.map(risk => risk.days), // Add this line to provide the days data for hover
                        marker: {
                            // Assign different colors for each bar based on their index
                            color: riskBandDurations.map((_, index) => {
                                switch (index) {
                                    case 0: return colors.redAccent[800];
                                    case 1: return colors.redAccent[700];
                                    case 2: return colors.redAccent[500];
                                    case 3: return colors.redAccent[300];
                                    case 4: return colors.redAccent[100];
                                    case 5: return colors.blueAccent[100];
                                    case 6: return colors.blueAccent[300];
                                    case 7: return colors.blueAccent[500];
                                    case 8: return colors.blueAccent[700];
                                    case 9: return colors.blueAccent[800];
                                    default: return colors.grey[400];
                                }
                            })
                        }
                    }
                ]}
                layout={{
                    title: isDashboard ? '' : 'Bitcoin Price Risk Band Durations',
                    autosize: true,
                    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
                    plot_bgcolor: colors.primary[700],
                    paper_bgcolor: colors.primary[700],
                    font: { color: colors.primary[100] },
                    xaxis: { title: isDashboard || isMobile ? '' : 'Risk Bands' },
                    yaxis: { title: 'Percentage of Time (%)' },
                    showlegend: false,
                }}
                config={{
                    displayModeBar: false,
                    responsive: true
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
            />
            <div>
                {
                    !isDashboard && (
                        <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem'}}>
                        Current Risk Level: <b>{currentRiskLevel !== null ? currentRiskLevel : 'Loading...'}</b>
                        </div>
                    )
                }
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
                        This chart shows the total amount of time Bitcoin has spent in each risk band over it's entire existence, which
                        can help to understand the fleeting nature of the extreme risk bands at either ends of the spectrum.
                        The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                        It does so by calculating the normalized logarithmic difference between the price and the moving average,
                        <br />
                    </p>
                        
                )   
            }
        </div>
        </div>
    );
};

export default BitcoinRiskBandDuration;