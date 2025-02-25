import React from 'react';
import { Box, Typography, Button, useTheme } from "@mui/material";
import { tokens } from "../theme"; // Assuming this is where your theme tokens are defined
import { Link } from "react-router-dom";
import '../styling/splashPage.css'; // You'll need to create this CSS file

const SplashPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary[900],
        padding: '0 20px',
      }}
    >
      {/* Main Content Container */}
      <Box
        sx={{
          maxWidth: '800px',
          textAlign: 'center',
          padding: '40px',
          backgroundColor: colors.primary[800],
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(141, 53, 53, 0.1)',
        }}
      >
        {/* Header */}
        <Typography
          variant="h1"
          sx={{
            color: colors.grey[100],
            marginBottom: '20px',
            fontSize: { xs: '2.5rem', md: '3.5rem' },
          }}
        >
          Welcome to Cryptological
        </Typography>

        {/* Subheader */}
        <Typography
          variant="h4"
          sx={{
            color: colors.grey[300],
            marginBottom: '30px',
            fontSize: { xs: '1.2rem', md: '1.5rem' },
            lineHeight: 1.5,
          }}
        >
          Unlock comprehensive cryptocurrency analytics, market trends, and risk metrics.
        </Typography>

        {/* Call to Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Button
            component={Link}
            to="/login"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[900],
              padding: '12px 24px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: colors.greenAccent[600],
              },
            }}
          >
            Sign In
          </Button>
          <Button
            component={Link}
            to="/register"
            sx={{
              backgroundColor: 'transparent',
              color: colors.greenAccent[500],
              padding: '12px 24px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: `2px solid ${colors.greenAccent[500]}`,
              '&:hover': {
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
              },
            }}
          >
            Register
          </Button>
        </Box>

        {/* Features Preview */}
        <Box
          sx={{
            marginTop: '40px',
            textAlign: 'left',
            color: colors.grey[200],
          }}
        >
          <Typography variant="h5" sx={{ marginBottom: '15px' }}>
            What You'll Get:
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            • Daily Bitcoin, Ethereum & altcoin price charts
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            • Risk metrics, market cycle analysis & other charts and indicators
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            • Altcoin performance and dominance indicators
          </Typography>
          <Typography variant="body1">
            • Macro economic data and market sentiment
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '20px',
          color: colors.grey[400],
          fontSize: '0.9rem',
        }}
      >
        <Typography>
          © {new Date().getFullYear()} Cryptological. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default SplashPage;