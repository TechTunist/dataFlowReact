import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';


const AltcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(0);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [selectedCoin, setSelectedCoin] = useState('SOL');
    const [tooltipData, setTooltipData] = useState(null);
    const [denominator, setDenominator] = useState('USD');
    const [btcData, setBtcData] = useState([]);
    const [altData, setAltData] = useState([]);   
    const [isInteractive, setIsInteractive] = useState(false);
    const isMobile = useIsMobile();

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

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // Hardcoded list of altcoin options
    const altcoins = [
        // { label: 'Bitcoin', value: 'BTC' },
        { label: 'Solana', value: 'SOL' },
        { label: 'Ethereum', value: 'ETH' },
        { label: 'Cardano', value: 'ADA' },
        { label: 'Dogecoin', value: 'DOGE' },
        { label: 'Chainlink', value: 'LINK' },
        { label: 'XRP', value: 'XRP' },
        // the following coins are not available anymore from messari free api
        // { label: 'Avalanche', value: 'AVAX' },
        // { label: 'Toncoin', value: 'TON' },
        // { label: 'Binance-Coin', value: 'BNB' },
        // { label: 'Polkadot', value: 'DOT' },
        { label: 'Cronos', value: 'CRO' },
        { label: 'GameStop', value: 'GME' },
        { label: 'Tesla', value: 'TSLA' },
    ];

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

    // Handle change event for the dropdown
    const handleSelectChange = (event) => {
        setSelectedCoin(event.target.value);
    };

    // Function to toggle scale mode
    const toggleScaleMode = () => {
        setScaleMode(prevMode => (prevMode === 1 ? 0 : 1));
    };

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    useEffect(() => {
        const cacheKey = selectedCoin.toLowerCase() + 'Data'; // cache data key every time the selected coin changes
        const cachedData = localStorage.getItem(cacheKey);

        // for bitcoin data
        const cacheKeyBtc = 'btcData';
        const cachedDataBtc = localStorage.getItem(cacheKeyBtc);

        const today = new Date();

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            // Check if parsedData is not empty before trying to access its last element
            if (parsedData.length > 0) {
                const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);

                if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                    // if cached data is found, parse it and set it to the state
                    setChartData(JSON.parse(cachedData)); // data to be plotted on chart
                    setAltData(JSON.parse(cachedData)); // selected altcoin data stored in state
                } else {
                    fetchAltData();
                }
                
            } else {
                fetchAltData();
            }
        } else {
            fetchAltData();
        }

        if (cachedDataBtc) {
            const parsedDataBtc = JSON.parse(cachedDataBtc);
            const lastCachedDateBtc = new Date(parsedDataBtc[parsedDataBtc.length - 1].time);

            if (lastCachedDateBtc.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                // if cached data is found, parse it and set it to the state
                // setChartData(JSON.parse(cachedDataBtc));
                setBtcData(JSON.parse(cachedDataBtc));
                
            } else {
                fetchBtcData();
            }
            
        } else {
            fetchBtcData();
        }

        // fetch bitcoin price data to act as denominator
        function fetchBtcData() {
            // if no cached data is found, fetch new data
            // Adjust the URL dynamically based on the selected altcoin
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                setBtcData(formattedData);

                // save the data to local storage
                localStorage.setItem(cacheKeyBtc, JSON.stringify(formattedData));

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }

        function fetchAltData() {
            // if no cached data is found, fetch new data
            // Adjust the URL dynamically based on the selected altcoin
            fetch(`https://tunist.pythonanywhere.com/api/${selectedCoin.toLowerCase()}/price/`)
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));  
                
                setChartData(formattedData); // data to be plotted on chart
                setAltData(formattedData); // selected altcoin data stored in state

                // save the data to local storage
                localStorage.setItem(cacheKey, JSON.stringify(formattedData));

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
    
        // Optionally reset visibility states
        setShow8Week(false);
        setShow20Week(false);
        setShow100Week(false);
        setShow200Week(false);
        
    }, [selectedCoin, denominator, scaleMode]
);

    
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

        // update tooltip data on crosshairMove event
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
                const formattedPrice = data.value.toFixed(priceScaleDecimals); // Use dynamic decimal places based on the denominator
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

         // Define your light and dark theme colors for the area series
         const lightThemeColors = {
            topColor: 'rgba(255, 165, 0, 0.56)', // Soft orange for the top gradient
            bottomColor: 'rgba(255, 165, 0, 0.2)', // Very subtle orange for the bottom gradient
            lineColor: 'rgba(255, 140, 0, 0.8)', // A vibrant, slightly deeper orange for the line
        };
        
        
        const darkThemeColors = {
            topColor: 'rgba(38, 198, 218, 0.56)', 
            bottomColor: 'rgba(38, 198, 218, 0.04)', 
            lineColor: 'rgba(38, 198, 218, 1)', 
        };

        // Select colors based on the theme mode
        const { topColor, bottomColor, lineColor } = theme.palette.mode === 'dark' ? darkThemeColors : lightThemeColors;

        // change decimal places based on the denominator (for satoshis)
        const priceScaleDecimals = denominator === 'BTC' ? 8 : 2;

        const areaSeries = chart.addAreaSeries({
            priceScaleId: 'right',
            topColor: topColor, 
            bottomColor: bottomColor, 
            lineColor: lineColor, 
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: priceScaleDecimals,
                minMove: 1 / Math.pow(10, priceScaleDecimals),
            }
        });
        areaSeries.setData(chartData);
    
        chart.applyOptions({
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
            handleScroll: isInteractive,
            handleScale: isInteractive
        });
    
        resizeChart(); // Ensure initial resize and fitContent call
        chart.timeScale().fitContent(); // Additional call to fitContent to ensure coverage
        chartRef.current = chart; // Store the chart instance
    
        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, scaleMode, isDashboard, theme.palette.mode ]);

    useEffect(() => {
        if (chartRef.current) {
            // Disable all interactions if the chart is displayed on the dashboard
        chartRef.current.applyOptions({
            handleScroll: isInteractive,
            handleScale: isInteractive,
        });
        }
    }, [isInteractive]);


    const computeNewDataset = () => {
        if (denominator === 'USD') {
            setChartData(altData); // Directly use altData if USD is the denominator
            return;
        }
    
        // For BTC as the denominator
        const newDataset = altData.map(altEntry => {
            const btcEntry = btcData.find(btc => btc.time === altEntry.time);
            return btcEntry ? { ...altEntry, value: altEntry.value / btcEntry.value } : null;
        }).filter(Boolean); // Remove any null entries where BTC data was not found
    
        setChartData(newDataset);
    };
    
    useEffect(() => {
        computeNewDataset();
    }, [selectedCoin, denominator, btcData, altData]); // Re-compute dataset when any of these dependencies change

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
    
        // Function to update or add SMA lines
        const updateSMA = (periodKey) => {
            const period = periods[periodKey];
            const data = calculateMovingAverage(chartData, period);
            let smaSeries = smaSeriesRefs[periodKey];
        
            if (smaVisibility[periodKey]) {
                if (!smaSeries) {
                    smaSeries = chartRef.current.addLineSeries({
                        color: colors[periodKey],
                        lineWidth: 2,
                        priceLineVisible: false  // This ensures no horizontal line is shown
                    });
                    smaSeriesRefs[periodKey] = smaSeries;
                }
                smaSeries.setData(data);
            } else if (smaSeries) {
                smaSeries.setData([]);
            }
        };        
    
        Object.keys(periods).forEach(periodKey => updateSMA(periodKey));
    }, [show8Week, show20Week, show100Week, show200Week, chartData, selectedCoin, denominator]);

    useEffect(() => {
        // This effect ensures that any change in selectedCoin or denominator resets and cleans up SMA series.
        const resetSMASeries = () => {
            Object.keys(smaSeriesRefs).forEach(key => {
                if (smaSeriesRefs[key]) {
                    smaSeriesRefs[key].setData([]); // Clear the series data
                    smaSeriesRefs[key] = null;      // Remove the reference
                }
            });
    
            // Optionally reset the toggle states
            setShow8Week(false);
            setShow20Week(false);
            setShow100Week(false);
            setShow200Week(false);
        };
    
        resetSMASeries();
    }, [selectedCoin, denominator, scaleMode]);
    
    

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
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
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
                    <LastUpdated storageKey={`${selectedCoin.toLowerCase()}Data`} />
                )}
            </div>
            <div className="chart-bottom-div">
                <div>
                    {!isDashboard && (
                        <button className="select-reset" onClick={() => setDenominator(denominator === 'USD' ? 'BTC' : 'USD')}>
                            {selectedCoin} / {denominator}
                        </button>
                    )}
                </div>
                <div>
                    {!isDashboard && (
                        <div className="select-reset-wrapper">
                            <select className="select-reset" value={selectedCoin} onChange={handleSelectChange}>
                                {altcoins.map((coin) => (
                                    <option key={coin.value} value={coin.value}>{coin.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
            <div style={{
                display: 'flex', // Use flex display for the container
                justifyContent: 'center', // Center the child elements horizontally
                alignItems: 'center', // This vertically centers the children
                marginBottom: '20px', // Space after the container to avoid overlap with the paragraph
                height: 'auto', // Adjust height automatically based on content
                flexWrap: 'wrap', // Allows items to wrap onto the next line
                gap: '10px 20px', // Sets vertical and horizontal gaps between items
                padding: '10px' // Adds padding inside the flex container
            }}>
                {!isDashboard && (
                        <div className="sma-toggles">
                            <button style={{
                                marginTop: '10px',
                                width: '150px',
                                minWidth: '150px',
                                backgroundColor: show8Week ? '#4cceac' : 'transparent', // Highlight background when active
                                color: show8Week ? color8Week : '#00b685', // Change text color when active
                                borderColor: show8Week ? color8Week : '#70d8bd' // Change border color when active
                            }}
                         onClick={toggle8Week} className="button-reset">
                                8 Week SMA
                            </button>
                            <button style={{
                                marginTop: '10px',
                                width: '150px',
                                minWidth: '150px',
                                backgroundColor: show20Week ? '#4cceac' : 'transparent', // Highlight background when active
                                color: show20Week ? 'green' : '#00b685', // Change text color when active
                                borderColor: show20Week ? color20Week : '#70d8bd' // Change border color when active
                            }}
                             onClick={toggle20Week} className="button-reset">
                                20 Week SMA
                            </button>
                            <button style={{
                                marginTop: '10px',
                                width: '150px',
                                minWidth: '150px',
                                backgroundColor: show100Week ? '#4cceac' : 'transparent', // Highlight background when active
                                color: show100Week ? color100Week : '#00b685', // Change text color when active
                                borderColor: show100Week ? color100Week : '#70d8bd' // Change border color when active
                            }}
                             onClick={toggle100Week} className="button-reset">
                                100 Week SMA
                            </button>
                            <button style={{
                                marginTop: '10px',
                                width: '150px',
                                minWidth: '150px',
                                backgroundColor: show200Week ? '#4cceac' : 'transparent', // Highlight background when active
                                color: show200Week ? color200Week : '#00b685', // Change text color when active
                                borderColor: show200Week ? color200Week : '#70d8bd' // Change border color when active
                            }}
                             onClick={toggle200Week} className="button-reset">
                                200 Week SMA
                            </button>
                        </div>
                    )}
            </div>
                    

            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        left: (() => {
                            const sidebarWidth = isMobile ? -80 : -320; // Adjust sidebarWidth based on isMobile
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
                    <div style={{fontSize: '15px' }}>{selectedCoin}</div>
                    {/* Update currency symbol and decimal places based on the denominator */}
                    <div style={{fontSize: '20px' }}>
                        {denominator === 'BTC' ? '₿' : '$'}
                        {denominator === 'BTC' ? tooltipData.price.toFixed(8) : tooltipData.price.toFixed(3)}
                    </div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {
                !isDashboard && (
                    <p className='chart-info'>
                        The altcoin market is the wild-west of the crypto world. This asset class faces regulatory uncertainty, scams perpetuated by bad actors,
                        extreme volatility and the tendancy to lose anywhere between 70-99% of a token's value in a bear market, with no guarantee that the price will ever recover.
                        There is however a core of projects that are being driven by some talented and respected developers and technologists that are implementing
                        smart-contract functionality (permissionless and immutable executable code that is deployed on the blockchain) and are genuinely attempting
                        to build the next generation of the internet through distributed ledger blockchain technology. These crypto assets are used to drive the
                        functionality and security of their respective blockchain.
                        
                        These projects are far riskier, but during certain phases of the business cycle (severe drops in biticoin dominance paired with looser monitary polcy)
                        they have historically offered far greater returns than that of traditional markets and the 2 crypto blue-chips; Bitcoin & Ethereum.
                        Since Bitcoin is the lowest risk crypto asset, it makes sense to value these altcoins against not only their USD pair, but also their BTC pair.
                        If the altcoin is underperforming against BTC, it makes no sense to hold the far riskier asset.
                        This chart allows you to compare the performance of various altcoins against Bitcoin.
                    </p>
                )   
            }
        </div>
    );
};

export default AltcoinPrice;