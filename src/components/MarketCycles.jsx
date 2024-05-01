import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';

const MarketCycles = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [btcData, setBtcData] = useState([]);
    const [cycleDataSets, setCycleDataSets] = useState([]);

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
                { name: 'Cycle 1', data: processCycle("2011-11-22", "2013-11-30") },
                { name: 'Cycle 2', data: processCycle("2015-08-25", "2017-12-17") },
                { name: 'Cycle 3', data: processCycle("2018-12-16", "2021-11-08") },
                { name: 'Cycle 4', data: processCycle("2022-11-21", "2024-03-13") }
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
                        name: cycle.name
                    }))}
                    layout={{
                        title: isDashboard ? '' : 'Market Cycles RoI',
                        autosize: true,
                        margin: { l: 50, r: 50, b: 30, t: 50, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
                        xaxis: { title: 'Days since cycle start' },
                        yaxis: { title: 'Log10 ROI', type: 'linear' },
                        showlegend: !isDashboard
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
        </div>
    );
};

export default MarketCycles;
