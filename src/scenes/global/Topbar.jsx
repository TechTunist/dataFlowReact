import React from "react";
import { Box, IconButton, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import { useLocation } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styling/bitcoinChart.css";
import Header from "../../components/Header";
import { useFavorites } from "../../contexts/FavoritesContext";
import AppControls from "./AppControls";
import InfoMenuButton from "./InfoMenuButton";
import { getTitleAndSubtitle, routeToChartId } from "../ChartTemplates/chartPageMeta";

const Topbar = ({ setIsSidebar, isSidebar }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const location = useLocation();
  const isMobile = useIsMobile();
  const sidebarWidth = isSidebar ? 270 : 0;
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart, loading } = useFavorites();
  const currentChartId = routeToChartId[location.pathname];
  const isChartPage = !!currentChartId;
  const isFavorite = isChartPage && favoriteCharts.includes(currentChartId);

  const handleToggleFavorite = () => {
    if (!currentChartId) return;
    if (isFavorite) {
      removeFavoriteChart(currentChartId);
    } else {
      addFavoriteChart(currentChartId);
    }
  };

  const topBarStyle = {
    position: "fixed",
    top: 0,
    left: isMobile ? 0 : sidebarWidth,
    right: 0,
    height: isMobile ? "65px" : "85px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 10px",
    backgroundColor: colors.primary[400],
    zIndex: 1000,
    width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
    borderBottom: `1px solid ${colors.greenAccent[500]}`,
    transition: "left 0.3s ease, width 0.3s ease",
  };

  const { title, subtitle } = getTitleAndSubtitle(location.pathname, isMobile);

  return (
    <Box style={topBarStyle}>
      <Box display="flex" alignItems="center">
        {isMobile && (
          <IconButton onClick={() => setIsSidebar(!isSidebar)} aria-label="menu">
            <MenuOutlinedIcon style={{ color: colors.primary[100] }} />
          </IconButton>
        )}
        <InfoMenuButton className="about-button" />
      </Box>
      <div style={{ flexGrow: 1, textAlign: "center" }}>
        <Header title={title} subtitle={subtitle} />
      </div>
      <AppControls
        showAbout={false}
        showFavorite={isChartPage}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        favoriteLoading={loading}
      />
    </Box>
  );
};

export default Topbar;