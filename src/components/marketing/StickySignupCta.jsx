import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import TrackedSignupLink from './TrackedSignupLink';
import {
  getStickyCtaHint,
  isOpenAccessPromoActive,
} from '../../config/openAccessPromo';

const StickySignupCta = ({
  colors,
  signupPath = '/login-signup?mode=signup',
  label,
}) => {
  const [visible, setVisible] = useState(false);
  const promoActive = isOpenAccessPromoActive();
  const buttonLabel =
    label || (promoActive ? 'Sign up free (limited access)' : 'Sign up free');

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.85);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Box
      className="splash-sticky-cta"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        py: 1.5,
        backgroundColor: `${colors.primary[900]}ee`,
        borderTop: `1px solid ${colors.primary[600]}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography sx={{ color: colors.grey[300], fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
          {getStickyCtaHint(promoActive)}
        </Typography>
        <Button
          component={TrackedSignupLink}
          to={signupPath}
          location="sticky-bar"
          variant="contained"
          sx={{
            backgroundColor: colors.greenAccent[500],
            color: colors.grey[900],
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            '&:hover': { backgroundColor: colors.greenAccent[400] },
          }}
        >
          {buttonLabel}
        </Button>
      </Container>
    </Box>
  );
};

export default StickySignupCta;
