import { useState, useEffect } from "react";
import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeIcon from "@mui/icons-material/Home";
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
import MultilineChartIcon from "@mui/icons-material/MultilineChart";
import RepeatIcon from "@mui/icons-material/Repeat";
import BalanceIcon from "@mui/icons-material/Balance";
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

import FitbitIcon from "@mui/icons-material/Fitbit"; // Check if this exists or find the closest match.
import CategoryIcon from "@mui/icons-material/Category";  // Generic icon for other categories.



const Item = ({ title, to, icon, selected, setSelected, isNested }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{ color: colors.grey[100] }}
      onClick={() => setSelected(title)}
      icon={icon}
    >
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Typography variant={isNested ? 'body1' : 'h6'}>{title}</Typography>
      </Link>
    </MenuItem>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selected, setSelected] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");


  const itemsData = [
    { title: "Dashboard", to: "/", icon: <DashboardIcon />, category: null },
    { title: "Bitcoin Chart", to: "/bitcoin", category: 'Bitcoin', icon: <ShowChartIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Bitcoin Risk Metric", to: "/risk", category: 'Bitcoin', icon: <AssessmentIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Ethereum Chart", to: "/ethereum", category: 'Ethereum', icon: <ShowChartIcon />, categoryIcon: <FitbitIcon /> },
    { title: "Ethereum Risk Metric", to: "/risk-eth", category: 'Ethereum', icon: <AssessmentIcon />, categoryIcon: <FitbitIcon /> },
    { title: "PiCycleTop Indicator", to: "/pi-cycle", category: 'Indicators', icon: <TimelineIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Fear And Greed Indicator", to: "/fear-and-greed", category: 'Indicators', icon: <NetworkCheckIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Logarithmic Regression", to: "/logarithmic-regression", category: 'Indicators', icon: <TrendingUpIcon />, categoryIcon: <CategoryIcon /> },
    { title: "Bitcoin Risk Colour Chart", to: "/risk-color", category: 'Bitcoin', icon: <PaletteIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Altcoin Chart", to: "/altcoin-price", category: 'Altcoins', icon: <ShowChartIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Altcoin Risk Metric", to: "/altcoin-risk", category: 'Altcoins', icon: <AssessmentIcon />, categoryIcon: <WarningOutlinedIcon /> },
    { title: "Market Cycles", to: "/market-cycles", category: 'Bitcoin', icon: <RepeatIcon />, categoryIcon: <CurrencyBitcoinIcon /> },
    { title: "Fear and Greed Chart", to: "/fear-and-greed-chart", category: 'Indicators', icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Inflation Chart", to: "/us-inflation", category: 'MacroEconomics', icon: <AddShoppingCartIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Unemployment Chart", to: "/us-unemployment", category: 'MacroEconomics', icon: <SentimentVeryDissatisfiedIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Interest Rate Chart", to: "/us-interest", category: 'MacroEconomics', icon: <BalanceIcon />, categoryIcon: <CategoryIcon /> },
    { title: "US Macro Information Chart", to: "/us-combined-macro", category: 'MacroEconomics', icon: <MultilineChartIcon />, categoryIcon: <CategoryIcon /> }, 
  ];
  

  const filteredItems = itemsData.filter(item =>
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    item.title !== "Dashboard" // Exclude the Dashboard from the filtered results
  );
  
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const renderMenuItem = (item, index, isNested = false) => (
    <Item
      key={index}
      title={item.title}
      to={item.to}
      icon={item.icon}
      selected={selected}
      setSelected={setSelected}
      isNested={isNested}
    />
  );

  // Group items by category
  const itemsByCategory = itemsData.reduce((acc, item) => {
    const { category } = item;
    if (category) {
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
    }
    return acc;
  }, {});

  // Render SubMenu for each category
  const renderSubMenus = () => (
    Object.entries(itemsByCategory).map(([category, items]) => (
      <SubMenu
        key={category}
        title={category}
        icon={items[0].categoryIcon || <BarChartOutlinedIcon />}  // Use the first item's categoryIcon or a default one
        style={{ color: colors.grey[100] }}
      >
        {items.map((item, index) => renderMenuItem(item, index, true))}
      </SubMenu>
    ))
  );

  return (
    <Box sx={{
      "& .pro-sidebar-inner": {
        background: `${colors.primary[400]} !important`,
        borderRight: `1px solid ${colors.greenAccent[500]}`
      },
      "& .pro-icon-wrapper": {
        backgroundColor: "transparent !important",
      },
      "& .pro-inner-item": {
        padding: "5px 35px 5px 20px !important",
        backgroundColor: "transparent !important",
      },
      "& .pro-inner-item:hover": {
        color: "#868dfb !important",
      },
      "& .pro-menu > ul > .pro-sub-menu > .pro-inner-list-item": {
        backgroundColor: "transparent !important",
      },
      "& .pro-menu > ul > .pro-sub-menu > .pro-inner-list-item:hover": {
        backgroundColor: "#868dfb !important",
        color: "#fff !important",
        backgroundColor: "transparent !important",
      },
    }}>
      <ProSidebar>
        <Menu iconShape="square">
          <Box mb="5px">
            {/* Main Logo and Title */}
            <Box display="flex" justifyContent="center" alignItems="center">
              <img alt="main-logo" width="100px" height="100px" src={`../../assets/cryptological-original-logo.png`}  />
            </Box>
            <Box display="flex" justifyContent="center" alignItems="center">
              <img alt="main-logo" width="200px" height="50px" src={`../../assets/cryptological-title-resized.png`}  />
            </Box>
            {/* <Box textAlign="center">
              <Typography variant="h2" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 0 0" }}>Cryptological</Typography>
              <Typography variant="h5" color={colors.greenAccent[500]}>Quantitative Analysis</Typography>
            </Box> */}
          </Box>

          {/* SEARCH BAR */}
          <Box display="flex" backgroundColor={colors.primary[400]} borderRadius="3px">
            <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search" value={searchQuery} onChange={handleSearchChange} />
            {searchQuery && <IconButton onClick={handleClearSearch} sx={{ p:1 }}><CloseIcon /></IconButton>}
            <IconButton type="button" sx={{ p: 1 }}><SearchIcon /></IconButton>
          </Box>

          {/* Render Dashboard item */}
          {renderMenuItem(itemsData.find(item => item.title === "Dashboard"), 0)}

          {/* Render categories */}
          {searchQuery ? (
            filteredItems.map(renderMenuItem)
          ) : (
            renderSubMenus()
          )}
        </Menu>
        <Box sx={{ padding: theme.spacing(2), // Use theme spacing for consistent padding
        }}>
      {/* Bitcoin Donations Address */}
      <Box display="flex" justifyContent="center" alignItems="center">
        <img alt="main-logo" width="100px" height="100px" src={`../../assets/bc1qnekceuntjc2ga3vm8r85l842umzh35xs6yxyvx.JPG`} style={{ cursor: "pointer", borderRadius: "10%", marginTop: '50px', }} />
      </Box>
      <Box textAlign="center" padding={theme.spacing(1)}> {/* Adjusted for consistent spacing */}
        <Typography variant="h3" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 20px 0" }}>BTC Donations</Typography>
        <Typography variant="h5" color={colors.greenAccent[500]}>
          This application is maintained at my own personal expense and effort, and is free to use. If this app provides any value to you, consider donating BTC. The more donations I receive, the more time I will be able to spend building further services into the app. Thanks
        </Typography>
      </Box>
    </Box>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
