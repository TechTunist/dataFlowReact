import React from "react";
import { useGalleryHashScroll } from "../hooks/useGalleryHashScroll";
import { Box, Button, Container, Typography, Chip, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";
import Navbar from "./global/SplashNavBar.jsx";
import ChartGalleryContent from "../components/ChartGalleryContent";
import SeoHead from "../components/SeoHead";
import SeoPublicFooter from "./seo/SeoPublicFooter";
import { SEO_PAGES } from "../seo/staticPageContent";
import { isOpenAccessPromoActive, OPEN_ACCESS_PROMO } from "../config/openAccessPromo";
import ShareActions from "../components/marketing/ShareActions";
import "../styling/splashPage.css";

const gallerySeo = SEO_PAGES["chart-gallery"];

const PublicChartGallery = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const promoActive = isOpenAccessPromoActive();
  useGalleryHashScroll();

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
      <SeoHead
        title={gallerySeo.title}
        description={gallerySeo.description}
        path="/chart-gallery"
        keywords={gallerySeo.keywords}
      />
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
            label={
              promoActive
                ? OPEN_ACCESS_PROMO.limitedAccessChip
                : "Public preview · No account required"
            }
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[800],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            component="h1"
            variant="h1"
            sx={{
              color: colors.grey[100],
              fontWeight: "bold",
              fontSize: { xs: "2rem", sm: "2.75rem", md: "3.25rem" },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            {gallerySeo.h1}
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
            Browse every chart available on Cryptological. This gallery is a public preview with
            screenshots only. Interactive charts require a free account (email and password).
            {promoActive
              ? " Full access for free accounts is limited-time promotional, no card required."
              : " Create a free account to open interactive charts."}
            {" "}For live numbers without signup, see the public market pulse on the home page.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 1 }}>
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
              Sign up free to open charts
            </Button>
            <Button
              component={Link}
              to="/#market-pulse"
              variant="outlined"
              sx={{
                color: colors.greenAccent[400],
                borderColor: colors.greenAccent[500],
                fontWeight: "bold",
                "&:hover": { borderColor: colors.greenAccent[300] },
              }}
            >
              See live market pulse
            </Button>
            <Button
              component={Link}
              to="/#public-trends"
              variant="text"
              sx={{
                color: colors.grey[300],
                textTransform: "none",
                "&:hover": { color: colors.greenAccent[300] },
              }}
            >
              Public trend previews
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ width: "100%", pb: 8 }}>
        <ChartGalleryContent linkable={false} />
        <Box sx={{ mt: 4, px: 2 }}>
          <ShareActions
            colors={colors}
            promoActive={promoActive}
            path="/chart-gallery"
            location="chart-gallery"
          />
        </Box>
      </Box>
      <SeoPublicFooter />
    </Box>
  );
};

export default PublicChartGallery;