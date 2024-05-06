import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';

const MarketCycles = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [btcData, setBtcData] = useState([]);
    const [cycleDataSets, setCycleDataSets] = useState([]);
    const isMobile = useIsMobile();

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
        const processCycle = (start, end) => {
            const filteredData = btcData.filter(d => new Date(d.time) >= new Date(start) && new Date(d.time) <= new Date(end));
            if (filteredData.length === 0) return [];
            
            const basePrice = filteredData[0].value;
            return filteredData.map((item, index) => ({
                day: index,
                roi: Math.log(item.value / basePrice) / Math.LN10 // convert to base-10 logarithm
            }));
        };

        if (btcData.length) {
            setCycleDataSets([
                { name: '2011- 2013', data: processCycle("2011-11-22", "2013-11-30") },
                { name: '2015 - 2017', data: processCycle("2015-08-25", "2017-12-17") },
                { name: '2018 - 2021', data: processCycle("2018-12-16", "2021-11-08") },
                { name: '2022 - present', data: processCycle("2022-11-21", "2024-03-13") }
            ]);
        }
    }, [btcData]);

    return (
        <div style={{ height: '100%' }}>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
            <Plot
                data={cycleDataSets.map(cycle => ({
                    x: cycle.data.map(d => d.day),
                    y: cycle.data.map(d => d.roi),
                    type: 'scatter',
                    mode: 'lines',
                    name: cycle.name,
                    text: cycle.data.map(d => `Day: ${d.day}<br>Log ROI: ${d.roi.toFixed(2)} (10^${d.roi.toFixed(2)} times base price)`), // Custom tooltip content
                    hoverinfo: 'text'
                }))}
                layout={{
                    title: isDashboard ? '' : 'Market Cycles RoI',
                    // autosize: true,
                    margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                    plot_bgcolor: colors.primary[700],
                    paper_bgcolor: colors.primary[700],
                    font: { color: colors.primary[100] },
                    xaxis: { title: isMobile || isDashboard ? '' : 'Days from bear market bottom' },
                    yaxis: { title: 'Logarithmic ROI (Base-10)', type: 'linear' },
                    showlegend: !isDashboard,
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
            <div>
                {
                    !isDashboard && (
                        <p className='chart-info'>
                            The return on investment between market cycles has been normalised by taking the natural log of the price ratio,
                            otherwise the data becomes impossible to discern due to the nature of diminishing returns as the asset matures and the 
                            total market increases drastically up to over a trillion dollars. The natural logarithm normalizes the scale of the returns
                            which is useful when the starting prices of different cycles can differ by orders of magnitude.

                            For example, a logarithmmic RoI value of 1 means that the price has increased by a factor of 10,
                            a value of 2 means that the price has increased by a factor of 100, and so on.
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default MarketCycles;
