import React, { useMemo } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useData } from '../../DataContext';
import { AVG_DAYS_TOP_TO_BOTTOM, getCycleBottomDaysLeft } from '../../utility/cycleBottomDaysLeft';

/** Fixed height offsets — keep in sync with SplashNavBar `topOffset`. */
export const HUNDRED_DAY_WINDOW_BANNER_HEIGHT = { xs: 40, sm: 44 };

const HundredDayWindowBanner = ({ colors }) => {
  const { btcData } = useData();

  const daysLeft = useMemo(() => {
    const referenceDate = btcData.length > 0
      ? btcData[btcData.length - 1].time
      : undefined;
    return getCycleBottomDaysLeft(referenceDate).daysLeft;
  }, [btcData]);

  return (
    <Box
      className="hundred-day-window-banner"
      role="status"
      aria-live="polite"
      aria-label={`${daysLeft} days to cycle bottom`}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        minHeight: HUNDRED_DAY_WINDOW_BANNER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: colors.primary[800],
        borderBottom: `1px solid ${colors.primary[600]}`,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
          py: 0.75,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Typography
          sx={{
            color: colors.grey[100],
            fontWeight: 700,
            fontSize: { xs: '0.8rem', sm: '0.95rem' },
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          The 100-Day Window
        </Typography>
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: '1px',
            height: 16,
            backgroundColor: colors.primary[500],
          }}
          aria-hidden
        />
        <Typography
          sx={{
            color: colors.grey[300],
            fontSize: { xs: '0.8rem', sm: '0.95rem' },
            textAlign: 'center',
          }}
        >
          <Box component="span" sx={{ color: colors.greenAccent[500], fontWeight: 700, fontSize: '1.05em' }}>
            {daysLeft}
          </Box>
          {' '}
          days to cycle bottom
          <Box
            component="span"
            sx={{ display: { xs: 'none', md: 'inline' }, color: colors.grey[400] }}
          >
            {' '}
            (based on historical averages)
          </Box>
        </Typography>
      </Container>
    </Box>
  );
};

export default HundredDayWindowBanner;