import React from 'react';
import { Box, Typography } from '@mui/material';
import { OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';

const STRIKE_COLOR = '#ef5350';

/**
 * Shows original price struck through in red with a promo replacement label.
 */
const PromoPriceDisplay = ({
  original = OPEN_ACCESS_PROMO.premiumPriceUsd,
  promoLabel = OPEN_ACCESS_PROMO.priceLabel,
  colors,
  variant = 'h6',
  align = 'center',
  sx = {},
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      gap: 0.5,
      mb: 2,
      ...sx,
    }}
  >
    <Typography
      variant={variant}
      sx={{
        color: colors.grey[500],
        textDecoration: 'line-through',
        textDecorationColor: STRIKE_COLOR,
        textDecorationThickness: '2px',
        fontWeight: 500,
      }}
    >
      {original}
    </Typography>
    <Typography
      variant={variant}
      sx={{
        color: colors.greenAccent[400],
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontSize: variant === 'h6' ? '1.05rem' : undefined,
      }}
    >
      {promoLabel}
    </Typography>
  </Box>
);

export default PromoPriceDisplay;