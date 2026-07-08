import React from 'react';
import { Box, useTheme } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { tokens } from '../theme';
import Navbar from './global/SplashNavBar.jsx';
import CreatorPromoKit from '../components/marketing/CreatorPromoKit';
import SeoPublicFooter from './seo/SeoPublicFooter';
import '../styling/splashPage.css';

/**
 * Internal page for promo video talking points.
 * Hidden from public marketing unless REACT_APP_SHOW_CREATOR_KIT=true.
 */
const CreatorKitPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (process.env.REACT_APP_SHOW_CREATOR_KIT !== 'true') {
    return <Navigate to="/" replace />;
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
      }}
    >
      <Navbar colors={colors} />
      <Box sx={{ width: '100%', pt: { xs: 10, sm: 12 } }}>
        <CreatorPromoKit colors={colors} />
      </Box>
      <SeoPublicFooter />
    </Box>
  );
};

export default CreatorKitPage;
