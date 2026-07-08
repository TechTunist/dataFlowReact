import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isOpenAccessPromoActive, OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';
import { trackPlausible } from '../../utils/plausibleEvents';

/**
 * Shown once after signup when landing on /dashboard?welcome=1.
 * Complements FirstWinOnboarding with promo/context messaging.
 */
const WelcomeSignupBanner = ({ colors }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const promoActive = isOpenAccessPromoActive();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') !== '1') return;
    setOpen(true);
    trackPlausible('Welcome Banner Shown', { promo: promoActive ? 'yes' : 'no' });
    // Clean URL without remounting hard
    params.delete('welcome');
    const next = params.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate, promoActive]);

  if (!open) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        severity="success"
        onClose={() => setOpen(false)}
        sx={{
          backgroundColor: colors.primary[500],
          color: colors.grey[100],
          border: `1px solid ${colors.greenAccent[600]}`,
          '& .MuiAlert-icon': { color: colors.greenAccent[400] },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
          {promoActive ? 'Welcome, limited free access is on' : 'Welcome to Cryptological'}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: colors.grey[300], mb: 1 }}>
          {promoActive
            ? `${OPEN_ACCESS_PROMO.bannerSubtext} Start with Risk Colour, the DCA simulator, or the chart gallery.`
            : 'Start with Risk Colour, pin favourites to your dashboard, and explore the free chart set.'}
        </Typography>
        <Button
          component={Link}
          to="/risk-color"
          size="small"
          variant="contained"
          sx={{
            mr: 1,
            backgroundColor: colors.greenAccent[500],
            color: colors.grey[900],
            fontWeight: 700,
            '&:hover': { backgroundColor: colors.greenAccent[400] },
          }}
        >
          Open Risk Colour
        </Button>
        <Button
          component={Link}
          to="/charts"
          size="small"
          sx={{ color: colors.greenAccent[400], textTransform: 'none' }}
        >
          Browse charts
        </Button>
      </Alert>
    </Box>
  );
};

export default WelcomeSignupBanner;
