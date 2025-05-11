import React, { useRef, useEffect, useState, useContext } from 'react';
import { createChart } from 'lightweight-charts';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinRisk = ({ isDashboard = false, riskData: propRiskData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const riskSeriesRef = useRef(null); // Store risk series for future crosshair
  const priceSeriesRef = useRef(null); // Store price series for future crosshair
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [currentBtcPrice, setCurrentBtcPrice] = useState(0);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const isMobile = useIsMobile();

  // DCA risk-based accumulation simulation state variables
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

  const [sellThresholds, setSellThresholds] = useState([
    { riskLevel: 0.6, percentage: 10 },
    { riskLevel: 0.7, percentage: 20 },
    { riskLevel: 0.8, percentage: 40 },
    { riskLevel: 0.9, percentage: 70 },
  ]);

  // Lump sum investment simulation state variables
  const [lumpSumInvest, setLumpSumInvest] = useState(1000); // Default USD investment amount (fixed typo)
  const [startDate, setStartDate] = useState("2021-01-01"); // Example start date
  const [simulationResult, setSimulationResult] = useState({
    finalUsdHeld: 0,
    finalBtcHeld: 0,
    totalValue: 0,
    transactionHistory: [],
  });

  // Access DataContext
  const { btcData, fetchBtcData } = useContext(DataContext);

// Function to calculate the risk metric
const calculateRiskMetric = (data) => {
    const diminishingFactor = 0.375; // Slightly increase sensitivity to later data points
    const movingAverageDays = 380; // Shorter moving average for more sensitivity
    const logScaleFactor = 1.05; // Amplify log differences slightly

    const movingAverage = data.map((item, index) => {
        const start = Math.max(0, index - (movingAverageDays - 1));
        const subset = data.slice(start, index + 1);
        const avg = subset.reduce((sum, entry) => sum + entry.value, 0) / subset.length;
        return { ...item, MA: avg };
    });

    movingAverage.forEach((item, index) => {
        const valueLog = Math.log(item.value + 1e-3); // Small offset to prevent issues with small values
        const maLog = Math.log(item.MA + 1e-3);
        const preavg = (valueLog - maLog) * logScaleFactor * Math.pow(index + 1, diminishingFactor);
        item.Preavg = preavg;
    });

    const preavgValues = movingAverage.map(item => item.Preavg);
    const preavgMin = Math.min(...preavgValues);
    const preavgMax = Math.max(...preavgValues);

    const riskScaleFactor = 1.05; // Scale risk values by 10%

    const normalizedRisk = movingAverage.map(item => ({
        ...item,
        Risk: Math.min(1, Math.max(0, ((item.Preavg - preavgMin) / (preavgMax - preavgMin)) * riskScaleFactor)),
    }));

    return normalizedRisk;
    };

  // Calculate risk data if not provided via prop
  const chartData = propRiskData || (btcData.length > 0 ? calculateRiskMetric(btcData) : []);

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

  // Function to simulate lump sum investment
  const simulateInvestment = (data, lumpSumInvest, startDate) => {
    const filteredData = data.filter(item => new Date(item.time) >= new Date(startDate));

    let btcHeld = 0;
    let initialInvestmentDate = '';
    let initialBitcoinPrice = 0;
    let bought = false;
    let initialRiskLevel = 0;

    const startDayData = data.find(item => item.time === startDate);
    if (startDayData) {
      initialRiskLevel = startDayData.Risk;
    }

    filteredData.forEach(day => {
      if (!bought && day.Risk <= initialRiskLevel) {
        btcHeld = lumpSumInvest / day.value;
        initialInvestmentDate = day.time;
        initialBitcoinPrice = day.value;
        bought = true;
      }
    });

    const finalDay = filteredData[filteredData.length - 1];
    const currentValue = btcHeld * finalDay.value;

    return {
      investmentDate: initialInvestmentDate,
      investedAmount: lumpSumInvest,
      initialBitcoinPrice: initialBitcoinPrice,
      currentValue: currentValue,
      currentBitcoinPrice: finalDay.value,
      btcHeld: btcHeld,
      initialRiskLevel: initialRiskLevel,
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

  // Trigger lazy fetching when the component mounts
  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

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
        visible: true,
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
    riskSeriesRef.current = riskSeries;
    riskSeries.setData(chartData.map(data => ({ time: data.time, value: data.Risk })));

    // Series for Bitcoin Price on Logarithmic Scale
    const priceSeries = chart.addLineSeries({
      color: 'gray',
      priceScaleId: 'left',
      lineWidth: 0.7,
      priceFormat: {
        type: 'custom',
        formatter: compactNumberFormatter,
      },
    });
    priceSeriesRef.current = priceSeries;
    priceSeries.setData(chartData.map(data => ({ time: data.time, value: data.value })));

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

    const resizeChart = () => {
      if (chart && chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const price = Math.floor(chartData[chartData.length - 1].value / 1000);
    setCurrentBtcPrice(price);

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
    lastSellDate.setDate(lastSellDate.getDate() - dcaFrequency);

    let currentBtcPrice = 0;
    let currentBtcRisk = 0;

    chartData.forEach(day => {
      const dayDate = new Date(day.time);
      currentBtcPrice = day.value;
      currentBtcRisk = day.Risk;

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
          localPercentageGains: percentageGains,
        });
        nextPurchaseDate = new Date(dayDate);
        nextPurchaseDate.setDate(dayDate.getDate() + dcaFrequency);
      }

      const daysSinceLastSale = (dayDate - lastSellDate) / (1000 * 60 * 60 * 24);

      if (localBtcHeld > 0 && daysSinceLastSale >= dcaFrequency) {
        let maxApplicableThreshold = null;

        sellThresholds.forEach(threshold => {
          if (day.Risk >= threshold.riskLevel && threshold.percentage > 0) {
            if (!maxApplicableThreshold || threshold.riskLevel > maxApplicableThreshold.riskLevel) {
              maxApplicableThreshold = threshold;
            }
          }
        });

        if (maxApplicableThreshold && maxApplicableThreshold.percentage > 0) {
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
            maxApplicableThreshold: maxApplicableThreshold.percentage,
            localBtcHeld: localBtcHeld,
            localTotalUsdInvested: localTotalUsdInvested,
            localTotalUsdRealized: localTotalUsdRealized,
            localTransactionHistory: localTransactionHistory,
            localPercentageGains: percentageGains,
            localBtcHeld: btcHeld,
            localTotalUsdRealized: totalUsdRealized,
            localTotalUsdInvested: totalUsdInvested,
            localTotalPortfolioValue: totalPortfolioValue,
            localPercentageGains: percentageGains,
          });

          lastSellDate = new Date(dayDate);
        }
      }
    });

    const calculatePercentageGains = localTotalUsdInvested > 0
      ? ((localTotalUsdRealized - localTotalUsdInvested) / localTotalUsdInvested) * 100
      : 0;

    const unrealizedGains = localBtcHeld * currentBtcPrice;

    setBtcHeld(localBtcHeld);
    setTotalUsdRealized(localTotalUsdRealized);
    setTotalUsdInvested(localTotalUsdInvested);
    setPercentageGains(calculatePercentageGains);
    setTransactionHistory(localTransactionHistory);
    setUnrealizedGains(unrealizedGains);
    setTotalPortfolioValue(localTotalUsdRealized + unrealizedGains);

    setSimulationRun(true);
  };

  return (
    <div style={{ height: '100%' }}>
      {!isDashboard && (
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

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : '#31d6aa',
                borderColor: isInteractive ? 'violet' : '#70d8bd',
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

      <div
        className="chart-container"
        style={{
          position: 'relative',
          height: isDashboard ? "100%" : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
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

      <div className='under-chart'>
        {!isDashboard && (
          <LastUpdated storageKey="btcData" />
        )}
        {!isDashboard && (
          <BitcoinFees />
        )}
      </div>

      {!isDashboard && (
        <div>
          <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem' }}>
            Current Risk level: <b>{currentRiskLevel}</b> (${currentBtcPrice.toFixed(0)}k)
          </div>

          <div className='simulator-container'>
            <div>
              <div className='risk-simulator results-display' style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <h2>Lump Sum Risk Based Investment Simulation</h2>
                <p>Choose a date and a lump sum to invest when the risk reaches an acceptably low level for your tolerance, and see what the investment would be worth today.</p>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', color: colors.greenAccent[500] }}>
                  <input className='input-field .simulate-button' type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <input className='input-field .simulate-button' type="number" placeholder="USD to Invest" value={lumpSumInvest} onChange={e => setLumpSumInvest(e.target.value)} />
                </div>
                <button className='simulate-button-dca' style={{ background: 'transparent', color: colors.greenAccent[500], borderRadius: '10px', margin: '20px' }} onClick={handleSimulation}>Simulate</button>
                {simulationResult.investmentDate && (
                  <div className='results-display'>
                    Investing ${simulationResult.investedAmount.toFixed(0)} on {simulationResult.investmentDate} at a risk level of {simulationResult.initialRiskLevel.toFixed(2)} would have resulted in an investment return of ${simulationResult.currentValue.toFixed(2)} based on today's prices.
                  </div>
                )}
              </div>
            </div>

            <div>
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
                  At each of the risk levels below, you can decide the percentage of your current stack of Bitcoin that you would like to sell. (The frequency at which you sell is set by default to the same purchasing frequency set above)
                </p>
                <p style={{ color: colors.greenAccent[500] }}>
                  It stands to reason that the higher the risk level, the more you would want to sell, but feel free to explore based on your own risk tolerance.
                </p>

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
                    <h3>Total Bitcoin Held: ₿ {btcHeld.toFixed(6)} BTC</h3>
                    <h3>Total Realized Gains: ${totalUsdRealized.toFixed(2)}</h3>
                    <h3>Total Unrealized Gains: ${unrealizedGains.toFixed(2)}</h3>
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

                              acc.accumulatedInvestment += usdSpent;
                              acc.totalProfit += profit;

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
            </div>
          </div>

          <p className='chart-info'>
            The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average. It does so by calculating the normalized logarithmic difference between the price and the moving average, producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk. This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
          </p>
        </div>
      )}
    </div>
  );
};

// export default BitcoinRisk;
export default restrictToPaidSubscription(BitcoinRisk);