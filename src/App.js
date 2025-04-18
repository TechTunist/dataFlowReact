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
        <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {!isSplashPage && (
            <Topbar
              setIsSidebar={setIsSidebar}
              isSidebar={isSidebar}
              isDashboardTopbar={isDashboardTopbar}
            />
          )}

          <div style={{ display: "flex", flex: 1}}>
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

            {/* <main
              className="content"
              style={{
                flex: 1,
                marginLeft: isMobile ? 0 : (isSidebar ? "270px" : "0"), // Offset for sidebar width
                transition: "margin-left 0.3s ease", // Smooth transition
                width: isMobile ? "100%" : (isSidebar ? "calc(100% - 270px)" : "100%"), // Adjust width
              }}
            > */}

            <main className="content" style={{ flex: 1 }}>
              {!isSplashPage && <div style={{ height: isMobile ? "65px" : "85px" }}></div>}
              <Routes>
                {/* Routes that don't involve charts - always render */}
                <Route
                  path="/"
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

                                        {/* New FRED series routes */}
                                        <Route
                      path="/fred/fed-funds-rate"
                      element={
                        <BasicChart
                          ChartComponent={FredSeriesChart}
                          seriesId="DFF"
                          chartType="line"
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
                          explanation="This chart indicates periods of recession in the US (1 = recession, 0 = no recession)."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly Consumer Price Index (CPI) for All Urban Consumers, a key inflation measure."
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
                          valueFormatter={value => `${value.toFixed(1)}%`}
                          explanation="This chart displays the monthly US unemployment rate."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the daily 10-Year Treasury Note yield."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the daily spread between 10-Year and 2-Year Treasury yields."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the daily 5-Year Breakeven Inflation Rate."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly Producer Price Index for All Commodities."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly total nonfarm payroll employment in the US."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the quarterly Real Gross Domestic Product (GDP) in the US."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the quarterly Real GDP growth rate in the US."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly M1 money supply in the US."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly M2 money supply in the US."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly University of Michigan Consumer Sentiment Index."
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
                          valueFormatter={value => value.toFixed(2)}
                          explanation="This chart shows the daily CBOE Volatility Index (VIX)."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the daily TED Spread, the difference between 3-Month LIBOR and 3-Month T-Bill rates."
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
                          valueFormatter={value => value.toFixed(2)}
                          explanation="This chart shows the monthly Chicago Fed National Activity Index."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the daily US Economic Policy Uncertainty Index."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly housing starts in the US."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the monthly S&P/Case-Shiller US National Home Price Index."
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
                          valueFormatter={value => value.toLocaleString()}
                          explanation="This chart shows the daily Nikkei 225 Index."
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
                          valueFormatter={value => `${value.toFixed(2)}%`}
                          explanation="This chart shows the monthly German 10-Year Government Bond Yield."
                        />
                      }
                    />
                    {/* Add more routes for other series as needed */}
                    {/* Example dynamic route (alternative approach):
                    <Route
                      path="/fred/:seriesId"
                      element={
                        <BasicChart
                          ChartComponent={FredSeriesChart}
                          seriesId={useParams().seriesId}
                          chartType="area"
                          valueFormatter={value => value.toLocaleString()}
                          explanation="Dynamic chart for FRED series data."
                        />
                      }
                    />
                    */}

                    {/* Optional: catch-all for unmatched routes */}
                    <Route path="*" element={<div>404 - Page Not Found</div>} />
                  </>
                )}
              </Routes>
            </main>
          </div>
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;