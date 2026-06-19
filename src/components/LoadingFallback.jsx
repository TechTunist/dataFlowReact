import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Reusable loading fallback for lazy-loaded routes and heavy charts.
 * Used with React.Suspense.
 */
const LoadingFallback = ({ message = "Loading chart...", fullScreen = false }) => {
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
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body1">{message}</Typography>
    </Box>
  );
};

export default LoadingFallback;