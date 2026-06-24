import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Box } from '@mui/material';

const ScrollHint = ({ color }) => (
  <Box
    className="splash-scroll-hint"
    sx={{
      position: 'absolute',
      bottom: { xs: 24, md: 40 },
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: color || 'rgba(255,255,255,0.55)',
      pointerEvents: 'none',
    }}
    aria-hidden
  >
    <KeyboardArrowDownIcon sx={{ fontSize: 36 }} />
  </Box>
);

export default ScrollHint;