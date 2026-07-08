import React from 'react';
import { Box, Typography } from '@mui/material';
import { OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';

/**
 * Prominent callout for the open-access promotion on public marketing pages.
 */
const OpenAccessPromoBanner = ({ colors, compact = false }) => (
  <Box
    role="status"
    sx={{
      width: '100%',
      py: compact ? 1.5 : 2,
      px: compact ? 2 : 3,
      borderRadius: 2,
      textAlign: 'center',
      background: `linear-gradient(135deg, ${colors.greenAccent[900]} 0%, ${colors.primary[800]} 100%)`,
      border: `1px solid ${colors.greenAccent[700]}`,
    }}
  >
    <Typography
      sx={{
        color: colors.greenAccent[300],
        fontWeight: 800,
        fontSize: compact ? '0.95rem' : { xs: '1rem', sm: '1.15rem' },
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {OPEN_ACCESS_PROMO.bannerHeadline}
    </Typography>
    <Typography
      sx={{
        color: colors.grey[200],
        mt: 0.5,
        fontSize: compact ? '0.85rem' : { xs: '0.9rem', sm: '1rem' },
      }}
    >
      {OPEN_ACCESS_PROMO.bannerSubtext}
    </Typography>
  </Box>
);

export default OpenAccessPromoBanner;