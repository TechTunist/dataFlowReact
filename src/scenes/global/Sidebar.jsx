import { useMemo, useState } from "react"; // Removed useState
import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme, Button } from "@mui/material";
import { Link, useLocation } from "react-router-dom"; // Added useLocation
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import RepeatIcon from "@mui/icons-material/Repeat";
import AddShoppingCart from "@mui/icons-material/AddShoppingCart";
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
import { SiEthereum } from "react-icons/si";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import LinkIcon from "@mui/icons-material/Link";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import PieChartIcon from "@mui/icons-material/PieChart";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FunctionsIcon from "@mui/icons-material/Functions";
import PaletteIcon from "@mui/icons-material/Palette";
import LayersIcon from "@mui/icons-material/Layers";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TableChartIcon from "@mui/icons-material/TableChart";
import CalculateIcon from "@mui/icons-material/Calculate";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import WorkOffIcon from "@mui/icons-material/WorkOff";
import PercentIcon from "@mui/icons-material/Percent";
import MultilineChartIcon from "@mui/icons-material/MultilineChart";

const Item = ({ title, to, icon, isNested, onClick, isProminent = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation(); // Added
  const isActive = useMemo(() => location.pathname === to, [location.pathname, to]); // Compute based on URL

  return (
    <MenuItem
      active={isActive}
      style={{
        color: isProminent ? colors.greenAccent[500] : colors.grey[100],
        padding: '5px 0px 5px 0px',
      }}
      onClick={onClick}
      icon={icon}
    >
      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <Typography
          variant={isNested ? "body1" : "h6"}
          sx={{
            fontWeight: isProminent ? 'bold' : 'normal',
            position: 'relative',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            maxWidth: 'calc(100% - 40px)',
            overflow: 'hidden',
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
  const location = useLocation(); // Added for buttons
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const itemsData = [
    { title: "Dashboard", to: "/dashboard", icon: <DashboardIcon />, category: null },
    { title: "Overview", to: "/market-overview", icon: <DashboardIcon />, category: null },
    { title: "Charts", to: "/charts", icon: <BarChartIcon />, category: null },
    { title: "Bitcoin Chart", to: "/bitcoin", category: "Bitcoin", icon: <CurrencyBitcoinIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Address Balance", to: "/btc-add-balance", category: "On Chain Data", icon: <AccountBalanceIcon />, categoryIcon: <LinkIcon /> },
    { title: "Market Cycles", to: "/market-cycles", category: "Bitcoin", icon: <RepeatIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin ROI", to: "/bitcoin-roi", category: "Bitcoin", icon: <TrendingUpIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Monthly Returns", to: "/monthly-returns", category: "Bitcoin", icon: <TableChartIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Bubble Indicator", to: "/btc-20-ext", category: "Bitcoin", icon: <WarningAmberIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Running ROI", to: "/running-roi", category: "Indicators", icon: <ShowChartIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Monthly Average ROI", to: "/monthly-average-roi", category: "Indicators", icon: <CalculateIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Altcoin Chart", to: "/altcoin-price", category: "Altcoins", icon: <MonetizationOnIcon />, categoryIcon: <MonetizationOnIcon /> },
    { title: "Total Market Cap", to: "/total", category: "Indicators", icon: <MonetizationOnIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Total Cap to Fair Value", to: "/total-difference", category: "Indicators", icon: <CompareArrowsIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Altcoin Season Index", to: "/altcoin-season-index", category: "Altcoins", icon: <CompareArrowsIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Bitcoin Dominance", to: "/bitcoin-dominance", category: "Bitcoin", icon: <PieChartIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "PiCycleTop Indicator", to: "/pi-cycle", category: "Indicators", icon: <TimelineIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Fear And Greed Indicator", to: "/fear-and-greed", category: "Indicators", icon: <MoodIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Historical Volatility", to: "/historical-volatility", category: "Indicators", icon: <TimelineIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Bitcoin Logarithmic Regression", to: "/logarithmic-regression", category: "Bitcoin", icon: <FunctionsIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Fear and Greed Chart", to: "/fear-and-greed-chart", category: "Indicators", icon: <SentimentSatisfiedIcon />, categoryIcon: <AnalyticsIcon /> },
    { title: "Bitcoin Risk Metric", to: "/risk", category: "Risk", icon: <WarningIcon />, categoryIcon: <WarningIcon /> },
    { title: "Ethereum Risk Metric", to: "/risk-eth", category: "Risk", icon: <WarningIcon />, categoryIcon: <WarningIcon /> },
    { title: "Altcoin Risk Metric", to: "/altcoin-risk", category: "Risk", icon: <WarningAmberIcon />, categoryIcon: <WarningIcon /> },
    { title: "Risk Colour Chart", to: "/risk-color", category: "Risk", icon: <PaletteIcon />, categoryIcon: <WarningIcon /> },
    { title: "Time in Risk Bands", to: "/risk-bands", category: "Risk", icon: <LayersIcon />, categoryIcon: <WarningIcon /> },
    { title: "Bitcoin On-chain Risk", to: "/on-chain-historical-risk", category: "Risk", icon: <HistoryIcon />, categoryIcon: <WarningIcon /> },
    { title: "BTC Transactions to MVRV", to: "/tx-mvrv", category: "On Chain Data", icon: <AssessmentIcon />, categoryIcon: <LinkIcon /> },
    { title: "Puell Multiple", to: "/puell-multiple", category: "On Chain Data", icon: <AssessmentIcon />, categoryIcon: <LinkIcon /> },
    { title: "US Inflation Chart", to: "/us-inflation", category: "Macro Basic Charts", icon: <PriceChangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "US Interest Rate Chart", to: "/us-interest", category: "Macro Basic Charts", icon: <PercentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "US Initial Claims", to: "/us-initial-claims", category: "Macro Basic Charts", icon: <AssignmentIcon />, categoryIcon: <AssessmentIcon /> },
    // { title: "US Macro Information Chart", to: "/us-combined-macro", category: "Macro Basic Charts", icon: <MultilineChartIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Federal Funds Rate", to: "/fred/fed-funds-rate", category: "Macro Basic Charts", icon: <PercentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "S&P 500 Return On Investment", to: "/sp500-roi", category: "Macro Indicators", icon: <PercentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "S&P 500 Index", to: "/fred/sp500", category: "Macro Basic Charts", icon: <CandlestickChart />, categoryIcon: <AssessmentIcon /> },
    { title: "US Recession Indicator", to: "/fred/recession-indicator", category: "Macro Basic Charts", icon: <WarningIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Consumer Price Index (CPI)", to: "/fred/cpi", category: "Macro Basic Charts", icon: <PriceChangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Unemployment Rate", to: "/fred/unemployment-rate", category: "Macro Basic Charts", icon: <WorkOffIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "10-Year Treasury Yield", to: "/fred/10-year-treasury", category: "Macro Basic Charts", icon: <PercentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "10Y-2Y Treasury Spread", to: "/fred/10y-2y-spread", category: "Macro Basic Charts", icon: <CompareArrowsIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "5-Year Inflation Expectation", to: "/fred/5y-inflation-expectation", category: "Macro Basic Charts", icon: <PriceChangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Euro to USD Exchange Rate", to: "/fred/euro-dollar", category: "Macro Basic Charts", icon: <CurrencyExchangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "WTI Crude Oil Price", to: "/fred/crude-oil", category: "Macro Basic Charts", icon: <OilBarrelIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Producer Price Index", to: "/fred/producer-price", category: "Macro Basic Charts", icon: <FactoryIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Nonfarm Payrolls", to: "/fred/nonfarm-payrolls", category: "Macro Basic Charts", icon: <WorkIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Real GDP", to: "/fred/gdp", category: "Macro Basic Charts", icon: <AssessmentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Real GDP Growth Rate", to: "/fred/gdp-growth", category: "Macro Basic Charts", icon: <TrendingUpIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "M1 Money Supply", to: "/fred/m1-money-supply", category: "Macro Basic Charts", icon: <MonetizationOnIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "M2 Money Supply", to: "/fred/m2-money-supply", category: "Macro Basic Charts", icon: <MonetizationOnIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Consumer Sentiment", to: "/fred/consumer-sentiment", category: "Macro Basic Charts", icon: <MoodIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "VIX Volatility Index", to: "/fred/vix", category: "Macro Basic Charts", icon: <ReportIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "TED Spread", to: "/fred/ted-spread", category: "Macro Basic Charts", icon: <CompareArrowsIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Yen to USD Exchange Rate", to: "/fred/yen-dollar", category: "Macro Basic Charts", icon: <CurrencyExchangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Pound to USD Exchange Rate", to: "/fred/pound-dollar", category: "Macro Basic Charts", icon: <CurrencyExchangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "CAD to USD Exchange Rate", to: "/fred/cad-dollar", category: "Macro Basic Charts", icon: <CurrencyExchangeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Chicago Fed Activity Index", to: "/fred/chicago-fed-index", category: "Macro Basic Charts", icon: <AssessmentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Economic Policy Uncertainty", to: "/fred/economic-policy-uncertainty", category: "Macro Basic Charts", icon: <WarningIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Housing Starts", to: "/fred/housing-starts", category: "Macro Basic Charts", icon: <ConstructionIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Case-Shiller Home Price Index", to: "/fred/case-shiller", category: "Macro Basic Charts", icon: <HomeIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Nikkei 225 Index", to: "/fred/nikkei-225", category: "Macro Basic Charts", icon: <CandlestickChart />, categoryIcon: <AssessmentIcon /> },
    { title: "German 10-Year Bond Yield", to: "/fred/german-bond-yield", category: "Macro Basic Charts", icon: <PercentIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Sahm Recession Indicator", to: "/fred/sahm-recession-indicator", category: "Macro Indicators", icon: <MonetizationOnIcon />, categoryIcon: <AssessmentIcon /> },
    { title: "Workbench (beta)", to: "/workbench", category: "Workbench", icon: <MultilineChartIcon />, categoryIcon: <ShowChartIcon /> },
  ];

  const filteredItems = useMemo(() =>
    itemsData.filter(item =>
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      !["Dashboard", "Overview", "Charts"].includes(item.title)
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
  , [itemsData]);

  const renderMenuItem = (item, index, isNested = false, isProminent = false) => (
    <Item
      key={item.title}
      title={item.title}
      to={item.to}
      icon={item.icon}
      isNested={isNested}
      isProminent={isProminent}
      onClick={handleMenuClick} // Only handle mobile close, no setSelected
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
            {/* Buttons Section - Now uses location for isActive */}
            <Box display="flex" justifyContent="space-between" px={2} mb={2}>
              {[
                { title: "Dashboard", to: "/dashboard" },
                { title: "Overview", to: "/market-overview" },
                { title: "Charts", to: "/charts" },
              ].map((button) => {
                let isActive;
                if (button.title === "Dashboard") {
                  isActive = location.pathname === "/dashboard";
                } else if (button.title === "Overview") {
                  isActive = location.pathname === "/market-overview";
                } else { // Charts
                  isActive = !["/dashboard", "/market-overview"].includes(location.pathname);
                }

                return (
                  <Button
                    key={button.title}
                    component={Link}
                    to={button.to}
                    onClick={handleMenuClick} // Only mobile close, no setSelected
                    sx={{
                      flex: 1,
                      mx: 0.5,
                      color: colors.grey[100],
                      backgroundColor: isActive ? colors.greenAccent[700] : 'transparent',
                      border: `2px solid ${isActive ? colors.greenAccent[500] : 'transparent'}`,
                      '&:hover': {
                        backgroundColor: colors.greenAccent[700],
                        border: `2px solid ${colors.greenAccent[500]}`,
                      },
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      padding: '6px 8px',
                    }}
                  >
                    {button.title}
                  </Button>
                );
              })}
            </Box>
            <Box display="flex" backgroundColor={colors.primary[400]} borderRadius="3px">
              <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" value={searchQuery} onChange={handleSearchChange} />
              {searchQuery && <IconButton onClick={handleClearSearch} sx={{ p: 1 }}><CloseIcon /></IconButton>}
              <IconButton type="button" sx={{ p: 1 }}><SearchIcon /></IconButton>
            </Box>
            {searchQuery ? filteredItems.map((item, index) => renderMenuItem(item, index)) : renderSubMenus()}
          </Menu>
          <Box sx={{ padding: theme.spacing(2) }}>
            <Box display="flex" justifyContent="center" alignItems="center">
              <Typography variant="h5" color={colors.greenAccent[500]}>
                Contact:
              </Typography>
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
              <IconButton href="https://twitter.com/CryptoLogical__" target="_blank" sx={{ color: colors.grey[100], mr: 1 }}>
                <XIcon />
              </IconButton>
              <IconButton href="mailto:support@cryptological.app" sx={{ color: colors.grey[100] }}>
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