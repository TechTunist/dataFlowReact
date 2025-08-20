import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const ProgressBar3D = ({
  value = 0, // Value from 0 to 100
  fillColor = 'rgba(255, 255, 255, 0.2)', // Color for the progress fill
  markerBorderColor = '#fff', // Color for the marker border
  leftEndLabel = '', // Label at the left end of the bar (e.g., "Extreme Fear")
  rightEndLabel = '', // Label at the right end of the bar (e.g., "Extreme Greed")
  bottomLabel = '', // Label below the bar (e.g., "Greed")
  heatStatusLabel = '', // Heat status below description (e.g., "Heat: Cool")
  labelColor = '#fff', // Color for all labels and marker border
}) => {
  const theme = useTheme();
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <Box
      sx={{
        textAlign: 'center',
        height: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        borderRadius: '8px',
        padding: '4px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(8px)',
        border: `1px solid rgba(255, 255, 255, 0.1)`,
      }}
    >
      <Box
        sx={{
          width: '90%',
          maxWidth: 500,
          height: 20,
          position: 'relative',
        }}
      >
        {(leftEndLabel || rightEndLabel) && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 4px',
            }}
          >
            {leftEndLabel && (
              <Typography
                variant="body2"
                sx={{
                  color: labelColor,
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                {leftEndLabel}
              </Typography>
            )}
            {rightEndLabel && (
              <Typography
                variant="body2"
                sx={{
                  color: labelColor,
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                {rightEndLabel}
              </Typography>
            )}
          </Box>
        )}
        <Box
          sx={{
            width: '100%',
            height: 20,
            background: `linear-gradient(90deg, #4B6587 0%, #8BBCCC 100%)`,
            borderRadius: '5px',
            position: 'relative',
            boxShadow: '0 3px 6px rgba(0, 0, 0, 0.25)',
            transform: 'perspective(600px) rotateX(8deg)',
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
              background: fillColor,
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: '5px',
              transition: 'width 1.2s ease-in-out',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: -18,
              left: `calc(${percentage}% - 14px)`,
              width: 28,
              height: 28,
              backgroundColor: theme.palette.grey[800],
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${labelColor}`,
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
                fontSize: '11px',
              }}
            >
              {percentage.toFixed(0)}
            </Typography>
          </Box>
        </Box>
      </Box>
      {bottomLabel && (
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            color: labelColor,
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontSize: '11px',
          }}
        >
          {bottomLabel}
        </Typography>
      )}
      {heatStatusLabel && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            color: labelColor,
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontSize: '11px',
          }}
        >
          {heatStatusLabel}
        </Typography>
      )}
    </Box>
  );
};

export default ProgressBar3D;