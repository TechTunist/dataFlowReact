import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';

const BitcoinROI = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { btcData, fetchBtcData } = useContext(DataContext);
    const [yearDataSets, setYearDataSets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Annual Bitcoin ROI',
        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
        plot_bgcolor: colors.primary[700],
        paper_bgcolor: colors.primary[700],
        font: { color: colors.primary[100] },
        xaxis: { 
            title: !isDashboard && !isMobile ? 'Days from Year Start' : '',
            autorange: true 
        },
        yaxis: { 
            title: 'Logarithmic ROI (Base-10)', 
            type: 'linear',
            autorange: true 
        },
        showlegend: true, // Always show legend for selection
        hovermode: 'x unified',
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.2,
            yanchor: 'top'
        }
    });

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (btcData.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchBtcData();
            } catch (err) {
                setError('Failed to fetch Bitcoin data. Please try again later.');
                console.error('Error fetching data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchBtcData, btcData.length]);

    // Process yearly data
    const yearlyDatasets = useMemo(() => {
        if (btcData.length === 0) return [];

        // Get unique years from data
        const years = [...new Set(btcData.map(d => new Date(d.time).getFullYear()))]
            .sort((a, b) => a - b);

        const processYear = (year) => {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            const filteredData = btcData.filter(d => {
                const date = new Date(d.time);
                return date >= new Date(yearStart) && date <= new Date(yearEnd);
            });
            
            if (filteredData.length === 0) return null;

            const basePrice = filteredData[0].value;
            return {
                name: `${year}`,
                data: filteredData.map((item, index) => ({
                    day: index,
                    roi: Math.log(item.value / basePrice) / Math.LN10,
                    date: item.time,
                    year: year
                }))
            };
        };

        return years.map(year => processYear(year)).filter(year => year !== null);
    }, [btcData]);

    // Update layout and set all years as datasets
    useEffect(() => {
        setLayout(prev => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: { color: colors.primary[100] },
            xaxis: {
                ...prev.xaxis,
                title: !isDashboard && !isMobile ? 'Days from Year Start' : ''
            }
        }));

        // Set all years as visible by default
        setYearDataSets(yearlyDatasets);
    }, [colors, isDashboard, isMobile, yearlyDatasets]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true }
        }));
    }, []);

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

    // Handle legend click to toggle visibility
    const handleLegendClick = useCallback((event) => {
        const year = event.data[event.curveNumber].name;
        setYearDataSets(prev => {
            const updated = prev.map(dataset => {
                if (dataset.name === year) {
                    return { ...dataset, visible: dataset.visible === 'legendonly' ? true : 'legendonly' };
                }
                return dataset;
            });
            return [...updated];
        });
        return false; // Prevent default Plotly behavior
    }, []);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div className="select-reset-wrapper">
                        {isLoading && <span style={{ color: colors.grey[100], marginLeft: '10px' }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500], marginLeft: '10px' }}>{error}</span>}
                    </div>
                    <div>{/* placeholder for styling */}</div>
                    <div>
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    </div>
                </div>
            )}
            
            <div className="chart-container" 
            style={{ 
                height: isDashboard ? "100%" : 'calc(100% - 40px)', 
                width: '100%', 
                border: '2px solid #a9a9a9' 
                }}>
                <Plot
                    data={yearDataSets.map(year => ({
                        x: year.data.map(d => d.day),
                        y: year.data.map(d => d.roi),
                        type: 'scatter',
                        mode: 'lines',
                        name: isMobile ? year.name : year.name,
                        text: year.data.map(d => `<b>${year.name}   ROI: ${d.roi.toFixed(2)}</b>  (${new Date(d.date).toLocaleDateString()})`),
                        hoverinfo: 'text',
                        hovertemplate: `%{text}<extra></extra>`,
                        visible: year.visible !== undefined ? year.visible : true // Default to visible
                    }))}
                    layout={layout}
                    config={{
                        staticPlot: isDashboard,
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                    onRelayout={handleRelayout}
                    onLegendClick={handleLegendClick}
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
                <p className='chart-info'>
                    The return on investment for each year has been normalized by taking the natural log of the price ratio,
                    showing growth from the start of each year. Click legend items to toggle years.
                </p>
            )}
        </div>
    );
};

export default BitcoinROI;