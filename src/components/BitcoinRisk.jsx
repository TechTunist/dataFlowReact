import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';

const BitcoinRisk = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [setIsDashboard] = useState(isDashboard);
    const [currentBtcPrice, setCurrentBtcPrice] = useState(0);

    // DCA risk based accumulation simulation state variables
    const [dcaAmount, setDcaAmount] = useState(100); // Default DCA amount in USD
    const [dcaFrequency, setDcaFrequency] = useState(7); 
    const [dcaStartDate, setDcaStartDate] = useState('2021-01-01'); // Default start date for DCA investments
    const [dcaRiskThreshold, setDcaRiskThreshold] = useState(0.4); // Default risk threshold for making purchases
    const [totalUsdFromSales, setTotalUsdFromSales] = useState(0);
    const [btcHeld, setBtcHeld] = useState(0);
    const [totalUsdRealized, setTotalUsdRealized] = useState(0);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [totalUsdInvested, setTotalUsdInvested] = useState(0);
    const [percentageGains, setPercentageGains] = useState(0);
    const [unrealizedGains, setUnrealizedGains] = useState(0);
    const [showTransactions, setShowTransactions] = useState(false);
    const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
    const [simulationRun, setSimulationRun] = useState(false);
    const isMobile = useIsMobile();

    const [sellThresholds, setSellThresholds] = useState([
        { riskLevel: 0.6, percentage: 10 },
        { riskLevel: 0.7, percentage: 20 },
        { riskLevel: 0.8, percentage: 40 },
        { riskLevel: 0.9, percentage: 70 }
    ]);

    // Lump sum investment simulation state variables
    const [lumpSumInvest, setlumpSumInvest] = useState(1000); // Default USD investment amount
    const [startDate, setStartDate] = useState("2021-01-01");  // Example start date
    // State to store simulation results
    const [simulationResult, setSimulationResult] = useState({
        finalUsdHeld: 0,
        finalBtcHeld: 0,
        totalValue: 0,
        transactionHistory: []
    });

    // State to store current risk level
    const [currentRiskLevel, setCurrentRiskLevel] = useState(null);

    // state to allow interactivity
    const [isInteractive, setIsInteractive] = useState(false);

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // Function to format numbers to 'k', 'M', etc. for price scale labels
    function compactNumberFormatter(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(0) + 'M'; // Millions
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'k'; // Thousands
        } else {
            return value.toFixed(0); // For values less than 1000, show the full number
        }
    }

    const simulateInvestment = (data, lumpSumInvest, startDate) => {
        // Filter data to start from the specified start date
        const filteredData = data.filter(item => new Date(item.time) >= new Date(startDate));
    
        let btcHeld = 0;
        let initialInvestmentDate = '';
        let initialBitcoinPrice = 0;
        let bought = false;
        let initialRiskLevel = 0;
    
        // Find the exact day's data that matches the start date and retrieve the risk level
        const startDayData = data.find(item => item.time === startDate);
        if (startDayData) {
            initialRiskLevel = startDayData.Risk;
        }
    
        // Process each day's data starting from the start date
        filteredData.forEach(day => {
            // Buy Bitcoin once when the risk level is below or equals the initialRiskLevel threshold
            if (!bought && day.Risk <= initialRiskLevel) {
                btcHeld = lumpSumInvest / day.value;
                initialInvestmentDate = day.time;
                initialBitcoinPrice = day.value;
                bought = true;  // Ensure no further purchases
            }
        });
    
        // Calculate the current value of the investment at the last available data point
        const finalDay = filteredData[filteredData.length - 1];
        const currentValue = btcHeld * finalDay.value;
    
        return {
            investmentDate: initialInvestmentDate,
            investedAmount: lumpSumInvest,
            initialBitcoinPrice: initialBitcoinPrice,
            currentValue: currentValue,
            currentBitcoinPrice: finalDay.value,
            btcHeld: btcHeld,
            initialRiskLevel: initialRiskLevel  // Including the initial risk level in the results
        };
    };

    const handleSimulation = () => {
        const results = simulateInvestment(chartData, parseFloat(lumpSumInvest), startDate);
        setSimulationResult(results);
    };
    
    // Function to reset the chart view
    const resetChartView = () => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    };

    // function to calculate the risk metric
    const calculateRiskMetric = (data) => {
        // Calculate 374-day moving average
        const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + curr.value, 0) / subset.length;
            return { ...item, MA: avg };
        });

        // Calculate risk metric
        movingAverage.forEach((item, index) => {
            const preavg = (Math.log(item.value) - Math.log(item.MA)) * index**0.395;
            item.Preavg = preavg;
        });

        // Normalize the Preavg to 0-1 range
        const preavgValues = movingAverage.map(item => item.Preavg);
        const preavgMin = Math.min(...preavgValues);
        const preavgMax = Math.max(...preavgValues);
        const normalizedRisk = movingAverage.map(item => ({
            ...item,
            Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
        }));

        return normalizedRisk;
    };


    // This useEffect handles fetching data and updating the local storage cache. It’s self-contained and correctly handles data fetching independently.
    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
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
                
                const withRiskMetric = calculateRiskMetric(formattedData);

                localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
                setChartData(withRiskMetric);

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }
    
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setChartData(JSON.parse(cachedData));
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }
    }, []);

    // This useEffect initializes the chart and updates it based on changes to the chartData,
    // theme.palette.mode, and isDashboard. It manages subscriptions and resizing.
    // Render chart
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
                visible: true, // Show the left price scale
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
            // color: '#ff5100',
            lastValueVisible: true,
            priceScaleId: 'right',
            lineWidth: 2,
        });
        riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));
        
        // Series for Bitcoin Price on Logarithmic Scale
        const priceSeries = chart.addLineSeries({
            color: 'gray',
            priceScaleId: 'left',
            lineWidth: 0.7,
            priceFormat: {
                type: 'custom',
                formatter: compactNumberFormatter, // Use the custom formatter
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
                formatter: compactNumberFormatter,
            },
        });
        
        // Function to update chart size
        const resizeChart = () => {
            if (chart && chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };

        const price = Math.floor(chartData[chartData.length - 1].value / 1000);
        setCurrentBtcPrice(price); // Set the current price to the last item in the array
        
        const latestData = chartData[chartData.length - 1]; // Get the last item in the array
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
        chartRef.current = chart; // Store the chart instance

        return () => {
            chart.remove();
            window.removeEventListener('resize', resizeChart);
            window.removeEventListener('resize', resetChartView);
        };
    }, [chartData, theme.palette.mode, isDashboard]);


    useEffect(() => {
        if (chartRef.current) {
            // Disable all interactions if the chart is displayed on the dashboard
        chartRef.current.applyOptions({
            handleScroll: isInteractive,
            handleScale: isInteractive,
        });
        }
    }, [isInteractive]);


    const handleThresholdChange = (index, newPercentage) => {
        const updatedThresholds = sellThresholds.map((threshold, idx) => {
            if (idx === index) {
                return { ...threshold, percentage: newPercentage };
            }
            return threshold;
        });
        setSellThresholds(updatedThresholds);
    };


    const handleDcaSimulation = () => {
        let localBtcHeld = 0;
        let localTotalUsdRealized = 0;
        let localTotalUsdInvested = 0;
        let localTransactionHistory = [];
        let nextPurchaseDate = new Date(dcaStartDate);
        let lastSellDate = new Date(dcaStartDate);
        lastSellDate.setDate(lastSellDate.getDate() - dcaFrequency);  // Set this to 7 days before the start to allow initial selling if conditions are met
    
        let currentBtcPrice = 0;  // Variable to store the most recent Bitcoin price
        let currentBtcRisk = 0;  // Variable to store the most recent Bitcoin risk level

        // console.log("dcaRiskThreshold", dcaRiskThreshold); // this is the purchase threshold
    
        chartData.forEach(day => {
            const dayDate = new Date(day.time);
            currentBtcPrice = day.value;  // Update current price to the latest in the loop
            currentBtcRisk = day.Risk;
        
            // Buying logic
            if (dayDate >= nextPurchaseDate && day.Risk <= dcaRiskThreshold) {
                const btcPurchased = dcaAmount / day.value;
                localBtcHeld += btcPurchased;
                localTotalUsdInvested += dcaAmount;
                localTransactionHistory.push({
                    type: 'buy',
                    date: day.time,
                    amount: btcPurchased,
                    price: day.value,
                    risk: day.Risk,
                    localBtcHeld: localBtcHeld,
                    localTotalUsdInvested: localTotalUsdInvested,
                    localTotalUsdRealized: localTotalUsdRealized,
                    localTransactionHistory: localTransactionHistory,
                    localPercentageGains: percentageGains,
                    localBtcHeld: btcHeld,
                    localTotalUsdRealized: totalUsdRealized,
                    localTotalUsdInvested: totalUsdInvested,
                    localTotalPortfolioValue: totalPortfolioValue,
                    localPercentageGains: percentageGains
                });
                nextPurchaseDate = new Date(dayDate);
                nextPurchaseDate.setDate(dayDate.getDate() + dcaFrequency);  // Properly increment the next purchase date
            }
        
            // Check if dcaFrequency days have passed since the last sale
            const daysSinceLastSale = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);
        
            // Selling logic
            if (localBtcHeld > 0 && daysSinceLastSale >= dcaFrequency) {
                let maxApplicableThreshold = null;
        
                sellThresholds.forEach(threshold => {
                    if (day.Risk >= threshold.riskLevel) {
                        if (!maxApplicableThreshold || threshold.riskLevel > maxApplicableThreshold.riskLevel) {
                            maxApplicableThreshold = threshold;
                        }
                    }
                });
        
                if (maxApplicableThreshold) {
                    console.log(maxApplicableThreshold.percentage);
                    const btcSold = localBtcHeld * (maxApplicableThreshold.percentage / 100);
                    localBtcHeld -= btcSold;
                    const usdRealized = btcSold * day.value;
                    localTotalUsdRealized += usdRealized;
                    localTransactionHistory.push({
                        type: 'sell',
                        date: day.time,
                        amount: btcSold,
                        price: day.value,
                        risk: day.Risk,
                        maxApplicableThreshold: maxApplicableThreshold.percentage, // Include maxApplicableThreshold here
                        localBtcHeld: localBtcHeld,
                        localTotalUsdInvested: localTotalUsdInvested,
                        localTotalUsdRealized: localTotalUsdRealized,
                        localTransactionHistory: localTransactionHistory,
                        localPercentageGains: percentageGains,
                        localBtcHeld: btcHeld,
                        localTotalUsdRealized: totalUsdRealized,
                        localTotalUsdInvested: totalUsdInvested,
                        localTotalPortfolioValue: totalPortfolioValue,
                        localPercentageGains: percentageGains
                    });
        
                    lastSellDate = new Date(dayDate);  // Update the last sell date
                }
            }
        });
    
        const calculatePercentageGains = localTotalUsdInvested > 0 ? 
            ((localTotalUsdRealized - localTotalUsdInvested) / localTotalUsdInvested) * 100 : 
            0;
    
        // Calculate unrealized gains
        const unrealizedGains = localBtcHeld * currentBtcPrice;
    
        // Update state with the results of the simulation
        setBtcHeld(localBtcHeld);
        setTotalUsdRealized(localTotalUsdRealized);
        setTotalUsdInvested(localTotalUsdInvested);
        setPercentageGains(calculatePercentageGains);
        setTransactionHistory(localTransactionHistory);
        setUnrealizedGains(unrealizedGains); // Assuming you have a state to store this
        setTotalPortfolioValue(localTotalUsdRealized + unrealizedGains);

        setSimulationRun(true);
    
        // console.log("Unrealized Gains: ", unrealizedGains);
        // console.log("Percentage Gains: ", calculatePercentageGains);
        // console.log("Total invested: ", localTotalUsdInvested);
        // console.log("Transaction History: ", localTransactionHistory);
    };
    
    
    return (
        <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
            <div className='chart-top-div'>
                <div className='span-container'>
                    <span style={{ marginRight: '20px', display: 'inline-block' }}>
                        <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Bitcoin Price
                    </span>
                    <span style={{ display: 'inline-block' }}>
                        <span style={{ backgroundColor: '#ff0062', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Risk Metric
                    </span>
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
            <div className="chart-container" style={{ 
                    position: 'relative', 
                    height: 'calc(100% - 40px)', 
                    width: '100%', 
                    border: '2px solid #a9a9a9' // Adds dark border with your specified color
                    }}> 
                <div
                    ref={chartContainerRef}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                    onClick={() => {
                        if (!isInteractive && !isDashboard) {  // Only set interactivity if it's currently disabled
                            setInteractivity();
                        }
                    }}
                    />
            </div>
            <div>
                {
                    !isDashboard && (
                        <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem'}}>
                            Current Risk level: <b>{currentRiskLevel}</b>   (${currentBtcPrice.toFixed(0)}k)
                        </div>
                    )
                }
                <div className='simulator-container'>
                    <div>
                        {
                            !isDashboard && (
                                <div className='risk-simulator results-display' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                    <h2>Lump Sum Risk Based Investment Simulation</h2>
                                    <p>Choose a date and a lump sum to invest when the risk reaches an acceptably low level for your tolerance,
                                        and see what the investment would be worth today.
                                    </p>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', color: colors.greenAccent[500]}}>
                                        <input className='input-field .simulate-button' type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                        <input className='input-field .simulate-button' type="number" placeholder="USD to Invest" value={lumpSumInvest} onChange={e => setlumpSumInvest(e.target.value)} />
                                    </div>
                                    <button className='simulate-button-dca' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px', margin: '20px'}}  onClick={handleSimulation}>Simulate</button>
                                    { !isDashboard && simulationResult.investmentDate && (
                                        <div className='results-display'>
                                            Investing ${simulationResult.investedAmount.toFixed(0)} on {simulationResult.investmentDate} at 
                                            a risk level of {simulationResult.initialRiskLevel.toFixed(2)} would have resulted in
                                            an investment return of ${simulationResult.currentValue.toFixed(2)} based on today's prices.
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    </div>
                    <div>
    {
    !isDashboard && (
        <div className='risk-simulator results-display' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
            <h2>DCA Risk Based Accumulation and Exit Strategy Simulation</h2>
            <p>Backtest simple buying and selling DCA strategies based on the risk level.</p>
            <ol>
                <li>Choose a start date to begin the test from.</li>
                <li>Choose an amount you would like to DCA.</li>
                <li>Choose a frequency (weekly, bi-weekly, or monthly) to make purchases and sales of your Bitcoin.</li>
                <li>Choose a risk level under which you are happy to accumulate Bitcoin.</li>
            </ol>

            <h2>BTC Accumulation Strategy</h2>
            <label htmlFor="start-date">Start Date:</label>
            <input className='input-field .simulate-button' id="start-date" type="date" value={dcaStartDate} onChange={e => setDcaStartDate(e.target.value)} />

            <label htmlFor="investment-amount">USD to Invest:</label>
            <input className='input-field .simulate-button' id="investment-amount" type="number" placeholder="USD to Invest" value={dcaAmount} onChange={e => setDcaAmount(parseFloat(e.target.value))} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label htmlFor="investment-frequency" style={{ marginBottom: '10px' }}>DCA (dollar cost average) purchase frequency in days:</label>
                <div style={{ display: 'flex', justifyContent: 'space-evenly', width: '100%', marginBottom: '50px' }}>
                    <button
                        className={`dceFreq ${dcaFrequency === 7 ? 'dceFreqHighlighted' : ''}`}
                        onClick={() => setDcaFrequency(7)}
                    >
                        7
                    </button>
                    <button
                        className={`dceFreq ${dcaFrequency === 14 ? 'dceFreqHighlighted' : ''}`}
                        onClick={() => setDcaFrequency(14)}
                    >
                        14
                    </button>
                    <button
                        className={`dceFreq ${dcaFrequency === 28 ? 'dceFreqHighlighted' : ''}`}
                        onClick={() => setDcaFrequency(28)}
                    >
                        28
                    </button>
                </div>
            </div>

            <label htmlFor="buy-risk-threshold">Buy when Risk is below:</label>
            <input className='input-field .simulate-button-dca' id="buy-risk-threshold" type="number" placeholder="Buy Risk Threshold (0-1)" min="0" max="1" step="0.1" value={dcaRiskThreshold} onChange={e => setDcaRiskThreshold(parseFloat(e.target.value))} />

            <h2>Taking Profit Strategy</h2>
            <p>
                At each of the risk levels below, you can decide the percentage of your current
                stack of Bitcoin that you would like to sell. (The frequency at which you sell
                is the set by default to the same purchasing frequency set above)
            </p>
            <p style={{color: colors.greenAccent[500]}}>
                It stands to reason that the higher the risk level, the more you would want to sell,
                but feel free to explore based on your own risk tolerance.
            </p>
                
            {
                sellThresholds.map((threshold, index) => (
                    <div key={index}>
                        <label>Risk Level {' > '} {threshold.riskLevel}: </label>
                        <input type="number" min="0" max="100" step="10" value={threshold.percentage} onChange={e => handleThresholdChange(index, parseFloat(e.target.value))} /> %
                    </div>
                ))
            }
            {simulationRun && (
                <div>
                    <h2 style={{textAlign: 'left'}}>Total USD Invested: ${totalUsdInvested}</h2>
                    <h2>Total Portfolio Value: ${totalPortfolioValue.toFixed(2)}</h2>
                    <h3>Total Bitcoin Held:  ₿ {btcHeld.toFixed(6)} BTC</h3>
                    <h3>Total Realized Gains: ${totalUsdRealized.toFixed(2)}</h3>
                    <h3>Total Unrealized Gains: ${unrealizedGains.toFixed(2)}</h3>
                    <h3>Percentage Realised Gains:  {percentageGains.toFixed(2)}  %</h3>
                </div>
                
            )}

            <button className='simulate-button-dca' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px', margin: '20px'}} onClick={handleDcaSimulation}>Simulate</button>

            {simulationRun && (
                <div style={{ fontSize: '0.7rem'}}>
                    <h1 onClick={() => setShowTransactions(!showTransactions)} style={{ cursor: 'pointer', textAlign: 'center', border: '1px teal solid', padding: '5px'}}>
                        Transaction History
                    </h1>
                    {showTransactions && (
                        isMobile ? (
                            <ul style={{padding: '0px'}}>
                                {transactionHistory.map((tx, index) => (
                                    <li key={index}>
                                        {tx.type} {tx.amount.toFixed(6)} BTC on {tx.date} at ${tx.price.toFixed(2)}
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
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>Bitcoin</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>At Price</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '100px' }}>Risk</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Total BTC Held</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Percentage Sold</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Total Invested $</th>
                                    <th style={{ padding: '8px', border: '1px solid teal', minWidth: '120px' }}>Profit</th>
                                </tr>
                                </thead>
                                <tbody>
                                    {transactionHistory.reduce((acc, tx, index) => {
                                        const usdSpent = tx.type === 'buy' ? tx.amount * tx.price : 0;
                                        const profit = tx.type === 'sell' ? (tx.amount * tx.price) - usdSpent : 0;

                                        // Update the accumulated values
                                        acc.accumulatedInvestment += usdSpent;
                                        acc.totalProfit += profit;

                                        // Update btcHeld based on the transaction type
                                        if (tx.type === 'buy') {
                                            acc.btcHeld += tx.amount;
                                        } else if (tx.type === 'sell') {
                                            acc.btcHeld -= tx.amount;
                                        }

                                        acc.rows.push(
                                            <tr key={index}>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{index + 1}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.type}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.date}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>${usdSpent.toFixed(2)}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.amount.toFixed(6)} BTC</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>${tx.price.toFixed(2)}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.risk.toFixed(2)}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{acc.btcHeld.toFixed(6)} BTC</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>{tx.maxApplicableThreshold ? `${tx.maxApplicableThreshold.toFixed(2)}%` : '-'}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>${acc.accumulatedInvestment.toFixed(2)}</td>
                                                <td style={{ padding: '8px', border: '1px solid black' }}>${acc.totalProfit.toFixed(2)}</td>
                                            </tr>
                                        );

                                        return acc;
                                    }, { accumulatedInvestment: 0, totalProfit: 0, btcHeld: 0, rows: [] }).rows}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            )}
        </div>
    )}
</div>


                </div>

                {
                    !isDashboard && (
                        <p className='chart-info'>
                            The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                            It does so by calculating the normalized logarithmic difference between the price and the moving average,
                            producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                            This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
                        </p>
                    )   
                }
            </div>
        </div>
        );
      
      
};

export default BitcoinRisk;
