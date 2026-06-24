import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import { trackCtaClick } from '../../utils/plausibleEvents';
import { gallerySectionHref } from '../../config/gallerySectionUtils';

/** Gallery screenshot tile — full capture visible, links to chart gallery section. */
export default function ChartPreviewLink({ image, alt, title, gallerySection, colors }) {
  return (
    <Link
      component={RouterLink}
      to={gallerySectionHref(gallerySection)}
      underline="none"
      onClick={() => trackCtaClick('splash_chart_preview', 'free')}
      sx={{ display: 'block', color: 'inherit' }}
    >
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #333',
          background: '#0a0a0a',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        }}
      >
        <Box
          component="img"
          src={image}
          alt={alt}
          loading="lazy"
          sx={{
            display: 'block',
            width: '100%',
            height: 'auto',
          }}
        />
      </Box>
      <Box sx={{ pt: 1.5, px: 0.5 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: colors.grey[100] }}>
          {title}
        </Typography>
      </Box>
    </Link>
  );
}