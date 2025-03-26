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
                        inflation_value: lastKnownInflation !== null ? lastKnownInflation / 100 : null,
                        unemployment_value: item.unemployment_rate ? parseFloat(item.unemployment_rate) / 100 : null,
                        interest_value: item.interest_rate ? parseFloat(item.interest_rate) / 100 : null,
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

    const filterData = (data, key) => data.filter(d => d[key] !== null && !isNaN(d[key]));

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
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
                            x: filterData(chartData, 'inflation_value').map(d => d.time),
                            y: filterData(chartData, 'inflation_value').map(d => d.inflation_value),
                            type: 'scatter',
                            mode: 'lines',
                            name: 'Inflation Rate',
                            line: { color: colors.primary[100], width: 2 },
                            hovertemplate: 'Inflation Rate: %{y:.1%}<extra></extra>'
                        },
                        {
                            x: filterData(chartData, 'unemployment_value').map(d => d.time),
                            y: filterData(chartData, 'unemployment_value').map(d => d.unemployment_value),
                            type: 'scatter',
                            mode: 'lines',
                            name: 'Unemployment Rate',
                            line: { color: 'blue', width: 2 },
                            hovertemplate: 'Unemployment Rate: %{y:.1%}<extra></extra>'
                        },
                        {
                            x: filterData(chartData, 'interest_value').map(d => d.time),
                            y: filterData(chartData, 'interest_value').map(d => d.interest_value),
                            type: 'scatter',
                            mode: 'lines',
                            name: 'Interest Rate',
                            line: { color: 'green', width: 2 },
                            hovertemplate: 'Interest Rate: %{y:.1%}<extra></extra>'
                        }
                    ]}
                    layout={{
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { showgrid: true, title: '' },
                        yaxis: { tickformat: ',.0%', title: '' },
                        showlegend: !isDashboard,
                        hovermode: 'x unified',
                        legend: {
                            orientation: 'h',
                            x: 0.5,
                            xanchor: 'center',
                            y: -0.2,
                            yanchor: 'top'
                        },
                        hoverlabel: {
                            font: {
                                size: 12 // Adjust the font size as needed
                            }
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
                    <LastUpdated storageKey="interestData" />
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
