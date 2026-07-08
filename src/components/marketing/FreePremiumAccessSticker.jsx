import React from 'react';
import { Box } from '@mui/material';
import { isOpenAccessPromoActive, OPEN_ACCESS_PROMO } from '../../config/openAccessPromo';

const STICKER_RED = '#d32f2f';

/**
 * Corner ribbon for public marketing pages. Uses a fixed clip region in the
 * top-right so the rotated band stays fully visible (no letter clipping).
 * Hidden unless REACT_APP_OPEN_ACCESS_PROMO=true.
 */
const FreePremiumAccessSticker = ({ corner = 'top-right' }) => {
  if (!isOpenAccessPromoActive()) return null;

  const isRight = corner !== 'top-left';

  return (
    <Box
      className="free-premium-access-sticker-wrap"
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        ...(isRight ? { right: 0 } : { left: 0 }),
        width: { xs: 160, sm: 190, md: 220 },
        height: { xs: 160, sm: 190, md: 220 },
        overflow: 'hidden',
        zIndex: 3,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        role="note"
        aria-label={OPEN_ACCESS_PROMO.stickerLabel}
        className="free-premium-access-sticker"
        sx={{
          position: 'absolute',
          // Balanced placement: enough shift to clear "F", not so much that "ss" clips
          top: { xs: 44, sm: 50, md: 58 },
          left: '50%',
          width: '250%',
          transform: isRight
            ? 'translateX(calc(-50% + 20px)) rotate(45deg) translate(14px, 10px)'
            : 'translateX(calc(-50% - 20px)) rotate(-45deg) translate(-14px, 10px)',
          transformOrigin: 'center center',
          backgroundColor: STICKER_RED,
          color: '#ffffff',
          py: { xs: 1, sm: 1.15, md: 1.35 },
          px: 2,
          fontWeight: 800,
          fontSize: { xs: '0.8rem', sm: '0.95rem', md: '1.1rem' },
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          textAlign: 'center',
          boxShadow: '0 3px 14px rgba(0,0,0,0.28)',
          borderTop: '2px solid rgba(255,255,255,0.35)',
          borderBottom: '2px solid rgba(0,0,0,0.12)',
        }}
      >
        {OPEN_ACCESS_PROMO.stickerLabel}
      </Box>
    </Box>
  );
};

export default FreePremiumAccessSticker;