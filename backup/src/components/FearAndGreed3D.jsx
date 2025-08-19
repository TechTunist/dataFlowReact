import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { DataContext } from '../DataContext'; // Import DataContext

const FearAndGreed3D = () => {
  const theme = useTheme();
  const { latestFearAndGreed, fetchLatestFearAndGreed } = useContext(DataContext); // Access context
  const [fearAndGreedValue, setFearAndGreedValue] = useState(50); // Placeholder value

  useEffect(() => {
    // Fetch the latest Fear and Greed data if not already fetched
    if (!latestFearAndGreed) {
      fetchLatestFearAndGreed();
    } else {
      // Set the value from the context
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: 200,
          height: 40,
          background: `linear-gradient(90deg, #ff0000 0%, ${theme.palette.warning.main} 50%, #00cc00 100%)`,
          borderRadius: 2,
          position: 'relative',
          margin: '0 auto',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          transform: 'perspective(500px) rotateX(20deg)',
          marginTop: 4,
        }}
      >
        <Box
          sx={{
            width: `${percentage}%`,
            height: '100%',
            background: 'rgba(255,255,255,0.3)',
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: 2,
            transition: 'width 1s ease-in-out',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            left: `calc(${percentage}% - 15px)`,
            width: 30,
            height: 30,
            backgroundColor: theme.palette.grey[700],
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            transition: 'left 1s ease-in-out',
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.common.white }}>
            {fearAndGreedValue}
          </Typography>
        </Box>
      </Box>
      <Typography variant="h5" sx={{ mt: 4, color }}>
        {label}
      </Typography>
    </Box>
  );
};

export default FearAndGreed3D;