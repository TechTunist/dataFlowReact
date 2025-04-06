import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

const FearAndGreedChart = ({ isDashboard = false }) => {
    const theme = useTheme();
    const isMobile = useIsMobile();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const { btcData, fetchBtcData, fearAndGreedData, fetchFearAndGreedData } = useContext(DataContext);
    const plotRef = useRef(null); // Ref to access Plotly instance
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Memoized layout to prevent unnecessary re-renders
    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Bitcoin Price vs. Fear and Greed Index',
        autosize: true,
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { title: '', autorange: true },
        yaxis: { title: 'Price (USD)', type: 'log', autorange: true },
        showlegend: !isDashboard,
        legend: !isDashboard ? {
            title: { text: isMobile ? '' : 'Select Risk Bands' },
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.2,
            yanchor: 'top',
        } : {}
    });

    const getColor = (classification) => {
        switch (classification) {
            case 'Extreme Fear': return '#FF4500';
            case 'Fear': return '#FFA500';
            case 'Neutral': return '#FFFF00';
            case 'Greed': return '#ADFF2F';
            case 'Extreme Greed': return '#00FF00';
            default: return '#D3D3D3';
        }
    };

    // Memoized datasets to avoid recalculating unless data changes
    const datasets = useMemo(() => {
        if (btcData.length === 0 || fearAndGreedData.length === 0) return [];

        const startDate = new Date('2018-02-01');
        const btcFormattedData = btcData.filter(item => new Date(item.time) >= startDate);

        const fearGreedGroups = {};
        fearAndGreedData.forEach(item => {
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

        const classificationOrder = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];

        const fearGreedDataset = Object.keys(fearGreedGroups)
            .sort((a, b) => classificationOrder.indexOf(a) - classificationOrder.indexOf(b))
            .map(classification => ({
                x: fearGreedGroups[classification].map(d => d.time),
                y: fearGreedGroups[classification].map(d => d.btcPrice),
                customdata: fearGreedGroups[classification].map(d => [d.value]),
                type: 'scatter',
                mode: 'markers',
                marker: { size: 6, color: getColor(classification) },
                name: classification,
                visible: true,
                hovertemplate:
                    `<b>Classification:</b> ${classification}<br>` +
                    `<b>Value:</b> %{customdata[0]}<br>` +
                    `<b>Price:</b> $%{y:,.0f}<br>` +
                    `<b>Date:</b> %{x|%B %d, %Y}<extra></extra>`
            }));

        return [
            {
                x: btcFormattedData.map(d => d.time),
                y: btcFormattedData.map(d => d.value),
                type: 'scatter',
                mode: 'lines',
                line: { color: 'grey', width: 1.5 },
                name: 'Bitcoin Price',
                visible: true
            },
            ...fearGreedDataset
        ];
    }, [btcData, fearAndGreedData]);

    // Fetch data only when necessary
    useEffect(() => {
        const fetchData = async () => {
            if (btcData.length > 0 && fearAndGreedData.length > 0) return; // Skip if data exists
            setIsLoading(true);
            setError(null);
            try {
                await Promise.all([
                    btcData.length === 0 && fetchBtcData(),
                    fearAndGreedData.length === 0 && fetchFearAndGreedData()
                ]);
            } catch (err) {
                setError('Failed to fetch data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchBtcData, fetchFearAndGreedData, btcData.length, fearAndGreedData.length]);

    // Update layout colors when theme changes
    useEffect(() => {
        setLayout(prev => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: { color: colors.primary[100] }
        }));
    }, [colors]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true }
        }));
    }, []);

    // Handle zoom and pan updates
    const handleRelayout = useCallback((event) => {
        if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
            setLayout(prev => ({
                ...prev,
                xaxis: {
                    ...prev.xaxis,
                    range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
                    autorange: false
                },
                yaxis: {
                    ...prev.yaxis,
                    range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
                    autorange: false
                }
            }));
        }
    }, []);

    // Toggle visibility of datasets
    const toggleDataset = useCallback((index) => {
        if (plotRef.current && plotRef.current.el) {
            const visibility = datasets[index].visible ? 'legendonly' : true;
            Plot.restyle(plotRef.current.el, { visible: visibility }, [index]);
            datasets[index].visible = !datasets[index].visible;
        }
    }, [datasets]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div className="risk-filter">
                        {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
                    </div>
                    <div>{/* placeholder for styling */}</div>
                    <div>
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    </div>
                </div>
            )}

            <div className="chart-container" style={{ height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    ref={plotRef}
                    data={datasets}
                    layout={layout}
                    config={{
                        staticPlot: isDashboard,
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                    onRelayout={handleRelayout}
                />
            </div>

            <div className='under-chart'>
                {!isDashboard && btcData.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: colors.greenAccent[500] }}>
                            Last Updated: {btcData[btcData.length - 1].time}
                        </span>
                    </div>
                )}
                {!isDashboard && <BitcoinFees />}
            </div>

            {!isDashboard && (
                <p className='chart-info' style={{ marginTop: '10px', textAlign: 'left', width: '100%' }}>
                    <b>Data only available starting from February 2018.</b><br /><br />
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data,
                    including surveys, social media, volatility, market momentum, and volume among others.
                    This chart plots the fear and greed indicator over the corresponding bitcoin price.
                    <br /> The information for this chart has been obtained from this source:
                    <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                </p>
            )}
        </div>
    );
};

export default FearAndGreedChart;