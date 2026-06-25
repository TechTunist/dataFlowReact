import { Box, IconButton, Typography, useTheme, useMediaQuery } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { tokens } from "../../theme";
import { useFavorites } from "../../contexts/FavoritesContext";

const ChartCardShell = ({ title, subtitle, chartId, children }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));
  const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
  const isFavorite = chartId && favoriteCharts.includes(chartId);

  const toggleFavorite = () => {
    if (!chartId) return;
    if (isFavorite) {
      removeFavoriteChart(chartId);
    } else {
      addFavoriteChart(chartId);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: colors.primary[400],
        borderRadius: "12px",
        padding: { xs: "16px", sm: "20px" },
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: `0 4px 12px ${theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)"}`,
      }}
    >
      {chartId && (
        <IconButton
          onClick={toggleFavorite}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: isFavorite ? "#FFD700" : colors.grey[300],
            zIndex: 10,
          }}
          size="small"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      )}

      <Box sx={{ mb: 1, pr: { xs: 4, sm: 5 } }}>
        <Typography
          variant={isNarrow ? "h5" : "h4"}
          color={colors.grey[100]}
          gutterBottom
          sx={{ lineHeight: 1.25, wordBreak: "break-word" }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color={colors.grey[300]}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {children}
    </Box>
  );
};

export const ChartSecondaryCard = ({ title, children }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        backgroundColor: colors.primary[400],
        borderRadius: "12px",
        padding: { xs: "16px", sm: "20px" },
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 4px 12px ${theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)"}`,
      }}
    >
      {title && (
        <Typography variant="h5" color={colors.grey[100]} gutterBottom sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

export default ChartCardShell;