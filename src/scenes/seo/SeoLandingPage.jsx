import React from 'react';
import { Box, Button, Container, Typography, Chip, Stack } from '@mui/material';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { tokens } from '../../theme';
import Navbar from '../global/SplashNavBar.jsx';
import SeoPublicFooter from './SeoPublicFooter';
import SeoHead, { organizationJsonLd, softwareApplicationJsonLd } from '../../components/SeoHead';
import { SEO_PAGES } from '../../seo/staticPageContent';
import '../../styling/splashPage.css';

const SeoLandingPage = () => {
  const { pathname } = useLocation();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const page = Object.values(SEO_PAGES).find((p) => p.path === pathname);

  if (!page) {
    return <Navigate to="/splash" replace />;
  }

  return (
    <Box
      className="splash-page"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: colors.primary[900],
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <SeoHead
        title={page.title}
        description={page.description}
        path={page.path}
        keywords={page.keywords}
        jsonLd={[organizationJsonLd, softwareApplicationJsonLd]}
      />
      <Navbar colors={colors} />

      <Box
        component="article"
        sx={{
          width: '100%',
          pt: { xs: 12, sm: 14 },
          pb: 4,
          background: `linear-gradient(180deg, ${colors.primary[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <Container maxWidth="md">
          <Chip
            label="Cryptological, Bitcoin & crypto analytics"
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
              fontWeight: 'bold',
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
              lineHeight: 1.2,
              mb: 3,
            }}
          >
            {page.h1}
          </Typography>

          {page.sections.map((section) => (
            <Box key={section.h2} sx={{ mb: 4 }}>
              <Typography
                component="h2"
                variant="h4"
                sx={{ color: colors.greenAccent[400], fontWeight: 'bold', mb: 1.5, fontSize: { xs: '1.35rem', md: '1.6rem' } }}
              >
                {section.h2}
              </Typography>
              {section.paragraphs.map((para) => (
                <Typography
                  key={para.slice(0, 40)}
                  component="p"
                  variant="body1"
                  sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 2, fontSize: { xs: '1.05rem', md: '1.15rem' } }}
                >
                  {para}
                </Typography>
              ))}
            </Box>
          ))}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Button
              component={Link}
              to="/login-signup?mode=signup"
              variant="contained"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: 'bold',
                '&:hover': { backgroundColor: colors.greenAccent[400] },
              }}
            >
              Sign up free
            </Button>
            <Button
              component={Link}
              to="/chart-gallery"
              variant="outlined"
              sx={{
                color: colors.greenAccent[400],
                borderColor: colors.greenAccent[500],
                '&:hover': { borderColor: colors.greenAccent[300] },
              }}
            >
              Browse chart gallery
            </Button>
          </Stack>

          <Typography component="nav" aria-label="Related pages" variant="body2" sx={{ color: colors.grey[400] }}>
            Related:{' '}
            {page.links.map((link, i) => (
              <React.Fragment key={link.href}>
                {i > 0 && ' · '}
                <Typography
                  component={Link}
                  to={link.href}
                  sx={{ color: colors.greenAccent[500], textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {link.label}
                </Typography>
              </React.Fragment>
            ))}
          </Typography>
        </Container>
      </Box>

      <SeoPublicFooter />
    </Box>
  );
};

export default SeoLandingPage;