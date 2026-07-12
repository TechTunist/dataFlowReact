/**
 * Market Overview entry point.
 *
 * Classic layout is sandboxed in MarketOverview.classic.jsx (full original).
 * Experimental layout is MarketOverview.experimental.jsx (same data, new presentation).
 *
 * Switch at runtime (persists in localStorage):
 *   - Floating "Classic layout" / "New layout" control on the page
 *   - Or: localStorage.setItem('marketOverviewStyle', 'classic' | 'experimental')
 *
 * Force default for deploys by changing DEFAULT_STYLE below.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import MarketOverviewClassic from './MarketOverview.classic';
import MarketOverviewExperimental from './MarketOverview.experimental';

const STORAGE_KEY = 'marketOverviewStyle';
/** 'experimental' | 'classic' — default for first visit */
const DEFAULT_STYLE = 'experimental';

function readStyle() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'classic' || v === 'experimental') return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_STYLE;
}

export default function MarketOverview() {
  const [style, setStyle] = useState(readStyle);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setStyle(readStyle());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setStyle((prev) => {
      const next = prev === 'classic' ? 'experimental' : 'classic';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isClassic = style === 'classic';

  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1200,
          display: 'flex',
          justifyContent: 'flex-end',
          px: { xs: 1.5, md: 2 },
          py: 1,
          pointerEvents: 'none',
        }}
      >
        <Button
          type="button"
          size="small"
          onClick={toggle}
          variant="outlined"
          sx={{
            pointerEvents: 'auto',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12,
            borderColor: '#4cceac',
            color: isClassic ? '#4cceac' : '#141b2d',
            bgcolor: isClassic ? 'transparent' : '#4cceac',
            '&:hover': {
              borderColor: '#70d8bd',
              bgcolor: isClassic ? 'rgba(76,206,172,0.12)' : '#70d8bd',
            },
          }}
        >
          {isClassic ? 'Try new layout' : 'Classic layout'}
        </Button>
      </Box>
      {isClassic ? <MarketOverviewClassic /> : <MarketOverviewExperimental />}
    </>
  );
}
