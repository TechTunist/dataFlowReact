import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import Dashboard from "./scenes/dashboard";
// import Footer from "./components/Footer";
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
import AltcoinPrice from "./components/AltcoinPrice";
import AltcoinRisk from "./components/AltcoinRisk";
import MarketCycles from "./components/MarketCycles";
import FearAndGreedChart from "./components/FearAndGreedChart";
import UsInflationChart from "./components/UsInflation";
import UsUnemploymentChart from "./components/UsUnemployment";
import UsInterestChart from "./components/UsInterest";
import UsCombinedMacroChart from "./components/UsCombinedMacro";
import About from "./scenes/About";
import LoginSignup from "./scenes/LoginSignup";
import { useLocation } from 'react-router-dom';


function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const location = useLocation(); // Get current location
  const isDashboardTopbar = location.pathname === '/'; // Determine if on Dashboard

  

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Topbar outside the main flexbox container to allow full width */}
          <Topbar setIsSidebar={setIsSidebar} isSidebar={isSidebar}  isDashboardTopbar={isDashboardTopbar}/>

          <div style={{ display: 'flex', flex: 1 }}> {/* Flex container for sidebar and content */}
            {isSidebar && <div className="sidebar">
              <Sidebar />
            </div>}
            
            <main className="content" style={{ flex: 1 }}>
              {/* Spacer to ensure content starts below the fixed Topbar */}
              <div style={{ height: '85px' }}></div>
              <Routes>
                <Route path="/" element={<Dashboard />} />
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
                <Route path="/altcoin-price" element={<BasicChart ChartComponent={AltcoinPrice} />} />
                <Route path="/altcoin-risk" element={<BasicChart ChartComponent={AltcoinRisk} />} />
                <Route path="/market-cycles" element={<BasicChart ChartComponent={MarketCycles} />} />
                <Route path="/fear-and-greed-chart" element={<BasicChart ChartComponent={FearAndGreedChart} />} />
                <Route path="/us-inflation" element={<BasicChart ChartComponent={UsInflationChart} />} />
                <Route path="/us-unemployment" element={<BasicChart ChartComponent={UsUnemploymentChart} />} />
                <Route path="/us-interest" element={<BasicChart ChartComponent={UsInterestChart} />} />
                <Route path="/us-combined-macro" element={<BasicChart ChartComponent={UsCombinedMacroChart} />} />
                <Route path="/about" element={<About />} />
                <Route path="/login-signup" element={<LoginSignup />} />
              </Routes>
            </main>
          </div>
          {/* <Footer /> */}
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
