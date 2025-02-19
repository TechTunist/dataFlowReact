import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';

const BitcoinRiskBandDuration = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [riskBandDurations, setRiskBandDurations] = useState([]);

    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);

        function fetchAndProcessBtcData() {
            // If no cached data is found, fetch new data
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: new Date(item.date),
                        value: parseFloat(item.close)
                    }));
                    
                    const riskData = calculateRiskMetric(formattedData);
                    const durations = calculateRiskBandDurations(riskData);
                    setRiskBandDurations(durations);
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
        const riskBands = [0.19, 0.39, 0.59, 0.79, 1.0];
        const bandCounts = [0, 0, 0, 0, 0];
        let currentBand = -1;

        for (let i = 0; i < data.length; i++) {
            const risk = data[i].Risk;
            let newBand = riskBands.findIndex(band => risk <= band);
            if (newBand === -1) newBand = 4;  // For the highest band

            if (newBand !== currentBand) {
                bandCounts[newBand]++;
                currentBand = newBand;
            } else {
                bandCounts[newBand]++;
            }
        }

        // Convert counts to percentages and days
        const totalDays = bandCounts.reduce((sum, count) => sum + count, 0);
        return bandCounts.map((count, index) => ({
            band: `${index === 0 ? '0.0' : (riskBands[index - 1] + 0.01).toFixed(2)} - ${riskBands[index]?.toFixed(2) || '1.0'}`,
            percentage: (count / totalDays * 100).toFixed(2),
            days: count
        }));
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>
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
                                    case 0: return colors.greenAccent[100];
                                    case 1: return colors.greenAccent[200];
                                    case 2: return colors.greenAccent[300];
                                    case 3: return colors.greenAccent[400];
                                    case 4: return colors.greenAccent[500];
                                    default: return colors.grey[400]; // Fallback color
                                }
                            })
                        }
                    }
                ]}
                layout={{
                    title: 'Bitcoin Price Risk Band Durations',
                    autosize: true,
                    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
                    plot_bgcolor: colors.primary[700],
                    paper_bgcolor: colors.primary[700],
                    font: { color: colors.primary[100] },
                    xaxis: { title: 'Risk Bands' },
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