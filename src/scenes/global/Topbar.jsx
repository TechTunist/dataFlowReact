// src/scenes/global/Topbar.js
import React, { useContext, useState } from "react";
import { Box, IconButton, useTheme, Typography, Menu, MenuItem, Avatar, Snackbar, Alert, Button } from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { useLocation, Link, useNavigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styling/bitcoinChart.css";
import Header from "../../components/Header";
import { useClerk, useUser } from "@clerk/clerk-react";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import { useFavorites } from "../../contexts/FavoritesContext";

// Mapping of route paths to chart IDs (aligned with Dashboard.js chartConfig)
const routeToChartId = {
  "/btc-20-ext": "bitcoin-20-ext",
  "/bitcoin": "bitcoin-price",
  "/total": "total-market-cap",
  "/total-difference": "total-difference",
  "/bitcoin-fees": "bitcoin-fees",
  "/bitcoin-dominance": "bitcoin-dominance",
  "/bitcoin-roi": "bitcoin-roi",
  "/running-roi": "running-roi",
  "/historical-volatility": "historical-volatility",
  "/monthly-returns": "monthly-returns",
  "/monthly-average-roi": "monthly-average-roi",
  "/btc-add-balance": "bitcoin-address-balances",
  "/ethereum": "ethereum-price",
  "/puell-multiple": "puell-multiple",
  "/risk": "bitcoin-risk",
  "/risk-eth": "ethereum-risk",
  "/pi-cycle": "pi-cycle-top",
  "/fear-and-greed": "fear-and-greed",
  "/fear-and-greed-3d": "fear-and-greed-3d",
  "/logarithmic-regression": "logarithmic-regression",
  "/risk-color": "bitcoin-risk-color",
  "/risk-bands": "risk-bands",
  "/altcoin-price": "altcoin-price",
  "/altcoin-risk": "altcoin-risk",
  "/market-cycles": "market-cycles",
  "/fear-and-greed-chart": "fear-and-greed-chart",
  "/fear-and-greed-binary": "fear-and-greed-binary",
  "/us-inflation": "us-inflation",
  "/us-unemployment": "us-unemployment",
  "/us-interest": "us-interest",
  "/us-combined-macro": "us-combined-macro",
  "/us-initial-claims": "us-initial-claims",
  // "/tx-combined": "tx-combined",
  "/tx-mvrv": "tx-mvrv",
  "/on-chain-historical-risk": "on-chain-historical-risk",
  "/altcoin-season-index": "altcoin-season-index",
  "/fred/fed-funds-rate": "fred-fed-funds-rate",
  "/fred/sp500": "fred-sp500",
  "/fred/recession-indicator": "fred-recession-indicator",
  "/fred/cpi": "fred-cpi",
  "/fred/unemployment-rate": "fred-unemployment-rate",
  "/fred/10-year-treasury": "fred-10-year-treasury",
  "/fred/10y-2y-spread": "fred-10y-2y-spread",
  "/fred/5y-inflation-expectation": "fred-5y-inflation-expectation",
  "/fred/euro-dollar": "fred-euro-dollar",
  "/fred/crude-oil": "fred-crude-oil",
  "/fred/producer-price": "fred-producer-price",
  "/fred/nonfarm-payrolls": "fred-nonfarm-payrolls",
  "/fred/gdp": "fred-gdp",
  "/fred/gdp-growth": "fred-gdp-growth",
  "/fred/m1-money-supply": "fred-m1-money-supply",
  "/fred/m2-money-supply": "fred-m2-money-supply",
  "/fred/consumer-sentiment": "fred-consumer-sentiment",
  "/fred/vix": "fred-vix",
  "/fred/ted-spread": "fred-ted-spread",
  "/fred/yen-dollar": "fred-yen-dollar",
  "/fred/pound-dollar": "fred-pound-dollar",
  "/fred/cad-dollar": "fred-cad-dollar",
  "/fred/chicago-fed-index": "fred-chicago-fed-index",
  "/fred/economic-policy-uncertainty": "fred-economic-policy-uncertainty",
  "/fred/housing-starts": "fred-housing-starts",
  "/fred/case-shiller": "fred-case-shiller",
  "/fred/nikkei-225": "fred-nikkei-225",
  "/fred/german-bond-yield": "fred-german-bond-yield",
  "/workbench": "workbench",
};

const Topbar = ({ setIsSidebar, isSidebar, isDashboardTopbar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sidebarWidth = isSidebar ? 270 : 0;
  const { user } = useUser();
  const { signOut } = useClerk();
  const [anchorEl, setAnchorEl] = useState(null);
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart, error, clearError } = useFavorites();

  const currentChartId = routeToChartId[location.pathname];
  const isChartPage = !!currentChartId;
  const isFavorite = isChartPage && favoriteCharts.includes(currentChartId);

  const handleToggleFavorite = () => {
    if (!currentChartId) return;
    if (isFavorite) {
      removeFavoriteChart(currentChartId);
    } else {
      addFavoriteChart(currentChartId);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    handleMenuClose();
  };

  const handleSnackbarClose = () => {
    clearError(); // Clear error state when Snackbar closes
  };

  const userPlan = "Free"; // Replace with actual plan data later

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
        return { title: "Dashboard", subtitle: "All charts" };
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
        return { title: "Price v Risk Bands", subtitle: isMobile ? "Colorized Price v Risk" : "Colorized BTC price based on the given risk level" };
      case "/risk-bands":
        return { title: "Time in Risk Bands", subtitle: isMobile ? "" : "See how long an asset spends in different risk bands" };
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
      case "/btc-20-ext":
        return { title: "Bitcoin Bubble Indicator", subtitle: isMobile ? "20 Week Ext." : "Bubble Indicator Showing the Extension From the 20 Week Moving Average" };
      case "/monthly-average-roi":
        return { title: "Monthly Average ROI", subtitle: isMobile ? "Monthly ROI" : "Monthly Averaged ROI Over Selected Timeframes" };
      case "/monthly-returns":
        return { title: "Bitcoin Monthly Returns", subtitle: isMobile ? "Monthly Returns" : "The Monthly Returns for Bitcoin" };
      case "/running-roi":
        return { title: "Running ROI", subtitle: isMobile ? "Running ROI v Price" : "The Running ROI plotted Against Price" };
      // case "/btc-tx-count":
      //   return { title: "Bitcoin Transaction Count", subtitle: isMobile ? "Transaction Count" : "Daily Transaction Count for Bitcoin" };
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
      // case "/tx-combined":
      //   return { title: "US Macro and BTC Tx Count", subtitle: "Macro and On-Chain Data" };
      case "/puell-multiple":
        return { title: "Puell Multiple", subtitle: isMobile ? "Miner Revenue" : "Current Mined BTC Value to the 365 day Moving Average" };
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
        return { title: "Workbench (beta)", subtitle: isMobile ? "Create your own indicator" : "Create your own indicator from a selection of data" };
      case "/on-chain-historical-risk":
        return { title: "OnChain Risk", subtitle: isMobile ? "Historical Risk" : "Historical Risk Levels of OnChain Indicators" };
      case "/market-overview":
        return { title: "General Market Conditions", subtitle: isMobile ? "Overview" : "Select features of the current market conditions" };
      case "/btc-add-balance":
        return { title: "BTC Account Balance", subtitle: isMobile ? "Discrete BTC Balances" : "Balances of Bitcoin in individual or grouped addresses" };
      case "/total-difference":
        return { title: "Total Cap to Fair Value", subtitle: isMobile ? "Total Cap to Fair Value" : "Total Market Cap to Fair Value Difference" };
      case "/historical-volatility":
        return { title: "Volatility", subtitle: isMobile ? "Historical Volatility" : "Historical Volatility to Predict Changes of Momentum" };
      case "/altcoin-season-index":
        return { title: "Altcoin Season Index", subtitle: isMobile ? "Crypto Seasonality" : "Is it closer to Altcoin Season or Bitcoin Season?" };
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
      <Box display="flex" alignItems="center" flexDirection="column" position="relative">
        <Snackbar
          open={!!error}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
        >
          <Alert
            severity="error"
            action={
              error.includes('Max 1 chart') && (
                <Button
                  color="inherit"
                  size="small"
                  component={Link}
                  to="/subscription"
                >
                  Upgrade Plan
                </Button>
              )
            }
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
        <Box display="flex" alignItems="center">
          {isChartPage && (
            <IconButton
              onClick={handleToggleFavorite}
              aria-label="favorite"
              sx={{ color: isFavorite ? colors.greenAccent[500] : colors.grey[100] }}
            >
              {isFavorite ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          )}
          <IconButton onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
          {user && (
            <Box display="flex" alignItems="center">
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  sx={{
                    bgcolor: colors.greenAccent[500],
                    width: 32,
                    height: 32,
                    fontSize: "1rem",
                  }}
                >
                  {user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                PaperProps={{
                  sx: {
                    backgroundColor: colors.primary[800],
                    color: colors.grey[100],
                    minWidth: "200px",
                  },
                }}
              >
                <Box
                  sx={{
                    padding: "8px 16px",
                    borderBottom: `1px solid ${colors.grey[700]}`,
                    backgroundColor: colors.primary[900],
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {user.emailAddresses[0]?.emailAddress}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.grey[400] }}>
                    Plan: {userPlan}
                  </Typography>
                </Box>
                <MenuItem
                  onClick={() => {
                    navigate("/profile");
                    handleMenuClose();
                  }}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[700] },
                  }}
                >
                  <PersonOutlinedIcon sx={{ mr: 1 }} />
                  View Profile
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/subscription");
                    handleMenuClose();
                  }}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[700] },
                  }}
                >
                  <PaymentOutlinedIcon sx={{ mr: 1 }} />
                  Manage Subscription
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/settings");
                    handleMenuClose();
                  }}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[700] },
                  }}
                >
                  <SettingsOutlinedIcon sx={{ mr: 1 }} />
                  Settings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/change-password");
                    handleMenuClose();
                  }}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[700] },
                  }}
                >
                  <LockOutlinedIcon sx={{ mr: 1 }} />
                  Change Password
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    "&:hover": { backgroundColor: colors.primary[700] },
                  }}
                >
                  <LogoutOutlinedIcon sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Topbar;