import React, { useRef, useEffect, useState } from 'react';
import { createChart, ISeriesApi } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { useTheme } from '@mui/material';
import { tokens } from '../theme';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';


const PiCycleTopChart = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const bitcoinSeriesRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const chartRef = useRef(null);
    const [showMarkers, setShowMarkers] = useState(false);
    const [isInteractive, setIsInteractive] = useState(false);
    const [setIsDashboard] = useState(isDashboard);
    const [tooltipData, setTooltipData] = useState(null);
    const isMobile = useIsMobile();
    const [showRatioSeries, setShowRatioSeries] = useState(false); // New state for toggle
    const ratioSeriesRef = useRef(); // Add ref for ratio series


    // Calculate ratio of 111 SMA / (350 SMA * 2)
    const calculateRatioSeries = (data) => {
        const sma111 = calculateSMA(data, 111);
        const sma350 = calculateSMA(data, 350);
        let ratioData = [];
        
        // Start from the longer SMA's starting point
        for (let i = 349; i < data.length; i++) {
            if (i - 110 >= 0) { // Ensure we have both SMA values
                const ratio = sma111[i - 110].value / (sma350[i - 349].value * 2);
                ratioData.push({
                    time: data[i].time,
                    value: ratio
                });
            }
        }
        return ratioData;
    };

    const markers = [
        {
            time: '2013-04-09',
            position: 'aboveBar',
            color: colors.greenAccent[400],
            shape: 'arrowDown',
            text: 'Indicated Top',
            size: 2,
        },
        {
            time: '2013-12-05',
            position: 'aboveBar',
            color: colors.greenAccent[400],
            shape: 'arrowDown',
            text: 'Indicated Top',
            size: 2,
        },
        // {
        //     time: '2015-04-30',
        //     position: 'belowBar',
        //     color: colors.greenAccent[400],
        //     shape: 'arrowUp',
        //     text: 'Indicated Bottom', 
        // },
        {
            time: '2017-12-17',
            position: 'aboveBar',
            color: colors.greenAccent[400],
            shape: 'arrowDown',
            text: 'Indicated Top', 
            size: 2,
        },
        // {
        //     time: '2019-03-19',
        //     position: 'belowBar',
        //     color: colors.greenAccent[400],
        //     shape: 'arrowUp',
        //     text: 'Indicated Bottom', 
        // },
        {
            time: '2021-04-12',
            position: 'aboveBar',
            color: colors.greenAccent[400],
            shape: 'arrowDown',
            text: 'Indicated Top',
            size: 2,
        },
        // {
        //     time: '2022-10-13',
        //     position: 'belowBar',
        //     color: colors.greenAccent[400],
        //     shape: 'arrowUp',
        //     text: 'Indicated Bottom', 
        // },
    ];

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

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

    // Function to toggle the visibility of markers
    const toggleMarkers = () => {
        setShowMarkers(!showMarkers);
    };

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    // SMA calculation helper function
    const calculateSMA = (data, windowSize) => {
        let sma = [];
        for (let i = windowSize - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            sum += parseFloat(data[i - j].value);
        }
        sma.push({ time: data[i].time, value: sum / windowSize });
        }
        return sma;
    };

    // This useEffect handles fetching data and updating the local storage cache. It’s self-contained and correctly handles data fetching independently.
    useEffect(() => {
        const cacheKey = 'btcData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        const fetchData = async () => {
            try {
                // const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
                const response = await fetch('https://vercel-dataflow.vercel.app/api/btc/price/')
                const data = await response.json();
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));
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
                setChartData(JSON.parse(cachedData));
            } else {
                fetchData();
            }
        } else {
            fetchData();
        }
    }, []);

    useEffect(() => {
        if (chartData.length === 0) return;      // Create the chart instance and store it in the ref
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 350,
                layout: {
                    background: { type: 'solid', color: colors.primary[700] },
                    textColor: colors.primary[100],
                },
                grid: {
                    vertLines: {
                        color: colors.greenAccent[700],
                    },
                    horzLines: {
                        color: colors.greenAccent[700],
                    },
                },
                timeScale: {
                    minBarSpacing: 0.001,
                },
                priceLineVisible: false,
            });

            // Update tooltip with new series
            chart.subscribeCrosshairMove(param => {
                if (!param.point || !param.time || 
                    param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth ||
                    param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
                    setTooltipData(null);
                } else {
                    const dateStr = param.time;
                    setTooltipData({
                        date: dateStr,
                        bitcoinValue: param.seriesData.get(bitcoinSeriesRef.current)?.value,
                        sma111Value: param.seriesData.get(sma111Series)?.value,
                        sma350Value: param.seriesData.get(sma350Series)?.value,
                        ratioValue: param.seriesData.get(ratioSeriesRef.current)?.value,
                        x: param.point.x,
                        y: param.point.y,
                    });
                }
            });

            // Add the series to the chart
            const bitcoinSeries = chart.addLineSeries({
                color: '#4ba1c8',
                lineWidth: 2,
                priceLineVisible: false,
                priceFormat: {
                    type: 'custom',
                    formatter: compactNumberFormatter, // Use the custom formatter
                },
            });

            bitcoinSeriesRef.current = bitcoinSeries;

            const sma111Series = chart.addLineSeries({
                color: '#66ff00',
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
                
            });

            const sma350Series = chart.addLineSeries({
                color: '#fe2bc9',
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
            });

            // Add new ratio series
            const ratioSeries = chart.addLineSeries({
                color: '#ff9900', // Orange color, you can change this
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
                visible: showRatioSeries, // Controlled by toggle
                priceScaleId: 'left', // Use separate price scale for ratio
            });
            ratioSeriesRef.current = ratioSeries;
            

            chart.priceScale('right').applyOptions({
                mode: scaleMode,
                autoScale: true,
                borderVisible: false,
                scaleMargins: {
                    top: 0.1, // 10% empty space at the top
                    bottom: 0.1 // 10% empty space at the bottom
                },
                priceFormat: {
                    type: 'custom',
                    formatter: compactNumberFormatter,
                },
            });

            // Add left price scale for ratio
            chart.priceScale('left').applyOptions({
                autoScale: true,
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
                priceFormat: { type: 'custom', formatter: (value) => value.toFixed(2) },
                visible: showRatioSeries, // Show left scale only when ratio is visible
            });
        
            const resizeChart = () => {
                if (chart && chartContainerRef.current) {
                    chart.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight,
                    });
                    chart.timeScale().fitContent();
                }
            };

            window.addEventListener('resize', resizeChart);
            // window.addEventListener('resize', resetChartView);

            bitcoinSeries.setData(chartData);
            sma111Series.setData(calculateSMA(chartData, 111));
            sma350Series.setData(calculateSMA(chartData, 350).map(point => ({
                time: point.time,
                value: point.value * 2,
            })));
            ratioSeries.setData(calculateRatioSeries(chartData)); // Add ratio data

            chart.applyOptions({
                handleScroll: !isDashboard,
                handleScale: !isDashboard,
                handleScroll: isInteractive,
                handleScale: isInteractive
            });
        
            resizeChart(); // Ensure initial resize and fitContent call
            chart.timeScale().fitContent(); // Additional call to fitContent to ensure coverage
            chartRef.current = chart; // Store the chart instance
        

        // Cleanup function
        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
        };
    }, [chartData, isDashboard, theme.palette.mode ]);

    // Toggle ratio series visibility
    const toggleRatioSeries = () => {
        setShowRatioSeries(!showRatioSeries);
    };

    // Separate useEffect for ratio visibility toggle
    useEffect(() => {
        if (ratioSeriesRef.current) {
            ratioSeriesRef.current.applyOptions({ visible: showRatioSeries });
        }
        if (chartRef.current) {
            chartRef.current.priceScale('left').applyOptions({ visible: showRatioSeries });
        }
    }, [showRatioSeries]);


    useEffect(() => {
        if (bitcoinSeriesRef.current) {
            if (showMarkers) {
                bitcoinSeriesRef.current.setMarkers(markers);
            } else {
                bitcoinSeriesRef.current.setMarkers([]);
            }
        }
    }, [showMarkers]);

    useEffect(() => {
        if (chartRef.current) {
        chartRef.current.applyOptions({
            handleScroll: isInteractive,
            handleScale: isInteractive,
        });
        }
    }, [isInteractive]);

    // Legend data
    const legendItems = [
        { label: 'BTC', color: '#4ba1c8' },
        { label: '111D SMA', color: '#66ff00' },
        { label: '350D SMA x 2', color: '#fe2bc9' },
        { label: '111/350x2 Ratio', color: '#ff9900', visible: showRatioSeries },
    ];


    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {/* Button to toggle markers */}
                        {
                            !isDashboard && (
                                <button
                                onClick={toggleMarkers}
                                className="button-reset extra-margin-right"
                                style={
                                    showMarkers 
                                        ? {
                                            backgroundColor: '#4cceac',
                                            color: 'black',
                                            borderColor: 'violet'
                                          }
                                        : {}
                                }
                            >
                                {showMarkers ? 'Hide Top Markers' : 'Show Top Markers'}
                            </button>)
                        }
                        {/* New toggle button for ratio series */}
                        {!isDashboard && (
                            <button
                                onClick={toggleRatioSeries}
                                className="button-reset"
                                style={showRatioSeries ? {
                                    backgroundColor: '#4cceac',
                                    color: 'black',
                                    borderColor: 'violet'
                                } : {}}
                            >
                                {showRatioSeries ? 'Hide Ratio' : 'Show Ratio'}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
                        {
                            !isDashboard && (
                                <button
                                    onClick={setInteractivity}
                                    className="button-reset"
                                    style={{
                                        backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                        color: isInteractive ? 'black' : '#31d6aa',
                                        borderColor: isInteractive ? 'violet' : '#70d8bd'
                                    }}>
                                    {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                                </button>
                            )   
                        }
                        {
                            !isDashboard && (
                                <button onClick={resetChartView} className="button-reset extra-margin">
                                    Reset Chart
                                </button>
                            )   
                        }
                    </div>
                </div>
            )}
            
            <div className="chart-container" style={{ 
                    position: 'relative', 
                    height: 'calc(100% - 40px)', 
                    width: '100%', 
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
                    }}> 
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    onDoubleClick={() => {
                        if (!isInteractive && !isDashboard) {  
                            setInteractivity();
                        } else {
                            setInteractivity();
                        }
                    }}
                    />
            </div>
            {/* Legend */}
            {!isDashboard && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '15px',
                    padding: '10px',
                    backgroundColor: colors.primary[700],
                    color: colors.primary[100],
                    fontSize: isMobile ? '12px' : '14px',
                }}>
                    {legendItems.map((item) => (
                        item.visible !== false && (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: item.color,
                                    borderRadius: '2px',
                                }} />
                                <span>{item.label}</span>
                            </div>
                        )
                    ))}
                </div>
            )}
            <div className='under-chart'>
                {!isDashboard && (
                    <LastUpdated storageKey="btcData" />
                )}
                {!isDashboard && (
                    <BitcoinFees />
                )}
            </div>
            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        left: (() => {
                            const sidebarWidth = isMobile ? -80 : -300; // Adjust sidebarWidth based on isMobile
                            const cursorX = tooltipData.x - sidebarWidth; // Adjust cursorX for sidebar
                            const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth; // Adjust chartWidth for sidebar
                            const tooltipWidth = 200; // Your tooltip's actual width
                            const K = 10000; // Adjust this constant based on desired sensitivity
                            const C = 300; // Base addition to stabilize the calculation

                            // Calculate the inverse proportional offset
                            const offset = K / (chartWidth + C);

                            // Calculate potential left and right positions with dynamic offset
                            const rightPosition = cursorX + offset;
                            const leftPosition = cursorX - tooltipWidth - offset;

                            if (rightPosition + tooltipWidth <= chartWidth) {
                                return `${rightPosition}px`; // Fits on the right
                            } else if (leftPosition >= 0) {
                                return `${leftPosition}px`; // Fits on the left
                            } else {
                                return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`; // Adjust near edge
                            }
                        })(),
                        top: `${tooltipData.y + 100}px`, // Adjust as needed
                    }}
                >
                    <b>{tooltipData.bitcoinValue && <div>Bitcoin Price: ${tooltipData.bitcoinValue.toFixed(2)}</div>}
                    {tooltipData.sma111Value && <div style={{color: 'lime'}}>111SMA: ${tooltipData.sma111Value.toFixed(2)}</div>}
                    {tooltipData.sma350Value && <div style={{color: 'violet'}}>350SMA: ${tooltipData.sma350Value.toFixed(2)}</div>}
                    {tooltipData.ratioValue && showRatioSeries && <div style={{color: '#ff9900'}}>111/350*2 Ratio: {tooltipData.ratioValue.toFixed(4)}</div>}
                    {tooltipData.date && <div style={{fontSize: '13px'}}>{tooltipData.date}</div>}</b>
                </div>
            )}
            <div>
                {
                    !isDashboard && (
                        <p className='chart-info'>
                            The PiCycle Top indicator was created by Phillip Swift in 2019, with the intention of calling the top of the Bitcoin bull market within 3 days.
                            The indicator is calculated by dividing the 111-day moving average of the Bitcoin price by the 350-day moving average of the Bitcoin price.
                            When the 111 day SMA crosses above the 350 day SMA, it is considered a bearish signal, and has historically been able to predict the
                            2 market peaks in 2013, the bull market peak in 2017 and the first market peak in 2021.
                            <br/>The yellow "ratio" line shows how the relationship between the 111 SMA and the 350 SMA has reduced in volatility over time
                            and indicates that it may not reach 1.0 in the next bull market peak, meaning that the 111 SMA & 350 SMA may not cross.
                        </p>
                    )   
                }
            </div>
        </div>
    );
};

export default PiCycleTopChart;
