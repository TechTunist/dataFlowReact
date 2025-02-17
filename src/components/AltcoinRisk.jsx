import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import '../styling/bitcoinChart.css';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';

const AltcoinPrice = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [selectedCoin, setSelectedCoin] = useState('SOL');
    const [isInteractive, setIsInteractive] = useState(false);
    const isMobile = useIsMobile();
    const [tooltipData, setTooltipData] = useState(null);

     // Hardcoded list of altcoin options
     const altcoins = [
        // { label: 'Bitcoin', value: 'BTC' },
        { label: 'Solana', value: 'SOL' },
        { label: 'Ethereum', value: 'ETH' },
        { label: 'Cardano', value: 'ADA' },
        { label: 'Dogecoin', value: 'DOGE' },
        { label: 'Chainlink', value: 'LINK' },
        { label: 'XRP', value: 'XRP' },
        { label: 'Avalanche', value: 'AVAX' },
        { label: 'Toncoin', value: 'TON' },
        { label: 'Binance-Coin', value: 'BNB' },
        // { label: 'Polkadot', value: 'DOT' },
        { label: 'Aave', value: 'AAVE' },
        { label: 'Cronos', value: 'CRO' },
        // { label: 'Sui', value: 'SUI' },
        { label: 'Hedera', value: 'HBAR' },
        // { label: 'Stellar', value: 'XLM' },

        // { label: 'GameStop', value: 'GME' },
        // { label: 'Tesla', value: 'TSLA' },
        // { label: 'Google', value: 'GOOG' },
        // { label: 'Amazon', value: 'AMZN' },
        // { label: 'Apple', value: 'AAPL' },
        // { label: 'Microstrategy', value: 'MSTR' },
        // { label: 'Microsoft', value: 'MSFT' },
        // { label: 'Rumble', value: 'RUM' },
        // { label: 'Nvidia', value: 'NVDA' },

        // { label: 'Pepe Memecoin', value: 'PEPE' },
        // { label: 'Trump Official', value: 'TRUMP' },
        
    ];

    // Handle change event for the dropdown
    const handleSelectChange = (event) => {
        setSelectedCoin(event.target.value);
    };

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    // Function to calculate the risk metric
    const calculateRiskMetric = (data) => {
        const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
            return { ...item, MA: avg };
        });
    
        let consecutiveDeclineDays = 0;
    
        movingAverage.forEach((item, index) => {
            const changeFactor = index ** 0.395;
            let preavg = (Math.log(item.value) - Math.log(item.MA)) * changeFactor;
    
            if (index > 0) {
                const previousItem = movingAverage[index - 1];
                const priceChange = item.value / previousItem.value;
    
                // Detect and handle parabolic increases
                if (priceChange > 1.5) {
                    const dampingFactor = 1 / priceChange;
                    preavg *= dampingFactor;
                    consecutiveDeclineDays = 0; // Reset decline counter on price increase
                }
    
                // Detect and handle prolonged declines
                if (priceChange < 1) {
                    consecutiveDeclineDays++;
                    const declineFactor = Math.min(consecutiveDeclineDays / 30, 1); // Scale factor over 30 days
                    preavg *= (1 + declineFactor); // Increase sensitivity during prolonged declines
                } else {
                    consecutiveDeclineDays = 0; // Reset decline counter on price increase
                }
            }
    
            item.Preavg = preavg;
        });
    
        const preavgValues = movingAverage.map(item => item.Preavg);
        const preavgMin = Math.min(...preavgValues);
        const preavgMax = Math.max(...preavgValues);
        const normalizedRisk = movingAverage.map(item => ({
            ...item,
            Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
        }));
    
        return normalizedRisk;
    };
    
    

    useEffect(() => {
        const cacheKey = `${selectedCoin.toLowerCase()}RiskData`;
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

        const fetchAltData = () => {
            fetch(`https://tunist.pythonanywhere.com/api/${selectedCoin.toLowerCase()}/price/`)
                .then(response => response.json())
                .then(data => {
                    const formattedData = data.map(item => ({
                        time: item.date,
                        value: parseFloat(item.close)
                    }));
                    const withRiskMetric = calculateRiskMetric(formattedData);
                    localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
                    setChartData(withRiskMetric);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        };

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.length > 0) {
                const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
                if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                    setChartData(parsedData);
                } else {
                    fetchAltData();
                }
            } else {
                fetchAltData();
            }
        } else {
            fetchAltData();
        }
    }, [selectedCoin]);

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
                vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
                horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.01,
                    bottom: 0.01,
                },
                borderVisible: false,
            },
            leftPriceScale: {
                visible: true, // Ensure the left price scale is visible
                borderColor: 'rgba(197, 203, 206, 1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                minBarSpacing: 0.001,
            },
        });

        // Series for Risk Metric
        const riskSeries = chart.addLineSeries({
            color: '#ff0062',
            lastValueVisible: true,
            priceScaleId: 'right',
            lineWidth: 2,
        });
        riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));

        // Series for Altcoin Price on Logarithmic Scale
        const priceSeries = chart.addLineSeries({
            color: 'gray',
            priceScaleId: 'left',
            lineWidth: 0.7,
            priceFormat: {
                type: 'custom',
                formatter: value => value.toFixed(2), // Custom formatter for price
            },
        });
        priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

        // Disable all interactions if the chart is displayed on the dashboard
        chart.applyOptions({
            handleScroll: isInteractive,
            handleScale: isInteractive,
        });

        chart.priceScale('left').applyOptions({
            mode: 1, // Logarithmic scale
            borderVisible: false,
            priceFormat: {
                type: 'custom',
                formatter: value => value.toFixed(2),
            },
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

        resizeChart();
        chart.timeScale().fitContent();
        chartRef.current = chart;

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, theme.palette.mode, isDashboard]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                handleScroll: isInteractive,
                handleScale: isInteractive,
            });
        }
    }, [isInteractive]);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div>
                        {!isDashboard && (
                            <div>
                                <select className="button-risk" value={selectedCoin} onChange={handleSelectChange}>
                                    {altcoins.map((coin) => (
                                        <option key={coin.value} value={coin.value}>{coin.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={setInteractivity}
                            className="button-reset"
                            style={{
                                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                color: isInteractive ? 'black' : '#31d6aa',
                                borderColor: isInteractive ? 'violet' : '#70d8bd',
                            }}>
                            {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                        </button>
                        <button onClick={resetChartView} className="button-reset extra-margin">
                            Reset Chart
                        </button>
                    </div>
                </div>
            )}
            <div className="chart-container" style={{
                position: 'relative',
                height: 'calc(100% - 40px)',
                width: '100%',
                border: '2px solid #a9a9a9',
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
            {!isDashboard && (
                <LastUpdated storageKey={`${selectedCoin.toLowerCase()}RiskData`} />
            )}
            
            {!isDashboard && tooltipData && (
                <div className="tooltip" style={{
                    left: `${tooltipData.x}px`,
                    top: `${tooltipData.y}px`,
                }}>
                    <div>{selectedCoin}</div>
                    <div>${tooltipData.price.toFixed(2)}</div>
                    <div>{tooltipData.date.toString()}</div>
                </div>
            )}
            {!isDashboard && (
                <p className='chart-info'>
                    The altcoin market is the wild-west of the crypto world. This asset class faces regulatory uncertainty, scams perpetuated by bad actors,
                    extreme volatility and the tendency to lose anywhere between 70-99% of a token's value in a bear market, with no guarantee that the price will ever recover.
                    There is however a core of projects that are being driven by some talented and respected developers and technologists that are implementing
                    smart-contract functionality (permissionless and immutable executable code that is deployed on the blockchain) and are genuinely attempting
                    to build the next generation of the internet through distributed ledger blockchain technology. These crypto assets are used to drive the
                    functionality and security of their respective blockchain.
                    
                    These projects are far riskier, but during certain phases of the business cycle (severe drops in Bitcoin dominance paired with looser monetary policy)
                    they have historically offered far greater returns than that of traditional markets and the 2 crypto blue-chips; Bitcoin & Ethereum.
                    Since Bitcoin is the lowest risk crypto asset, it makes sense to value these altcoins against not only their USD pair, but also their BTC pair.
                    If the altcoin is underperforming against BTC, it makes no sense to hold the far riskier asset.
                    This chart allows you to compare the performance of various altcoins against Bitcoin.
                </p>
            )}
        </div>
    );
};

export default AltcoinPrice;
