import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Reusable UK-friendly educational disclaimer for public marketing / cycle content.
 * Not a substitute for legal review; frames copy as analytics education only.
 */
const EducationalDisclaimer = ({ colors, sx }) => (
  <Box
    role="note"
    sx={{
      mt: 3,
      p: 2.5,
      borderRadius: 1,
      border: `1px solid ${colors.primary[500]}`,
      backgroundColor: colors.primary[700],
      ...sx,
    }}
  >
    <Typography
      sx={{
        color: colors.grey[400],
        fontSize: '0.85rem',
        lineHeight: 1.75,
      }}
    >
      <strong style={{ color: colors.grey[300] }}>Educational use only.</strong>{' '}
      Cryptological is a charting and analytics platform operated from the UK. Nothing on this site
      is regulated financial advice, a personal recommendation, or an invitation to buy, sell, or hold
      any investment. Historical cycle averages and indicator readings describe past patterns only; they
      do not predict future prices. You are solely responsible for your own decisions. If you need
      guidance tailored to your circumstances, speak to a qualified financial adviser.
    </Typography>
  </Box>
);

export default EducationalDisclaimer;