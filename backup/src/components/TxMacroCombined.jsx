import React, { useEffect, useState, useMemo, useCallback, useContext } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

const TxCombinedChart = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { txCountCombinedData, fetchTxCountCombinedData } = useContext(DataContext);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [layout, setLayout] = useState({
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { showgrid: true, title: '', autorange: true },
        yaxis: { title: 'Transaction Count', autorange: true },
        yaxis2: {
            title: 'Rates (%)',
            autorange: true,
            overlaying: 'y',
            side: 'right',
            tickformat: '.1%'
        },
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

    useEffect(() => {
        const fetchData = async () => {
            if (txCountCombinedData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchTxCountCombinedData();
            } catch (err) {
                setError('Failed to fetch transaction combined data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchTxCountCombinedData, txCountCombinedData.length]);

    const processedData = useMemo(() => {
        if (txCountCombinedData.length === 0) return [];
        return txCountCombinedData.map(item => ({
            time: item.time,
            tx_count: item.tx_count,
            price: item.price,
            inflation_rate: item.inflation_rate,
            unemployment_rate: item.unemployment_rate,
            fed_funds_rate: item.fed_funds_rate
        }));
    }, [txCountCombinedData]);

    const filterData = useCallback((data, key) => data.filter(d => d[key] !== null && !isNaN(d[key])), []);

    const datasets = useMemo(() => {
        const availableData = [];
        if (filterData(processedData, 'tx_count').length > 0) {
            availableData.push({
                x: filterData(processedData, 'tx_count').map(d => d.time),
                y: filterData(processedData, 'tx_count').map(d => d.tx_count),
                type: 'scatter',
                mode: 'lines',
                name: 'Transaction Count',
                line: { color: colors.primary[100], width: 2 },
                hovertemplate: 'Tx Count: %{y:,.0f}<extra></extra>'
            });
        }
        if (filterData(processedData, 'inflation_rate').length > 0) {
            availableData.push({
                x: filterData(processedData, 'inflation_rate').map(d => d.time),
                y: filterData(processedData, 'inflation_rate').map(d => d.inflation_rate),
                type: 'scatter',
                mode: 'lines',
                name: 'Inflation Rate',
                line: { color: 'red', width: 2 },
                yaxis: 'y2',
                hovertemplate: 'Inflation: %{y:.1f}%<extra></extra>'
            });
        }
        if (filterData(processedData, 'price').length > 0) {
            availableData.push({
                x: filterData(processedData, 'price').map(d => d.time),
                y: filterData(processedData, 'price').map(d => d.price),
                type: 'scatter',
                mode: 'lines',
                name: 'BTC Price',
                line: { color: 'orange', width: 2 },
                yaxis: 'y2',
                hovertemplate: 'Price: $%{y:,.2f}<extra></extra>'
            });
        }
        if (filterData(processedData, 'unemployment_rate').length > 0) {
            availableData.push({
                x: filterData(processedData, 'unemployment_rate').map(d => d.time),
                y: filterData(processedData, 'unemployment_rate').map(d => d.unemployment_rate),
                type: 'scatter',
                mode: 'lines',
                name: 'Unemployment Rate',
                line: { color: 'blue', width: 2 },
                yaxis: 'y2',
                hovertemplate: 'Unemployment: %{y:.1f}%<extra></extra>'
            });
        }
        if (filterData(processedData, 'fed_funds_rate').length > 0) {
            availableData.push({
                x: filterData(processedData, 'fed_funds_rate').map(d => d.time),
                y: filterData(processedData, 'fed_funds_rate').map(d => d.fed_funds_rate),
                type: 'scatter',
                mode: 'lines',
                name: 'Fed Funds Rate',
                line: { color: 'green', width: 2 },
                yaxis: 'y2',
                hovertemplate: 'Fed Funds: %{y:.1f}%<extra></extra>'
            });
        }
        return availableData;
    }, [processedData, colors.primary, filterData]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true },
            yaxis2: { ...prev.yaxis2, autorange: true }
        }));
    }, []);

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
| {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
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
                {!isDashboard && txCountCombinedData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>Last Updated: {txCountCombinedData[txCountCombinedData.length - 1].time}</span>
                    </div>
                )}
            </div>
            {!isDashboard && (
                <p className='chart-info'>
                    This chart shows Bitcoin transaction count alongside US inflation rate, unemployment rate, and Fed funds rate over time, using the latest available monthly data for macro indicators.
                </p>
            )}
        </div>
    );
};

export default TxCombinedChart;