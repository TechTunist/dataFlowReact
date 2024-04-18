// SolanaChart.jsx
import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";


const AltcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const [scaleMode, setScaleMode] = useState(1);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [selectedCoin, setSelectedCoin] = useState('SOL');
    const [tooltipData, setTooltipData] = useState(null);
    const [denominator, setDenominator] = useState('USD');
    const [btcData, setBtcData] = useState([]);
    const [altData, setAltData] = useState([]);   

    // Hardcoded list of altcoin options
    const altcoins = [
        // { label: 'Bitcoin', value: 'BTC' },
        { label: 'Solana', value: 'SOL' },
        { label: 'Ethereum', value: 'ETH' },
        { label: 'Cardano', value: 'ADA' },
        { label: 'Dogecoin', value: 'DOGE' },
        // Add more altcoins as needed
    ];

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
    }, [selectedCoin, denominator]
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
    

    return (
        <div style={{ height: '100%' }}>
            <div className='chart-top-div'>
                <div>
                    {/* The switch and label go here */}
                    <label className="switch">
                        <input type="checkbox" checked={scaleMode === 1} onChange={toggleScaleMode} />
                        <span className="slider round"></span>
                    </label>
                    <span className="scale-mode-label" style={{color: colors.primary[100]}}>{scaleMode === 1 ? 'Logarithmic' : 'Linear'}</span>
                </div>
                <div>
                {
                    !isDashboard && (
                        <button className="select-reset" onClick={() => setDenominator(denominator === 'USD' ? 'BTC' : 'USD')}>
                            {selectedCoin} / {denominator}
                        </button>

                    )   
                }
                </div>
                <div>
                {
                    !isDashboard && (
                        <div className="select-reset-wrapper">
                            <select className="select-reset" value={selectedCoin} onChange={handleSelectChange}>
                                {altcoins.map((coin) => (
                                    <option key={coin.value} value={coin.value}>{coin.label}</option>
                                ))}
                            </select>
                        </div>
                    )   
                }
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
            <div className="chart-container" style={{ 
                    position: 'relative', 
                    height: 'calc(100% - 40px)', 
                    width: '100%', 
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
                    }}>                
                <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
            </div>
            {/* Conditional Rendering for the Tooltip */}
            {!isDashboard && tooltipData && (
                <div
                    className="tooltip"
                    style={{
                        left: `${tooltipData.x > (chartContainerRef.current.clientWidth / 2) ? tooltipData.x + (chartContainerRef.current.clientWidth / 10) : tooltipData.x + (chartContainerRef.current.clientWidth / 5)}px`,
                        top: `${tooltipData.y + 100}px`,                        
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
                        extreme volatility and the tendancy to lose anywhere between 70-99% of a token's value in a bear market. There is however a potential upside
                        far greater than that of traditional markets and Bitcoin, under certain economic conditions. Since Bitcoin is the lowest risk crypto asset,
                        it makes sense to value these altcoins against not only their USD pair, but also their BTC pair. If the altcoin is underperforming against BTC, 
                        it makes no sense to hold the far riskier asset. This chart allows you to compare the performance of various altcoins against Bitcoin.
                    </p>
                )   
            }
        </div>
    );
};

export default AltcoinPrice;