import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import BasicChart from "./scenes/ChartTemplates/BasicChart";
import Dashboard from "./scenes/dashboard";
import Footer from "./components/Footer";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";

import BitcoinPrice from "./components/BitcoinPrice";
import Risk from "./components/BitcoinRisk";
import EthereumPrice from "./components/EthereumPrice";
import EthereumRisk from "./components/EthereumRisk";


function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ flex: 1, display: 'flex' }}> {/* Ensuring content takes up available space */}
            <div className="sidebar">
              <Sidebar isSidebar={isSidebar} />
            </div>
            
            <main className="content">
              <Topbar setIsSidebar={setIsSidebar} />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/bitcoin" element={<BasicChart ChartComponent={BitcoinPrice} />} />
                <Route path="/ethereum" element={<BasicChart ChartComponent={EthereumPrice} />} />
                <Route path="/risk" element={<BasicChart ChartComponent={Risk} />} />
                <Route path="/risk-eth" element={<BasicChart ChartComponent={EthereumRisk} />} />
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
