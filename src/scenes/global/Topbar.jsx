import React, { useContext } from "react";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useLocation } from "react-router-dom";
import { Link } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import useIsMobile from '../../hooks/useIsMobile';
import '../../styling/bitcoinChart.css';
import Header from "../../components/Header";


const Topbar = ({ setIsSidebar, isSidebar, isDashboardTopbar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const location = useLocation();
  const isMobile = useIsMobile(); // Custom hook to detect mobile devices
  const sidebarWidth = isSidebar ? 270 : 0; // Assuming 250px is your sidebar's width

  const topBarStyle = {
    position: 'fixed',
    top: 0,
    left: isMobile ? 0 : sidebarWidth, // Adjust left position based on mobile view
    right: 0,
    height: isMobile ? '65px' : '85px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 10px',
    backgroundColor: colors.primary[400],
    zIndex: 1000,
    width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
    borderBottom: `1px solid ${colors.greenAccent[500]}` // Adjust width based on the sidebar and mobile view
  };

  // Function to determine the title and subtitle based on the current location
  const getTitleAndSubtitle = (pathname) => {
    switch (pathname) {
      case "/":
        return { title: "Dashboard", subtitle: "All charts" };
      case "/bitcoin":
        return { title: "Bitcoin", subtitle: "Historical Chart" };
      case "/risk":
        return { title: "Bitcoin", subtitle: "Risk Metric" };
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
        return { title: "Bitcoin", subtitle: "Price v Risk" };
      case "/altcoin-price":
        return { title: "Altcoins", subtitle: "Altcoin Analysis" };
      case "/about":
        return { title: "About", subtitle: "Why did I create Cryptological?" };
      case "/login-signup":
        return { title: "Login / Signup", subtitle: "Under Construction" };
      case "/market-cycles":
        return { title: "Bitcoin Cycles", subtitle: "Start from either the cycle bottom or from the halving" };
      case "/fear-and-greed-chart":
        return { title: "Bitcoin Fear and Greed", subtitle: "Fear and Greed plotted over the Bitcoin Price" };
      case "/altcoin-risk":
        return { title: "Altcoin Risk Chart", subtitle: "Display the risk metric for a selection of altcoins" };
      case "/us-inflation":
        return { title: "US Inflation", subtitle: "Annualised inflation rate" };
      case "/us-unemployment":
        return { title: "US Unemployment", subtitle: "Historical US Unemployment Rate" };
      case "/us-interest":
        return { title: "US Interest Rate", subtitle: "Fed Funds Rate" };
      default:
        return { title: "CryptoLogical", subtitle: "" }; // Default title or could be a 404 page title
    }
  };

  const { title, subtitle } = getTitleAndSubtitle(location.pathname);

  return (
    <Box style={topBarStyle}>
      <Box display="flex" alignItems="center">
        <Link to="/about">
          <IconButton aria-label="about" className="about-button">
            <InfoOutlinedIcon style={{ color: colors.primary[100] }} />
          </IconButton>
        </Link>
      </Box>
      <div style={{ flexGrow: 1, textAlign: 'center' }}>
        <Header title={title} subtitle={subtitle} /> {/* Use Header component for title and subtitle */}
      </div>
      <Box display="flex" alignItems="center">
        {isMobile && (
          <Link to="/">
            <IconButton aria-label="home" className="home-button">
              <HomeOutlinedIcon style={{ color: colors.primary[100] }} />
            </IconButton>
          </Link>
        )}
        <IconButton onClick={colorMode.toggleColorMode} color="inherit">
          {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
