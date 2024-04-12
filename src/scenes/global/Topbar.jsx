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

const Topbar = ({ setIsSidebar, isSidebar }) => {
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
    height: '100px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 10px',
    backgroundColor: colors.primary[400],
    zIndex: 1000,
    width: isMobile ? '100%' : `calc(100% - ${mobileTopbar ? 0 : sidebarWidth}px)` // Adjust width based on the sidebar and mobile view
  };

  // Function to determine the title based on the current location
  const getTitle = (pathname) => {
    switch (pathname) {
      case "/":
        return <Header title="Dashboard" subtitle="Currently showing all available charts" />;
      case "/bitcoin":
        return <Header title="Bitcoin" subtitle="Simple Bitcoin Chart" />;
      case "/risk":
        return <Header title="Bitcoin" subtitle="Risk Chart" />;
      case "/ethereum":
        return <Header title="Ethereum" subtitle="Simple Ethereum Chart" />;
      case "/risk-eth":
        return <Header title="Ethereum" subtitle="Ethereum Risk Chart" />;
        case "/pi-cycle":
          return <Header title="PiCycle Top" subtitle="Top Calling Indicator" />;
        case "/fear-and-greed":
          return <Header title="Fear and Greed" subtitle="Market Sentiment Analyzer" />;
        case "/logarithmic-regression":
          return <Header title="Bitcoin" subtitle="Logarithmic Regression" />;
        case "/risk-color":
          return <Header title="Bitcoin Risk (Colour)" subtitle="Colour-Coded Risk Levels" />;
        case "/altcoin-price":
          return <Header title="Altcoin Charts" subtitle="Simple Altcoin Price Chart" />;
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
      <IconButton onClick={colorMode.toggleColorMode} color="inherit">
        {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Box>
  );
};

export default Topbar;
