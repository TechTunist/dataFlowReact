import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { DataContext } from '../DataContext';

const FearAndGreed3D = () => {
  const theme = useTheme();
  const { latestFearAndGreed, fetchLatestFearAndGreed } = useContext(DataContext);
  const [fearAndGreedValue, setFearAndGreedValue] = useState(50);

  useEffect(() => {
    if (!latestFearAndGreed) {
      fetchLatestFearAndGreed();
    } else {
      setFearAndGreedValue(parseInt(latestFearAndGreed.value, 10));
    }
  }, [latestFearAndGreed, fetchLatestFearAndGreed]);

  const getLabelAndColor = (value) => {
    if (value <= 25) return { label: 'Extreme Fear', color: theme.palette.error.main };
    if (value <= 50) return { label: 'Fear', color: theme.palette.warning.main };
    if (value <= 75) return { label: 'Greed', color: theme.palette.success.main };
    return { label: 'Extreme Greed', color: theme.palette.success.dark };
  };

  const { label, color } = getLabelAndColor(fearAndGreedValue);
  const percentage = (fearAndGreedValue / 100) * 100;

  return (
    <Box
      sx={{
        textAlign: 'center',
        height: '80px', // Further reduced height for thinner background
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.55)', // Dark, semi-transparent background
        borderRadius: '8px', // Slightly smaller radius
        padding: '4px', // Significantly reduced padding for thinner background
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15)', // Subtler shadow
        backdropFilter: 'blur(8px)', // Slightly reduced blur for compactness
        border: `1px solid rgba(255, 255, 255, 0.1)`,
      }}
    >
      <Box
        sx={{
          width: '80%', // Maintain wide lateral width
          maxWidth: 400, // Max width for larger screens
          height: 20, // Slightly thinner gauge bar for balance
          background: `linear-gradient(90deg, #4B6587 0%, #8BBCCC 100%)`, // Minimal blue-to-green gradient
          borderRadius: '5px', // Adjusted for thinner bar
          position: 'relative',
          margin: '0 auto',
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.25)', // Subtler shadow
          transform: 'perspective(600px) rotateX(8deg)', // Subtler 3D effect
          transition: 'transform 0.3s ease-in-out',
          '&:hover': {
            transform: 'perspective(600px) rotateX(6deg) translateY(-1px)',
          },
        }}
      >
        <Box
          sx={{
            width: `${percentage}%`,
            height: '100%',
            background: 'rgba(255, 255, 255, 0.2)', // Subtle overlay
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: '5px',
            transition: 'width 1.2s ease-in-out', // Smoother transition
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -18, // Adjusted for thinner bar
            left: `calc(${percentage}% - 14px)`,
            width: 28, // Slightly smaller marker for compact look
            height: 28,
            backgroundColor: theme.palette.grey[800],
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${color}`, // Border matches dynamic label color
            transition: 'left 1.2s ease-in-out, transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.common.white,
              fontWeight: 'bold',
              fontSize: '11px', // Smaller font for compact marker
            }}
          >
            {fearAndGreedValue}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="h6"
        sx={{
          mt: 1.5, // Further reduced margin
          color,
          fontWeight: '600',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontSize: '0.9rem', // Slightly smaller font
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default FearAndGreed3D;