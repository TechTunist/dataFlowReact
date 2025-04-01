import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';

const EthereumRisk = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [isInteractive, setIsInteractive] = useState(false);
    const isMobile = useIsMobile();

    // DCA and Lump Sum simulation state variables
    const [dcaAmount, setDcaAmount] = useState(100);
    const [dcaFrequency, setDcaFrequency] = useState(7);
    const [dcaStartDate, setDcaStartDate] = useState('2021-01-01');
    const [dcaRiskThreshold, setDcaRiskThreshold] = useState(0.4);
    const [totalUsdFromSales, setTotalUsdFromSales] = useState(0);
    const [ethHeld, setEthHeld] = useState(0);
    const [totalUsdRealized, setTotalUsdRealized] = useState(0);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [totalUsdInvested, setTotalUsdInvested] = useState(0);
    const [percentageGains, setPercentageGains] = useState(0);
    const [unrealizedGains, setUnrealizedGains] = useState(0);
    const [showTransactions, setShowTransactions] = useState(false);
    const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
    const [simulationRun, setSimulationRun] = useState(false);
    const [sellThresholds, setSellThresholds] = useState([
        { riskLevel: 0.6, percentage: 10 },
        { riskLevel: 0.7, percentage: 20 },
        { riskLevel: 0.8, percentage: 40 },
        { riskLevel: 0.9, percentage: 70 }
    ]);
    const [lumpSumInvest, setlumpSumInvest] = useState(1000);
    const [startDate, setStartDate] = useState("2021-01-01");
    const [simulationResult, setSimulationResult] = useState({
        finalUsdHeld: 0,
        finalEthHeld: 0,
        totalValue: 0,
        transactionHistory: []
    });
    const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
    const [currentEthPrice, setCurrentEthPrice] = useState(0);

    // Storage management functions (adjusted for uncompressed data)
    const getLocalStorageSize = () => {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += ((localStorage[key].length + key.length) * 2);
            }
        }
        return total;
    };

    const MAX_STORAGE_SIZE = 4 * 1024 * 1024;

    const pruneOldData = () => {
        const keys = Object.keys(localStorage)
            .filter(key => key.endsWith('RiskData'))
            .map(key => {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key));
                    // Check if the data has a timestamp (new format) or use 0 for old format
                    return { key, timestamp: parsed.timestamp || 0 };
                } catch {
                    return { key, timestamp: 0 };
                }
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        let currentSize = getLocalStorageSize();
        for (let { key } of keys) {
            if (currentSize < MAX_STORAGE_SIZE * 0.8) break;
            localStorage.removeItem(key);
            currentSize = getLocalStorageSize();
        }
    };

    // Existing functions (unchanged)
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    const compactNumberFormatter = (value) => {
        if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
        else if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
        else return value.toFixed(0);
    };

    const calculateRiskMetric = (data) => {
        const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
            return { ...item, MA: avg };
        });

        movingAverage.forEach((item, index) => {
            const preavg = (Math.log(item.value) - Math.log(item.MA)) * index ** 0.395;
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

    const simulateInvestment = (data, lumpSumInvest, startDate) => {
        const filteredData = data.filter(item => new Date(item.time) >= new Date(startDate));
        let ethHeld = 0, initialInvestmentDate = '', initialEthereumPrice = 0, bought = false, initialRiskLevel = 0;
        const startDayData = data.find(item => item.time === startDate);
        if (startDayData) initialRiskLevel = startDayData.Risk;

        filteredData.forEach(day => {
            if (!bought && day.Risk <= initialRiskLevel) {
                ethHeld = lumpSumInvest / day.value;
                initialInvestmentDate = day.time;
                initialEthereumPrice = day.value;
                bought = true;
            }
        });

        const finalDay = filteredData[filteredData.length - 1];
        const currentValue = ethHeld * finalDay.value;

        return {
            investmentDate: initialInvestmentDate,
            investedAmount: lumpSumInvest,
            initialEthereumPrice,
            currentValue,
            currentEthereumPrice: finalDay.value,
            ethHeld,
            initialRiskLevel
        };
    };

    const handleSimulation = () => {
        const results = simulateInvestment(chartData, parseFloat(lumpSumInvest), startDate);
        setSimulationResult(results);
    };

    // Updated useEffect for data fetching without compression
    useEffect(() => {
        const cacheKey = 'ethRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

        const fetchEthData = async () => {
            try {
                const response = await fetch('https://vercel-dataflow.vercel.app/api/eth/price/');
                const data = await response.json();
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));
                const withRiskMetric = calculateRiskMetric(formattedData);
                const payload = { data: withRiskMetric, timestamp: Date.now() };

                const currentSize = getLocalStorageSize();
                if (currentSize > MAX_STORAGE_SIZE * 0.9) {
                    pruneOldData();
                }

                // Store as plain JSON without compression
                localStorage.setItem(cacheKey, JSON.stringify(payload));
                setChartData(withRiskMetric);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (cachedData) {
            try {
                const parsedData = JSON.parse(cachedData);
                // Check if the data has the new structure (with timestamp) or is old format (array)
                const dataToUse = parsedData.data || parsedData;
                if (dataToUse.length > 0) {
                    const lastCachedDate = new Date(dataToUse[dataToUse.length - 1].time);
                    if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                        setChartData(dataToUse);
                    } else {
                        fetchEthData();
                    }
                } else {
                    fetchEthData();
                }
            } catch (error) {
                console.error('Error processing cached data:', error);
                fetchEthData();
            }
        } else {
            fetchEthData();
        }
    }, []);

    // Chart rendering useEffect (unchanged)
    useEffect(() => {
        if (chartData.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { type: 'solid', color: colors.primary[700] }, textColor: colors.primary[100] },
            grid: { vertLines: { color: 'rgba(70, 70, 70, 0.5)' }, horzLines: { color: 'rgba(70, 70, 70, 0.5)' } },
            rightPriceScale: { scaleMargins: { top: 0.01, bottom: 0.01 }, borderVisible: false },
            leftPriceScale: { visible: true, borderColor: 'rgba(197, 203, 206, 1)', scaleMargins: { top: 0.1, bottom: 0.1 } },
            timeScale: { minBarSpacing: 0.001 },
        });

        const riskSeries = chart.addLineSeries({
            color: '#ff0062',
            lastValueVisible: true,
            priceScaleId: 'right',
            lineWidth: 2,
        });
        riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));

        const priceSeries = chart.addLineSeries({
            color: 'gray',
            priceScaleId: 'left',
            lineWidth: 0.7,
            priceFormat: { type: 'custom', formatter: compactNumberFormatter },
        });
        priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

        chart.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });

        chart.priceScale('left').applyOptions({
            mode: 1,
            borderVisible: false,
            priceFormat: { type: 'custom', formatter: compactNumberFormatter },
        });

        const resizeChart = () => {
            if (chart && chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        const price = chartData[chartData.length - 1].value;
        setCurrentEthPrice(price);
        const latestData = chartData[chartData.length - 1];
        try {
            const riskLevel = latestData.Risk.toFixed(2);
            setCurrentRiskLevel(riskLevel);
        } catch (error) {
            console.error('Failed to set risk level:', error);
        }

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
            chartRef.current.applyOptions({ handleScroll: isInteractive, handleScale: isInteractive });
        }
    }, [isInteractive]);

    const handleThresholdChange = (index, newPercentage) => {
        const updatedThresholds = sellThresholds.map((threshold, idx) =>
            idx === index ? { ...threshold, percentage: newPercentage } : threshold
        );
        setSellThresholds(updatedThresholds);
    };

    const handleDcaSimulation = () => {
        let localEthHeld = 0, localTotalUsdRealized = 0, localTotalUsdInvested = 0;
        let localTransactionHistory = [];
        let nextPurchaseDate = new Date(dcaStartDate);
        let lastSellDate = new Date(dcaStartDate);
        lastSellDate.setDate(lastSellDate.getDate() - dcaFrequency);

        let currentEthPrice = 0, currentEthRisk = 0;

        chartData.forEach(day => {
            const dayDate = new Date(day.time);
            currentEthPrice = day.value;
            currentEthRisk = day.Risk;

            if (dayDate >= nextPurchaseDate && day.Risk <= dcaRiskThreshold) {
                const ethPurchased = dcaAmount / day.value;
                localEthHeld += ethPurchased;
                localTotalUsdInvested += dcaAmount;
                localTransactionHistory.push({
                    type: 'buy',
                    date: day.time,
                    amount: ethPurchased,
                    price: day.value,
                    risk: day.Risk,
                    localEthHeld,
                    localTotalUsdInvested,
                    localTotalUsdRealized,
                });
                nextPurchaseDate = new Date(dayDate);
                nextPurchaseDate.setDate(dayDate.getDate() + dcaFrequency);
            }

            const daysSinceLastSale = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);
            if (localEthHeld > 0 && daysSinceLastSale >= dcaFrequency) {
                let maxApplicableThreshold = null;
                sellThresholds.forEach(threshold => {
                    if (day.Risk >= threshold.riskLevel && threshold.percentage > 0) {
                        if (!maxApplicableThreshold || threshold.riskLevel > maxApplicableThreshold.riskLevel) {
                            maxApplicableThreshold = threshold;
                        }
                    }
                });

                if (maxApplicableThreshold && maxApplicableThreshold.percentage > 0) {
                    const ethSold = localEthHeld * (maxApplicableThreshold.percentage / 100);
                    localEthHeld -= ethSold;
                    const usdRealized = ethSold * day.value;
                    localTotalUsdRealized += usdRealized;
                    localTransactionHistory.push({
                        type: 'sell',
                        date: day.time,
                        amount: ethSold,
                        price: day.value,
                        risk: day.Risk,
                        maxApplicableThreshold: maxApplicableThreshold.percentage,
                        localEthHeld,
                        localTotalUsdInvested,
                        localTotalUsdRealized,
                    });
                    lastSellDate = new Date(dayDate);
                }
            }
        });

        const calculatePercentageGains = localTotalUsdInvested > 0 ?
            ((localTotalUsdRealized - localTotalUsdInvested) / localTotalUsdInvested) * 100 : 0;
        const unrealizedGains = localEthHeld * currentEthPrice;

        setEthHeld(localEthHeld);
        setTotalUsdRealized(localTotalUsdRealized);
        setTotalUsdInvested(localTotalUsdInvested);
        setPercentageGains(calculatePercentageGains);
        setTransactionHistory(localTransactionHistory);
        setUnrealizedGains(unrealizedGains);
        setTotalPortfolioValue(localTotalUsdRealized + unrealizedGains);
        setSimulationRun(true);
    };

    // Render (unchanged)
    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div className='chart-top-div'>
                    <div className='span-container'>
                        <span style={{ marginRight: '20px', display: 'inline-block' }}>
                            <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                            Ethereum Price
                        </span>
                        <span style={{ display: 'inline-block' }}>
                            <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                            Risk Metric
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={setInteractivity}
                            className="button-reset"
                            style={{
                                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                                color: isInteractive ? 'black' : '#31d6aa',
                                borderColor: isInteractive ? 'violet' : '#70d8bd'
                            }}
                        >
                            {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
                        </button>
                        <button onClick={resetChartView} className="button-reset extra-margin">
                            Reset Chart
                        </button>
                    </div>
                </div>
            )}
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    onDoubleClick={() => setInteractivity(!isInteractive && !isDashboard)}
                />
            </div>
            {!isDashboard && (
                <LastUpdated storageKey="ethRiskData" />
            )}
            <div>
                {!isDashboard && (
                    <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem' }}>
                        Current Risk level: <b>{currentRiskLevel}</b> (${currentEthPrice.toFixed(2)})
                    </div>
                )}
                <div className='simulator-container'>
                    {!isDashboard && (
                        <div className='risk-simulator results-display' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <h2>Lump Sum Risk Based Investment Simulation</h2>
                            <p>Choose a date and a lump sum to invest when the risk reaches an acceptably low level for your tolerance, and see what the investment would be worth today.</p>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', color: colors.greenAccent[500] }}>
                                <input className='input-field .simulate-button' type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <input className='input-field .simulate-button' type="number" placeholder="USD to Invest" value={lumpSumInvest} onChange={e => setlumpSumInvest(e.target.value)} />
                            </div>
                            <button className='simulate-button-dca' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px', margin: '20px' }} onClick={handleSimulation}>Simulate</button>
                            {simulationResult.investmentDate && (
                                <div className='results-display'>
                                    Investing ${simulationResult.investedAmount.toFixed(0)} on {simulationResult.investmentDate} at a risk level of {simulationResult.initialRiskLevel.toFixed(2)} would have resulted in an investment return of ${simulationResult.currentValue.toFixed(2)} based on today's prices.
                                </div>
                            )}
                        </div>
                    )}
                    {!isDashboard && (
                        <div className='risk-simulator results-display' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            <h2>DCA Risk Based Accumulation and Exit Strategy Simulation</h2>
                            <p>Backtest simple buying and selling DCA strategies based on the risk level.</p>
                            <ol>
                                <li>Choose a start date to begin the test from.</li>
                                <li>Choose an amount you would like to DCA.</li>
                                <li>Choose a frequency (weekly, bi-weekly, or monthly) to make purchases and sales of your Ethereum.</li>
                                <li>Choose a risk level under which you are happy to accumulate Ethereum.</li>
                            </ol>
                            <h2>Eth Accumulation Strategy</h2>
                            <label htmlFor="start-date">Start Date:</label>
                            <input className='input-field .simulate-button' id="start-date" type="date" value={dcaStartDate} onChange={e => setDcaStartDate(e.target.value)} />
                            <label htmlFor="investment-amount">USD to Invest:</label>
                            <input className='input-field .simulate-button' id="investment-amount" type="number" placeholder="USD to Invest" value={dcaAmount} onChange={e => setDcaAmount(parseFloat(e.target.value))} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <label htmlFor="investment-frequency" style={{ marginBottom: '10px' }}>DCA purchase frequency in days:</label>
                                <div style={{ display: 'flex', justifyContent: 'space-evenly', width: '100%', marginBottom: '50px' }}>
                                    <button className={`dceFreq ${dcaFrequency === 7 ? 'dceFreqHighlighted' : ''}`} onClick={() => setDcaFrequency(7)}>7</button>
                                    <button className={`dceFreq ${dcaFrequency === 14 ? 'dceFreqHighlighted' : ''}`} onClick={() => setDcaFrequency(14)}>14</button>
                                    <button className={`dceFreq ${dcaFrequency === 28 ? 'dceFreqHighlighted' : ''}`} onClick={() => setDcaFrequency(28)}>28</button>
                                </div>
                            </div>
                            <label htmlFor="buy-risk-threshold">Buy when Risk is below:</label>
                            <input className='input-field .simulate-button-dca' id="buy-risk-threshold" type="number" placeholder="Buy Risk Threshold (0-1)" min="0" max="1" step="0.1" value={dcaRiskThreshold} onChange={e => setDcaRiskThreshold(parseFloat(e.target.value))} />
                            <h2>Taking Profit Strategy</h2>
                            <p>At each of the risk levels below, you can decide the percentage of your current stack of Ethereum that you would like to sell.</p>
                            <p style={{ color: colors.greenAccent[500] }}>It stands to reason that the higher the risk level, the more you would want to sell, but feel free to explore based on your own risk tolerance.</p>
                            {sellThresholds.map((threshold, index) => (
                                <div key={index}>
                                    <label>Risk Level {' > '} {threshold.riskLevel}: </label>
                                    <input type="number" min="0" max="100" step="10" value={threshold.percentage} onChange={e => handleThresholdChange(index, parseFloat(e.target.value))} /> %
                                </div>
                            ))}
                            {simulationRun && (
                                <div>
                                    <h2 style={{ textAlign: 'left' }}>Total USD Invested: ${totalUsdInvested}</h2>
                                    <h2>Total Portfolio Value: ${totalPortfolioValue.toFixed(2)}</h2>
                                    <h3>Total Ethereum Held: {ethHeld.toFixed(6)} ETH</h3>
                                    <h3>Total Realized Gains: ${totalUsdRealized.toFixed(2)}</h3>
                                    <h3>Total Unrealized Gains: ${unrealizedGains.toFixed(2)}</h3>
                                    <h3>Percentage Realised Gains: {percentageGains.toFixed(2)} %</h3>
                                </div>
                            )}
                            <button className='simulate-button-dca' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px', margin: '20px' }} onClick={handleDcaSimulation}>Simulate</button>
                            {simulationRun && (
                                <div style={{ fontSize: '0.7rem' }}>
                                    <h1 onClick={() => setShowTransactions(!showTransactions)} style={{ cursor: 'pointer', textAlign: 'center', border: '1px teal solid', padding: '5px' }}>
                                        Transaction History
                                    </h1>
                                    {showTransactions && (
                                        isMobile ? (
                                            <ul style={{ padding: '0px' }}>
                                                {transactionHistory.map((tx, index) => (
                                                    <li key={index}>
                                                        {tx.type} {tx.amount.toFixed(6)} ETH on {tx.date} at ${tx.price.toFixed(2)}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid cyan' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '40px' }}>#</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '60px' }}>Type</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Date</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>Spent</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>Ethereum</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>At Price</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>Risk</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Total ETH Held</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Percentage Sold</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Total Invested $</th>
                                                        <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Profit</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactionHistory.reduce((acc, tx, index) => {
                                                        const usdSpent = tx.type === 'buy' ? tx.amount * tx.price : 0;
                                                        const profit = tx.type === 'sell' ? (tx.amount * tx.price) - usdSpent : 0;
                                                        acc.accumulatedInvestment += usdSpent;
                                                        acc.totalProfit += profit;
                                                        if (tx.type === 'buy') acc.ethHeld += tx.amount;
                                                        else if (tx.type === 'sell') acc.ethHeld -= tx.amount;
                                                        acc.rows.push(
                                                            <tr key={index}>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{index + 1}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.type}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.date}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>${usdSpent.toFixed(2)}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.amount.toFixed(6)} ETH</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>${tx.price.toFixed(2)}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.risk.toFixed(2)}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{acc.ethHeld.toFixed(6)} ETH</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.maxApplicableThreshold ? `${tx.maxApplicableThreshold.toFixed(2)}%` : '-'}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>${acc.accumulatedInvestment.toFixed(2)}</td>
                                                                <td style={{ padding: '8px', border: '1px solid black' }}>${acc.totalProfit.toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                        return acc;
                                                    }, { accumulatedInvestment: 0, totalProfit: 0, ethHeld: 0, rows: [] }).rows}
                                                </tbody>
                                            </table>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {
                    !isDashboard && (
                        <p className='chart-info'>
                            The risk metric assesses Ethereum's investment risk over time by comparing its daily prices to a 374-day moving average.
                            It does so by calculating the normalized logarithmic difference between the price and the moving average,
                            producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                            This method provides a simplified view of when it might be riskier or safer to invest in Ethereum based on historical price movements.
                        </p>
                    )   
                }
            </div>
        </div>
        );
      
      
};

export default EthereumRisk;
