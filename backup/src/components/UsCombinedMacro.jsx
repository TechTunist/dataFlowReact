import React, { useEffect, useState, useMemo, useCallback, useContext} from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

const UsCombinedMacroChart = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { macroData, fetchMacroData } = useContext(DataContext);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [layout, setLayout] = useState({
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { showgrid: true, title: '', autorange: true },
        yaxis: { tickformat: ',.0%', title: '', autorange: true },
        showlegend: !isDashboard,
        hovermode: 'x unified',
        legend: !isDashboard ? {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.2,
            yanchor: 'top'
        } : {},
        hoverlabel: { font: { size: 12 } }
    });

    // Fetch data only if not present in context
    useEffect(() => {
        const fetchData = async () => {
            if (macroData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchMacroData();
            } catch (err) {
                setError('Failed to fetch macro data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchMacroData, macroData.length]);

    // Process data with memoization
    const processedData = useMemo(() => {
        if (macroData.length === 0) return [];
        let lastKnownInflation = null;
        return macroData.map(item => {
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
    }, [macroData]);

    const filterData = useCallback((data, key) => data.filter(d => d[key] !== null && !isNaN(d[key])), []);

    // Memoized chart datasets
    const datasets = useMemo(() => [
        {
            x: filterData(processedData, 'inflation_value').map(d => d.time),
            y: filterData(processedData, 'inflation_value').map(d => d.inflation_value),
            type: 'scatter',
            mode: 'lines',
            name: 'Inflation Rate',
            line: { color: colors.primary[100], width: 2 },
            hovertemplate: 'Inflation Rate: %{y:.1%}<extra></extra>'
        },
        {
            x: filterData(processedData, 'unemployment_value').map(d => d.time),
            y: filterData(processedData, 'unemployment_value').map(d => d.unemployment_value),
            type: 'scatter',
            mode: 'lines',
            name: 'Unemployment Rate',
            line: { color: 'blue', width: 2 },
            hovertemplate: 'Unemployment Rate: %{y:.1%}<extra></extra>'
        },
        {
            x: filterData(processedData, 'interest_value').map(d => d.time),
            y: filterData(processedData, 'interest_value').map(d => d.interest_value),
            type: 'scatter',
            mode: 'lines',
            name: 'Interest Rate',
            line: { color: 'green', width: 2 },
            hovertemplate: 'Interest Rate: %{y:.1%}<extra></extra>'
        }
    ], [processedData, colors.primary, filterData]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true }
        }));
    }, []);

    // Update layout colors when theme changes
    useEffect(() => {
        setLayout(prev => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: { color: colors.primary[100] }
        }));
    }, [colors]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
                    </div>
                    <div>
                        <button onClick={resetChartView} className="button-reset">Reset Chart</button>
                    </div>
                </div>
            )}
            <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    data={datasets}
                    layout={layout}
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
                {!isDashboard && macroData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {macroData[macroData.length - 1].date}</span>
                    </div>
                )}
            </div>
            {!isDashboard && (
                <p className='chart-info'>
                    This chart shows the historical macroeconomic indicators of the United States, including inflation rate, unemployment rate, and interest rate.
                </p>
            )}
        </div>
    );
};

export default UsCombinedMacroChart;