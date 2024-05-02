import React, { useContext } from "react";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useLocation } from "react-router-dom";
import Header from "../../components/Header";
import { Link } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import useIsMobile from '../../hooks/useIsMobile';
import { BorderColor } from "@mui/icons-material";
import '../../styling/bitcoinChart.css'

const Topbar = ({ setIsSidebar, isSidebar, isDashboardTopbar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const location = useLocation();
  const isMobile = useIsMobile(); // Custom hook to detect mobile devices
  const sidebarWidth = isSidebar ? 270 : 0; // Assuming 250px is your sidebar's width
  const mobileTopbar = window.innerWidth <= 600; // Check if the viewport width is 600px or less

  const topBarStyle = {
    position: 'fixed',
    top: 0,
    left: isMobile ? 0 : sidebarWidth, // Adjust left position based on mobile view
    right: 0,
    height: '85px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 10px',
    backgroundColor: colors.primary[400],
    zIndex: 1000,
    width: isMobile ? '100%' : `calc(100% - ${mobileTopbar ? 0 : sidebarWidth}px)`, // Adjust width based on the sidebar and mobile view
    // borderBottom: '1px',
    // borderBottomStyle: 'solid',
    // borderBottomColor: colors.greenAccent[500]
  };

  // Function to determine the title based on the current location
  const getTitle = (pathname) => {
    switch (pathname) {
      case "/":
        return <Header title="Dashboard" subtitle="All charts" />;
      case "/bitcoin":
        return <Header title="Bitcoin" subtitle="Historical Chart" />;
      case "/risk":
        return <Header title="Bitcoin" subtitle="Risk Metric" />;
      case "/ethereum":
        return <Header title="Ethereum" subtitle="Historical Chart" />;
      case "/risk-eth":
        return <Header title="Ethereum" subtitle="Risk Metric" />;
        case "/pi-cycle":
          return <Header title="PiCycle Top" subtitle="Top Calling Indicator" />;
        case "/fear-and-greed":
          return <Header title="Fear & Greed" subtitle="Market Sentiment" />;
        case "/logarithmic-regression":
          return <Header title="Bitcoin" subtitle="Logarithmic Regression" />;
        case "/risk-color":
          return <Header title="Bitcoin" subtitle="Price v Risk" />;
        case "/altcoin-price":
          return <Header title="Altcoins" subtitle="Altcoin Analysis" />;
        case "/about":
          return <Header title="About" subtitle="Why did I create Data Flow?" />;
        case "/login-signup":
          return <Header title="Login / Signup" subtitle="Under Construnction" />;
        case "/market-cycles":
          return <Header title="Bitcoin Cycles" subtitle="From bear-market low to bull-market high" />;
      default:
        return "Welcome"; // Default title or could be a 404 page title
    }
  };

  return (
    <Box style={topBarStyle}>
      <Typography variant="h6" color="inherit">
        {getTitle(location.pathname)} {/* Set the dynamic title based on the route */}
      </Typography>
      {isMobile && (
                <Link to="/">
                <IconButton aria-label="home" className="home-button">
                    <HomeOutlinedIcon />
                </IconButton>
                </Link>
      )}
      <div className='topbar-links'>
        <Link to="/login-signup" className="topbar-link">
          <div className="topbar-link" style={{color: colors.primary[100]}}>Login</div>
        </Link>
        <Link to="/about" className="topbar-link">
          <div className="topbar-link" style={{color: colors.primary[100]}}>About</div>
        </Link>
      </div>

        {
            isDashboardTopbar && (
              <IconButton onClick={colorMode.toggleColorMode} color="inherit">
                {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            )   
        }
        {
            !isDashboardTopbar && (
              <div>
                {/* placeholder for styling */}
              </div>
            )   
        }
      
    </Box>
  );
};

export default Topbar;
