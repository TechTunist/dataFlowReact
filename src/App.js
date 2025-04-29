import { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import Dashboard from "./scenes/dashboard";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import BitcoinPrice from "./components/BitcoinPrice";
import TotalMarketCap from "./components/TotalMarketCap";
import BitcoinTransactionFees from "./components/BitcoinTransactionFees";
import BitcoinDominance from "./components/BitcoinDominance";
import Risk from "./components/BitcoinRisk";
import EthereumPrice from "./components/EthereumPrice";
import EthereumRisk from "./components/EthereumRisk";
import PiCycleTop from "./components/PiCycleTop";
import FearAndGreed from "./components/FearAndGreed";
import BitcoinLogRegression from "./components/BitcoinLogRegression";
import BitcoinRiskColor from "./components/BitcoinRiskColor";
import BitcoinRiskTimeInBands from "./components/BitcoinRiskTimeInBands";
import AltcoinPrice from "./components/AltcoinPrice";
import AltcoinRisk from "./components/AltcoinRisk";
import MarketCycles from "./components/MarketCycles";
import FearAndGreedChart from "./components/FearAndGreedChart";
import UsInflationChart from "./components/UsInflation";
import UsUnemploymentChart from "./components/UsUnemployment";
import UsInterestChart from "./components/UsInterest";
import UsInitialClaimsChart from "./components/UsInitialClaims";
import UsCombinedMacroChart from "./components/UsCombinedMacro";
import SplashPage from "./scenes/splash";
import About from "./scenes/About";
import LoginSignup from "./scenes/LoginSignup";
import useIsMobile from "./hooks/useIsMobile";
import BitcoinROI from "./components/BitcoinROI";
import BitcoinTxCountChart from "./components/BitcoinTxCount";
import TxCombinedChart from "./components/TxMacroCombined";
import BitcoinTxMvrvChart from "./components/BitcoinTxMvrv";
import FredSeriesChart from "./components/FredSeriesChart";
import Bitcoin10YearChart from "./components/Bitcoin10YearRecession";
import WorkbenchChart from "./components/Workbench";
import OnChainHistoricalRisk from "./components/OnChainHistoricalRisk";
import { AuthProvider } from './context/AuthContext';

function App() {
  const [theme, colorMode] = useMode();
  const isMobile = useIsMobile();
  const [isSidebar, setIsSidebar] = useState(!isMobile);
  const location = useLocation();
  const isDashboardTopbar = location.pathname === "/";
  const isSplashPage = location.pathname === "/splash";

  useEffect(() => {
    setIsSidebar(!isMobile);
  }, [isMobile]);

  // Determine if charts should be rendered
  const shouldRenderCharts = !isMobile || (isMobile && !isSidebar);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            {!isSplashPage && (
              <Topbar
                setIsSidebar={setIsSidebar}
                isSidebar={isSidebar}
                isDashboardTopbar={isDashboardTopbar}
              />
            )}

            <div style={{ display: "flex", flex: 1 }}>
              {!isSplashPage && (
                <div
                  className="sidebar"
                  style={{
                    position: isMobile ? "fixed" : "sticky",
                    top: 0,
                    zIndex: 1100,
                    width: isMobile ? (isSidebar ? "270px" : "0") : "270px",
                  }}
                >
                  <Sidebar isSidebar={isSidebar} setIsSidebar={setIsSidebar} />
                </div>
              )}

              <main className="content" style={{ flex: 1 }}>
                {!isSplashPage && <div style={{ height: isMobile ? "65px" : "85px" }}></div>}
                <Routes>
                  {/* Routes that don't involve charts - always render */}
                  <Route
                    path="/dashboard"
                    element={<Dashboard isMobile={isMobile} isSidebar={isSidebar} />}
                  />
                  <Route path="/about" element={<About />} />
                  <Route path="/login-signup" element={<LoginSignup />} />
                  <Route path="/splash" element={<SplashPage />} />

                  {/* Chart routes - only render if shouldRenderCharts is true */}
                  {shouldRenderCharts && (
                    <>
                      <Route path="/bitcoin" element={<BasicChart ChartComponent={BitcoinPrice} />} />
                      <Route path="/total" element={<BasicChart ChartComponent={TotalMarketCap} />} />
                      <Route path="/bitcoin-fees" element={<BasicChart ChartComponent={BitcoinTransactionFees} />} />
                      <Route path="/bitcoin-dominance" element={<BasicChart ChartComponent={BitcoinDominance} />} />
                      <Route path="/bitcoin-roi" element={<BasicChart ChartComponent={BitcoinROI} />} />
                      <Route path="/btc-tx-count" element={<BasicChart ChartComponent={BitcoinTxCountChart} />} />
                      <Route path="/ethereum" element={<BasicChart ChartComponent={EthereumPrice} />} />
                      <Route path="/risk" element={<BasicChart ChartComponent={Risk} />} />
                      <Route path="/risk-eth" element={<BasicChart ChartComponent={EthereumRisk} />} />
                      <Route path="/pi-cycle" element={<BasicChart ChartComponent={PiCycleTop} />} />
                      <Route path="/fear-and-greed" element={<BasicChart ChartComponent={FearAndGreed} />} />
                      <Route path="/logarithmic-regression" element={<BasicChart ChartComponent={BitcoinLogRegression} />} />
                      <Route path="/risk-color" element={<BasicChart ChartComponent={BitcoinRiskColor} />} />
                      <Route path="/risk-bands" element={<BasicChart ChartComponent={BitcoinRiskTimeInBands} />} />
                      <Route path="/altcoin-price" element={<BasicChart ChartComponent={AltcoinPrice} />} />
                      <Route path="/altcoin-risk" element={<BasicChart ChartComponent={AltcoinRisk} />} />
                      <Route path="/market-cycles" element={<BasicChart ChartComponent={MarketCycles} />} />
                      <Route path="/fear-and-greed-chart" element={<BasicChart ChartComponent={FearAndGreedChart} />} />
                      <Route path="/us-inflation" element={<BasicChart ChartComponent={UsInflationChart} />} />
                      <Route path="/us-unemployment" element={<BasicChart ChartComponent={UsUnemploymentChart} />} />
                      <Route path="/us-interest" element={<BasicChart ChartComponent={UsInterestChart} />} />
                      <Route path="/us-combined-macro" element={<BasicChart ChartComponent={UsCombinedMacroChart} />} />
                      <Route path="/us-initial-claims" element={<BasicChart ChartComponent={UsInitialClaimsChart} />} />
                      <Route path="/tx-combined" element={<BasicChart ChartComponent={TxCombinedChart} />} />
                      <Route path="/tx-mvrv" element={<BasicChart ChartComponent={BitcoinTxMvrvChart} />} />
                      <Route path="/on-chain-historical-risk" element={<BasicChart ChartComponent={OnChainHistoricalRisk} />} />

                      {/* New FRED series routes */}
                      <Route
                        path="/fred/fed-funds-rate"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DFF"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="This chart shows the daily Effective Federal Funds Rate in the United States, set by the Federal Reserve."
                          />
                        }
                      />
                      <Route
                        path="/fred/sp500"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="SP500"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="This chart displays the daily closing values of the S&P 500 Index."
                          />
                        }
                      />
                      <Route
                        path="/fred/recession-indicator"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="USRECD"
                            chartType="histogram"
                            valueFormatter={value => (value === 1 ? 'Recession' : 'No Recession')}
                            explanation="This chart indicates periods of recession in the US."
                            defaultScaleMode={0}
                          />
                        }
                      />
                      <Route
                        path="/fred/cpi"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CPIAUCSL"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The Consumer Price Index (CPI) for All Urban Consumers, often referred to as CPI-U, is a widely used economic indicator that measures the average change over time in the prices paid by urban consumers for a market basket of goods and services. These include essentials like food, housing, transportation, medical care, clothing, and recreation, among others. The CPI is calculated by the U.S. Bureau of Labor Statistics (BLS) and serves as a critical tool for assessing inflation or deflation in the economy."
                          />
                        }
                      />
                      <Route
                        path="/fred/unemployment-rate"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="UNRATE"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(1)}%`}
                            explanation="The monthly U.S. unemployment rate is a key economic indicator that measures the percentage of the labor force that is jobless, actively seeking work, and available to work. It is calculated and reported by the U.S. Bureau of Labor Statistics (BLS) through the Current Population Survey (CPS), typically released on the first Friday of each month as part of the Employment Situation report."
                          />
                        }
                      />
                      <Route
                        path="/fred/10-year-treasury"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DGS10"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="The daily 10-Year Treasury Note yield represents the annualized return investors receive for holding a U.S. 10-Year Treasury Note, a key benchmark for interest rates in the global economy. The yield is determined by the note’s price in the bond market, which fluctuates based on supply, demand, and economic conditions. Data is typically reported by the U.S. Department of the Treasury or financial platforms like the Federal Reserve’s FRED database."
                          />
                        }
                      />
                      <Route
                        path="/fred/10y-2y-spread"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="T10Y2Y"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="The daily spread between the 10-Year and 2-Year Treasury yields measures the difference between the yields of the U.S. 10-Year Treasury Note and the 2-Year Treasury Note. This spread, often referred to as the 10-2 yield spread, is a key component of the Treasury yield curve and a widely watched indicator of economic health, particularly for predicting recessions. The data is typically sourced from the U.S. Department of the Treasury or platforms like the Federal Reserve’s FRED database."
                          />
                        }
                      />
                      <Route
                        path="/fred/5y-inflation-expectation"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="T5YIE"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="The daily 5-Year Breakeven Inflation Rate represents the market's expected average annual inflation rate over the next five years, derived from the difference between the yields of the 5-Year U.S. Treasury Note and the 5-Year Treasury Inflation-Protected Securities (TIPS). This metric, often reported by the Federal Reserve (e.g., via FRED) or financial platforms, reflects investor inflation expectations and is a key gauge of anticipated price pressures in the economy."
                          />
                        }
                      />
                      <Route
                        path="/fred/euro-dollar"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXUSEU"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of Euro to US Dollar."
                          />
                        }
                      />
                      <Route
                        path="/fred/crude-oil"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DCOILWTICO"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => `$${value.toFixed(2)}`}
                            explanation="This chart shows the daily West Texas Intermediate (WTI) crude oil price."
                          />
                        }
                      />
                      <Route
                        path="/fred/producer-price"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="PPIACO"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly Producer Price Index (PPI) for All Commodities measures the average change over time in the selling prices received by domestic producers for their output, specifically for a broad basket of commodities. Calculated by the U.S. Bureau of Labor Statistics (BLS), the PPI is a key indicator of wholesale price trends and serves as an early signal of inflationary pressures in the economy, complementing metrics like the Consumer Price Index (CPI)."
                          />
                        }
                      />
                      <Route
                        path="/fred/nonfarm-payrolls"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="PAYEMS"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly total nonfarm payroll employment in the U.S. represents the total number of paid workers in the U.S. economy, excluding farm workers, private household employees, nonprofit employees, and unincorporated self-employed individuals. This data, compiled by the U.S. Bureau of Labor Statistics (BLS) through the Current Employment Statistics (CES) survey, is a critical indicator of labor market health and economic activity. It is released monthly, typically on the first Friday of the following month, as part of the Employment Situation report."
                          />
                        }
                      />
                      <Route
                        path="/fred/gdp"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="GDPC1"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The quarterly Real Gross Domestic Product (GDP) in the U.S. measures the inflation-adjusted value of all final goods and services produced within the U.S. economy over a three-month period. Reported by the Bureau of Economic Analysis (BEA), Real GDP is a key indicator of economic growth, expressed in constant dollars (e.g., chained 2017 dollars) to remove the effects of price changes. It is typically presented as an annualized growth rate (e.g., 2.5% annualized) or as a total dollar value, released in three estimates (advance, second, third) per quarter."
                          />
                        }
                      />
                      <Route
                        path="/fred/gdp-growth"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="A191RL1Q225SBEA"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="The quarterly Real GDP growth rate in the U.S. represents the annualized percentage change in inflation-adjusted Gross Domestic Product (GDP) from one quarter to the next. Real GDP, reported by the U.S. Bureau of Analysis (BEA), measures the value of all final goods and services produced within the U.S., adjusted for inflation using a price deflator (e.g., chained 2017 dollars). The growth rate, expressed as an annualized figure, is a key indicator of economic momentum, released in three estimates (advance, second, third) per quarter."
                          />
                        }
                      />
                      <Route
                        path="/fred/m1-money-supply"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="M1SL"
                            chartType="area"
                            scaleMode="logarithmic"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly M1 money supply in the U.S. measures the most liquid components of the money supply, including physical currency, demand deposits, and other highly liquid deposits. Reported by the Federal Reserve through the H.6 Money Stock Measures, M1 reflects the money readily available for spending and is a key indicator of monetary policy, liquidity, and potential inflationary pressures. Data is typically presented in billions of dollars, seasonally adjusted, and updated monthly via sources like the Federal Reserve’s FRED database."
                          />
                        }
                      />
                      <Route
                        path="/fred/m2-money-supply"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="M2SL"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly M2 money supply in the U.S. measures a broader definition of the money supply compared to M1, encompassing all components of M1 plus less liquid assets such as savings deposits, small-denomination time deposits, and retail money market mutual funds (MMFs). Reported by the Federal Reserve through the H.6 Money Stock Measures, M2 reflects money available for spending and short-term saving, serving as a key indicator of monetary policy, economic liquidity, and potential inflationary pressures. Data is presented in billions of dollars, seasonally adjusted, and updated monthly via sources like the Federal Reserve’s FRED database."
                          />
                        }
                      />
                      <Route
                        path="/fred/consumer-sentiment"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="UMCSENT"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly University of Michigan Consumer Sentiment Index (UMCSI) measures U.S. consumer confidence based on their perceptions of current economic conditions and expectations for the future. Compiled by the University of Michigan through its Surveys of Consumers, the UMCSI is a leading indicator of consumer spending, which drives ~70% of U.S. economic activity. The index is reported monthly, with preliminary and final readings, and is expressed relative to a base period (1966 = 100)."
                          />
                        }
                      />
                      <Route
                        path="/fred/vix"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="VIXCLS"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toFixed(2)}
                            explanation="The daily CBOE Volatility Index (VIX) measures the market's expectation of 30-day forward-looking volatility in the S&P 500 Index, often referred to as the 'fear gauge.' Calculated by the Chicago Board Options Exchange (CBOE), the VIX is derived from the prices of S&P 500 index options and reflects investor sentiment about near-term market uncertainty. It is reported daily in real-time during market hours, expressed as an annualized percentage."
                          />
                        }
                      />
                      <Route
                        path="/fred/ted-spread"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="TEDRATE"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="The daily TED Spread measures the difference between the 3-Month London Interbank Offered Rate (LIBOR) and the 3-Month U.S. Treasury Bill (T-Bill) rate. It serves as an indicator of perceived credit risk and liquidity in the interbank lending market. The spread is expressed in percentage points (or basis points, where 1% = 100 bps) and is calculated daily using data from financial markets, typically reported via platforms like the Federal Reserve’s FRED database or Bloomberg."
                          />
                        }
                      />
                      <Route
                        path="/fred/yen-dollar"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXJPUS"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={value => value.toFixed(2)}
                            explanation="This chart shows the daily exchange rate of Japanese Yen to US Dollar."
                          />
                        }
                      />
                      <Route
                        path="/fred/pound-dollar"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXUSUK"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={value => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of British Pound to US Dollar."
                          />
                        }
                      />
                      <Route
                        path="/fred/cad-dollar"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="DEXCAUS"
                            chartType="line"
                            scaleMode="logarithmic"
                            valueFormatter={value => value.toFixed(4)}
                            explanation="This chart shows the daily exchange rate of Canadian Dollar to US Dollar."
                          />
                        }
                      />
                      <Route
                        path="/fred/chicago-fed-index"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CFNAI"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toFixed(2)}
                            explanation="The monthly Chicago Fed National Activity Index (CFNAI) is a weighted average of 85 economic indicators that provides a single, comprehensive measure of U.S. economic activity. Produced by the Federal Reserve Bank of Chicago, the CFNAI tracks the economy’s overall health, with values above zero indicating above-average growth and values below zero signaling below-average growth. It is reported monthly, typically three weeks after the month ends, and is a key tool for assessing economic trends and recession risks."
                          />
                        }
                      />
                      <Route
                        path="/fred/economic-policy-uncertainty"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="USEPUINDXD"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The daily U.S. Economic Policy Uncertainty (EPU) Index measures uncertainty related to economic policy based on newspaper coverage, tax code provisions, and forecaster disagreement. Developed by economists Scott R. Baker, Nicholas Bloom, and Steven J. Davis, the EPU Index quantifies how uncertainty about fiscal, monetary, regulatory, or trade policies affects economic decision-making. It is reported daily, expressed as an index with a long-term average of 100, and is available via sources like policyuncertainty.com or FRED."
                          />
                        }
                      />
                      <Route
                        path="/fred/housing-starts"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="HOUST"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly U.S. Housing Starts measures the number of new residential construction projects (privately owned housing units) that began during a given month, expressed as a seasonally adjusted annualized rate (SAAR) in thousands of units. Reported by the U.S. Census Bureau and the Department of Housing and Urban Development (HUD) as part of the New Residential Construction report, housing starts are a leading indicator of economic strength, reflecting activity in the housing sector, consumer confidence, and broader economic conditions. Data is released around the 17th of each month for the prior month and is available via sources like FRED, Census.gov, or tradingeconomics.com."
                          />
                        }
                      />
                      <Route
                        path="/fred/case-shiller"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="CSUSHPINSA"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The monthly S&P/Case-Shiller U.S. National Home Price Index measures changes in the value of single-family homes across the U.S., adjusted for inflation and seasonal variations. Produced by S&P Dow Jones Indices and CoreLogic, the index uses a repeat-sales methodology, tracking price changes of the same properties over time to provide a consistent measure of home price trends. Reported monthly with a two-month lag (e.g., March 2025 data released in May 2025), it is expressed relative to a base value (January 2000 = 100) and is a key indicator of housing market health, consumer wealth, and economic conditions."
                          />
                        }
                      />
                      <Route
                        path="/fred/nikkei-225"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="NIKKEI225"
                            chartType="area"
                            scaleMode="linear"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="The daily Nikkei 225 Index tracks the performance of 225 major, highly liquid, publicly owned companies listed on the Prime Market of the Tokyo Stock Exchange (TSE). Calculated by the Nihon Keizai Shimbun (Nikkei) newspaper, the Nikkei 225 is a price-weighted index, denominated in Japanese Yen (JPY), and serves as a leading indicator of the Japanese equity market and broader economic conditions. The index is updated every five seconds during trading hours (9:00 AM–3:00 PM JST, with a lunch break from 11:30 AM–12:30 PM) and is reported daily via platforms like Yahoo Finance, FRED, or TradingView."
                          />
                        }
                      />
                      <Route
                        path="/fred/german-bond-yield"
                        element={
                          <BasicChart
                            ChartComponent={FredSeriesChart}
                            seriesId="IRLTLT01DEM156N"
                            chartType="line"
                            scaleMode="linear"
                            valueFormatter={value => `${value.toFixed(2)}%`}
                            explanation="This chart shows the monthly German 10-Year Government Bond Yield."
                          />
                        }
                      />
                      <Route
                        path="/indicators/btc-yield-recession"
                        element={
                          <BasicChart
                            ChartComponent={Bitcoin10YearChart}
                            indicatorId="btc-yield-recession"
                            explanation="Bitcoin price vs. 10Y-2Y Treasury yield spread and US recessions. Yield curve inversions (negative spread) often precede BTC rallies, while recessions may signal caution."
                          />
                        }
                      />
                      <Route
                        path="/workbench"
                        element={
                          <BasicChart
                            ChartComponent={WorkbenchChart}
                            seriesId="UMCSENT"
                            chartType="area"
                            valueFormatter={value => value.toLocaleString()}
                            explanation="Create your own indicator by choosing your own data series' to compare."
                          />
                        }
                      />

                      {/* Optional: catch-all for unmatched routes */}
                      <Route path="*" element={<div>404 - Page Not Found</div>} />
                    </>
                  )}
                </Routes>
              </main>
            </div>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;