import React from "react";
import { Box, Button, Container, Typography, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";
import Navbar from "./global/SplashNavBar.jsx";
import ChartGalleryContent from "../components/ChartGalleryContent";
import "../styling/splashPage.css";

const PublicChartGallery = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      className="splash-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: colors.primary[900],
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Navbar colors={colors} />

      <Box
        component="section"
        sx={{
          width: "100%",
          pt: { xs: 12, sm: 14 },
          pb: { xs: 4, md: 6 },
          background: `linear-gradient(180deg, ${colors.primary[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <Container maxWidth="md">
          <Chip
            label="Public preview · No account required"
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[800],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            variant="h1"
            sx={{
              color: colors.grey[100],
              fontWeight: "bold",
              fontSize: { xs: "2rem", sm: "2.75rem", md: "3.25rem" },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            Explore the charts
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: colors.grey[300],
              fontWeight: 400,
              fontSize: { xs: "1.05rem", md: "1.25rem" },
              lineHeight: 1.7,
              mb: 3,
            }}
          >
            Browse every chart available on Cryptological. Create a free account to open interactive charts,
            customise your dashboard, and track the metrics that matter to you.
          </Typography>
          <Button
            component={Link}
            to="/login-signup?mode=signup"
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              fontWeight: "bold",
              "&:hover": { backgroundColor: colors.greenAccent[400] },
            }}
          >
            Sign up free
          </Button>
        </Container>
      </Box>

      <Box sx={{ width: "100%", pb: 8 }}>
        <ChartGalleryContent linkable={false} />
      </Box>
    </Box>
  );
};

export default PublicChartGallery;