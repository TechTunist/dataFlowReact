import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Bitcoin from "./scenes/bitcoin";
import Ethereum from "./scenes/ethereum";
import Risk from "./scenes/risk";
import RiskEthereum from "./scenes/riskEthereum";
import Dashboard from "./scenes/dashboard";
import Footer from "./components/Footer";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";

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
                <Route path="/bitcoin" element={<Bitcoin />} />
                <Route path="/risk" element={<Risk />} />
                <Route path="/ethereum" element={<Ethereum />} />
                <Route path="/risk-eth" element={<RiskEthereum />} />
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
