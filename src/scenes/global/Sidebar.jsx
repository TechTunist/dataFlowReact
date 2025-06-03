import { useState, useMemo } from "react";
import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import WarningOutlinedIcon from "@mui/icons-material/WarningOutlined";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TimelineIcon from "@mui/icons-material/Timeline";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PaletteIcon from "@mui/icons-material/Palette";
import TimerIcon from "@mui/icons-material/Timer";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import RepeatIcon from "@mui/icons-material/Repeat";
import BalanceIcon from "@mui/icons-material/Balance";
import AddShoppingCart from "@mui/icons-material/AddShoppingCart";
import FitbitIcon from "@mui/icons-material/Fitbit";
import CategoryIcon from "@mui/icons-material/Category";
import XIcon from "@mui/icons-material/X";
import EmailIcon from "@mui/icons-material/Email";
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import useIsMobile from "../../hooks/useIsMobile";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CandlestickChart from '@mui/icons-material/CandlestickChart';
import WarningIcon from '@mui/icons-material/Warning';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import OilBarrelIcon from '@mui/icons-material/OilBarrel';
import FactoryIcon from '@mui/icons-material/Factory';
import WorkIcon from '@mui/icons-material/Work';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import MoodIcon from '@mui/icons-material/Mood';
import ReportIcon from '@mui/icons-material/Report';
import ConstructionIcon from '@mui/icons-material/Construction';
import HomeIcon from '@mui/icons-material/Home';

const Item = ({ title, to, icon, selected, setSelected, isNested, onClick, isProminent = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: isProminent ? colors.greenAccent[500] : colors.grey[100],
        padding: '5px 0px 5px 0px', // Reduced left/right padding, increased top/bottom for breathing room
      }}
      onClick={() => {
        setSelected(title);
        if (onClick) onClick();
      }}
      icon={icon}
    >
      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <Typography
          variant={isNested ? "body1" : "h6"}
          sx={{
            fontWeight: isProminent ? 'bold' : 'normal',
            position: 'relative',
            // Enable text wrapping
            whiteSpace: 'normal', // Allow text to wrap
            wordBreak: 'break-word', // Break long words if necessary
            maxWidth: 'calc(100% - 40px)', // Account for icon and padding (270px sidebar - 35px left padding - 20px right padding - ~40px for icon)
            overflow: 'hidden', // Prevent overflow
            '&:after': isProminent
              ? {
                  content: '""',
                  position: 'absolute',
                  width: '50%',
                  height: '2px',
                  bottom: '-2px',
                  left: 0,
                  backgroundColor: colors.greenAccent[500],
                }
              : {},
          }}
        >
          {title}
        </Typography>
      </Link>
    </MenuItem>
  );
};

const Sidebar = ({ isSidebar, setIsSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selected, setSelected] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const itemsData = [
    { title: "Dashboard", to: "/dashboard", icon: <DashboardIcon />, category: null },
    { title: "Overview", to: "/market-overview", icon: <DashboardIcon />, category: null },
    { title: "Bitcoin Chart", to: "/bitcoin", category: "Bitcoin", icon: <ShowChartIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Total Market Cap", to: "/total", category: "Indicators", icon: <ShowChartIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Bitcoin Dominance", to: "/bitcoin-dominance", category: "Indicators", icon: <ShowChartIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Bitcoin Risk Metric", to: "/risk", category: "Bitcoin", icon: <AssessmentIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "BTC Transactions to MVRV", to: "/tx-mvrv", category: "On Chain Data", icon: <AssessmentIcon />, categoryIcon: <SwapHorizIcon /> },
    { title: "Ethereum Chart", to: "/ethereum", category: "Ethereum", icon: <ShowChartIcon />, categoryIcon: <FitbitIcon /> },
    { title: "Ethereum Risk Metric", to: "/risk-eth", category: "Ethereum", icon: <AssessmentIcon />, categoryIcon: <FitbitIcon /> },
    { title: "PiCycleTop Indicator", to: "/pi-cycle", category: "Indicators", icon: <TimelineIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Fear And Greed Indicator", to: "/fear-and-greed", category: "Indicators", icon: <NetworkCheckIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Logarithmic Regression", to: "/logarithmic-regression", category: "Indicators", icon: <TrendingUpIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Risk Colour Chart", to: "/risk-color", category: "Bitcoin", icon: <PaletteIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Time in Risk Bands", to: "/risk-bands", category: "Bitcoin", icon: <TimerIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Transaction Count", to: "/btc-tx-count", category: "On Chain Data", icon: <SwapHorizIcon />, categoryIcon: <SwapHorizIcon /> },
    { title: "Bitcoin On-chain Risk", to: "/on-chain-historical-risk", category: "On Chain Data", icon: <SwapHorizIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Bitcoin Address balance", to: "/btc-add-balance", category: "On Chain Data", icon: <AccountBalanceIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Altcoin Chart", to: "/altcoin-price", category: "Altcoins", icon: <ShowChartIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Altcoin Risk Metric", to: "/altcoin-risk", category: "Altcoins", icon: <AssessmentIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "US Initial Claims", to: "/us-initial-claims", category: "MacroEconomics", icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Market Cycles", to: "/market-cycles", category: "Bitcoin", icon: <RepeatIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin ROI", to: "/bitcoin-roi", category: "Bitcoin", icon: <AttachMoneyIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Fear and Greed Chart", to: "/fear-and-greed-chart", category: "Indicators", icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Inflation Chart", to: "/us-inflation", category: "MacroEconomics", icon: <AddShoppingCart />, categoryIcon: <CategoryIcon /> },
    { title: "US Unemployment Chart", to: "/us-unemployment", category: "MacroEconomics", icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Interest Rate Chart", to: "/us-interest", category: "MacroEconomics", icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Macro Information Chart", to: "/us-combined-macro", category: "MacroEconomics", icon: <MultilineChartIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Macro and BTC Tx Count", to: "/tx-combined", category: "MacroEconomics", icon: <BarChartIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Federal Funds Rate", to: "/fred/fed-funds-rate", category: "MacroEconomics", icon: <AccountBalanceIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "S&P 500 Index", to: "/fred/sp500", category: "MacroEconomics", icon: <CandlestickChart />, categoryIcon: <ShowChartIcon /> },
    { title: "US Recession Indicator", to: "/fred/recession-indicator", category: "MacroEconomics", icon: <WarningIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Consumer Price Index (CPI)", to: "/fred/cpi", category: "MacroEconomics", icon: <AddShoppingCart />, categoryIcon: <ShowChartIcon /> },
    { title: "Unemployment Rate", to: "/fred/unemployment-rate", category: "MacroEconomics", icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "10-Year Treasury Yield", to: "/fred/10-year-treasury", category: "MacroEconomics", icon: <AccountBalanceIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "10Y-2Y Treasury Spread", to: "/fred/10y-2y-spread", category: "MacroEconomics", icon: <AccountBalanceIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "5-Year Inflation Expectation", to: "/fred/5y-inflation-expectation", category: "MacroEconomics", icon: <TrendingUpIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Euro to USD Exchange Rate", to: "/fred/euro-dollar", category: "MacroEconomics", icon: <CurrencyExchangeIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "WTI Crude Oil Price", to: "/fred/crude-oil", category: "MacroEconomics", icon: <OilBarrelIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Producer Price Index", to: "/fred/producer-price", category: "MacroEconomics", icon: <FactoryIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Nonfarm Payrolls", to: "/fred/nonfarm-payrolls", category: "MacroEconomics", icon: <WorkIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Real GDP", to: "/fred/gdp", category: "MacroEconomics", icon: <ApartmentIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Real GDP Growth Rate", to: "/fred/gdp-growth", category: "MacroEconomics", icon: <TrendingUpIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "M1 Money Supply", to: "/fred/m1-money-supply", category: "MacroEconomics", icon: <MonetizationOnIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "M2 Money Supply", to: "/fred/m2-money-supply", category: "MacroEconomics", icon: <MonetizationOnIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Consumer Sentiment", to: "/fred/consumer-sentiment", category: "MacroEconomics", icon: <MoodIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "VIX Volatility Index", to: "/fred/vix", category: "MacroEconomics", icon: <ReportIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "TED Spread", to: "/fred/ted-spread", category: "MacroEconomics", icon: <AccountBalanceIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Yen to USD Exchange Rate", to: "/fred/yen-dollar", category: "MacroEconomics", icon: <CurrencyExchangeIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Pound to USD Exchange Rate", to: "/fred/pound-dollar", category: "MacroEconomics", icon: <CurrencyExchangeIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "CAD to USD Exchange Rate", to: "/fred/cad-dollar", category: "MacroEconomics", icon: <CurrencyExchangeIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Chicago Fed Activity Index", to: "/fred/chicago-fed-index", category: "MacroEconomics", icon: <ApartmentIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Economic Policy Uncertainty", to: "/fred/economic-policy-uncertainty", category: "MacroEconomics", icon: <WarningIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Housing Starts", to: "/fred/housing-starts", category: "MacroEconomics", icon: <ConstructionIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Case-Shiller Home Price Index", to: "/fred/case-shiller", category: "MacroEconomics", icon: <HomeIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Nikkei 225 Index", to: "/fred/nikkei-225", category: "MacroEconomics", icon: <CandlestickChart />, categoryIcon: <ShowChartIcon /> },
    { title: "German 10-Year Bond Yield", to: "/fred/german-bond-yield", category: "MacroEconomics", icon: <AccountBalanceIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Workbench", to: "/workbench", category: "Workbench", icon: <MultilineChartIcon />, categoryIcon: <ShowChartIcon /> },
  ];

  const filteredItems = useMemo(() =>
    itemsData.filter(item =>
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      item.title !== "Dashboard" &&
      item.title !== "Overview"
    ), [searchQuery]
  );

  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleClearSearch = () => setSearchQuery("");
  const handleMenuClick = () => isMobile && setIsSidebar(false);

  const itemsByCategory = useMemo(() =>
    itemsData.reduce((acc, item) => {
      const { category } = item;
      if (category) {
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
      }
      return acc;
    }, {})
  );

  const renderMenuItem = (item, index, isNested = false, isProminent = false) => (
    <Item
      key={item.title}
      title={item.title}
      to={item.to}
      icon={item.icon}
      selected={selected}
      setSelected={setSelected}
      isNested={isNested}
      isProminent={isProminent}
      onClick={handleMenuClick}
    />
  );

  const renderSubMenus = () => (
    Object.entries(itemsByCategory).map(([category, items]) => (
      <SubMenu
        key={category}
        title={category}
        icon={items[0].categoryIcon || <BarChartOutlinedIcon />}
        style={{ color: colors.grey[100] }}
      >
        {items.map((item, index) => renderMenuItem(item, index, true))}
      </SubMenu>
    ))
  );

  return (
    <>
      {isMobile && isSidebar && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1099,
          }}
          onClick={() => setIsSidebar(false)}
        />
      )}

      <Box
        className="sidebar"
        sx={{
          "& .pro-sidebar-inner": {
            background: `${colors.primary[400]} !important`,
            borderRight: `1px solid ${colors.greenAccent[500]}`,
          },
          "& .pro-icon-wrapper": { backgroundColor: "transparent !important" },
          "& .pro-inner-item": {
            padding: "5px 35px 5px 5px !important",
            backgroundColor: "transparent !important",
          },
          "& .pro-inner-item:hover": { color: "#868dfb !important" },
          "& .pro-menu > ul > .pro-sub-menu > .pro-inner-list-item": {
            backgroundColor: "transparent !important",
          },
          "& .pro-menu > ul > .pro-sub-menu > .pro-inner-list-item:hover": {
            color: "#fff !important",
            backgroundColor: "transparent !important",
          },
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: 1100,
          height: "100vh",
          width: isMobile ? (isSidebar ? "270px" : "0") : "270px",
          overflowX: isMobile && !isSidebar ? "hidden" : "auto",
          overflowY: "auto",
          transition: "width 0.3s ease",
          visibility: isMobile && !isSidebar ? "hidden" : "visible",
        }}
      >
        <ProSidebar>
          <Menu iconShape="square">
            <Box display="flex" justifyContent="flex-end" alignItems="center" p={1}>
              {isMobile && (
                <IconButton onClick={() => setIsSidebar(false)} sx={{ color: colors.grey[100] }}>
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
            <Box mb="5px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img alt="main-logo" width="100px" height="100px" src={`../../assets/cryptological-original-logo.png`} />
              </Box>
              <Box display="flex" justifyContent="center" alignItems="center">
                <img alt="main-logo" width="200px" height="50px" src={`../../assets/cryptological-title-resized.png`} />
              </Box>
            </Box>

            <Box display="flex" backgroundColor={colors.primary[400]} borderRadius="3px">
              <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" value={searchQuery} onChange={handleSearchChange} />
              {searchQuery && <IconButton onClick={handleClearSearch} sx={{ p: 1 }}><CloseIcon /></IconButton>}
              <IconButton type="button" sx={{ p: 1 }}><SearchIcon /></IconButton>
            </Box>

            {renderMenuItem(itemsData.find(item => item.title === "Dashboard"), 0, false, true)}
            {renderMenuItem(itemsData.find(item => item.title === "Overview"), 1, false, true)}

            {searchQuery ? filteredItems.map((item, index) => renderMenuItem(item, index)) : renderSubMenus()}
          </Menu>
          <Box sx={{ padding: theme.spacing(2) }}>
            <Box display="flex" justifyContent="center" alignItems="center">
              <Typography variant="h5" color={colors.greenAccent[500]}>
                Contact me here:
              </Typography>
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
              <IconButton href="https://twitter.com/CryptoLogical__" target="_blank" sx={{ color: colors.grey[100], mr: 1 }}>
                <XIcon />
              </IconButton>
              <IconButton href="mailto:thecryptological@gmail.com" sx={{ color: colors.grey[100] }}>
                <EmailIcon />
              </IconButton>
            </Box>
          </Box>
        </ProSidebar>
      </Box>
    </>
  );
};

export default Sidebar;