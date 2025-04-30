// src/components/Topbar.js
import React, { useContext, useState } from "react";
import { Box, IconButton, useTheme, Menu, MenuItem, Typography } from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import { useLocation, Link, useNavigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styling/bitcoinChart.css";
import Header from "../../components/Header";
import { AuthContext } from "../../context/AuthContext";

const Topbar = ({ setIsSidebar, isSidebar, isDashboardTopbar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sidebarWidth = isSidebar ? 270 : 0;

  // State for the user menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleUserMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleUserMenuClose();
    navigate("/login");
  };

  const handleLogin = () => {
    handleUserMenuClose();
    navigate("/login");
  };

  const topBarStyle = {
    position: "fixed",
    top: 0,
    left: isMobile ? 0 : sidebarWidth,
    right: 0,
    height: isMobile ? "65px" : "85px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 10px",
    backgroundColor: colors.primary[400],
    zIndex: 1000,
    width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
    borderBottom: `1px solid ${colors.greenAccent[500]}`,
    transition: "left 0.3s ease, width 0.3s ease",
  };

  const getTitleAndSubtitle = (pathname) => {
    switch (pathname) {
      case "/dashboard":
        return { title: "Dashboard", subtitle: "A Selection of your favourite charts" };
      case "/bitcoin":
        return { title: "Bitcoin", subtitle: "Historical Chart" };
      case "/bitcoin-dominance":
        return { title: "Bitcoin Dominance", subtitle: "Bitcoin Dominance Chart" };
      case "/total":
        return { title: "Total Crypto Market Cap", subtitle: isMobile ? "All Crypto Assets" : "Combined marketcap of the top 125 crypto assets" };
      case "/risk":
        return { title: "Bitcoin", subtitle: "Historical Risk Metric for Bitcoin" };
      case "/ethereum":
        return { title: "Ethereum", subtitle: "Historical Chart" };
      case "/risk-eth":
        return { title: "Ethereum", subtitle: "Risk Metric" };
      case "/pi-cycle":
        return { title: "PiCycle Top", subtitle: "Top Calling Indicator" };
      case "/fear-and-greed":
        return { title: "Fear & Greed", subtitle: "Market Sentiment" };
      case "/logarithmic-regression":
        return { title: "Bitcoin", subtitle: "Logarithmic Regression" };
      case "/risk-color":
        return { title: "Bitcoin", subtitle: "Price v Risk" };
      case "/risk-bands":
        return { title: "Bitcoin", subtitle: "Time in Risk Bands" };
      case "/altcoin-price":
        return { title: "Altcoins", subtitle: "Altcoin Analysis" };
      case "/about":
        return { title: "About", subtitle: "Why did I create Cryptological?" };
      case "/login-signup":
        return { title: "Login / Signup", subtitle: "Under Construction" };
      case "/market-cycles":
        return { title: "Bitcoin Cycles", subtitle: isMobile ? "Compare Market Cycles" : "Start from either the cycle bottom or from the halving" };
      case "/bitcoin-roi":
        return { title: "Bitcoin ROI", subtitle: isMobile ? "ROI" : "Annualised ROI for Bitcoin" };
      case "/btc-tx-count":
        return { title: "Bitcoin Transaction Count", subtitle: isMobile ? "Transaction Count" : "Daily Transaction Count for Bitcoin" };
      case "/fear-and-greed-chart":
        return { title: "Bitcoin Fear and Greed", subtitle: "Fear and Greed plotted over the Bitcoin Price" };
      case "/altcoin-risk":
        return { title: "Altcoin Risk Chart", subtitle: "Risk metric for a selection of altcoins" };
      case "/us-inflation":
        return { title: "US Inflation", subtitle: "Annualised inflation rate" };
      case "/us-unemployment":
        return { title: "US Unemployment", subtitle: "Historical US Unemployment Rate" };
      case "/us-interest":
        return { title: "US Interest Rate", subtitle: "Fed Funds Rate" };
      case "/us-combined-macro":
        return { title: "US Macro Information", subtitle: "Compare US Macro Data" };
      case "/us-initial-claims":
        return { title: "US Initial Claims", subtitle: "Jobless Claims" };
      case "/tx-combined":
        return { title: "US Macro and BTC Tx Count", subtitle: "Macro and On-Chain Data" };
      case "/tx-mvrv":
        return { title: "BTC Tx Count to MVRV", subtitle: "Transactions to MVRV Chart" };
      case "/fred/fed-funds-rate":
        return { title: "Federal Funds Rate", subtitle: isMobile ? "Fed Rate" : "Effective Federal Funds Rate" };
      case "/fred/sp500":
        return { title: "S&P 500", subtitle: isMobile ? "Stock Index" : "S&P 500 Index Daily Closing Values" };
      case "/fred/recession-indicator":
        return { title: "US Recession", subtitle: isMobile ? "Recession Periods" : "US Recession Indicator" };
      case "/fred/cpi":
        return { title: "Consumer Price Index", subtitle: isMobile ? "CPI" : "US Consumer Price Index" };
      case "/fred/unemployment-rate":
        return { title: "Unemployment Rate", subtitle: isMobile ? "Unemployment" : "US Unemployment Rate" };
      case "/fred/10-year-treasury":
        return { title: "10-Year Treasury", subtitle: isMobile ? "Treasury Yield" : "10-Year Treasury Note Yield" };
      case "/fred/10y-2y-spread":
        return { title: "10Y-2Y Spread", subtitle: isMobile ? "Yield Spread" : "10-Year to 2-Year Treasury Spread" };
      case "/fred/5y-inflation-expectation":
        return { title: "Inflation Expectation", subtitle: isMobile ? "5Y Inflation" : "5-Year Breakeven Inflation Rate" };
      case "/fred/euro-dollar":
        return { title: "Euro to USD", subtitle: isMobile ? "Exchange Rate" : "Euro to USD Exchange Rate" };
      case "/fred/crude-oil":
        return { title: "Crude Oil Price", subtitle: isMobile ? "Oil Price" : "WTI Crude Oil Price" };
      case "/fred/producer-price":
        return { title: "Producer Price Index", subtitle: isMobile ? "PPI" : "Producer Price Index for Commodities" };
      case "/fred/nonfarm-payrolls":
        return { title: "Nonfarm Payrolls", subtitle: isMobile ? "Payrolls" : "US Nonfarm Payroll Employment" };
      case "/fred/gdp":
        return { title: "Real GDP", subtitle: isMobile ? "GDP" : "US Real Gross Domestic Product" };
      case "/fred/gdp-growth":
        return { title: "GDP Growth", subtitle: isMobile ? "Growth Rate" : "US Real GDP Growth Rate" };
      case "/fred/m1-money-supply":
        return { title: "M1 Money Supply", subtitle: isMobile ? "M1" : "US M1 Money Supply" };
      case "/fred/m2-money-supply":
        return { title: "M2 Money Supply", subtitle: isMobile ? "M2" : "US M2 Money Supply" };
      case "/fred/consumer-sentiment":
        return { title: "Consumer Sentiment", subtitle: isMobile ? "Sentiment" : "US Consumer Sentiment Index" };
      case "/fred/vix":
        return { title: "VIX Index", subtitle: isMobile ? "Volatility" : "CBOE Volatility Index" };
      case "/fred/ted-spread":
        return { title: "TED Spread", subtitle: isMobile ? "Spread" : "LIBOR to T-Bill Spread" };
      case "/fred/yen-dollar":
        return { title: "Yen to USD", subtitle: isMobile ? "Exchange Rate" : "Japanese Yen to USD Exchange Rate" };
      case "/fred/pound-dollar":
        return { title: "Pound to USD", subtitle: isMobile ? "Exchange Rate" : "British Pound to USD Exchange Rate" };
      case "/fred/cad-dollar":
        return { title: "CAD to USD", subtitle: isMobile ? "Exchange Rate" : "Canadian Dollar to USD Exchange Rate" };
      case "/fred/chicago-fed-index":
        return { title: "Chicago Fed Index", subtitle: isMobile ? "Activity Index" : "Chicago Fed National Activity Index" };
      case "/fred/economic-policy-uncertainty":
        return { title: "Policy Uncertainty", subtitle: isMobile ? "Uncertainty" : "US Economic Policy Uncertainty Index" };
      case "/fred/housing-starts":
        return { title: "Housing Starts", subtitle: isMobile ? "Housing" : "US Housing Starts" };
      case "/fred/case-shiller":
        return { title: "Home Price Index", subtitle: isMobile ? "Home Prices" : "Case-Shiller US Home Price Index" };
      case "/fred/nikkei-225":
        return { title: "Nikkei 225", subtitle: isMobile ? "Stock Index" : "Nikkei 225 Index" };
      case "/fred/german-bond-yield":
        return { title: "German Bond Yield", subtitle: isMobile ? "Bond Yield" : "German 10-Year Bond Yield" };
      case "/indicators/btc-yield-recession":
        return { title: "Bitcoin to 10 Year Yield", subtitle: isMobile ? "BTC vs 10 Year" : "Bitcoin Vs 10 year Bond Yield with Recesion Indicator" };
      case "/workbench":
        return { title: "Workbench", subtitle: isMobile ? "Create your own indicator" : "Create your own indicator from a selection of data" };
      case "/on-chain-historical-risk":
        return { title: "OnChain Risk", subtitle: isMobile ? "Historical Risk" : "Historical Risk Levels of OnChain Indicators" };
      default:
        return { title: "CryptoLogical", subtitle: "" };
    }
  };

  const { title, subtitle } = getTitleAndSubtitle(location.pathname);

  return (
    <Box style={topBarStyle}>
      <Box display="flex" alignItems="center">
        {isMobile && (
          <IconButton onClick={() => setIsSidebar(!isSidebar)} aria-label="menu">
            <MenuOutlinedIcon style={{ color: colors.primary[100] }} />
          </IconButton>
        )}
        <Link to="/about">
          <IconButton aria-label="about" className="about-button">
            <InfoOutlinedIcon style={{ color: colors.primary[100] }} />
          </IconButton>
        </Link>
      </Box>
      <div style={{ flexGrow: 1, textAlign: "center" }}>
        <Header title={title} subtitle={subtitle} />
      </div>
      <Box display="flex" alignItems="center">
        {isMobile && (
          <Link to="/">
            <IconButton aria-label="home" className="home-button">
              <HomeOutlinedIcon style={{ color: colors.primary[100] }} />
            </IconButton>
          </Link>
        )}
        <IconButton onClick={colorMode.toggleColorMode} color="inherit">
          {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
        <IconButton
          onClick={handleUserMenuClick}
          color="inherit"
          aria-label="user menu"
          aria-controls={open ? "user-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <PersonOutlinedIcon style={{ color: colors.primary[100] }} />
        </IconButton>
        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleUserMenuClose}
          MenuListProps={{
            "aria-labelledby": "user-button",
          }}
          PaperProps={{
            style: {
              backgroundColor: colors.primary[400],
              color: colors.primary[100],
              border: `1px solid ${colors.greenAccent[500]}`,
            },
          }}
        >
          {user ? (
            <>
              <MenuItem disabled>
                <Typography variant="body2">
                  {user.username} ({user.email || "No email"})
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleUserMenuClose} component={Link} to="/profile">
                Profile
              </MenuItem>
              <MenuItem onClick={handleUserMenuClose} component={Link} to="/subscription">
                Subscription
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </>
          ) : (
            <>
              <MenuItem disabled>
                <Typography variant="body2">Not logged in</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogin}>Login</MenuItem>
            </>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

export default Topbar;