import { useState } from "react";
import { ProSidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import WarningOutlinedIcon from "@mui/icons-material/WarningOutlined";


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
    { title: "Dashboard", to: "/", icon: <HomeOutlinedIcon />, category: null },
    { title: "Bitcoin Chart", to: "/bitcoin", category: 'Bitcoin', icon: <BarChartOutlinedIcon /> },
    { title: "Bitcoin Risk Metric", to: "/risk", category: 'Bitcoin', icon: <WarningOutlinedIcon /> },
    { title: "Ethereum Chart", to: "/ethereum", category: 'Ethereum', icon: <BarChartOutlinedIcon /> },
    { title: "Ethereum Risk Metric", to: "/risk-eth", category: 'Ethereum', icon: <WarningOutlinedIcon /> },
    { title: "PiCycleTop Indicator", to: "/pi-cycle", category: 'Indicators', icon: <WarningOutlinedIcon /> },
    { title: "Fear And Greed Indicator", to: "/fear-and-greed", category: 'Indicators', icon: <WarningOutlinedIcon /> },
    { title: "Bitcoin Logarithmic Regression", to: "/logarithmic-regression", category: 'Indicators', icon: <WarningOutlinedIcon /> },
    { title: "Bitcoin Risk Colour Chart", to: "/risk-color", category: 'Bitcoin', icon: <WarningOutlinedIcon /> },
    { title: "Altcoin Chart", to: "/altcoin-price", category: 'Altcoins', icon: <BarChartOutlinedIcon /> },
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
      <SubMenu key={category} title={category} icon={<BarChartOutlinedIcon />} style={{ color: colors.grey[100] }}>
        {items.map(renderMenuItem)}
      </SubMenu>
    ))
  );

  return (
    <Box sx={{
      "& .pro-sidebar-inner": {
        background: `${colors.primary[400]} !important`,
        // borderRight: `1px solid ${colors.greenAccent[500]}`
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
          <Box mb="25px">
            {/* Main Logo and Title */}
            <Box display="flex" justifyContent="center" alignItems="center">
              <img alt="main-logo" width="100px" height="100px" src={`../../assets/main-logo.png`} style={{ cursor: "pointer", borderRadius: "50%" }} />
            </Box>
            <Box textAlign="center">
              <Typography variant="h2" color={colors.grey[100]} fontWeight="bold" sx={{ m: "10px 0 0 0" }}>Data Flow</Typography>
              <Typography variant="h5" color={colors.greenAccent[500]}>Quantitative Analysis</Typography>
            </Box>
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
