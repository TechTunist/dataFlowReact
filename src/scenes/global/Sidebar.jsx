import { useState } from "react";
import { ProSidebar, Menu, MenuItem, SubMenu} from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import "react-pro-sidebar/dist/css/styles.css";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close"; 
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";

const Item = ({ title, to, icon, selected, setSelected }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={selected === title}
      style={{
        color: colors.grey[100],
      }}
      onClick={() => setSelected(title)}
      icon={icon}
    >
      <Typography>{title}</Typography>
      <Link to={to} />
    </MenuItem>
  );
};

const Sidebar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const itemsData = [
    { title: "Dashboard", to: "/", icon: <HomeOutlinedIcon /> },
    { title: "Bitcoin Chart", to: "/bitcoin", category: 'Bitcoin', icon: <TimelineOutlinedIcon /> },
    { title: "Bitcoin Risk", to: "/risk", category: 'Bitcoin', icon: <TimelineOutlinedIcon /> },
    { title: "Bitcoin Cycles", to: "/cycles", category: 'Bitcoin', icon: <TimelineOutlinedIcon /> },
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

  // Function to render menu items
  const renderMenuItem = (item, index) => (
    <Item
      key={index}
      title={item.title}
      to={item.to}
      icon={item.icon}
      selected={selected}
      setSelected={setSelected}
    />
  );

  const renderMenuItemsByCategory = (category) => {
    return itemsData
      .filter(item => item.category === category)
      .map(renderMenuItem);
  };

  return (
    <Box
      sx={{
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 35px 5px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: "#868dfb !important",
        },
        "& .pro-menu-item.active": {
          color: "#6870fa !important",
        },
      }}
    >
      <ProSidebar collapsed={isCollapsed}>
        <Menu iconShape="square">
          {/* LOGO AND MENU ICON */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 20px 0",
              color: colors.grey[100],
            }}
          >
            {!isCollapsed && (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                ml="15px"
              >
                <Typography variant="h3" color={colors.grey[100]}>
                  Navigation
                </Typography>
                <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>

          {!isCollapsed && (
            <Box mb="25px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img
                  alt="main-logo"
                  width="100px"
                  height="100px"
                  src={`../../assets/main-logo.png`}
                  style={{ cursor: "pointer", borderRadius: "50%" }}
                />
              </Box>
              <Box textAlign="center">
                <Typography
                  variant="h2"
                  color={colors.grey[100]}
                  fontWeight="bold"
                  sx={{ m: "10px 0 0 0" }}
                >
                  Data Flow
                </Typography>
                <Typography variant="h5" color={colors.greenAccent[500]}>
                  Quantitative Analysis
                </Typography>
              </Box>
            </Box>
          )}

          {/* SEARCH BAR */}
          <Box
            display="flex"
            backgroundColor={colors.primary[400]}
            borderRadius="3px"
          >
            <InputBase
              sx={{ ml: 2, flex: 1 }}
              placeholder="Search"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <IconButton onClick={handleClearSearch} sx={{ p:1 }}>
                <CloseIcon />
              </IconButton>
            )}
            <IconButton type="button" sx={{ p: 1 }}>
              <SearchIcon />
            </IconButton>
          </Box>

          <Box paddingLeft={isCollapsed ? undefined : "10%"}>
            {/* Render Dashboard item always */}
            {renderMenuItem(itemsData.find(item => item.title === "Dashboard"), 0)}

            {/* Check if there is a search query */}
            {searchQuery ? (
              // If search query exists, render filtered items directly
              filteredItems.map(renderMenuItem)
            ) : (
              // Otherwise, render items within their categories
              <>
                <SubMenu title="Bitcoin" icon={<BarChartOutlinedIcon />} style={{ color: colors.grey[100] }}>
                  {renderMenuItemsByCategory("Bitcoin")}
                </SubMenu>
                {/* Render other categories similarly */}
              </>
            )}
          </Box>
        </Menu>
      </ProSidebar>
    </Box>
  );
};

export default Sidebar;
