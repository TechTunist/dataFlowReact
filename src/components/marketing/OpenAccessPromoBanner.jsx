import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';

/**
 * Prominent callout for the open-access promotion on public marketing pages.
 * Must make limited-time + free-account (email/password) requirements obvious.
 */
const OpenAccessPromoBanner = ({ colors, compact = false }) => (
  <Box
    role="status"
    sx={{
      width: '100%',
      py: compact ? 1.5 : 2.25,
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
        mt: 0.75,
        fontSize: compact ? '0.85rem' : { xs: '0.9rem', sm: '1rem' },
        lineHeight: 1.5,
      }}
    >
      {OPEN_ACCESS_PROMO.bannerSubtext}
    </Typography>
    {!compact && (
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="center"
        sx={{ mt: 1.5 }}
      >
        {OPEN_ACCESS_PROMO.requirements.map((req) => (
          <Typography
            key={req}
            sx={{
              color: colors.grey[300],
              fontSize: '0.78rem',
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: `${colors.primary[900]}99`,
              border: `1px solid ${colors.primary[600]}`,
            }}
          >
            {req}
          </Typography>
        ))}
      </Stack>
    )}
  </Box>
);

export default OpenAccessPromoBanner;
