import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Reusable loading fallback for lazy-loaded routes and heavy charts.
 * Used with React.Suspense.
 */
const LoadingFallback = ({ message = "Loading chart..." }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
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