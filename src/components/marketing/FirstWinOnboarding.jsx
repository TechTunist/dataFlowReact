import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from 'react-router-dom';
import { isOpenAccessPromoActive, OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';
import {
  trackOnboardingDismissed,
  trackOnboardingShown,
  trackOnboardingStep,
} from '../../utils/plausibleEvents';

const STORAGE_KEY = 'cryptological_first_win_dismissed_v1';

const STEPS = [
  {
    title: 'Open Bitcoin Risk Colour',
    text: 'See where BTC sits in historical risk bands, the core cycle map.',
    to: '/risk-color',
    cta: 'Open risk colour',
  },
  {
    title: 'Try the Dynamic DCA Simulator',
    text: 'Backtest buy and sell rules against history and compare to HODL.',
    to: '/dynamic-dca',
    cta: 'Open DCA simulator',
  },
  {
    title: 'Browse the chart gallery',
    text: '80+ charts across risk, macro, alts, and stocks. Star favourites for your dashboard.',
    to: '/charts',
    cta: 'Browse charts',
  },
];

/**
 * One-time first-session guide after signup.
 * Stored dismissal is local only (no backend / payment changes).
 */
const FirstWinOnboarding = ({ colors }) => {
  const [visible, setVisible] = useState(false);
  const promoActive = isOpenAccessPromoActive();

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
      setVisible(true);
      trackOnboardingShown();
    } catch {
      setVisible(true);
      trackOnboardingShown();
    }
  }, []);

  const dismiss = (reason = 'dismiss') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore quota */
    }
    trackOnboardingDismissed(reason);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card
      sx={{
        mb: 3,
        backgroundColor: colors.primary[500],
        border: `1px solid ${colors.greenAccent[600]}`,
        position: 'relative',
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <IconButton
          aria-label="Dismiss getting started"
          onClick={() => dismiss('close')}
          sx={{ position: 'absolute', top: 8, right: 8, color: colors.grey[300] }}
        >
          <CloseIcon />
        </IconButton>
        <Box pr={4}>
          {promoActive && (
            <Chip
              label={OPEN_ACCESS_PROMO.stickerLabel || 'Free Premium Access'}
              size="small"
              sx={{
                mb: 1.5,
                backgroundColor: colors.greenAccent[800],
                color: colors.greenAccent[200],
                fontWeight: 600,
              }}
            />
          )}
          <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: 700, mb: 1 }}>
            Welcome, start here
          </Typography>
          <Typography sx={{ color: colors.grey[300], mb: 2.5, maxWidth: 720 }}>
            {promoActive
              ? 'Full access is currently free with your account. Three quick wins to feel the product in under five minutes:'
              : 'Three quick wins to feel the product in under five minutes:'}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {STEPS.map((step, i) => (
            <Grid item xs={12} md={4} key={step.to}>
              <Box
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: colors.primary[700],
                  border: `1px solid ${colors.primary[600]}`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography sx={{ color: colors.greenAccent[400], fontWeight: 800, mb: 0.5 }}>
                  {i + 1}. {step.title}
                </Typography>
                <Typography sx={{ color: colors.grey[300], fontSize: '0.9rem', flex: 1, mb: 1.5 }}>
                  {step.text}
                </Typography>
                <Button
                  component={Link}
                  to={step.to}
                  onClick={() => {
                    trackOnboardingStep(step.to);
                    dismiss(`step:${step.to}`);
                  }}
                  size="small"
                  variant="contained"
                  sx={{
                    alignSelf: 'flex-start',
                    backgroundColor: colors.greenAccent[500],
                    color: colors.grey[900],
                    fontWeight: 700,
                    '&:hover': { backgroundColor: colors.greenAccent[400] },
                  }}
                >
                  {step.cta}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Button
          onClick={() => dismiss('later')}
          sx={{ mt: 2, color: colors.grey[400], textTransform: 'none' }}
        >
          I&apos;ll explore myself
        </Button>
      </CardContent>
    </Card>
  );
};

export default FirstWinOnboarding;
