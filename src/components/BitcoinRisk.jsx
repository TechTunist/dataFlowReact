import React, { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";

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

    // Fetch and process data
    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

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

        function fetchData() {
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
            .catch(error => console.error('Error fetching data: ', error));
        }
    }, []);

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
            color: 'red',
            lastValueVisible: true,
            priceScaleId: 'right',
            lineWidth: 1,
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
            handleScroll: !isDashboard,
            handleScale: !isDashboard,
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
    }, [chartData, theme.palette.mode]);

    // return (

    //     <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
    //         <div className='chart-top-div'>
    //             <div>
    //                 <span style={{ marginRight: '20px', display: 'inline-block' }}>
    //                     <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
    //                     Bitcoin Price
    //                 </span>
    //                 <span style={{ display: 'inline-block' }}>
    //                     <span style={{ backgroundColor: 'red', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
    //                     Risk Metric
    //                 </span>
    //             </div>
                
    //             {
    //                 !isDashboard && (
    //                     <button onClick={resetChartView} className="button-reset">
    //                         Reset Chart
    //                     </button>
    //                 )   
    //             }
    //         </div>
    //         <div className="chart-container" style={{ 
    //                 position: 'relative', 
    //                 height: 'calc(100% - 40px)', 
    //                 width: '100%', 
    //                 border: '2px solid #a9a9a9' // Adds dark border with your specified color
    //                 }}> 
    //             {/* Adjust the height calculation based on the height of your button and margin */}
    //             <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
    //         </div>
    //         <div>
    //             {
    //                 !isDashboard && (
    //                     <p className='chart-info'>
    //                         The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
    //                         It does so by calculating the normalized logarithmic difference between the price and the moving average,
    //                         producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
    //                         This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
    //                     </p>
    //                 )   
    //             }
    //         </div>
    //     </div>

    //   );

    return (
        <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
            <div className='chart-top-div'>
                <div>
                    <span style={{ marginRight: '20px', display: 'inline-block' }}>
                        <span style={{ backgroundColor: 'gray', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Bitcoin Price
                    </span>
                    <span style={{ display: 'inline-block' }}>
                        <span style={{ backgroundColor: 'red', height: '10px', width: '10px', display: 'inline-block', marginRight: '5px' }}></span>
                        Risk Metric
                    </span>
                </div>
                {
                    !isDashboard && (
                        <button onClick={resetChartView} className="button-reset">
                            Reset Chart
                        </button>
                    )   
                }
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
                    <div className='risk-simulator'>
                        <h1>Backtest the Risk Metric Investment Strategy</h1>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /> Date <br />
                        <input type="number" placeholder="USD to Invest" value={usdInvest} onChange={e => setUsdInvest(e.target.value)} /> Investment in USD<br />
                        <button onClick={handleSimulation}>Run Simulation</button>
                    </div>
                )
            }
            { !isDashboard && simulationResult.investmentDate && (
                <div className='results-display'>
                    Investment Date: {simulationResult.investmentDate} <br />
                    Invested Amount: ${simulationResult.investedAmount.toFixed(2)} <br />
                    Initial Bitcoin Price: ${simulationResult.initialBitcoinPrice.toFixed(2)} <br />
                    Amount of Bitcoin Purchased: {simulationResult.btcHeld.toFixed(4)} BTC <br />
                    Current Value of Investment: ${simulationResult.currentValue.toFixed(2)} <br />
                    Current Bitcoin Price: ${simulationResult.currentBitcoinPrice.toFixed(2)} <br />
                    Risk Level at Investment Date: {simulationResult.initialRiskLevel.toFixed(2)} <br />
                </div>
            )}
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