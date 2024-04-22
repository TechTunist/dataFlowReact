import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';

const BitcoinRisk = ({ isDashboard = false }) => {
    const chartContainerRef = useRef();
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null); // ref to store chart for use in return statement
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    // State for user inputs
    const [lowRisk, setLowRisk] = useState(0.2);
    const [highRisk, setHighRisk] = useState(0.8);
    const [usdInvest, setUsdInvest] = useState(1000);
    const [btcSell, setBtcSell] = useState(0.1);
    const [startDate, setStartDate] = useState("2021-01-01");  // Example start date

    // State to store current risk level
    const [currentRiskLevel, setCurrentRiskLevel] = useState(null);

    // state to allow interactivity
    const [isInteractive, setIsInteractive] = useState(false);

    // Function to set chart interactivity
    const setInteractivity = () => {
        setIsInteractive(!isInteractive);
    };

    // State to store simulation results
    const [simulationResult, setSimulationResult] = useState({
        finalUsdHeld: 0,
        finalBtcHeld: 0,
        totalValue: 0,
        transactionHistory: []
    });


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

    const simulateInvestment = (data, usdInvest, startDate) => {
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
                btcHeld = usdInvest / day.value;
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
            investedAmount: usdInvest,
            initialBitcoinPrice: initialBitcoinPrice,
            currentValue: currentValue,
            currentBitcoinPrice: finalDay.value,
            btcHeld: btcHeld,
            initialRiskLevel: initialRiskLevel  // Including the initial risk level in the results
        };
    };

    const handleSimulation = () => {
        const results = simulateInvestment(chartData, parseFloat(usdInvest), startDate);
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
        const cacheKey = 'btcData';
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
            <div>
                {
                    !isDashboard && (
                        <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem'}}>
                            Current Risk level: {currentRiskLevel}
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
                                        <input className='input-field .simulate-button' type="number" placeholder="USD to Invest" value={usdInvest} onChange={e => setUsdInvest(e.target.value)} />
                                        <button className='simulate-button' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px'}}  onClick={handleSimulation}>Simulate</button>
                                    </div>
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
                                    <h2>DCA Risk Based Accumulation Simulation</h2>
                                    <p>Choose a start date, a risk level that you will buy at, an amount and frequency to invest,
                                        and see what the investment would be worth today.
                                    </p>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px', }}>
                                        <input className='input-field .simulate-button' type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                        <input className='input-field .simulate-button' type="number" placeholder="USD to Invest" value={usdInvest} onChange={e => setUsdInvest(e.target.value)} />
                                        <button className='simulate-button' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px'}}  onClick={handleSimulation}>Simulate</button>
                                    </div>
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
