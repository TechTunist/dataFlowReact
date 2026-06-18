import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { tokens } from '../../theme';
import { SITE_NAME, SUPPORT_EMAIL } from '../../seo/seoConfig';

const FOOTER_SECTIONS = [
  {
    title: 'Explore',
    links: [
      { to: '/splash', label: 'Home' },
      { to: '/bitcoin-analytics', label: 'Bitcoin Analytics' },
      { to: '/on-chain-metrics', label: 'On-Chain Metrics' },
      { to: '/crypto-charts-tools', label: 'Crypto Charting Tools' },
      { to: '/chart-gallery', label: 'Chart Gallery' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { to: '/bitcoin-whitepaper', label: 'Why Bitcoin?' },
      { to: '/login-signup?mode=signup', label: 'Sign Up Free' },
      { to: '/login-signup?mode=signin', label: 'Login' },
    ],
  },
];

const SeoPublicFooter = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        mt: 8,
        py: 6,
        borderTop: `1px solid ${colors.primary[600]}`,
        backgroundColor: colors.primary[900],
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: colors.grey[100], fontWeight: 'bold', mb: 1 }}>
              {SITE_NAME}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.grey[400], lineHeight: 1.7 }}>
              Bitcoin and cryptocurrency analytics — on-chain metrics, risk indicators, macro overlays,
              and market cycle tools for serious investors.
            </Typography>
          </Grid>
          {FOOTER_SECTIONS.map((section) => (
            <Grid item xs={6} md={4} key={section.title}>
              <Typography
                variant="subtitle2"
                sx={{ color: colors.greenAccent[400], fontWeight: 'bold', mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {section.title}
              </Typography>
              {section.links.map((link) => (
                <MuiLink
                  key={link.to}
                  component={Link}
                  to={link.to}
                  underline="hover"
                  display="block"
                  sx={{ color: colors.grey[300], fontSize: '0.95rem', mb: 0.75 }}
                >
                  {link.label}
                </MuiLink>
              ))}
            </Grid>
          ))}
        </Grid>
        <Typography variant="caption" sx={{ color: colors.grey[500], display: 'block', mt: 4 }}>
          © {new Date().getFullYear()} {SITE_NAME}. Questions?{' '}
          <MuiLink href={`mailto:${SUPPORT_EMAIL}`} sx={{ color: colors.grey[400] }}>
            {SUPPORT_EMAIL}
          </MuiLink>
        </Typography>
      </Container>
    </Box>
  );
};

export default SeoPublicFooter;