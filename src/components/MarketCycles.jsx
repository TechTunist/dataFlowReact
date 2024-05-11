import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';

const MarketCycles = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [btcData, setBtcData] = useState([]);
    const [cycleDataSets, setCycleDataSets] = useState([]);
    const isMobile = useIsMobile();
    const [layout, setLayout] = useState({});

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    useEffect(() => {
        const cacheKey = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        const fetchData = async () => {
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
                if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                    setBtcData(JSON.parse(cachedData));
                } else {
                    fetchDataFromAPI();
                }
            } else {
                fetchDataFromAPI();
            }
        };

        const fetchDataFromAPI = async () => {
            try {
                const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
                const data = await response.json();
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));
                localStorage.setItem(cacheKey, JSON.stringify(formattedData));
                setBtcData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const processCycle = (start, end, cycleName) => {
            // If the end date is not specified, use the date of the last entry in the dataset
            const endDate = end || (btcData[btcData.length - 1] && btcData[btcData.length - 1].time);
            const filteredData = btcData.filter(d => new Date(d.time) >= new Date(start) && new Date(d.time) <= new Date(endDate));
            if (filteredData.length === 0) return [];
    
            const basePrice = filteredData[0].value;
            return filteredData.map((item, index) => ({
                day: index,
                roi: Math.log(item.value / basePrice) / Math.LN10, // convert to base-10 logarithm
                date: item.time,
                cycle: cycleName
            }));
        };
    
        if (btcData.length) {
            setCycleDataSets([
                { name: 'Cycle 1 (2011-2013)', shortName: 'Cycle 1', data: processCycle("2011-11-22", "2013-11-30") },
                { name: 'Cycle 2 (2015-2017)', shortName: 'Cycle 2', data: processCycle("2015-08-25", "2017-12-17")},
                { name: 'Cycle 3 (2018-2021)', shortName: 'Cycle 3', data: processCycle("2018-12-16", "2021-11-08")},
                { name: 'Cycle 4 (2022-present)', shortName: 'Cycle 4', data: processCycle("2022-11-21", null)}
            ]);
        }
    }, [btcData]);
    

    return (
        <div style={{ height: '100%' }}>
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
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    data={cycleDataSets.map(cycle => ({
                        x: cycle.data.map(d => d.day),
                        y: cycle.data.map(d => d.roi),
                        type: 'scatter',
                        mode: 'lines',
                        name: cycle.name,
                        text: cycle.data.map(d => `<b>Cycle: ${d.cycle}<br>Days from Bottom: ${d.day}<br>Log ROI: ${d.roi.toFixed(2)}<br>Date: ${new Date(d.date).toLocaleDateString()}</b>`), // Custom tooltip content
                        hoverinfo: 'text',
                        hovertemplate:
                                `<b>${cycle.shortName}   ROI: %{y:.2f}</b><extra></extra>`
                    }))}
                    layout={{
                        title: isDashboard ? '' : 'Market Cycles RoI',
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { title: isMobile || isDashboard ? '' : 'Days from bear market bottom' },
                        yaxis: { title: 'Logarithmic ROI (Base-10)', type: 'linear' },
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
            {!isDashboard && (
                <LastUpdated storageKey="btcData" />
            )}
            <div>
                {
                    !isDashboard && (
                        <p className='chart-info'>
                            The return on investment between market cycles has been normalized by taking the natural log of the price ratio,
                            which is useful when the starting prices of different cycles can differ by orders of magnitude.
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default MarketCycles;
