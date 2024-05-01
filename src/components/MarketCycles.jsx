import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';

const MarketCycles = ({ isDashboard = false }) => {
    const [btcData, setBtcData] = useState([]);
    const [cycleOne, setCycleOne] = useState([]);
    const [cycleTwo, setCycleTwo] = useState([]);
    const [cycleThree, setCycleThree] = useState([]);
    const [cycleFour, setCycleFour] = useState([]);
    const chartContainerRef = useRef();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [isInteractive, setIsInteractive] = useState(false);
    const [scaleMode, setScaleMode] = useState(1);
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);

    // Function to format numbers to 'k', 'M', etc.
    function compactNumberFormatter(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M'; // Millions
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k'; // Thousands
        } else {
            return value.toFixed(0); // For values less than 1000, show the full number
        }
    }

    useEffect(() => {
        const cacheKey = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        const fetchData = async () => {
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
    
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setBtcData(JSON.parse(cachedData));
            } else {
                fetchData();
            }
        } else {
            fetchData();
        }
    }, []);

    useEffect(() => {
        if (btcData.length > 0) {
            const cycles = [
                { start: "2011-10-21", end: "2013-11-30" },
                { start: "2015-01-15", end: "2017-12-17" },
                { start: "2018-12-16", end: "2021-04-13" },
                { start: "2022-11-21", end: new Date().toISOString().split('T')[0] }
            ];

            const filterDataForCycle = (start, end) => {
                const filteredData = btcData.filter(data => {
                    const date = new Date(data.time);
                    return date >= new Date(start) && date <= new Date(end);
                });
                return filteredData.map((item, index) => ({
                    day: index, // Day since the start of the cycle
                    price: item.value,
                    time: item.time
                }));
            };

            setCycleOne(filterDataForCycle(cycles[0].start, cycles[0].end));
            setCycleTwo(filterDataForCycle(cycles[1].start, cycles[1].end));
            setCycleThree(filterDataForCycle(cycles[2].start, cycles[2].end));
            setCycleFour(filterDataForCycle(cycles[3].start, cycles[3].end));
        }
    }, [btcData]);


    // This useEffect initializes the chart and updates it based on changes to the chartData,
    // theme.palette.mode, and isDashboard. It manages subscriptions and resizing.
    // useEffect(() => {
    //     if (chartData.length === 0) return;
    
    //     const chart = createChart(chartContainerRef.current, {
    //         width: chartContainerRef.current.clientWidth,
    //         height: chartContainerRef.current.clientHeight,
    //         layout: {
    //             background: { type: 'solid', color: colors.primary[700] },
    //             textColor: colors.primary[100],
    //         },
    //         grid: {
    //             vertLines: {
    //                 color: colors.greenAccent[700]
    //             },
    //             horzLines: {
    //                 color: colors.greenAccent[700],
    //             },
    //         },
    //         timeScale: {
    //             minBarSpacing: 0.001
    //         },
    //     });
    
    //     const lineSeries = chart.addlineSeries({
    //         priceScaleId: 'right',
    //         topColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.56)' : 'rgba(255, 165, 0, 0.56)',
    //         bottomColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 0.04)' : 'rgba(255, 165, 0, 0.2)',
    //         lineColor: theme.palette.mode === 'dark' ? 'rgba(38, 198, 218, 1)' : 'rgba(255, 140, 0, 0.8)',
    //         lineWidth: 2,
    //         priceFormat: { type: 'custom', formatter: compactNumberFormatter },
    //     });

    //     chart.priceScale('right').applyOptions({
    //         mode: scaleMode,
    //         // borderVisible: false,
    //     });
    
    //     lineSeries.setData(chartData);
    
    //     chart.applyOptions({
    //         handleScroll: !isDashboard,
    //         handleScale: !isDashboard,
    //         handleScroll: isInteractive,
    //         handleScale: isInteractive, });
    
    //     const resizeChart = () => {
    //         chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
    //         chart.timeScale().fitContent();
    //     };

    //     resizeChart();
    
    //     window.addEventListener('resize', resizeChart);

    //     chartRef.current = chart;
    
    //     return () => {
    //         chart.remove();
    //         window.removeEventListener('resize', resizeChart);
    //     };
    // }, [chartData, isDashboard, theme.palette.mode]);

    return (
        <div>
            {/* Example output, you can replace or extend this with a chart or other components */}
            <h2>Cycle One</h2>
            {cycleOne.map(entry => <div key={entry.time}>{entry.day} - ${entry.price}</div>)}
            <h2>Cycle Two</h2>
            {cycleTwo.map(entry => <div key={entry.time}>{entry.day} - ${entry.price}</div>)}
            <h2>Cycle Three</h2>
            {cycleThree.map(entry => <div key={entry.time}>{entry.day} - ${entry.price}</div>)}
            <h2>Cycle Four</h2>
            {cycleFour.map(entry => <div key={entry.time}>{entry.day} - ${entry.price}</div>)}
        </div>
    );

    // return (
    //     <div style={{ height: '100%' }}>
    //         <div className='chart-top-div'>
    //             <div>
    //                 {/* Button to toggle markers */}
    //                 {
    //                     !isDashboard && (
    //                     <button onClick={toggleMarkers} className="button-reset">
    //                                 {showMarkers ? 'Hide Markers' : 'Show Markers'}
    //                     </button>)
                        
    //                 }
    //             </div>
    //             <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
    //                 {
    //                     !isDashboard && (
    //                         <button
    //                             onClick={setInteractivity}
    //                             className="button-reset"
    //                             style={{
    //                                 backgroundColor: isInteractive ? '#4cceac' : 'transparent',
    //                                 color: isInteractive ? 'black' : '#31d6aa',
    //                                 borderColor: isInteractive ? 'violet' : '#70d8bd'
    //                             }}>
    //                             {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
    //                         </button>
    //                     )   
    //                 }
    //                 {
    //                     !isDashboard && (
    //                         <button onClick={resetChartView} className="button-reset extra-margin">
    //                             Reset Chart
    //                         </button>
    //                     )   
    //                 }
    //             </div>
    //         </div>
    //         <div className="chart-container" style={{ 
    //                 position: 'relative', 
    //                 height: 'calc(100% - 40px)', 
    //                 width: '100%', 
    //                 border: '2px solid #a9a9a9' // Adds dark border with your specified color
    //                 }}> 
    //             <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
    //         </div>
    //         <div>
    //             {
    //                 !isDashboard && (
    //                     <p className='chart-info'>
    //                         The PiCycle Top indicator was created by Phillip Swift in 2019, with the intention of calling the top of the Bitcoin bull market within 3 days.
    //                         The indicator is calculated by dividing the 111-day moving average of the Bitcoin price by the 350-day moving average of the Bitcoin price.
    //                         When the 111 day SMA crosses above the 350 day SMA, it is considered a bearish signal, and has historically been able to predict the
    //                         2 market peaks in 2013, the bull market peak in 2017 and the first market peak in 2021.
    //                         <br/>The market bottom can also be indicated by the maximum difference between the 111 day SMA and the 350 day SMA.
    //                     </p>
    //                 )   
    //             }
    //         </div>
    //     </div>
    // );
};

export default MarketCycles;
