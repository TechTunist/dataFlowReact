import { useState } from "react";
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
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FitbitIcon from "@mui/icons-material/Fitbit";
import CategoryIcon from "@mui/icons-material/Category";
import XIcon from "@mui/icons-material/X";
import EmailIcon from "@mui/icons-material/Email";
import BarChartIcon from '@mui/icons-material/BarChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import useIsMobile from "../../hooks/useIsMobile";


const Item = ({ title, to, icon, selected, setSelected, isNested, onClick }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{ color: colors.grey[100] }}
      onClick={() => {
        setSelected(title);
        if (onClick) onClick();
      }}
      icon={icon}
    >
      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <Typography variant={isNested ? "body1" : "h6"}>{title}</Typography>
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
    { title: "Dashboard", to: "/", icon: <DashboardIcon />, category: null },
    { title: "Bitcoin Chart", to: "/bitcoin", category: "Bitcoin", icon: <ShowChartIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Total Market Cap", to: "/total", category: "Indicators", icon: <ShowChartIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Bitcoin Dominance", to: "/bitcoin-dominance", category: "Indicators", icon: <ShowChartIcon />, categoryIcon: <ShowChartIcon /> },
    { title: "Bitcoin Risk Metric", to: "/risk", category: "Bitcoin", icon: <AssessmentIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "BTC Transactions to MVRV", to: "/tx-mvrv", category: "Bitcoin", icon: <AssessmentIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Ethereum Chart", to: "/ethereum", category: "Ethereum", icon: <ShowChartIcon />, categoryIcon: <FitbitIcon /> },
    { title: "Ethereum Risk Metric", to: "/risk-eth", category: "Ethereum", icon: <AssessmentIcon />, categoryIcon: <FitbitIcon /> },
    { title: "PiCycleTop Indicator", to: "/pi-cycle", category: "Indicators", icon: <TimelineIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Fear And Greed Indicator", to: "/fear-and-greed", category: "Indicators", icon: <NetworkCheckIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Logarithmic Regression", to: "/logarithmic-regression", category: "Indicators", icon: <TrendingUpIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Risk Colour Chart", to: "/risk-color", category: "Bitcoin", icon: <PaletteIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Time in Risk Bands", to: "/risk-bands", category: "Bitcoin", icon: <TimerIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Transaction Count", to: "/btc-tx-count", category: "Bitcoin", icon: <SwapHorizIcon />, categoryIcon: <SwapHorizIcon /> },
    { title: "Altcoin Chart", to: "/altcoin-price", category: "Altcoins", icon: <ShowChartIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Altcoin Risk Metric", to: "/altcoin-risk", category: "Altcoins", icon: <AssessmentIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "US Initial Claims", to: "/us-initial-claims", category: "MacroEconomics", icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Market Cycles", to: "/market-cycles", category: "Bitcoin", icon: <RepeatIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin ROI", to: "/bitcoin-roi", category: "Bitcoin", icon: <AttachMoneyIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Fear and Greed Chart", to: "/fear-and-greed-chart", category: "Indicators", icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Inflation Chart", to: "/us-inflation", category: "MacroEconomics", icon: <AddShoppingCartIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Unemployment Chart", to: "/us-unemployment", category: "MacroEconomics", icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Interest Rate Chart", to: "/us-interest", category: "MacroEconomics", icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Macro Information Chart", to: "/us-combined-macro", category: "MacroEconomics", icon: <MultilineChartIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Macro and BTC Tx Count", to: "/tx-combined", category: "MacroEconomics", icon: <BarChartIcon />, categoryIcon: <CategoryIcon /> },
  ];

  const filteredItems = itemsData.filter(item =>
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    item.title !== "Dashboard"
  );

  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleClearSearch = () => setSearchQuery("");
  const handleMenuClick = () => isMobile && setIsSidebar(false);

  const renderMenuItem = (item, index, isNested = false) => (
    <Item
      key={index}
      title={item.title}
      to={item.to}
      icon={item.icon}
      selected={selected}
      setSelected={setSelected}
      isNested={isNested}
      onClick={handleMenuClick}
    />
  );

  const itemsByCategory = itemsData.reduce((acc, item) => {
    const { category } = item;
    if (category) {
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
    }
    return acc;
  }, {});

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
      {/* Overlay for clicking outside to close */}
      {isMobile && isSidebar && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1099, // Above Topbar (1000), below sidebar (1100)
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
            padding: "5px 35px 5px 20px !important",
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
          zIndex: 1100, // Above charts (1) and Topbar (1000)
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

            {renderMenuItem(itemsData.find(item => item.title === "Dashboard"), 0)}

            {searchQuery ? filteredItems.map(renderMenuItem) : renderSubMenus()}
          </Menu>
          <Box sx={{ padding: theme.spacing(2) }}>
            <Box display="flex" justifyContent="center" alignItems="center">
              <img alt="main-logo" width="100px" height="100px" src={`../../assets/bc1qnekceuntjc2ga3vm8r85l842umzh35xs6yxyvx.JPG`} style={{ cursor: "pointer", borderRadius: "10%", marginTop: "50px" }} />
            </Box>
            <Box textAlign="center" padding={theme.spacing(1)}>
              <Typography variant="h3" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 20px 0" }}>BTC Donations</Typography>
              <Typography variant="h5" color={colors.greenAccent[500]}>
                I'm a solo developer trying to create a free useful tool. If you found any value from this site, please consider donating some BTC by using the QR code. Thanks
              </Typography>
            </Box>
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