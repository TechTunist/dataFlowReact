import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';

const UsCombinedMacroChart = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [chartData, setChartData] = useState([]);
    const [selectedData, setSelectedData] = useState('inflation');
    const isMobile = useIsMobile();
    const [layout, setLayout] = useState({});

    const resetChartView = () => {
        setLayout({
            ...layout,
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    useEffect(() => {
        const cacheKey = 'combinedMacroData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

        const fetchData = async () => {
            try {
                // const response = await fetch('https://tunist.pythonanywhere.com/api/combined-macro-data/');
                const response = await fetch('https://vercel-dataflow.vercel.app/api/combined-macro-data/');
                const data = await response.json();
                let lastKnownInflation = null;
                const formattedData = data.map(item => {
                    if (item.inflation_rate !== null) {
                        lastKnownInflation = parseFloat(item.inflation_rate);
                    }
                    return {
                        time: item.date,
                        inflation_value: lastKnownInflation,
                        unemployment_value: item.unemployment_rate ? parseFloat(item.unemployment_rate) : null,
                        interest_value: item.interest_rate ? parseFloat(item.interest_rate) : null,
                    };
                });

                localStorage.setItem(cacheKey, JSON.stringify(formattedData));
                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setChartData(parsedData);
            } else {
                fetchData();
            }
        } else {
            fetchData();
        }
    }, []);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div className="select-reset-wrapper">
                        <select className="button-reset" value={selectedData} onChange={(e) => setSelectedData(e.target.value)}>
                            <option value="inflation">Inflation Rate</option>
                            <option value="unemployment">Unemployment Rate</option>
                            <option value="interest">Interest Rate</option>
                        </select>
                    </div>
                    <div>
                        {/* placeholder for styling */}
                    </div>
                    <div>
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    </div>
                </div>
            )}
            
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    data={[
                        {
                            x: chartData.map(d => d.time),
                            y: chartData.map(d => d[`${selectedData}_value`]),
                            type: 'scatter',
                            mode: 'lines',
                            name: selectedData.charAt(0).toUpperCase() + selectedData.slice(1) + ' Rate',
                            line: { color: colors.primary[100] }
                        }
                    ]}
                    layout={{
                        title: isDashboard ? '' : 'US Combined Macro Data',
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { title: 'Date' },
                        yaxis: { title: selectedData.charAt(0).toUpperCase() + selectedData.slice(1) + ' Rate' },
                        showlegend: !isDashboard,
                        hovermode: 'x unified',
                        legend: {
                            orientation: 'h',
                            x: 0.5,
                            xanchor: 'center',
                            y: -0.2,
                            yanchor: 'top'
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
                    <LastUpdated storageKey="combinedMacroData" />
                )}
            </div>
            <div>
                {
                    !isDashboard && (
                        <p className='chart-info'>
                            This chart shows the historical macroeconomic indicators of the United States, including inflation rate, unemployment rate, and interest rate.    
                        </p>
                    )
                }
            </div>
        </div>
    );
};

export default UsCombinedMacroChart;
