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
import UsCombinedMacroChart from "./components/UsCombinedMacro";
import SplashPage from "./scenes/splash";
import About from "./scenes/About";
import LoginSignup from "./scenes/LoginSignup";
import useIsMobile from "./hooks/useIsMobile";

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

          <div style={{ display: "flex", flex: 1 }}>
            {!isSplashPage && (
              <div className="sidebar">
                <Sidebar isSidebar={isSidebar} setIsSidebar={setIsSidebar} />
              </div>
            )}

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