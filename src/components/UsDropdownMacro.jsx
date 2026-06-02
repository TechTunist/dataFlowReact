import React, { useEffect, useState, useContext } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import { DataContext } from '../DataContext';

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

    const { macroData, fetchMacroData } = useContext(DataContext);

    // Use central macroData (guaranteed IDB cache via fetchWithCache + auth attachment).
    // Local re-format preserves exact chart visuals + behavior.
    useEffect(() => {
        if (!macroData || macroData.length === 0) {
            fetchMacroData?.();
            return;
        }
        let lastKnownInflation = null;
        const formattedData = macroData.map(item => {
            const inf = item.inflation_value != null ? item.inflation_value : (item.inflation_rate != null ? parseFloat(item.inflation_rate) : null);
            if (inf != null) {
                lastKnownInflation = inf;
            }
            return {
                time: item.time || item.date,
                inflation_value: lastKnownInflation,
                unemployment_value: item.unemployment_value != null ? item.unemployment_value : (item.unemployment_rate != null ? parseFloat(item.unemployment_rate) : null),
                interest_value: item.interest_value != null ? item.interest_value : (item.interest_rate != null ? parseFloat(item.interest_rate) : null),
            };
        });
        setChartData(formattedData);
    }, [macroData, fetchMacroData]);

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
            
            <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
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
