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
      <Typography variant={isNested ? 'h6' : 'h5'}>{title}</Typography>
      <Link to={to} />
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
    { title: "Risk Metric", to: "/risk", category: 'Bitcoin', icon: <BarChartOutlinedIcon /> },
    { title: "ROI from Cycle Bottom", to: "/cycles", category: 'Bitcoin', icon: <BarChartOutlinedIcon /> },
  ];

  const filteredItems = itemsData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
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

  const renderMenuItemsByCategory = (category) => {
    return itemsData
      .filter(item => item.category === category)
      .map(renderMenuItem);
  };

  return (
    <Box sx={{
      "& .pro-sidebar-inner": {
        background: `${colors.primary[400]} !important`,
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

          {/* Render other categories */}
          {searchQuery ? (
            filteredItems.map(renderMenuItem)
          ) : (
            <SubMenu title="Bitcoin" icon={<BarChartOutlinedIcon />} style={{ color: colors.grey[100] }}>
              {itemsData.filter(item => item.category === "Bitcoin").map((item, index) => renderMenuItem(item, index, true))}
            </SubMenu>
            // Render other categories similarly
          )}
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;