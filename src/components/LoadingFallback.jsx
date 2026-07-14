import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { hardNavigateReload } from '../utils/reloadOnce';

/** Lazy routes / heavy charts that hang after cold boot should not spin forever. */
export const LOADING_FALLBACK_STUCK_MS = 12_000;

/**
 * Reusable loading fallback for lazy-loaded routes and heavy charts.
 * Used with React.Suspense.
 *
 * After LOADING_FALLBACK_STUCK_MS, swaps the spinner for a Reload button so a
 * hung dynamic import (common after laptop boot / flaky network) is recoverable.
 */
const LoadingFallback = ({
  message = "Loading chart...",
  fullScreen = false,
  stuckAfterMs = LOADING_FALLBACK_STUCK_MS,
}) => {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (stuckAfterMs == null || stuckAfterMs <= 0) return undefined;
    const id = window.setTimeout(() => setStuck(true), stuckAfterMs);
    return () => window.clearTimeout(id);
  }, [stuckAfterMs]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '50vh',
        width: '100%',
        bgcolor: fullScreen ? 'background.default' : 'transparent',
        color: 'text.secondary',
        gap: 2,
        px: 2,
        textAlign: 'center',
      }}
    >
      {!stuck && <CircularProgress size={48} />}
      <Typography variant="body1">
        {stuck ? 'This is taking longer than expected.' : message}
      </Typography>
      {stuck && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            The page may have opened before the network was ready. Reload to continue.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => hardNavigateReload('loading-fallback-stuck')}
          >
            Reload
          </Button>
        </>
      )}
    </Box>
  );
};

export default LoadingFallback;
