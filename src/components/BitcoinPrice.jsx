import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';

const BitcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [tooltipData, setTooltipData] = useState(null);
    const [isInteractive, setIsInteractive] = useState(false);
    const isMobile = useIsMobile();

    let storageKey=""

    const [show8Week, setShow8Week] = useState(false);
    const [show20Week, setShow20Week] = useState(false);
    const [show100Week, setShow100Week] = useState(false);
    const [show200Week, setShow200Week] = useState(false);

    const toggle8Week = () => setShow8Week(!show8Week);
    const toggle20Week = () => setShow20Week(!show20Week);
    const toggle100Week = () => setShow100Week(!show100Week);
    const toggle200Week = () => setShow200Week(!show200Week);

    const smaSeriesRefs = useRef({
        '8w': null,
        '20w': null,
        '100w': null,
        '200w': null
    }).current;

    const smaVisibility = {
        '8w': show8Week,
        '20w': show20Week,
        '100w': show100Week,
        '200w': show200Week
    };

    const color8Week = 'blue';
    const color20Week = 'limegreen';
    const color100Week = 'white';
    const color200Week = 'yellow';

    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    function compactNumberFormatter(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k';
        } else {
            return value.toFixed(0);
        }
    }

    const calculateMovingAverage = (data, period) => {
        let movingAverages = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].value;
            }
            movingAverages.push({
                time: data[i].time,
                value: sum / period
            });
        }
        
        return movingAverages;
    };

    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
    };

    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    useEffect(() => {
        const cacheKeyBtc = 'btcData';
        const cachedDataBtc = localStorage.getItem(cacheKeyBtc);
        const today = new Date();

        if (cachedDataBtc) {
            const parsedDataBtc = JSON.parse(cachedDataBtc);
            const lastCachedDateBtc = new Date(parsedDataBtc[parsedDataBtc.length - 1].time);

            if (lastCachedDateBtc.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setChartData(parsedDataBtc);
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }

        function fetchBtcData() {
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                setChartData(formattedData);

                localStorage.setItem(cacheKeyBtc, JSON.stringify(formattedData));
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }

        Object.keys(smaSeriesRefs).forEach(key => {
            if (smaSeriesRefs[key]) {
                smaSeriesRefs[key].setData([]);
                smaSeriesRefs[key] = null;
            }
        });

        setShow8Week(false);
        setShow20Week(false);
        setShow100Week(false);
        setShow200Week(false);
        
    }, []);

    useEffect(() => {
        if (chartData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
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
        });

        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current.clientHeight
            ) {
                setTooltipData(null);
            } else {
                const dateStr = param.time;
                const data = param.seriesData.get(areaSeries);
                setTooltipData({
                    date: dateStr,
                    price: data.value,
                    x: param.point.x,
                    y: param.point.y,
                });
            }
        });

        chart.priceScale('right').applyOptions({
            mode: scaleMode,
            borderVisible: false,
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
        window.addEventListener('resize', resetChartView);

        const lightThemeColors = {
            topColor: 'rgba(255, 165, 0, 0.56)',
            bottomColor: 'rgba(255, 165, 0, 0.2)',
            lineColor: 'rgba(255, 140, 0, 0.8)',
        };

        const darkThemeColors = {
            topColor: 'rgba(38, 198, 218, 0.56)', 
            bottomColor: 'rgba(38, 198, 218, 0.04)', 
            lineColor: 'rgba(38, 198, 218, 1)', 
        };

        const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            topColor: topColor, 
            bottomColor: bottomColor, 
            lineColor: lineColor, 
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            }
        });
        areaSeries.setData(chartData);

        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
            handleScroll: isInteractive,
            handleScale: isInteractive
        });

        resizeChart();
        chart.timeScale().fitContent();
        chartRef.current = chart;

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, scaleMode, isDashboard, theme.palette.mode ]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                handleScroll: isInteractive,
                handleScale: isInteractive,
            });
        }
    }, [isInteractive]);

    useEffect(() => {
        if (!chartRef.current) return;

        const periods = {
            '8w': 8 * 7,
            '20w': 20 * 7,
            '100w': 100 * 7,
            '200w': 200 * 7
        };
        const colors = {
            '8w': 'blue',
            '20w': 'green',
            '100w': 'white',
            '200w': 'yellow'
        };

        const updateSMA = (periodKey) => {
            const period = periods[periodKey];
            const data = calculateMovingAverage(chartData, period);
            let smaSeries = smaSeriesRefs[periodKey];

            if (smaVisibility[periodKey]) {
                if (!smaSeries) {
                    smaSeries = chartRef.current.addLineSeries({
                        color: colors[periodKey],
                        lineWidth: 2,
                        priceLineVisible: false
                    });
                    smaSeriesRefs[periodKey] = smaSeries;
                }
                smaSeries.setData(data);
            } else if (smaSeries) {
                smaSeries.setData([]);
            }
        };

        Object.keys(periods).forEach(periodKey => updateSMA(periodKey));
    }, [show8Week, show20Week, show100Week, show200Week, chartData]);

    useEffect(() => {
        const resetSMASeries = () => {
            Object.keys(smaSeriesRefs).forEach(key => {
                if (smaSeriesRefs[key]) {
                    smaSeriesRefs[key].setData([]);
                    smaSeriesRefs[key] = null;
                }
            });

            setShow8Week(false);
            setShow20Week(false);
            setShow100Week(false);
            setShow200Week(false);
        };

        resetSMASeries();
    }, []);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                {!isDashboard && (
                        <div>
                        {/* The switch and label go here */}
                        <label className="switch">
                            <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                            <span className="slider round"></span>
                        </label>
                        <span className="scale-mode-label" style={{color: colors.primary[100]}}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                    </div>
                    )}
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
                    border: '2px solid #a9a9a9'
                    }}
                    onDoubleClick={() => {
                        if (!isInteractive && !isDashboard) {
                            setInteractivity();
                        } else {
                            setInteractivity();
                        }
                    }}>                
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
        
            <div className='under-chart'>
                {!isDashboard && (
                    <LastUpdated storageKey="btcData" />
                )}
                {!isDashboard && (
                    <BitcoinFees />
                )}
            </div>
            
            {!isDashboard && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '20px',
                    height: 'auto',
                    flexWrap: 'wrap',
                    gap: '10px 20px',
                    padding: '10px'
                }}>
                    {!isDashboard && (
                            <div className="sma-toggles">
                                <button style={{
                                    marginTop: '10px',
                                    width: '150px',
                                    minWidth: '150px',
                                    backgroundColor: show8Week ? '#4cceac' : 'transparent',
                                    color: show8Week ? color8Week : '#00b685',
                                    borderColor: show8Week ? color8Week : '#70d8bd'
                                }}
                             onClick={toggle8Week} className="button-reset">
                                    8 Week SMA
                                </button>
                                <button style={{
                                    marginTop: '10px',
                                    width: '150px',
                                    minWidth: '150px',
                                    backgroundColor: show20Week ? '#4cceac' : 'transparent',
                                    color: show20Week ? 'green' : '#00b685',
                                    borderColor: show20Week ? color20Week : '#70d8bd'
                                }}
                                 onClick={toggle20Week} className="button-reset">
                                    20 Week SMA
                                </button>
                                <button style={{
                                    marginTop: '10px',
                                    width: '150px',
                                    minWidth: '150px',
                                    backgroundColor: show100Week ? '#4cceac' : 'transparent',
                                    color: show100Week ? color100Week : '#00b685',
                                    borderColor: show100Week ? color100Week : '#70d8bd'
                                }}
                                 onClick={toggle100Week} className="button-reset">
                                    100 Week SMA
                                </button>
                                <button style={{
                                    marginTop: '10px',
                                    width: '150px',
                                    minWidth: '150px',
                                    backgroundColor: show200Week ? '#4cceac' : 'transparent',
                                    color: show200Week ? color200Week : '#00b685',
                                    borderColor: show200Week ? color200Week : '#70d8bd'
                                }}
                                 onClick={toggle200Week} className="button-reset">
                                    200 Week SMA
                                </button>
                            </div>
                        )}
                </div>
            )}
            
                    
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        left: (() => {
                            const sidebarWidth = isMobile ? -80 : -320;
                            const cursorX = tooltipData.x - sidebarWidth;
                            const chartWidth = chartContainerRef.current.clientWidth - sidebarWidth;
                            const tooltipWidth = 200;
                            const K = 10000;
                            const C = 300;

                            const offset = K / (chartWidth + C);

                            const rightPosition = cursorX + offset;
                            const leftPosition = cursorX - tooltipWidth - offset;

                            if (rightPosition + tooltipWidth <= chartWidth) {
                                return `${rightPosition}px`;
                            } else if (leftPosition >= 0) {
                                return `${leftPosition}px`;
                            } else {
                                return `${Math.max(0, Math.min(rightPosition, chartWidth - tooltipWidth))}px`;
                            }
                        })(),
                        top: `${tooltipData.y + 100}px`,
                    }}
                >
                    <div style={{fontSize: '15px'}}>Bitcoin</div>
                    <div style={{fontSize: '20px'}}>${tooltipData.price.toFixed(2)}</div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {
                !isDashboard && (
                    <p className='chart-info'>
                        Bitcoin represents a significant advancement in digital finance. It operates on a globally distributed and permissionless ledger,
                        secured by a network of miners. This system is designed to be transparent, secure, and resilient. Bitcoin enables the transfer of
                        value without intermediaries, offering a unique digital asset that can be sent anywhere in the world almost instantly.
                        As a finite digital currency, it provides a novel way to store and transfer wealth, with potential implications for global finance and value exchange.
                        <br />
                        <br />
                        <br />
                    </p>

                )   
            }
        </div>
    );
};

export default BitcoinPrice;